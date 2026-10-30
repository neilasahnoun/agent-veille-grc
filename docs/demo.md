# Déroulé de la démonstration (environ 10 minutes)

## Avant la présentation
```bash
cd agent && npm run demo && cd ..
streamlit run cockpit/app.py
```
Ouvrir aussi Notion (les 6 bases) et le dépôt GitHub dans deux onglets.

## Déroulé

**1. Le problème (1 min)**
NIS 2 impose une vingtaine d'obligations à une entité essentielle. La veille manuelle est lente et sans traçabilité. Notre agent automatise la veille et l'analyse, et garde l'humain pour la validation.

**2. Le contexte (1 min)**
Hydréa, distributeur d'eau fictif de 600 salariés, avec un SCADA. Montrer `data/organisation/hydrea.json` : ses processus, systèmes et contrôles existants.

**3. L'agent en direct (2 min)**
Lancer `npm run demo` dans le terminal et commenter :
- 6 articles détectés ;
- applicabilité : entité essentielle ;
- 23 exigences, dont 22 vérifiées dans le texte.

Ouvrir `agent/src/schemas.ts` : *« le modèle doit remplir ce schéma Zod, il ne répond pas en texte libre »*.

**4. Le fil de veille (1 min)**
Onglet 📡 : le texte analysé avec son lien officiel et sa version, puis les signaux. Expliquer l'empreinte SHA-256 : un texte modifié est détecté et ses exigences repassent « À valider ».

**5. Les matrices (2 min)**
Onglet 📑 :
- M1 : l'article, la citation et l'URL officielle de chaque exigence ;
- M3 : la notification n'est pas couverte (aucun contrôle) ;
- M4 : 9 risques critiques ;
- le même identifiant REQ-… suit l'exigence de M1 à M5 ;
- export Excel.

**6. La validation humaine (2 min), le moment fort**
Onglet ✅ :
- activer le filtre « non vérifiées ». **REQ-NIS2-023-02** apparaît : sa citation n'existe pas dans le texte, l'IA a reformulé. L'agent l'a repéré. On la **corrige**, puis on enregistre.
- **valider** REQ-NIS2-023-03 (alerte 24 h) ;
- montrer dans Notion que le statut a changé.

**7. Le pilotage et la gouvernance (1 min)**
Onglet 📊 :
- les lots P1 à 3 mois et les délais 24 h / 72 h / 1 mois ;
- la recommandation hybride TOGAF + ITIL ;
- la saisie de la **décision humaine**.

**8. Les limites et la suite (30 s)**
Voir `docs/resultats-et-limites.md` : l'extrait de démo, la transposition française, une jurisprudence encore rare, et un modèle qui peut se tromper, d'où la validation.

## Répartition possible de l'oral
| Partie | Personne |
|---|---|
| Problème et contexte | … |
| Agent et IA | … |
| Matrices et GRC | … |
| Validation et Notion | … |
| Gouvernance et limites | … |
