# Plan de gouvernance — Hydréa

> Document généré automatiquement par l'agent de veille GRC le 31/10/2026.
> **La décision finale sur le cadre de gouvernance appartient à la direction** (voir § 5).

## 1. Synthèse

- Textes analysés : DIRECTIVE (UE) 2022/2555 DU PARLEMENT EUROPÉEN ET DU CONSEIL du 14 décembre 2022
- Exigences applicables retenues : **51** (sur 133 extraites)
- Couverture actuelle : 5 couvertes, 40 partielles, 6 non couvertes
- Lots d'action proposés : 12

## 2. Recommandation de l'agent : **Hybride TOGAF + ITIL**

Scores (part des thèmes d'exigences) : TOGAF 51 % — ITIL 49 %

Les exigences NIS 2 applicables à Hydréa se répartissent en deux familles de poids comparable. D'un côté, la gouvernance (art. 20), l'analyse des risques, la chaîne d'approvisionnement et la sécurité des acquisitions (art. 21 §2 a, d, e) demandent de revoir l'architecture d'entreprise : cartographie IT/OT, principes de sécurité, exigences fournisseurs. C'est le terrain de TOGAF (ADM, phases A à F). De l'autre, la gestion des incidents, la notification en 24 h / 72 h / 1 mois (art. 23), la continuité et le contrôle d'accès relèvent de l'exploitation quotidienne des services : c'est le terrain d'ITIL 4 (pratiques de gestion des incidents, de la continuité, de la sécurité de l'information). Un hybride permet d'utiliser TOGAF pour concevoir la cible et la feuille de route, et ITIL pour faire fonctionner et mesurer les processus au quotidien.

### Ce qu'apporte TOGAF
- Phase A (vision) et B–D (architectures métier, données, applications, technologie) : cartographie complète IT et OT, aujourd'hui partielle
- Principes d'architecture de sécurité opposables aux projets et aux achats (art. 21 §2 d et e)
- Phase F (planification de la migration) : transformer les lots d'action en feuille de route budgétée validée par la direction (art. 20)
- Gouvernance de l'architecture : comité qui approuve les écarts et trace les décisions

### Ce qu'apporte ITIL
- Pratique « gestion des incidents » étendue au volet réglementaire : circuit d'alerte précoce sous 24 h et notification sous 72 h vers l'ANSSI (art. 23)
- Pratique « gestion de la continuité des services » : tests de restauration et exercices de crise réguliers (art. 21 §2 c)
- Pratique « gestion de la sécurité de l'information » et « gestion des fournisseurs » : suivi opérationnel des prestataires SCADA et infogérance
- Amélioration continue et indicateurs : mesure de l'efficacité des mesures (art. 21 §2 f)

### Points de vigilance
- Ne pas créer deux gouvernances concurrentes : un seul comité cyber, rattaché à la direction générale, arbitre TOGAF et ITIL
- Inclure l'OT (SCADA, automates) dans les deux cadres : c'est le principal angle mort actuel
- La recommandation est produite par un agent automatisé : elle doit être validée par la direction et le RSSI avant toute mise en œuvre

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
| LOT-01 | Analyse et gestion des risques | P1 | RSSI | 2027-01-31 | REQ-NIS2-001-03, REQ-NIS2-004-01, REQ-NIS2-021-01, REQ-NIS2-021-02, REQ-NIS2-021-13, REQ-NIS2-033-10 |
| LOT-02 | Sécurité d'acquisition et des vulnérabilités | P1 | RSSI | 2027-01-31 | REQ-NIS2-021-06 |
| LOT-03 | Sécurité RH, contrôle d'accès et actifs | P1 | DSI | 2027-01-31 | REQ-NIS2-021-10 |
| LOT-04 | MFA et communications sécurisées | P1 | DSI | 2027-01-31 | REQ-NIS2-021-11 |
| LOT-05 | Gestion des incidents | P1 | DSI | 2027-01-31 | REQ-NIS2-023-01, REQ-NIS2-023-02, REQ-NIS2-023-03, REQ-NIS2-023-04, REQ-NIS2-023-05, REQ-NIS2-023-06, REQ-NIS2-023-07, REQ-NIS2-023-08, REQ-NIS2-023-09, REQ-NIS2-033-11 |
| LOT-06 | Notification des incidents | P1 | RSSI | 2027-01-31 | REQ-NIS2-029-04, REQ-NIS2-030-01 |
| LOT-07 | Gouvernance et responsabilité de la direction | P2 | Direction générale | 2027-05-01 | REQ-NIS2-001-04, REQ-NIS2-002-01, REQ-NIS2-003-02, REQ-NIS2-020-01, REQ-NIS2-024-01, REQ-NIS2-032-04, REQ-NIS2-033-05, REQ-NIS2-034-01 |
| LOT-08 | Cyberhygiène et formation | P2 | RSSI | 2027-05-01 | REQ-NIS2-020-02, REQ-NIS2-021-08 |
| LOT-09 | Sécurité de la chaîne d'approvisionnement | P2 | Achats + RSSI | 2027-05-01 | REQ-NIS2-021-05, REQ-NIS2-021-12 |
| LOT-10 | Scans de sécurité | P2 | DSI | 2027-05-01 | REQ-NIS2-033-04 |
| LOT-11 | Évaluation de l'efficacité des mesures | P3 | Audit interne | 2027-10-31 | REQ-NIS2-021-07, REQ-NIS2-033-12 |
| LOT-12 | Supervision par l'autorité et audits | P3 | Direction générale + Audit interne | 2027-10-31 | REQ-NIS2-032-02, REQ-NIS2-032-03, REQ-NIS2-033-01, REQ-NIS2-033-02, REQ-NIS2-033-03, REQ-NIS2-033-06, REQ-NIS2-033-07, REQ-NIS2-033-08, REQ-NIS2-033-09, REQ-NIS2-033-13 |

## 5. Décision humaine

_En attente : la décision est saisie dans le cockpit Streamlit (onglet « Pilotage »)._
