# Intégration Notion : API, worker et MCP

Le projet utilise Notion de trois façons complémentaires.

## 1. API Notion (agent et cockpit)
- `agent/src/notion-setup.ts` crée les 6 bases reliées et enregistre leurs identifiants dans `.env`.
- `agent/src/storage/notion.ts` crée ou met à jour les pages. La recherche se fait par identifiant (`REQ-…`, `RSK-…`), ce qui évite les doublons.
- `cockpit/backend.py` lit les bases et écrit les décisions de validation (statut, obligation corrigée, commentaire, validateur, date).

**Schéma des bases :**
```
Textes ──< Exigences >── Contrôles
              │
              ├──< Risques
              ├──< Jurisprudence
              └──< Lots d'action
```

## 2. Worker de synchronisation

> **Pourquoi pas les « Workers » de Notion ?** Notion propose une fonctionnalité « Workers » (code hébergé sur sa plateforme développeur), mais son déploiement est réservé aux offres payantes Business et Enterprise. Avec un compte gratuit, nous avons développé notre propre worker, qui joue le même rôle et peut tourner sur un poste ou dans GitHub Actions.

`npm run worker` tourne en tâche de fond. Toutes les 2 minutes, il :
1. lit dans Notion les décisions prises par les validateurs ;
2. recalcule les risques, les lots d'action, les matrices M1 à M5 et le plan de gouvernance ;
3. renvoie les risques et les lots à jour dans Notion.

On peut aussi valider directement dans Notion, en changeant la colonne « Statut validation » : le worker en tient compte.

## 3. Serveur MCP Notion
Le *Model Context Protocol* (MCP) permet à un assistant IA d'utiliser des outils externes. Le fichier `.mcp.json` à la racine déclare le **serveur MCP officiel de Notion** (`@notionhq/notion-mcp-server`) :

```json
{
  "mcpServers": {
    "notion": {
      "command": "npx",
      "args": ["-y", "@notionhq/notion-mcp-server"],
      "env": { "NOTION_TOKEN": "${NOTION_TOKEN}" }
    }
  }
}
```

Avec un client compatible (Claude Desktop, Cursor, VS Code…) ouvert sur ce dossier, on peut interroger les bases en langage naturel :
- « Liste les exigences de la base Exigences dont le statut est À valider et la confiance inférieure à 0,8. »
- « Quels lots d'action P1 ont une échéance avant fin janvier ? »
- « Résume les risques critiques liés à la notification d'incident. »

Pour Claude Desktop, copier le bloc `notion` dans son fichier de configuration MCP, en remplaçant `${NOTION_TOKEN}` par le secret de l'intégration. **Ne pas publier ce fichier** s'il contient la clé.
