"""
Assistant conversationnel du cockpit.

1. Dépôt de document : on charge un PDF / HTML / texte, l'agent le lit et l'analyse
   (même chaîne que `npm run analyse`), puis les résultats apparaissent dans le cockpit.
2. Chatbot : répond en direct (texte affiché au fur et à mesure) aux questions sur
   l'analyse, en s'appuyant UNIQUEMENT sur les exigences extraites et vérifiées
   (approche RAG : on retrouve les passages pertinents, puis le modèle rédige la réponse).

Le modèle utilisé est celui du fichier .env (Gemini ou Mistral, offres gratuites).
En mode démo (LLM_PROVIDER=mock), le chatbot répond sans IA en listant les exigences pertinentes.
"""
from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import unicodedata
from pathlib import Path
from typing import Iterator

import requests

from backend import RACINE

SOURCES = RACINE / "data" / "sources"
MODELES_PAR_DEFAUT = {"google": "gemini-3.8-flash", "mistral": "mistral-small-latest"}

SYSTEME = """Tu es l'assistant GRC de l'agent de veille réglementaire d'Hydréa (organisation fictive).
Règles :
- Réponds en français, de façon claire et directe, en quelques phrases ou une courte liste.
- Appuie-toi UNIQUEMENT sur le contexte fourni (exigences extraites du texte officiel, matrices, lots d'action).
- Cite systématiquement les identifiants d'exigences (REQ-...) et les articles concernés.
- Si l'information n'est pas dans le contexte, dis-le simplement et propose de charger le texte correspondant.
- Signale quand une exigence n'est pas vérifiée ou n'est pas encore validée par un humain.
- Tu aides à la décision : la décision finale appartient toujours à l'humain."""


# ---------------------------------------------------------------------------
# Recherche des passages pertinents (RAG très simple, sans base vectorielle)
# ---------------------------------------------------------------------------
MOTS_VIDES = set("le la les un une des du de d l et ou a au aux en dans pour par sur avec que qui quoi quel quelle quels quelles est sont ce cet cette ces il elle on nous vous ils mes mon ma notre nos son sa ses leur leurs pas ne plus moins tout tous toute toutes faire doit doivent comment pourquoi quand".split())


def _normaliser(t: str) -> str:
    t = unicodedata.normalize("NFD", t.lower())
    return "".join(c for c in t if unicodedata.category(c) != "Mn")


def _mots(t: str) -> set[str]:
    return {m for m in re.findall(r"[a-z0-9]+", _normaliser(t)) if len(m) > 2 and m not in MOTS_VIDES}


SYNONYMES = {
    "urgent": "critique p1 priorite", "priorite": "critique p1", "delai": "heures mois jour echeance", "delais": "heures mois jour echeance",
    "amende": "sanction", "sanctions": "sanction", "direction": "dirigeants organes gouvernance", "dirigeants": "organes direction gouvernance",
    "fournisseurs": "chaine approvisionnement prestataires", "incident": "incidents notification", "anssi": "csirt autorite notification",
    "mfa": "authentification facteurs", "formation": "cyberhygiene formation", "risques": "risque", "audit": "audits supervision",
}


def rechercher(question: str, store: dict, matrices: dict, n: int = 12) -> list[dict]:
    """Classe les exigences par proximité avec la question (mots communs, article cité, identifiant cité)."""
    q = _normaliser(question)
    mots = _mots(question)
    for m in list(mots):
        mots |= _mots(SYNONYMES.get(m, ""))
    articles_cites = set(re.findall(r"art(?:icle)?\.?\s*(\d+)", q))
    ids_cites = {i.upper() for i in re.findall(r"req-[a-z0-9-]+", q)}
    risques = {r["ID exigence"]: r for r in matrices.get("M4_risque", [])}
    scores = []
    for e in store.get("exigences", []):
        texte = " ".join(str(e.get(k, "")) for k in ("intitule", "obligation", "article", "echeance", "sanction", "type")) + " " + " ".join(e.get("themes", []))
        texte += " " + risques.get(e["id"], {}).get("Niveau", "")
        score = len(mots & _mots(texte))
        num = (re.findall(r"\d+", e.get("article", "")) or [""])[0]
        if num in articles_cites:
            score += 6
        if e["id"] in ids_cites:
            score += 20
        if e.get("applicable"):
            score += 0.5
        if score > 0.5:
            scores.append((score, e))
    scores.sort(key=lambda x: -x[0])
    return [e for _, e in scores[:n]]


def contexte(question: str, store: dict, matrices: dict) -> str:
    couv = {r["ID exigence"]: r for r in matrices.get("M3_couverture", [])}
    risq = {r["ID exigence"]: r for r in matrices.get("M4_risque", [])}
    ex = rechercher(question, store, matrices)
    lignes = []
    for e in ex:
        lignes.append(
            f"- {e['id']} | {e.get('article')} | {e.get('intitule')} | obligation : {e.get('obligation')} | "
            f"échéance : {e.get('echeance') or '—'} | sanction : {e.get('sanction') or '—'} | applicable : {'oui' if e.get('applicable') else 'non'} "
            f"({e.get('justification_applicabilite', '')}) | vérifiée dans le texte : {'oui' if e.get('verifiee') else 'NON'} | "
            f"confiance : {e.get('confiance_finale')} | statut : {e.get('statut_validation')} | "
            f"couverture : {couv.get(e['id'], {}).get('Statut', '—')} | risque : {risq.get(e['id'], {}).get('Niveau', '—')}"
        )
    actives = [e for e in store.get("exigences", []) if e.get("applicable") and e.get("statut_validation") != "Rejetée"]
    niveaux: dict[str, int] = {}
    for r in matrices.get("M4_risque", []):
        niveaux[r["Niveau"]] = niveaux.get(r["Niveau"], 0) + 1
    lots = [f"{l['id']} {l['priorite']} {l['intitule']} (resp. {l['responsable']}, échéance {l['echeance']})" for l in store.get("lots", [])]
    gouv = store.get("gouvernance") or {}
    textes = "; ".join(f"{t.get('titre')} — {t.get('qualification', '')}" for t in store.get("textes", []))
    return (
        f"Organisation : {store.get('organisation')}\nTextes analysés : {textes}\n"
        f"Synthèse : {len(store.get('exigences', []))} exigences extraites, {len(actives)} applicables retenues ; risques résiduels : {niveaux}.\n"
        f"Lots d'action : {' ; '.join(lots)}\n"
        f"Gouvernance recommandée : {gouv.get('cadre_recommande', '—')} (décision humaine : {gouv.get('decision_humaine') or 'non prise'})\n\n"
        f"Exigences les plus pertinentes pour la question :\n" + ("\n".join(lignes) or "(aucune exigence ne correspond)")
    )


# ---------------------------------------------------------------------------
# Appel au modèle, en flux (la réponse s'affiche au fur et à mesure)
# ---------------------------------------------------------------------------
class ErreurIA(Exception):
    pass


def _flux_sse(reponse: requests.Response) -> Iterator[dict]:
    # Les flux « text/event-stream » n'annoncent pas toujours leur encodage : on impose l'UTF-8 (sinon « dÃ©lais »).
    reponse.encoding = "utf-8"
    for ligne in reponse.iter_lines(decode_unicode=True):
        if not ligne or not ligne.startswith("data:"):
            continue
        donnees = ligne[5:].strip()
        if donnees == "[DONE]":
            return
        try:
            yield json.loads(donnees)
        except json.JSONDecodeError:
            continue


def _erreur(r: requests.Response) -> ErreurIA:
    texte = r.text[:500]
    if r.status_code == 429 or "quota" in texte.lower():
        return ErreurIA("Quota gratuit du modèle atteint pour le moment. Réessayez dans une minute, ou changez LLM_MODEL dans le fichier .env (ex. gemini-flash-lite-latest).")
    if r.status_code in (401, 403):
        return ErreurIA("Clé API refusée : vérifiez la clé dans le fichier .env.")
    if r.status_code == 404 or "no longer available" in texte:
        return ErreurIA("Modèle indisponible : changez LLM_MODEL dans le fichier .env (ex. gemini-flash-lite-latest).")
    return ErreurIA(f"Erreur du modèle ({r.status_code}) : {texte}")


def repondre(question: str, historique: list[dict], store: dict, matrices: dict) -> Iterator[str]:
    """Génère la réponse morceau par morceau."""
    fournisseur = os.environ.get("LLM_PROVIDER", "mock").strip() or "mock"
    modele = os.environ.get("LLM_MODEL", "").strip() or MODELES_PAR_DEFAUT.get(fournisseur, "")
    ctx = contexte(question, store, matrices)
    consigne = f"Contexte (résultats de l'agent) :\n{ctx}\n\nQuestion : {question}"

    if fournisseur == "mock":
        yield from _reponse_sans_ia(question, store, matrices)
        return

    precedents = historique[-6:]  # mémoire courte de la conversation
    if fournisseur == "google":
        cle = os.environ.get("GOOGLE_GENERATIVE_AI_API_KEY", "").strip()
        if not cle:
            raise ErreurIA("Clé GOOGLE_GENERATIVE_AI_API_KEY absente du fichier .env.")
        contenus = [{"role": "user" if m["role"] == "user" else "model", "parts": [{"text": m["content"]}]} for m in precedents]
        contenus.append({"role": "user", "parts": [{"text": consigne}]})
        r = requests.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/{modele}:streamGenerateContent?alt=sse",
            headers={"x-goog-api-key": cle, "Content-Type": "application/json"},
            json={"systemInstruction": {"parts": [{"text": SYSTEME}]}, "contents": contenus, "generationConfig": {"temperature": 0.2}},
            stream=True, timeout=120,
        )
        if r.status_code != 200:
            raise _erreur(r)
        for morceau in _flux_sse(r):
            for cand in morceau.get("candidates", []):
                for part in cand.get("content", {}).get("parts", []):
                    if part.get("text") and not part.get("thought"):
                        yield part["text"]
        return

    if fournisseur == "mistral":
        cle = os.environ.get("MISTRAL_API_KEY", "").strip()
        if not cle:
            raise ErreurIA("Clé MISTRAL_API_KEY absente du fichier .env.")
        messages = [{"role": "system", "content": SYSTEME}] + [{"role": m["role"], "content": m["content"]} for m in precedents]
        messages.append({"role": "user", "content": consigne})
        r = requests.post(
            "https://api.mistral.ai/v1/chat/completions",
            headers={"Authorization": f"Bearer {cle}", "Content-Type": "application/json"},
            json={"model": modele, "messages": messages, "temperature": 0.2, "stream": True},
            stream=True, timeout=120,
        )
        if r.status_code != 200:
            raise _erreur(r)
        for morceau in _flux_sse(r):
            for choix in morceau.get("choices", []):
                if choix.get("delta", {}).get("content"):
                    yield choix["delta"]["content"]
        return

    raise ErreurIA(f"LLM_PROVIDER inconnu : {fournisseur}")


def _reponse_sans_ia(question: str, store: dict, matrices: dict) -> Iterator[str]:
    ex = rechercher(question, store, matrices, n=6)
    if not ex:
        yield "Mode démo (sans IA) : aucune exigence ne correspond à votre question. Essayez avec un mot-clé (notification, fournisseurs, direction, MFA…)."
        return
    risq = {r["ID exigence"]: r.get("Niveau", "—") for r in matrices.get("M4_risque", [])}
    yield "Mode démo (sans IA) : voici les exigences les plus proches de votre question.\n\n"
    for e in ex:
        yield (f"- **{e['id']}** ({e.get('article')}) — {e.get('intitule')} : {e.get('obligation')}"
               f" · échéance : {e.get('echeance') or '—'} · risque : {risq.get(e['id'], '—')} · statut : {e.get('statut_validation')}\n")
    yield "\nPour des réponses rédigées, mettez LLM_PROVIDER=google et votre clé dans le fichier .env."


# ---------------------------------------------------------------------------
# Dépôt d'un document puis analyse par l'agent
# ---------------------------------------------------------------------------
def identifiant_depuis_nom(nom: str) -> str:
    base = re.sub(r"\.[^.]+$", "", nom)
    base = re.sub(r"[^A-Za-z0-9]+", "-", _normaliser(base)).strip("-").upper()
    return f"TXT-{base[:20].strip('-') or 'DOC'}"


def enregistrer_document(nom: str, contenu: bytes) -> Path:
    """Enregistre le fichier dans data/sources ; un PDF est converti en texte."""
    SOURCES.mkdir(parents=True, exist_ok=True)
    nom_sur = re.sub(r"[^A-Za-z0-9._-]+", "_", nom)
    if nom_sur.lower().endswith(".pdf"):
        from io import BytesIO

        from pypdf import PdfReader

        lecteur = PdfReader(BytesIO(contenu))
        texte = "\n".join((page.extract_text() or "") for page in lecteur.pages)
        # « Article 21 Mesures de… » sur une même ligne → « Article 21 » seul sur sa ligne (format attendu par l'agent)
        texte = re.sub(r"(?m)^\s*(Article\s+(?:premier|\d+[a-z]?))\s+(?=\S)", r"\1\n", texte)
        if len(texte.strip()) < 200:
            raise ValueError("Ce PDF ne contient pas de texte lisible (PDF scanné ?). Essayez la version HTML du texte.")
        chemin = SOURCES / (nom_sur[:-4] + ".txt")
        chemin.write_text(texte, encoding="utf-8")
        return chemin
    chemin = SOURCES / nom_sur
    chemin.write_bytes(contenu)
    return chemin


def analyser_document(chemin: Path, identifiant: str, titre: str = "") -> Iterator[str]:
    """Lance l'agent (npm run analyse) et renvoie son journal ligne par ligne."""
    if shutil.which("npm") is None:
        raise RuntimeError("L'analyse de documents nécessite Node.js : elle fonctionne quand le projet est installé en local "
                           "(voir le README), pas sur la version en ligne du cockpit.")
    relatif = chemin.relative_to(RACINE).as_posix()
    commande = f'npm run analyse -- --fichier "{relatif}" --id {identifiant}'
    if titre.strip():
        commande += f' --titre "{titre.strip()}"'
    proc = subprocess.Popen(commande, cwd=RACINE / "agent", shell=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                            text=True, encoding="utf-8", errors="replace")
    assert proc.stdout is not None
    for ligne in proc.stdout:
        yield ligne.rstrip()
    proc.wait()
    if proc.returncode != 0:
        raise RuntimeError("L'analyse s'est arrêtée (voir le journal ci-dessus).")
