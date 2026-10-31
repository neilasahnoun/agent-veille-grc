"""
Cockpit de l'agent de veille GRC — interface de consultation et de validation humaine.

    streamlit run cockpit/app.py

Un assistant et quatre vues (Module 5 du TP) :
  0. Assistant              — déposer un document à analyser + chatbot qui répond en direct
  1. Fil de veille          — ce que l'agent a détecté
  2. Textes et matrices     — applicabilité + matrices M1 à M5
  3. Validation humaine     — valider, corriger ou rejeter chaque exigence (enregistré dans Notion ou en local)
  4. Pilotage et échéances  — indicateurs, lots d'action, délais, décision sur le cadre de gouvernance
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

import pandas as pd
import streamlit as st

sys.path.insert(0, str(Path(__file__).resolve().parent))
from backend import MODE, PLAN, backend, charger_matrices, recalculer_matrices  # noqa: E402
from export_xlsx import TITRES, classeur_matrices  # noqa: E402
import assistant  # noqa: E402

st.set_page_config(page_title="Agent de veille GRC — NIS 2", page_icon="🛡️", layout="wide")

STATUTS = ["À valider", "Validée", "Corrigée", "Rejetée"]
PASTILLES = {"À valider": "🟡", "Validée": "🟢", "Corrigée": "🔵", "Rejetée": "⚪",
             "Critique": "🔴", "Élevé": "🟠", "Modéré": "🟡", "Faible": "🟢",
             "Couverte": "🟢", "Partielle": "🟡", "Non couverte": "🔴", "P1": "🔴", "P2": "🟠", "P3": "🟢"}


def pastille(v: str) -> str:
    return f"{PASTILLES.get(v, '')} {v}".strip()


# ---------------------------------------------------------------------------
# Dépôt d'un document à analyser (utilisé dans l'onglet Assistant)
# ---------------------------------------------------------------------------
def bloc_depot() -> None:
    st.markdown("#### 📄 Donner un document à l'agent")
    st.caption("Loi, directive, règlement, recommandation CNIL/ANSSI… au format PDF, HTML ou texte. "
               "L'agent le lit, extrait les obligations, les vérifie et met à jour les matrices.")
    fichier = st.file_uploader("Document", type=["pdf", "html", "htm", "txt", "md"], label_visibility="collapsed")
    if fichier is None:
        return
    c1, c2 = st.columns(2)
    identifiant = c1.text_input("Identifiant du texte", value=assistant.identifiant_depuis_nom(fichier.name),
                                help="Sert à nommer les exigences (REQ-...). Réutiliser le même identifiant met à jour le texte au lieu d'en créer un nouveau.")
    titre = c2.text_input("Titre (facultatif)", value="", help="Laisser vide : l'agent retrouve le titre officiel tout seul.")
    if st.button("🔍 Analyser ce document", type="primary"):
        try:
            chemin = assistant.enregistrer_document(fichier.name, fichier.getvalue())
        except Exception as err:  # noqa: BLE001
            st.error(str(err))
            return
        journal: list[str] = []
        with st.status("L'agent lit et analyse le document…", expanded=True) as statut:
            zone = st.empty()
            try:
                for ligne in assistant.analyser_document(chemin, identifiant.strip() or "TXT-DOC", titre):
                    journal.append(ligne)
                    zone.code("\n".join(journal[-25:]))
                statut.update(label="Analyse terminée ✅ — les onglets sont à jour", state="complete")
                st.session_state["analyse_ok"] = True
            except Exception as err:  # noqa: BLE001
                statut.update(label="L'analyse s'est arrêtée", state="error")
                st.error(str(err))
        if st.session_state.pop("analyse_ok", False):
            st.button("Afficher les résultats", on_click=lambda: None)


# ---------------------------------------------------------------------------
# Chargement
# ---------------------------------------------------------------------------
try:
    source = backend()
    store = source.charger()
except Exception as err:  # noqa: BLE001
    st.error(f"Impossible de charger les données : {err}")
    st.stop()

if not store or not store.get("exigences"):
    st.title("🛡️ Agent de veille GRC")
    st.info("Aucune analyse pour l'instant : déposez un texte ci-dessous, ou lancez `cd agent && npm run demo` (démo hors ligne).")
    bloc_depot()
    st.stop()

exigences = store["exigences"]
matrices = charger_matrices()

# ---------------------------------------------------------------------------
# En-tête
# ---------------------------------------------------------------------------
st.title("🛡️ Agent de veille GRC et législative")
st.caption(f"Organisation : **{store.get('organisation', '—')}** · Données : **{source.nom}** · Dernière analyse : {str(store.get('genere_le', ''))[:16].replace('T', ' ')}")

EN_LIGNE = os.environ.get("COCKPIT_EN_LIGNE", "").lower() == "true"

with st.sidebar:
    if EN_LIGNE:
        st.info("🌐 Version en ligne de démonstration : les validations faites ici ne sont pas enregistrées dans Notion "
                "et s'effacent au redémarrage. Le dépôt d'un document à analyser nécessite l'installation locale.")
    st.header("Actions")
    if st.button("🔄 Recharger les données"):
        st.rerun()
    if st.button("🧮 Recalculer les matrices", help="Lance `npm run matrices` (prend en compte les validations)"):
        with st.spinner("Recalcul en cours…"):
            ok, journal = recalculer_matrices()
        (st.success if ok else st.error)("Matrices recalculées" if ok else "Échec du recalcul")
        with st.expander("Journal"):
            st.code(journal)
    st.divider()
    st.markdown("**Légende**\n\n🟡 À valider · 🟢 Validée · 🔵 Corrigée · ⚪ Rejetée")
    st.caption("L'IA propose, l'humain décide : aucune exigence n'est considérée comme acquise sans validation.")

vue_assistant, vue_veille, vue_matrices, vue_validation, vue_pilotage = st.tabs(
    ["💬 Assistant", "📡 Fil de veille", "📑 Textes et matrices", "✅ Validation humaine", "📊 Pilotage et échéances"]
)

# ---------------------------------------------------------------------------
# 0. Assistant : chatbot + dépôt de document
# ---------------------------------------------------------------------------
with vue_assistant:
    st.markdown("#### 💬 Poser une question à l'agent")
    st.caption("L'agent répond à partir des exigences extraites du texte officiel, en citant les articles et les identifiants. "
               "Exemples : « Quelles sont nos obligations de notification et leurs délais ? » · « Qu'est-ce qui est le plus urgent ? » · « Que risque la direction ? »")
    if "conversation" not in st.session_state:
        st.session_state.conversation = []
    suggestions = ["Quelles sont nos obligations de notification et leurs délais ?", "Qu'est-ce qui est le plus urgent pour Hydréa ?",
                   "Que risquent les dirigeants ?", "Quelles exigences l'IA n'a pas su vérifier ?"]
    cols = st.columns(len(suggestions))
    question_rapide = None
    for col, texte_suggestion in zip(cols, suggestions):
        if col.button(texte_suggestion, use_container_width=True):
            question_rapide = texte_suggestion
    zone_chat = st.container(height=480)
    with zone_chat:
        for message in st.session_state.conversation:
            with st.chat_message(message["role"], avatar="🧑" if message["role"] == "user" else "🛡️"):
                st.markdown(message["content"])
    question = st.chat_input("Votre question sur l'analyse NIS 2…") or question_rapide
    if question:
        with zone_chat:
            with st.chat_message("user", avatar="🧑"):
                st.markdown(question)
            with st.chat_message("assistant", avatar="🛡️"):
                try:
                    reponse = st.write_stream(assistant.repondre(question, st.session_state.conversation, store, matrices))
                except assistant.ErreurIA as err:
                    reponse = f"⚠️ {err}"
                    st.warning(reponse)
                except Exception as err:  # noqa: BLE001
                    reponse = f"⚠️ Erreur inattendue : {err}"
                    st.error(reponse)
        st.session_state.conversation += [{"role": "user", "content": question}, {"role": "assistant", "content": str(reponse)}]
    if st.session_state.conversation and st.button("🗑️ Effacer la conversation"):
        st.session_state.conversation = []
        st.rerun()
    st.divider()
    bloc_depot()

# ---------------------------------------------------------------------------
# 1. Fil de veille
# ---------------------------------------------------------------------------
with vue_veille:
    textes = store.get("textes", [])
    signaux = store.get("signaux", [])
    c1, c2, c3 = st.columns(3)
    c1.metric("Textes analysés", len(textes))
    c2.metric("Signaux de veille", len(signaux))
    c3.metric("Exigences extraites", len(exigences))

    st.subheader("Textes analysés")
    for t in textes:
        with st.container(border=True):
            st.markdown(f"**{t.get('titre')}**  \n{t.get('source')} · {t.get('reference', '')} · version {t.get('version', 1)}")
            etat = "✅ Applicable" if t.get("applicable") else "⛔ Non applicable"
            st.markdown(f"{etat} — {t.get('qualification', '')} (confiance {t.get('confiance', '—')})")
            if t.get("url"):
                st.link_button("Texte officiel", t["url"])

    st.subheader("Signaux détectés")
    if signaux:
        df = pd.DataFrame(signaux)
        colonnes = [c for c in ["detecte_le", "source", "titre", "statut", "url"] if c in df.columns]
        df = df[colonnes].rename(columns={"detecte_le": "Détecté le", "source": "Source", "titre": "Titre", "statut": "Statut", "url": "Lien"})
        if "Détecté le" in df:
            df["Détecté le"] = df["Détecté le"].astype(str).str[:10]
        st.dataframe(df, hide_index=True, column_config={"Lien": st.column_config.LinkColumn("Lien")})
    else:
        st.info("Aucun signal : lancez `npm run veille` pour interroger les sources configurées.")

# ---------------------------------------------------------------------------
# 2. Textes et matrices
# ---------------------------------------------------------------------------
with vue_matrices:
    for t in store.get("textes", []):
        with st.expander(f"Applicabilité — {t.get('titre')}", expanded=False):
            st.write(t.get("raisonnement", ""))
    if not matrices:
        st.info("Matrices absentes : lancez `npm run matrices`.")
    else:
        st.download_button("⬇️ Télécharger les 5 matrices (Excel)", classeur_matrices(matrices), file_name="matrices_grc.xlsx",
                           mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        onglets = st.tabs([TITRES[k][0] for k in TITRES])
        for onglet, cle in zip(onglets, TITRES):
            with onglet:
                st.caption(TITRES[cle][1])
                df = pd.DataFrame(matrices.get(cle, []))
                for col in ("Niveau", "Statut", "Statut validation"):
                    if col in df:
                        df[col] = df[col].map(pastille)
                config = {"URL officielle": st.column_config.LinkColumn("URL officielle")} if "URL officielle" in df else None
                st.dataframe(df, hide_index=True, column_config=config)
        st.caption("Toutes les matrices partagent la colonne « ID exigence » : une même exigence se suit de M1 à M5.")

# ---------------------------------------------------------------------------
# 3. Validation humaine
# ---------------------------------------------------------------------------
with vue_validation:
    a_valider = sum(e["statut_validation"] == "À valider" for e in exigences)
    st.markdown(f"**{a_valider}** exigence(s) en attente de validation sur {len(exigences)}.")

    f1, f2, f3 = st.columns(3)
    filtre_statut = f1.multiselect("Statut", STATUTS, default=["À valider"])
    seulement_douteuses = f2.toggle("Seulement les non vérifiées ou confiance < 0,8", value=False)
    seulement_applicables = f3.toggle("Seulement les applicables", value=False)

    liste = [e for e in exigences
             if (not filtre_statut or e["statut_validation"] in filtre_statut)
             and (not seulement_douteuses or not e.get("verifiee") or float(e.get("confiance_finale") or 0) < 0.8)
             and (not seulement_applicables or e.get("applicable"))]
    if not liste:
        st.success("Rien à afficher avec ces filtres.")
    else:
        libelles = {e["id"]: f"{PASTILLES.get(e['statut_validation'], '')} {e['id']} — {e['intitule']}" for e in liste}
        choix = st.selectbox("Exigence", list(libelles), format_func=libelles.get)
        e = next(x for x in liste if x["id"] == choix)

        gauche, droite = st.columns([3, 2])
        with gauche:
            st.markdown(f"### {e['intitule']}")
            st.markdown(f"**{e['article']}** · {e['destinataire']} · type *{e['type']}*")
            st.markdown("**Citation du texte officiel**")
            st.info(e["citation"])
            st.markdown(f"**Échéance :** {e.get('echeance') or '—'}  \n**Sanction :** {e.get('sanction') or '—'}")
            st.markdown(f"**Applicable à l'organisation :** {'oui' if e.get('applicable') else 'non'} — {e.get('justification_applicabilite', '')}")
            if e.get("url_source"):
                st.link_button("Vérifier dans le texte officiel", e["url_source"])
        with droite:
            conf = float(e.get("confiance_finale") or 0)
            st.metric("Confiance", f"{conf:.0%}")
            st.progress(min(max(conf, 0.0), 1.0))
            (st.success if e.get("verifiee") else st.error)(("✔ Vérifiée : " if e.get("verifiee") else "✘ À contrôler : ") + e.get("verification_detail", ""))
            if e.get("commentaire_validation"):
                st.caption(f"Dernier commentaire : {e['commentaire_validation']}")

        with st.form(f"decision-{e['id']}"):
            st.markdown("#### Décision")
            statut = st.radio("Statut", STATUTS, index=STATUTS.index(e["statut_validation"]), horizontal=True)
            obligation = st.text_area("Obligation (modifiable en cas de correction)", value=e["obligation"], height=110)
            commentaire = st.text_area("Commentaire / justification", value=e.get("commentaire_validation", ""), height=80)
            valide_par = st.text_input("Validé par", value=e.get("valide_par") or "")
            if st.form_submit_button("💾 Enregistrer la décision", type="primary"):
                if statut == "Corrigée" and obligation.strip() == e["obligation"].strip():
                    st.warning("Statut « Corrigée » : modifiez le texte de l'obligation avant d'enregistrer.")
                elif statut == "Rejetée" and not commentaire.strip():
                    st.warning("Un rejet doit être justifié dans le commentaire.")
                else:
                    try:
                        source.enregistrer_decision(e["id"], statut, obligation.strip(), commentaire.strip(), valide_par.strip())
                        st.toast(f"{e['id']} : {statut}", icon="✅")
                        st.rerun()
                    except Exception as err:  # noqa: BLE001
                        st.error(f"Échec de l'enregistrement : {err}")

# ---------------------------------------------------------------------------
# 4. Pilotage et échéances
# ---------------------------------------------------------------------------
with vue_pilotage:
    applicables = [e for e in exigences if e.get("applicable") and e["statut_validation"] != "Rejetée"]
    traitees = sum(e["statut_validation"] in ("Validée", "Corrigée") for e in exigences)
    risques = store.get("risques", [])
    critiques = sum(r.get("niveau") == "Critique" for r in risques)
    couverture = pd.DataFrame(matrices.get("M3_couverture", []))

    k1, k2, k3, k4 = st.columns(4)
    k1.metric("Exigences applicables", len(applicables))
    k2.metric("Validées ou corrigées", f"{traitees}/{len(exigences)}", f"{traitees / max(len(exigences), 1):.0%}")
    k3.metric("Risques critiques", critiques)
    k4.metric("Lots d'action", len(store.get("lots", [])))

    g1, g2 = st.columns(2)
    with g1:
        st.markdown("**Couverture par les contrôles existants**")
        if not couverture.empty:
            ordre = ["Couverte", "Partielle", "Non couverte"]
            comptes = couverture["Statut"].value_counts().reindex(ordre, fill_value=0)
            st.bar_chart(pd.DataFrame({"Statut": [f"{i + 1}. {o}" for i, o in enumerate(ordre)], "Exigences": comptes.values}), x="Statut", y="Exigences")
    with g2:
        st.markdown("**Risques résiduels par niveau**")
        if risques:
            ordre = ["Faible", "Modéré", "Élevé", "Critique"]
            niveaux = pd.Series([r.get("niveau") for r in risques]).value_counts().reindex(ordre, fill_value=0)
            st.bar_chart(pd.DataFrame({"Niveau": [f"{i + 1}. {o}" for i, o in enumerate(ordre)], "Risques": niveaux.values}), x="Niveau", y="Risques")

    st.subheader("Lots d'action et échéances")
    lots = pd.DataFrame(store.get("lots", []))
    if not lots.empty:
        lots = lots.sort_values(["echeance", "priorite"])
        vue = lots[["id", "priorite", "intitule", "responsable", "echeance", "statut", "description"]].rename(columns={
            "id": "Lot", "priorite": "Priorité", "intitule": "Intitulé", "responsable": "Responsable", "echeance": "Échéance", "statut": "Statut", "description": "Exigences"})
        vue["Priorité"] = vue["Priorité"].map(pastille)
        st.dataframe(vue, hide_index=True)

    st.subheader("Délais réglementaires à intégrer aux procédures")
    delais = [e for e in applicables if e.get("echeance") and any(m in e["echeance"] for m in ("heure", "mois", "jour"))]
    if delais:
        st.dataframe(pd.DataFrame([{"ID": e["id"], "Exigence": e["intitule"], "Délai": e["echeance"], "Article": e["article"]} for e in delais]), hide_index=True)

    st.subheader("Cadre de gouvernance")
    gouv = store.get("gouvernance")
    if gouv:
        c1, c2 = st.columns([2, 1])
        with c1:
            st.markdown(f"Recommandation de l'agent : **{gouv['cadre_recommande']}**")
            st.write(gouv.get("justification", ""))
        with c2:
            scores = gouv.get("scores", {})
            st.metric("Part TOGAF", f"{scores.get('TOGAF', 0):.0%}")
            st.metric("Part ITIL", f"{scores.get('ITIL', 0):.0%}")
        with st.form("decision-gouvernance"):
            st.markdown("**Décision humaine** (le choix final appartient à la direction)")
            options = ["TOGAF", "ITIL", "Hybride TOGAF + ITIL"]
            actuel = gouv.get("decision_humaine") or ""
            cadre = st.radio("Cadre retenu", options, index=next((i for i, o in enumerate(options) if actuel.startswith(o)), 2), horizontal=True)
            motif = st.text_input("Motif / instance de décision", value=actuel.split(" — ", 1)[1] if " — " in actuel else "")
            if st.form_submit_button("Enregistrer la décision"):
                source.enregistrer_decision_gouvernance(f"{cadre} — {motif}" if motif else cadre)
                st.toast("Décision enregistrée", icon="✅")
                st.rerun()
        if gouv.get("decision_humaine"):
            st.success(f"Décision enregistrée : {gouv['decision_humaine']}")
        if PLAN.exists():
            with st.expander("Plan de gouvernance complet"):
                st.markdown(PLAN.read_text(encoding="utf-8"))
