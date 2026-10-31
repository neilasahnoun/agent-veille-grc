# Guide de démonstration et de test

Ce guide indique comment vérifier le fonctionnement de l'agent, du plus simple (sans rien installer) au plus complet (avec ses propres clés API).

## Niveau 1 — Sans rien installer

| À consulter | Ce qu'on y voit |
|---|---|
| [Base Notion en ligne](https://petite-resolution-107.notion.site/Veille-GRC-409fe7ba810c80709939cbf1d7bc0aa8) | Les 6 bases reliées : textes et signaux de veille, exigences avec leur statut de validation, contrôles, risques, jurisprudence, lots d'action |
| `outputs/matrices_grc.xlsx` | Les 5 matrices GRC (M1 à M5) avec les mêmes identifiants d'exigence |
| `outputs/plan-gouvernance.md` et `docs/plan-gouvernance.md` | La recommandation TOGAF / ITIL et la décision humaine |
| Onglet **Actions** du dépôt GitHub | L'exécution quotidienne de la veille (`Veille GRC quotidienne`) et ses journaux |
| `data/store.json` | L'ensemble des résultats de l'agent (exigences, vérifications, décisions) |

## Niveau 2 — Cockpit en local, sans clé API

Après l'installation décrite dans le README :

```bash
py -m streamlit run cockpit/app.py      # macOS / Linux : streamlit run cockpit/app.py
```

Sans fichier `.env`, le cockpit affiche les **résultats réels** enregistrés dans le dépôt et le chatbot fonctionne en mode démo (recherche des exigences pertinentes, sans IA).

| Onglet | À vérifier |
|---|---|
| 💬 Assistant | Poser « Quelles sont nos obligations de notification et leurs délais ? » : l'assistant cite REQ-NIS2-023-05 (24 h), 023-06 (72 h) et 023-08 (1 mois) |
| 📡 Fil de veille | Le texte officiel analysé (CELEX 32022L2555, applicabilité « entité essentielle ») et les signaux issus de Légifrance, du Sénat, de l'Assemblée nationale et de la CNIL, avec leurs liens officiels |
| 📑 Textes et matrices | Le raisonnement d'applicabilité, les matrices M1 à M5, l'export Excel |
| ✅ Validation humaine | Changer le filtre « Statut » pour afficher les exigences **Validées**, **Corrigée** et **Rejetées** : par exemple REQ-NIS2-033-01 rejetée (l'article 33 ne vise que les entités importantes) et REQ-NIS2-023-08 corrigée (citation de l'IA introuvable dans le texte) |
| 📊 Pilotage et échéances | Indicateurs, couverture, risques résiduels, lots d'action datés, délais réglementaires, décision « Hybride TOGAF + ITIL » |

Pour tester l'agent lui-même sans clé, sur une copie du dépôt :

```bash
cd agent
npm install
npm run demo        # analyse un extrait de NIS 2 avec des réponses enregistrées (23 exigences)
```

> ⚠️ `npm run demo` remplace les résultats réels de `data/store.json`. Pour les retrouver : `git checkout data/store.json outputs/`.

## Niveau 3 — Analyse réelle avec ses propres clés (gratuites)

1. Copier `.env.example` en `.env` et renseigner au minimum `LLM_PROVIDER=google` et une clé Gemini (voir README, § 3).
2. Analyser un texte officiel :
   ```bash
   cd agent
   npm run analyse -- --celex 32022L2555 --id TXT-NIS2
   ```
3. Avec des identifiants PISTE : `npm run veille` (6 sources) et `npm run jurisprudence` (Judilibre, matrice M5).
4. Avec un jeton Notion : `npm run notion:setup`, puis `STORAGE=notion` : les décisions prises dans le cockpit sont enregistrées dans Notion.
5. Dans le cockpit, onglet 💬 Assistant : déposer un document (PDF, HTML ou texte) et cliquer sur « Analyser ce document » ; le chatbot rédige alors ses réponses avec le modèle d'IA.

## Points de contrôle attendus

| Exigence du sujet | Où la constater |
|---|---|
| Texte officiel chargé et obligations extraites avec leurs articles | Matrice M1, onglet Validation humaine |
| Obligations vérifiables dans les sources officielles | Colonne « Vérifiée » de M1 et cadre vert ou rouge dans l'onglet Validation |
| Valider, corriger, rejeter, avec conservation dans Notion | Base Notion « Exigences », colonne « Statut validation » |
| Plusieurs sources, détection des modifications, exécution planifiée | Onglet Fil de veille, `data/etat-veille.json`, onglet Actions de GitHub |
| Jurisprudence associée aux exigences | Matrice M5, base Notion « Jurisprudence » |
| Choix final du cadre par un humain | Onglet Pilotage, `docs/plan-gouvernance.md` § 7 |
