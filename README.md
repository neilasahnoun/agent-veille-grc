# 🛡️ Agent de veille continue GRC et législative — NIS 2

Atelier EPITA (MSc1) : un agent IA qui **surveille** les textes juridiques, **extrait** les obligations applicables à une organisation, **vérifie** chaque obligation dans le texte officiel, produit **5 matrices GRC** et un **plan de gouvernance TOGAF / ITIL**, avec une **validation humaine** dans un cockpit Streamlit et un stockage dans **Notion**.

- **Texte analysé :** directive (UE) 2022/2555, dite **NIS 2**
- **Organisation (fictive) :** **Hydréa**, société d'économie mixte de distribution d'eau potable de 600 salariés, qualifiée d'*entité essentielle*
- **Coût :** 0 €. Gemini ou Mistral en offre gratuite, Notion gratuit, et un mode démo qui fonctionne sans aucune clé.

```
 Sources officielles          Agent (Node.js / TypeScript)                      Restitution
 ─────────────────           ─────────────────────────────                     ───────────
 EUR-Lex (NIS 2)    ─┐       1. collecte + détection des modifications         ┌─ Notion : 6 bases reliées
 Légifrance (PISTE) ─┼──►    2. découpage en articles                    ──►   ├─ Cockpit Streamlit (4 vues)
 Judilibre (PISTE)  ─┤       3. IA (AI SDK + Zod) : applicabilité, obligations  ├─ Matrices M1–M5 (CSV, Excel)
 CNIL, CERT-FR (RSS)─┘       4. vérification des citations dans le texte        └─ Plan de gouvernance
                             5. couverture, risques, lots, TOGAF/ITIL
                                        ▲                                     │
                                        └──── décisions humaines (worker) ◄───┘
```

---

## 1. Installation

**Prérequis :** [Node.js 20+](https://nodejs.org) et [Python 3.11+](https://www.python.org/downloads/).

```bash
git clone https://github.com/<compte>/agent-veille-grc.git
cd agent-veille-grc

# Configuration : copier le modèle de fichier .env
cp .env.example .env            # Windows : copy .env.example .env

# Agent (TypeScript)
cd agent
npm install
cd ..

# Cockpit (Python)
pip install -r cockpit/requirements.txt
```

## 2. Démo en 2 minutes (aucune clé nécessaire)

```bash
cd agent
npm run demo                     # analyse NIS 2 pour Hydréa avec des réponses enregistrées
cd ..
streamlit run cockpit/app.py     # ouvre le cockpit dans le navigateur
```

Ce qu'on obtient :

- 23 exigences extraites de NIS 2 (articles 20, 21, 23 et 32), dont 22 applicables à Hydréa.
- Une exigence marquée « à contrôler » (REQ-NIS2-023-02) : sa citation ne figure pas dans le texte. Cela montre que la vérification automatique repère les hallucinations.
- Les matrices M1 à M5 dans `outputs/matrices/`, le classeur Excel `outputs/matrices_grc.xlsx` et le plan de gouvernance `outputs/plan-gouvernance.md`.

> Le mode démo s'appuie sur `data/sources/nis2-extrait.md`, un extrait de travail de la directive. Pour analyser le **texte officiel**, suivre l'étape 3.

## 3. Analyse réelle avec l'IA (gratuit)

1. Créer une clé Gemini gratuite sur **https://aistudio.google.com/apikey**. Il suffit d'un compte Google, sans carte bancaire.
2. Dans `.env` :
   ```
   LLM_PROVIDER=google
   GOOGLE_GENERATIVE_AI_API_KEY=collez-votre-clé-ici
   ```
3. Lancer l'analyse du texte officiel, téléchargé depuis EUR-Lex :
   ```bash
   cd agent
   npm run analyse -- --celex 32022L2555 --id TXT-NIS2
   ```

Les offres gratuites limitent le nombre de requêtes par minute. L'agent fait une pause entre deux appels (`LLM_DELAY_MS`) et réessaie automatiquement en cas de limite atteinte.

Mistral marche aussi (offre gratuite « Experiment » sur https://console.mistral.ai, avec vérification par numéro de téléphone) : `LLM_PROVIDER=mistral` et `MISTRAL_API_KEY=...`.

Pour analyser un texte que vous avez téléchargé vous-même (.md, .txt ou .html) :
```bash
npm run analyse -- --fichier data/sources/mon-texte.html
```

## 4. Notion (6 bases reliées)

1. Sur **https://www.notion.so/profile/integrations**, créer une intégration interne et copier son *Internal Integration Secret* dans `NOTION_TOKEN`.
2. Dans Notion, créer une page vide (par exemple « Veille GRC »). Cliquer sur `•••` puis **Connexions**, et ajouter l'intégration.
3. Copier le lien de cette page dans `NOTION_PARENT_PAGE_ID`.
4. Créer les bases :
   ```bash
   cd agent
   npm run notion:setup     # crée Textes, Exigences, Contrôles, Risques, Jurisprudence, Lots d'action
   ```
   Les identifiants des bases sont écrits automatiquement dans `.env`.
5. Mettre `STORAGE=notion` dans `.env`, puis `npm run demo` ou `npm run analyse ...` : les résultats sont envoyés dans Notion.
6. Le cockpit lit et écrit alors directement dans Notion.

**Serveur MCP Notion :** le fichier `.mcp.json` configure le serveur MCP officiel de Notion (`@notionhq/notion-mcp-server`). Un assistant compatible MCP (Claude Desktop, Cursor, VS Code) peut alors interroger les bases en langage naturel, par exemple « liste les exigences critiques non validées ». Voir `docs/notion-mcp.md`.

## 5. Veille continue

```bash
cd agent
npm run veille      # interroge toutes les sources de agent/sources.json
npm run worker      # tâche de fond : reporte les validations humaines et recalcule les matrices
npm run matrices    # recalcul ponctuel après des validations
```

- Les sources se configurent dans `agent/sources.json` : EUR-Lex, Légifrance, flux RSS CNIL et CERT-FR, Assemblée nationale et Sénat.
- **Détection des modifications :** l'agent calcule l'empreinte SHA-256 de chaque document. Un texte modifié reçoit un nouveau numéro de version, et ses exigences repassent « À valider ».
- **Déduplication :** un même contenu publié par deux sources n'est traité qu'une fois.
- **URL officielles :** chaque exigence garde le lien vers sa source (matrice M1).
- **Exécution planifiée :** `.github/workflows/veille.yml` lance la veille chaque jour sur GitHub Actions, une fois les clés ajoutées dans *Settings → Secrets*.
- **Légifrance et Judilibre :** il faut des identifiants gratuits sur https://piste.gouv.fr (`PISTE_CLIENT_ID` et `PISTE_CLIENT_SECRET`). Sans eux, ces sources sont ignorées et la matrice M5 contient les requêtes préparées.

## 6. Cockpit Streamlit

| Vue | Contenu |
|---|---|
| 📡 Fil de veille | Textes analysés (version, applicabilité, lien officiel) et signaux détectés |
| 📑 Textes et matrices | Raisonnement d'applicabilité, matrices M1 à M5, export Excel |
| ✅ Validation humaine | Citation officielle, contrôle automatique, confiance, puis **Valider / Corriger / Rejeter** avec commentaire. La décision est enregistrée dans Notion ou en local |
| 📊 Pilotage et échéances | Indicateurs, couverture, risques, lots d'action datés, délais 24 h / 72 h / 1 mois, **décision humaine sur le cadre TOGAF / ITIL** |

## 7. Livrables

| Livrable demandé | Où le trouver |
|---|---|
| Agent de veille | `agent/src/` (voir `docs/comment-ca-marche.md`) |
| Base Notion et intégration MCP / worker | `agent/src/storage/`, `agent/src/notion-setup.ts`, `agent/src/worker.ts`, `.mcp.json` |
| Cockpit Streamlit | `cockpit/app.py` |
| 5 matrices GRC | `outputs/matrices/*.csv`, `outputs/matrices_grc.xlsx` |
| Plan de gouvernance | `docs/plan-gouvernance.md` (analyse) et `outputs/plan-gouvernance.md` (généré) |
| Résultats et limites | `docs/resultats-et-limites.md` |
| Démonstration | `docs/demo.md` (déroulé de la présentation) |

## 8. Arborescence

```
agent/            agent TypeScript (AI SDK + Zod)
  src/sources/    connecteurs : fichier, EUR-Lex, Légifrance, Judilibre, RSS
  src/storage/    stockage local et Notion (6 bases reliées)
  src/llm.ts      appels au modèle (Gemini / Mistral / démo)
  src/verify.ts   vérification des citations dans le texte officiel
  src/matrices.ts matrices M1–M5, risques, lots d'action
  src/gouvernance.ts  recommandation TOGAF / ITIL
cockpit/          cockpit Streamlit + export Excel
data/organisation profil de l'organisation fictive Hydréa
data/sources/     textes analysés (copie locale des sources officielles)
data/demo/        réponses enregistrées pour le mode démo
outputs/          matrices et plan de gouvernance générés
docs/             documentation
```

## 9. Problèmes fréquents

| Message | Solution |
|---|---|
| `Variable ... manquante dans le fichier .env` | Le message indique quoi remplir et où obtenir la clé |
| `limite de débit atteinte` | Normal avec l'offre gratuite : l'agent attend puis réessaie. Augmenter `LLM_DELAY_MS` si besoin |
| `Le modèle ... n'est pas disponible` | Google retire régulièrement d'anciens modèles : mettre dans `.env` le modèle conseillé par le message, par exemple `LLM_MODEL=gemini-flash-latest` |
| Gemini répond 403 | Vérifier que la clé a été créée dans AI Studio et qu'elle est autorisée pour l'API Gemini |
| Notion répond `object_not_found` | La page parente ou les bases ne sont pas partagées avec l'intégration (`•••` puis **Connexions**) |
| Le cockpit affiche « Aucune analyse » | Lancer d'abord `npm run demo` dans `agent/` |
| `streamlit` introuvable | `python -m streamlit run cockpit/app.py` |

---

*Projet pédagogique. Les exigences produites par l'agent doivent être validées par un juriste ou un RSSI avant tout usage réel. Hydréa et ses prestataires sont fictifs.*
