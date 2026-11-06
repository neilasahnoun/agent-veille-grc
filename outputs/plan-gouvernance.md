# Plan de gouvernance — Hydréa

> Document généré automatiquement par l'agent de veille GRC le 06/11/2026.
> **La décision finale sur le cadre de gouvernance appartient à la direction** (voir § 5).

## 1. Synthèse

- Textes analysés : politique-fournisseurs ; DIRECTIVE (UE) 2022/2555 DU PARLEMENT EUROPÉEN ET DU CONSEIL du 14 décembre 2022
- Exigences applicables retenues : **50** (sur 137 extraites)
- Couverture actuelle : 5 couvertes, 38 partielles, 7 non couvertes
- Lots d'action proposés : 12

## 2. Recommandation de l'agent : **Hybride TOGAF + ITIL**

Scores (part des thèmes d'exigences) : TOGAF 46 % — ITIL 54 %

L'organisation Hydreå doit répondre à de multiples exigences NIS2 et de sécurité de la chaîne d'approvisionnement couvrant à la fois la structure d'entreprise, les processus industriels et la gestion des services IT/OT (comme REQ-NIS2-021-01 à REQ-NIS2-021-13). Un cadre hybride permet de structurer l'architecture globale des systèmes et des flux de données critiques tout en assurant l'opérabilité des services, la gestion des incidents et la continuité d'activité.

### Ce qu'apporte TOGAF
- Structuration de l'architecture d'entreprise pour intégrer la gouvernance et la sécurité de manière transversale.
- Modélisation des processus métier et des systèmes hétérogènes (SCADA, ERP, CRM, IoT) exigée pour la gestion des risques.

### Ce qu'apporte ITIL
- Maîtrise des processus opérationnels de gestion des incidents, des changements et de la continuité des services.
- Alignement des services de support et de la chaîne de valeur avec les exigences de notification et de gestion des vulnérabilités.

### Points de vigilance
- La décision finale d'adoption et d'arbitrage entre ces cadres appartient à la direction générale.
- Éviter la lourdeur bureaucratique en combinant les deux méthodologies sur des périmètres opérationnels restreints.

## 3. Répartition des thèmes par cadre

**TOGAF (architecture d'entreprise, ADM)**
- Gouvernance et responsabilité de la direction (7 exigence(s))
- Analyse et gestion des risques (8 exigence(s))
- Sécurité de la chaîne d'approvisionnement (6 exigence(s))
- Acquisition, développement et maintenance sécurisés (1 exigence(s))
- Gestion des actifs (2 exigence(s))
- Évaluation de l'efficacité des mesures (4 exigence(s))
- Supervision par l'autorité et audits (10 exigence(s))
- Cryptographie et chiffrement (1 exigence(s))

**ITIL 4 (gestion des services)**
- Gestion des incidents (16 exigence(s))
- Notification des incidents (16 exigence(s))
- Continuité d'activité et gestion de crise (1 exigence(s))
- Traitement des vulnérabilités (3 exigence(s))
- Contrôle d'accès (3 exigence(s))
- Authentification multifacteur (2 exigence(s))
- Communications sécurisées et d'urgence (1 exigence(s))
- Cyberhygiène et formation (2 exigence(s))
- Sécurité des ressources humaines (2 exigence(s))

## 4. Feuille de route (lots d'action)

| Lot | Intitulé | Priorité | Responsable | Échéance proposée | Exigences |
|---|---|---|---|---|---|
| LOT-01 | Authentification multifacteur | P1 | DSI | 2027-02-06 | REQ-POLITIQUE-FOURNISSEU-0S1-01, REQ-NIS2-021-11 |
| LOT-02 | Sécurité de la chaîne d'approvisionnement | P1 | Achats + RSSI | 2027-02-06 | REQ-POLITIQUE-FOURNISSEU-0S1-02, REQ-POLITIQUE-FOURNISSEU-0S1-03, REQ-POLITIQUE-FOURNISSEU-0S1-04, REQ-NIS2-021-05, REQ-NIS2-021-12 |
| LOT-03 | Analyse et gestion des risques | P1 | RSSI | 2027-02-06 | REQ-NIS2-001-03, REQ-NIS2-004-01, REQ-NIS2-021-01, REQ-NIS2-021-02, REQ-NIS2-021-13, REQ-NIS2-033-10 |
| LOT-04 | Sécurité d'acquisition et des vulnérabilités | P1 | RSSI | 2027-02-06 | REQ-NIS2-021-06 |
| LOT-05 | Sécurité RH, contrôle d'accès et actifs | P1 | DSI | 2027-02-06 | REQ-NIS2-021-10 |
| LOT-06 | Gestion des incidents | P1 | DSI | 2027-02-06 | REQ-NIS2-023-01, REQ-NIS2-023-02, REQ-NIS2-023-03, REQ-NIS2-023-04, REQ-NIS2-023-05, REQ-NIS2-023-06, REQ-NIS2-023-07, REQ-NIS2-023-08, REQ-NIS2-023-09, REQ-NIS2-033-11 |
| LOT-07 | Notification des incidents | P1 | RSSI | 2027-02-06 | REQ-NIS2-029-04, REQ-NIS2-030-01 |
| LOT-08 | Gouvernance et responsabilité de la direction | P2 | Direction générale | 2027-05-06 | REQ-NIS2-001-04, REQ-NIS2-003-02, REQ-NIS2-020-01, REQ-NIS2-024-01, REQ-NIS2-032-04, REQ-NIS2-033-05 |
| LOT-09 | Cyberhygiène et formation | P2 | RSSI | 2027-05-06 | REQ-NIS2-020-02, REQ-NIS2-021-08 |
| LOT-10 | Scans de sécurité | P2 | DSI | 2027-05-06 | REQ-NIS2-033-04 |
| LOT-11 | Évaluation de l'efficacité des mesures | P3 | Audit interne | 2027-11-06 | REQ-NIS2-021-07, REQ-NIS2-033-12 |
| LOT-12 | Supervision par l'autorité et audits | P3 | Direction générale + Audit interne | 2027-11-06 | REQ-NIS2-032-02, REQ-NIS2-032-03, REQ-NIS2-033-06, REQ-NIS2-033-07, REQ-NIS2-033-08, REQ-NIS2-033-09, REQ-NIS2-033-13 |

## 5. Décision humaine

**Décision enregistrée :** Hybride TOGAF + ITIL — Décision de l'équipe projet : TOGAF pour la cible IT/OT, ITIL pour l'exploitation (incidents, notification 24 h / 72 h).
