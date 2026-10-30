# Plan de gouvernance — Hydréa

> Document généré automatiquement par l'agent de veille GRC le 30/10/2026.
> **La décision finale sur le cadre de gouvernance appartient à la direction** (voir § 5).

## 1. Synthèse

- Textes analysés : DIRECTIVE (UE) 2022/2555 DU PARLEMENT EUROPÉEN ET DU CONSEIL du 14 décembre 2022
- Exigences applicables retenues : **51** (sur 133 extraites)
- Couverture actuelle : 5 couvertes, 40 partielles, 6 non couvertes
- Lots d'action proposés : 12

## 2. Recommandation de l'agent : **Hybride TOGAF + ITIL**

Scores (part des thèmes d'exigences) : TOGAF 51 % — ITIL 49 %

Compte tenu du score équilibré entre TOGAF (51%) et ITIL (49%) et de la nature de l'organisation Hydréa qui combine des infrastructures industrielles critiques et complexes (SCADA, PLC, IoT, réseaux d'eau) et des processus de service de grande envergure (gestion de crise, relation abonnés, maintenance, chaîne d'approvisionnement), un cadre hybride est indispensable pour couvrir à la fois la structuration architecturale et la gestion opérationnelle des services de sécurité.

### Ce qu'apporte TOGAF
- Alignement stratégique des exigences de gouvernance et de gestion des risques (REQ-NIS2-020-01, REQ-NIS2-021-02)
- Modélisation de l'architecture d'entreprise pour intégrer la sécurité dans les processus métier (P01 à P08) et les systèmes (S01 à S09)
- Gestion de la complexité des environnements IT et OT (SCADA, automates, SI)
- Traçabilité globale de la conformité réglementaire pour répondre aux exigences de supervision et d'audit (REQ-NIS2-033)

### Ce qu'apporte ITIL
- Maîtrise opérationnelle de la gestion des incidents et des notifications obligatoires (REQ-NIS2-021-03, REQ-NIS2-023)
- Mise en place de la continuité des activités et de la gestion de crise (REQ-NIS2-021-04)
- Gestion des changements, des correctifs, et de la sécurité des acquisitions (REQ-NIS2-021-06)
- Sécurisation de la chaîne d'approvisionnement et des relations fournisseurs (REQ-NIS2-021-05, REQ-NIS2-021-12)

### Points de vigilance
- La décision finale et la responsabilité de l'approbation de la gestion des risques appartiennent exclusivement à la direction (REQ-NIS2-020-01, REQ-NIS2-032-04)
- Complexité potentielle de la fusion de deux cadres méthodologiques lourds pour une structure de 600 salariés
- Nécessité de former efficacement la direction et le personnel aux exigences réglementaires spécifiques de la directive NIS2 (REQ-NIS2-020-02)

## 3. Répartition des thèmes par cadre

**TOGAF (architecture d'entreprise, ADM)**
- Gouvernance et responsabilité de la direction (9 exigence(s))
- Analyse et gestion des risques (9 exigence(s))
- Sécurité de la chaîne d'approvisionnement (2 exigence(s))
- Acquisition, développement et maintenance sécurisés (1 exigence(s))
- Gestion des actifs (2 exigence(s))
- Évaluation de l'efficacité des mesures (6 exigence(s))
- Supervision par l'autorité et audits (12 exigence(s))
- Cryptographie et chiffrement (1 exigence(s))

**ITIL 4 (gestion des services)**
- Gestion des incidents (15 exigence(s))
- Notification des incidents (15 exigence(s))
- Continuité d'activité et gestion de crise (1 exigence(s))
- Traitement des vulnérabilités (3 exigence(s))
- Contrôle d'accès (1 exigence(s))
- Authentification multifacteur (1 exigence(s))
- Communications sécurisées et d'urgence (1 exigence(s))
- Cyberhygiène et formation (2 exigence(s))
- Sécurité des ressources humaines (1 exigence(s))

## 4. Feuille de route (lots d'action)

| Lot | Intitulé | Priorité | Responsable | Échéance proposée | Exigences |
|---|---|---|---|---|---|
| LOT-01 | Analyse et gestion des risques | P1 | RSSI | 2027-01-30 | REQ-NIS2-001-03, REQ-NIS2-004-01, REQ-NIS2-021-01, REQ-NIS2-021-02, REQ-NIS2-021-13, REQ-NIS2-033-10 |
| LOT-02 | Sécurité d'acquisition et des vulnérabilités | P1 | RSSI | 2027-01-30 | REQ-NIS2-021-06 |
| LOT-03 | Sécurité RH, contrôle d'accès et actifs | P1 | DSI | 2027-01-30 | REQ-NIS2-021-10 |
| LOT-04 | MFA et communications sécurisées | P1 | DSI | 2027-01-30 | REQ-NIS2-021-11 |
| LOT-05 | Gestion des incidents | P1 | DSI | 2027-01-30 | REQ-NIS2-023-01, REQ-NIS2-023-02, REQ-NIS2-023-03, REQ-NIS2-023-04, REQ-NIS2-023-05, REQ-NIS2-023-06, REQ-NIS2-023-07, REQ-NIS2-023-08, REQ-NIS2-023-09, REQ-NIS2-033-11 |
| LOT-06 | Notification des incidents | P1 | RSSI | 2027-01-30 | REQ-NIS2-029-04, REQ-NIS2-030-01 |
| LOT-07 | Gouvernance et responsabilité de la direction | P2 | Direction générale | 2027-04-30 | REQ-NIS2-001-04, REQ-NIS2-002-01, REQ-NIS2-003-02, REQ-NIS2-020-01, REQ-NIS2-024-01, REQ-NIS2-032-04, REQ-NIS2-033-05, REQ-NIS2-034-01 |
| LOT-08 | Cyberhygiène et formation | P2 | RSSI | 2027-04-30 | REQ-NIS2-020-02, REQ-NIS2-021-08 |
| LOT-09 | Sécurité de la chaîne d'approvisionnement | P2 | Achats + RSSI | 2027-04-30 | REQ-NIS2-021-05, REQ-NIS2-021-12 |
| LOT-10 | Scans de sécurité | P2 | DSI | 2027-04-30 | REQ-NIS2-033-04 |
| LOT-11 | Évaluation de l'efficacité des mesures | P3 | Audit interne | 2027-10-30 | REQ-NIS2-021-07, REQ-NIS2-033-12 |
| LOT-12 | Supervision par l'autorité et audits | P3 | Direction générale + Audit interne | 2027-10-30 | REQ-NIS2-032-02, REQ-NIS2-032-03, REQ-NIS2-033-01, REQ-NIS2-033-02, REQ-NIS2-033-03, REQ-NIS2-033-06, REQ-NIS2-033-07, REQ-NIS2-033-08, REQ-NIS2-033-09, REQ-NIS2-033-13 |

## 5. Décision humaine

_En attente : la décision est saisie dans le cockpit Streamlit (onglet « Pilotage »)._
