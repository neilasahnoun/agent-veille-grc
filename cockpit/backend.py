"""
Accès aux données pour le cockpit Streamlit.

Deux modes, choisis par la variable STORAGE du fichier .env :
  - local  : lit et écrit data/store.json (mode démo, aucune clé nécessaire)
  - notion : lit et écrit directement dans les bases Notion créées par `npm run notion:setup`

Les décisions humaines (valider / corriger / rejeter) sont enregistrées dans la même source,
puis le worker (`npm run worker`) ou `npm run matrices` recalcule les matrices.
"""
from __future__ import annotations

import json
import os
import subprocess
from datetime import date
from pathlib import Path
from typing import Any

import requests

RACINE = Path(__file__).resolve().parent.parent
STORE = RACINE / "data" / "store.json"
MATRICES = RACINE / "outputs" / "matrices" / "matrices.json"
PLAN = RACINE / "outputs" / "plan-gouvernance.md"


def charger_env() -> None:
    """Charge le .env de la racine (format CLÉ=valeur) sans écraser l'environnement existant."""
    chemin = RACINE / ".env"
    if not chemin.exists():
        return
    for ligne in chemin.read_text(encoding="utf-8").splitlines():
        ligne = ligne.strip()
        if not ligne or ligne.startswith("#") or "=" not in ligne:
            continue
        cle, valeur = ligne.split("=", 1)
        os.environ.setdefault(cle.strip(), valeur.strip().strip("\"'"))


charger_env()
MODE = os.environ.get("STORAGE", "local").strip() or "local"


# ---------------------------------------------------------------------------
# Mode local
# ---------------------------------------------------------------------------
class BackendLocal:
    nom = "Fichier local (data/store.json)"

    def charger(self) -> dict[str, Any]:
        if not STORE.exists():
            return {}
        return json.loads(STORE.read_text(encoding="utf-8"))

    def _ecrire(self, store: dict[str, Any]) -> None:
        STORE.write_text(json.dumps(store, ensure_ascii=False, indent=2), encoding="utf-8")

    def enregistrer_decision(self, exigence_id: str, statut: str, obligation: str, commentaire: str, valide_par: str) -> None:
        store = self.charger()
        for e in store.get("exigences", []):
            if e["id"] == exigence_id:
                e["statut_validation"] = statut
                e["obligation"] = obligation
                e["commentaire_validation"] = commentaire
                e["valide_par"] = valide_par or None
                e["date_validation"] = date.today().isoformat()
        self._ecrire(store)

    def enregistrer_decision_gouvernance(self, decision: str) -> None:
        store = self.charger()
        if store.get("gouvernance") is not None:
            store["gouvernance"]["decision_humaine"] = decision
        self._ecrire(store)


# ---------------------------------------------------------------------------
# Mode Notion (API REST officielle, version 2022-06-28)
# ---------------------------------------------------------------------------
API = "https://api.notion.com/v1"


def _texte(prop: dict | None) -> str:
    if not prop:
        return ""
    t = prop.get("type")
    if t in ("title", "rich_text"):
        return "".join(x.get("plain_text", "") for x in prop.get(t, []))
    if t == "select":
        return (prop.get("select") or {}).get("name", "")
    if t == "multi_select":
        return ", ".join(x["name"] for x in prop.get("multi_select", []))
    if t == "number":
        return prop.get("number")
    if t == "checkbox":
        return prop.get("checkbox")
    if t == "url":
        return prop.get("url") or ""
    if t == "date":
        return (prop.get("date") or {}).get("start", "")
    return ""


class BackendNotion:
    nom = "Notion"

    def __init__(self) -> None:
        self.token = os.environ.get("NOTION_TOKEN", "")
        self.bases = {cle: os.environ.get(f"NOTION_DB_{cle.upper()}", "") for cle in ("textes", "exigences", "controles", "risques", "jurisprudence", "lots")}
        manquants = [k for k, v in self.bases.items() if not v]
        if not self.token or manquants:
            raise RuntimeError("Mode Notion : NOTION_TOKEN ou identifiants de bases manquants dans .env (lancer `npm run notion:setup`).")
        self.entetes = {"Authorization": f"Bearer {self.token}", "Notion-Version": "2022-06-28", "Content-Type": "application/json"}
        self._pages: dict[str, str] = {}

    def _requete(self, base: str) -> list[dict]:
        pages, curseur = [], None
        while True:
            corps = {"page_size": 100, **({"start_cursor": curseur} if curseur else {})}
            r = requests.post(f"{API}/databases/{self.bases[base]}/query", headers=self.entetes, json=corps, timeout=30)
            r.raise_for_status()
            data = r.json()
            pages += data["results"]
            if not data.get("has_more"):
                return pages
            curseur = data["next_cursor"]

    def charger(self) -> dict[str, Any]:
        # Le store local (s'il existe) apporte les champs non stockés dans Notion (raisonnement, gouvernance) ;
        # Notion fait foi pour tout ce qui est modifiable par un humain.
        local = BackendLocal().charger()
        exigences_locales = {e["id"]: e for e in local.get("exigences", [])}
        exigences = []
        for p in self._requete("exigences"):
            pr = p["properties"]
            ident = _texte(pr.get("ID"))
            self._pages[ident] = p["id"]
            base = exigences_locales.get(ident, {})
            exigences.append({
                **base,
                "id": ident,
                "intitule": _texte(pr.get("Intitulé")),
                "article": _texte(pr.get("Article")),
                "obligation": _texte(pr.get("Obligation")),
                "citation": _texte(pr.get("Citation")),
                "destinataire": _texte(pr.get("Destinataire")),
                "type": _texte(pr.get("Type")),
                "themes": [t.strip() for t in str(_texte(pr.get("Thèmes"))).split(",") if t.strip()],
                "echeance": _texte(pr.get("Échéance")) or None,
                "sanction": _texte(pr.get("Sanction")) or None,
                "applicable": bool(_texte(pr.get("Applicable"))),
                "justification_applicabilite": _texte(pr.get("Justification")),
                "confiance_finale": _texte(pr.get("Confiance")) or 0,
                "verifiee": bool(_texte(pr.get("Vérifiée"))),
                "verification_detail": _texte(pr.get("Vérification")),
                "statut_validation": _texte(pr.get("Statut validation")) or "À valider",
                "commentaire_validation": _texte(pr.get("Commentaire")),
                "valide_par": _texte(pr.get("Validé par")) or None,
                "date_validation": _texte(pr.get("Date validation")) or None,
                "url_source": _texte(pr.get("URL source")),
                "texte_id": base.get("texte_id", ""),
            })
        exigences.sort(key=lambda e: e["id"])

        textes, signaux = [], []
        for p in self._requete("textes"):
            pr = p["properties"]
            ident = _texte(pr.get("ID"))
            commun = {"id": ident, "titre": _texte(pr.get("Titre")), "source": _texte(pr.get("Source")), "url": _texte(pr.get("URL")),
                      "date_publication": _texte(pr.get("Date publication")), "date_detection": _texte(pr.get("Date détection"))}
            if _texte(pr.get("Nature")) == "Signal de veille":
                signaux.append({**commun, "detecte_le": commun["date_detection"], "statut": "nouveau", "extrait": ""})
            else:
                loc = next((t for t in local.get("textes", []) if t["id"] == ident), {})
                textes.append({**loc, **commun, "reference": _texte(pr.get("Référence")), "version": _texte(pr.get("Version")),
                               "applicable": bool(_texte(pr.get("Applicable"))), "qualification": _texte(pr.get("Qualification")),
                               "confiance": _texte(pr.get("Confiance"))})

        lots = []
        for p in self._requete("lots"):
            pr = p["properties"]
            lots.append({"id": _texte(pr.get("ID")), "intitule": _texte(pr.get("Intitulé")), "theme": _texte(pr.get("Thème")),
                         "priorite": _texte(pr.get("Priorité")), "echeance": _texte(pr.get("Échéance")), "responsable": _texte(pr.get("Responsable")),
                         "statut": _texte(pr.get("Statut")), "description": _texte(pr.get("Description")), "exigence_ids": []})
        lots.sort(key=lambda l: l["id"])

        risques = []
        for p in self._requete("risques"):
            pr = p["properties"]
            risques.append({"id": _texte(pr.get("ID")), "intitule": _texte(pr.get("Intitulé")), "score_residuel": _texte(pr.get("Résiduel")),
                            "score_inherent": _texte(pr.get("Inhérent")), "niveau": _texte(pr.get("Niveau")), "exigence_id": _texte(pr.get("ID")).replace("RSK", "REQ")})

        return {**local, "exigences": exigences, "textes": textes or local.get("textes", []), "signaux": signaux or local.get("signaux", []),
                "lots": lots or local.get("lots", []), "risques": risques or local.get("risques", [])}

    def enregistrer_decision(self, exigence_id: str, statut: str, obligation: str, commentaire: str, valide_par: str) -> None:
        if exigence_id not in self._pages:
            self.charger()
        proprietes = {
            "Statut validation": {"select": {"name": statut}},
            "Obligation": {"rich_text": [{"text": {"content": obligation[:1900]}}]},
            "Commentaire": {"rich_text": [{"text": {"content": commentaire[:1900]}}] if commentaire else []},
            "Validé par": {"rich_text": [{"text": {"content": valide_par[:200]}}] if valide_par else []},
            "Date validation": {"date": {"start": date.today().isoformat()}},
        }
        r = requests.patch(f"{API}/pages/{self._pages[exigence_id]}", headers=self.entetes, json={"properties": proprietes}, timeout=30)
        r.raise_for_status()
        BackendLocal().enregistrer_decision(exigence_id, statut, obligation, commentaire, valide_par)  # copie locale

    def enregistrer_decision_gouvernance(self, decision: str) -> None:
        BackendLocal().enregistrer_decision_gouvernance(decision)


def backend():
    return BackendNotion() if MODE == "notion" else BackendLocal()


def charger_matrices() -> dict[str, list[dict]]:
    return json.loads(MATRICES.read_text(encoding="utf-8")) if MATRICES.exists() else {}


def recalculer_matrices() -> tuple[bool, str]:
    """Lance `npm run matrices` (Node doit être installé) pour régénérer M1–M5 et le plan."""
    import shutil
    if shutil.which("npm") is None:
        return False, "Recalcul indisponible sur la version en ligne (Node.js absent) : il se fait en local ou chaque jour par GitHub Actions."
    try:
        res = subprocess.run("npm run matrices", cwd=RACINE / "agent", shell=True, capture_output=True, text=True, timeout=300)
        return res.returncode == 0, (res.stdout + res.stderr)[-1500:]
    except Exception as err:  # noqa: BLE001
        return False, str(err)
