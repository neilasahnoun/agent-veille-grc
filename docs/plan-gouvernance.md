# Plan de gouvernance NIS 2 — Hydréa

> Synthèse rédigée à partir de l'analyse du **texte officiel** de la directive NIS 2 par l'agent (Gemini), voir `outputs/plan-gouvernance.md` et les matrices M1 à M5.
> Organisation fictive. **Le choix du cadre est une décision humaine** (§ 6).

## 1. Contexte et périmètre

- **Organisation :** Hydréa, société d'économie mixte de distribution d'eau potable (600 salariés, 95 M€ de chiffre d'affaires, 420 000 habitants desservis).
- **Qualification NIS 2 :** **entité essentielle**. Le secteur de l'eau potable figure à l'annexe I, et Hydréa dépasse les plafonds des moyennes entreprises (art. 3 §1 a). Elle est donc soumise à une supervision *ex ante* : inspections et audits (art. 32).
- **Exigences :** sur les 46 articles, l'agent a extrait 133 exigences, dont **51 jugées applicables** à Hydréa. Le cœur des obligations se trouve aux articles 20 (gouvernance), 21 (mesures de sécurité) et 23 (notification).
- **Point de vigilance :** l'agent a aussi retenu des dispositions qui ne s'appliquent pas à une entité essentielle, notamment l'article 33 et l'amende de l'article 34 prévue pour les entités importantes. Elles sont à **rejeter lors de la validation humaine** (voir `resultats-et-limites.md`).
- **Situation actuelle (M3) :** 5 exigences couvertes, 40 partiellement, 6 pas du tout.
- **Principaux écarts :**
  - aucun circuit de notification réglementaire (art. 23) ;
  - OT (SCADA, automates) absente de l'analyse de risques et de l'inventaire ;
  - pas de MFA sur le SCADA ;
  - clauses de sécurité limitées à un seul contrat fournisseur.

## 2. Recommandation : cadre hybride TOGAF + ITIL 4

L'agent mesure la part des thèmes d'exigences relevant de chaque cadre : **51 % TOGAF et 49 % ITIL**. Aucune des deux familles ne domine nettement :

- **Concevoir la cible (TOGAF).** La gouvernance de la direction (art. 20), l'analyse des risques étendue à l'OT, la sécurité de la chaîne d'approvisionnement et des acquisitions (art. 21 §2 a, d, e) supposent de revoir l'architecture d'entreprise et ses principes.
- **Faire tourner les processus (ITIL 4).** La notification en 24 h, 72 h et 1 mois (art. 23), la gestion des incidents, la continuité et la gestion des accès sont des pratiques de service à exécuter et mesurer au quotidien.

Un seul cadre laisserait un angle mort. TOGAF seul ne dit pas comment notifier l'ANSSI à 3 h du matin. ITIL seul ne garantit pas que l'OT soit intégrée à l'architecture et aux achats.

## 3. Volet TOGAF : cycle ADM appliqué à NIS 2

| Phase ADM | Travaux | Exigences (identifiants réels) |
|---|---|---|
| Préliminaire | Principes d'architecture de sécurité, comité d'architecture rattaché à la direction | REQ-NIS2-020-01, 021-01 |
| A — Vision | Ambition de conformité NIS 2 validée par le conseil d'administration ; responsabilité des dirigeants | 020-01, 020-02, 032-04 |
| B — Métier | Cartographie des processus critiques (production, distribution, crise) | 021-01, 021-02, 021-04 |
| C — Données et applications | Classification des données (plans réseau, qualité de l'eau, abonnés), cryptographie | 021-09, 021-10 |
| D — Technologie | Cartographie IT **et OT**, segmentation, MFA sur l'accès distant au SCADA | 021-06, 021-10, 021-11 |
| E/F — Solutions et migration | Feuille de route des lots d'action, budget, séquencement | tous les lots |
| G — Gouvernance de la mise en œuvre | Exigences de sécurité opposables aux projets et aux fournisseurs, produits certifiés | 021-05, 021-12, 024-01 |
| H — Gestion du changement | Veille continue par l'agent : un texte modifié relance l'analyse | 021-07, 021-13 |

## 4. Volet ITIL 4 : pratiques à mettre en place

| Pratique ITIL 4 | Ce qui change chez Hydréa | Exigences (identifiants réels) |
|---|---|---|
| Gestion des incidents | Qualification « incident important », astreinte reliée au RSSI | 021-03, 023-01 |
| Gestion des incidents (volet réglementaire) | **Alerte précoce sous 24 h**, **notification sous 72 h**, rapport intermédiaire sur demande, **rapport final à 1 mois** vers l'ANSSI ; information des abonnés | 023-02, 023-05 à 023-09 |
| Gestion de la continuité des services | Exercices de crise cyber et tests de restauration semestriels | 021-04 |
| Gestion de la sécurité de l'information | Revue de la PSSI, MFA, chiffrement, partage d'informations sur les menaces | 021-02, 021-09, 021-11, 023-04, 029-01 |
| Gestion des fournisseurs | Clauses de sécurité dans tous les contrats critiques (SCADA, télécom, cloud) | 021-05, 021-12 |
| Gestion des actifs informatiques | Inventaire unifié IT et OT | 021-10 |
| Gestion des talents et de la main-d'œuvre | Formation des dirigeants et du personnel | 020-02, 021-08 |
| Amélioration continue | Indicateurs, audit interne annuel, mesures correctives | 021-07, 021-13, 032-02, 032-03 |

## 5. Organisation et responsabilités (RACI)

R = réalise, A = approuve, C = consulté, I = informé.

| Activité | Direction générale / CA | RSSI | DSI | Dir. exploitation | Achats | Audit interne |
|---|---|---|---|---|---|---|
| Approuver les mesures NIS 2 (art. 20) | **A** | R | C | C | I | I |
| Analyse de risques IT et OT | I | **A/R** | R | R | I | C |
| Notification ANSSI 24 h / 72 h | I | **A/R** | C | R | — | I |
| Continuité et gestion de crise | A | C | R | **R** | — | I |
| Sécurité des fournisseurs | I | C | C | C | **A/R** | I |
| Évaluation de l'efficacité, audits | I | C | C | C | — | **A/R** |

**Instance :** un **comité cyber trimestriel**, présidé par la direction générale, arbitre à la fois l'architecture (TOGAF) et les services (ITIL). On évite ainsi deux gouvernances concurrentes.

## 6. Feuille de route

| Horizon | Lots | Objectif |
|---|---|---|
| 0–3 mois (P1) | Analyse des risques · Acquisition et vulnérabilités · Accès et actifs · MFA et communications sécurisées · Gestion des incidents · Notification des incidents | Fermer les risques **critiques** (17 au total, dont 9 sur la notification art. 23) |
| 3–6 mois (P2) | Gouvernance de la direction · Formation · Chaîne d'approvisionnement · Scans de sécurité | Structurer le dispositif |
| 6–12 mois (P3) | Évaluation de l'efficacité · Préparation aux contrôles de l'autorité | Démontrer la conformité |

Le détail des lots, avec responsables, échéances et exigences rattachées, est dans le cockpit (onglet « Pilotage ») et dans `outputs/plan-gouvernance.md`.

**Indicateurs suivis :**
- part des exigences validées ;
- taux de couverture moyen ;
- nombre de risques critiques ;
- délai réel de notification lors des exercices ;
- part des contrats critiques avec clauses de sécurité.

## 7. Décision humaine

| | |
|---|---|
| Recommandation de l'agent | Hybride TOGAF + ITIL |
| **Cadre retenu par l'équipe** | *à compléter (saisi aussi dans le cockpit)* |
| Motif / instance | *à compléter* |
| Date | *à compléter* |
