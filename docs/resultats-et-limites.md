# Résultats et limites

## Résultats

| Élément | Résultat |
|---|---|
| Parcours complet | Chargement du texte → extraction → exigences structurées avec articles → matrices → Notion → validation dans Streamlit |
| Texte | Directive NIS 2 (articles 3, 20, 21, 23, 32, 34 en démo ; texte intégral via EUR-Lex) |
| Exigences extraites (démo) | 23, dont 22 applicables à Hydréa et 1 non applicable (art. 21 §5, qui vise la Commission) |
| Vérification automatique | 22 citations retrouvées mot pour mot ; 1 citation reformulée repérée et marquée « à contrôler » |
| Couverture (M3) | 3 exigences couvertes, 15 partielles, 4 non couvertes |
| Risques résiduels (M4) | 9 critiques (surtout la notification art. 23, la MFA et les accès), 6 élevés, 7 modérés |
| Lots d'action | 10 lots priorisés (4 P1, 4 P2, 2 P3), avec responsable et échéance |
| Gouvernance | Recommandation d'un hybride TOGAF + ITIL (44 % / 56 %) ; décision humaine saisie dans le cockpit |
| Sources | EUR-Lex, Légifrance (PISTE), Judilibre (PISTE), RSS CNIL et CERT-FR, fichier local |
| Veille | Empreinte SHA-256, versionnement, déduplication, exécution planifiée (GitHub Actions), worker de synchronisation |

## Ce qui a été fait pendant l'atelier, et ce qui a été ajouté ensuite

| Pendant l'atelier (4 h) — minimum attendu | Ajouté pendant la semaine |
|---|---|
| Chargement d'un texte officiel (fichier local) | Connecteurs EUR-Lex, Légifrance, Judilibre et RSS |
| Extraction des obligations avec l'IA (AI SDK + Zod) | Applicabilité, échéances, sanctions, destinataires, confiance |
| Exigences structurées avec articles | Vérification automatique des citations |
| Première matrice (M1 Traçabilité) | Matrices M2 à M5 avec identifiants communs, export Excel |
| Enregistrement dans Notion | 6 bases reliées, worker de synchronisation, configuration MCP |
| Une exigence visible dans Streamlit avec son statut | Cockpit à 4 vues, validation, correction et rejet enregistrés dans Notion |
| — | Plan de gouvernance TOGAF / ITIL, détection des modifications, exécution planifiée |

*(À adapter selon ce que l'équipe a réellement présenté en fin d'atelier.)*

## Limites

**Sur le fond juridique**
- L'extrait utilisé en mode démo (`data/sources/nis2-extrait.md`) est une **reconstitution de travail**, qui peut s'écarter légèrement du texte officiel. L'analyse réelle se fait sur le texte téléchargé depuis EUR-Lex.
- NIS 2 est une **directive** : en France, les obligations précises et les échéances dépendent de la **loi de transposition** et de ses décrets d'application, à suivre via Légifrance. Les échéances indiquées « dépend de la loi de transposition » sont à compléter.
- Le règlement d'exécution (UE) 2024/2690 et les référentiels de l'ANSSI ne sont pas encore analysés : la source est prévue mais désactivée dans `sources.json`.
- **Jurisprudence (M5) :** les décisions de justice portant directement sur NIS 2 sont encore rares. Judilibre renvoie surtout des décisions voisines (obligation de sécurité, fraude informatique). En mode démo, M5 ne contient que les requêtes préparées, sans aucune décision inventée.

**Sur l'IA**
- Le modèle peut **halluciner** ou mal découper une obligation. La vérification des citations réduit ce risque sans le supprimer : une citation exacte peut être mal interprétée. C'est pourquoi chaque exigence passe par une **validation humaine**.
- La **confiance** est une auto-évaluation du modèle, corrigée par des règles simples. Ce n'est pas une probabilité calibrée.
- Les offres gratuites (Gemini, Mistral) limitent le débit. Un texte long comme le règlement 2024/2690 prend plusieurs minutes, et les requêtes peuvent servir à améliorer les modèles du fournisseur. C'est acceptable pour des textes publics, à proscrire pour des documents internes.

**Sur la méthode GRC**
- La couverture et le risque reposent sur des **règles volontairement simples** : correspondance de thèmes, maturité de 0 à 5, probabilité × impact. Elles sont explicables, mais elles ne remplacent pas une analyse EBIOS RM.
- Le profil d'Hydréa est **fictif** et déclaratif : la maturité des contrôles n'est pas mesurée sur le terrain.
- La recommandation TOGAF / ITIL est un **outil d'aide à la décision**. Le choix appartient à la direction.

**Sur la technique**
- Le découpage repose sur les lignes « Article N » : un format de texte inhabituel peut nécessiter d'adapter `parse.ts`.
- Le format des réponses des API Légifrance et Judilibre peut évoluer. Les connecteurs lisent les champs de façon défensive, mais doivent être testés avec de vrais identifiants PISTE.
- La synchronisation Notion respecte la limite d'environ 3 requêtes par seconde. Le premier envoi prend environ une minute.

## Pistes d'amélioration
- Analyser le règlement 2024/2690 et rattacher chaque exigence technique à l'article 21 correspondant.
- Suivre la loi française de transposition et produire un tableau directive → loi → décret.
- Ajouter le RGPD (art. 32 à 34) et DORA, avec un dédoublonnage des exigences communes (par exemple, la notification d'incident).
- Calibrer la confiance à partir des décisions humaines : taux de correction par type d'exigence.
- Ajouter une recherche de jurisprudence européenne (CJUE) et les sanctions de la CNIL.
