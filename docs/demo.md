# Déroulé de la démonstration (environ 10 minutes)

## Avant la présentation
Les résultats réels (texte officiel analysé par Gemini) sont déjà dans le dépôt. Il suffit de lancer le cockpit :
```bash
py -m streamlit run cockpit/app.py
```
`npm run demo` régénère une démo hors ligne (23 exigences), mais **remplace** les résultats réels : à éviter avant la présentation.
Ouvrir aussi Notion (les 6 bases) et le dépôt GitHub dans deux onglets.

## Déroulé

**1. Le problème (1 min)**
NIS 2 impose une vingtaine d'obligations à une entité essentielle. La veille manuelle est lente et sans traçabilité. Notre agent automatise la veille et l'analyse, et garde l'humain pour la validation.

**2. Le contexte (1 min)**
Hydréa, distributeur d'eau fictif de 600 salariés, avec un SCADA. Montrer `data/organisation/hydrea.json` : ses processus, systèmes et contrôles existants.

**3. L'agent (2 min)**
Montrer la capture ou relancer l'analyse et commenter :
- 46 articles officiels, analysés en 12 requêtes (articles regroupés par lots pour l'offre gratuite) ;
- applicabilité : entité essentielle ;
- 133 exigences, 122 citations vérifiées dans le texte, 51 applicables.

Ouvrir `agent/src/schemas.ts` : *« le modèle doit remplir ce schéma Zod, il ne répond pas en texte libre »*.

**4. Le fil de veille (1 min)**
Onglet 📡 : le texte analysé avec son lien officiel et sa version, puis les signaux. Expliquer l'empreinte SHA-256 : un texte modifié est détecté et ses exigences repassent « À valider ».

**5. Les matrices (2 min)**
Onglet 📑 :
- M1 : l'article, la citation et l'URL officielle de chaque exigence ;
- M3 : 5 exigences couvertes, 40 partielles, 6 non couvertes ; la notification n'a aucun contrôle ;
- M4 : 17 risques critiques ;
- le même identifiant REQ-… suit l'exigence de M1 à M5 ;
- export Excel.

**6. La validation humaine (2 min), le moment fort**
Onglet ✅ :
- choisir **REQ-NIS2-033-01** : l'IA applique à Hydréa l'article 33, réservé aux entités *importantes*, alors qu'elle l'a elle-même qualifiée d'entité *essentielle*. On la **rejette** avec le commentaire « Hydréa est une entité essentielle : art. 32 et non art. 33 » ;
- activer le filtre « non vérifiées » : **REQ-NIS2-023-08** (rapport final) a une citation introuvable, on vérifie dans le texte officiel puis on la **corrige** ;
- **valider** REQ-NIS2-023-05 (alerte précoce 24 h) ;
- montrer dans Notion que les statuts ont changé.

Message clé : *l'IA va vite, mais elle se trompe ; l'humain garde la décision.*

**7. Le pilotage et la gouvernance (1 min)**
Onglet 📊 :
- les lots P1 à 3 mois et les délais 24 h / 72 h / 1 mois ;
- la recommandation hybride TOGAF + ITIL ;
- la saisie de la **décision humaine**.

**8. Les limites et la suite (30 s)**
Voir `docs/resultats-et-limites.md` : les erreurs de l'IA repérées, la transposition française, une jurisprudence encore rare, les quotas des offres gratuites.

## Répartition possible de l'oral
| Partie | Personne |
|---|---|
| Problème et contexte | … |
| Agent et IA | … |
| Matrices et GRC | … |
| Validation et Notion | … |
| Gouvernance et limites | … |
