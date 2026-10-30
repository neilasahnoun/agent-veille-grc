# Résultats et limites

## Résultats

### Analyse réelle : texte officiel de NIS 2 avec Gemini

| Élément | Résultat |
|---|---|
| Parcours complet | Texte officiel → IA → exigences structurées avec articles → matrices → Notion → validation dans Streamlit |
| Texte | Directive (UE) 2022/2555, version française officielle (EUR-Lex), **46 articles** |
| Modèle | Google Gemini (offre gratuite), 12 requêtes grâce au regroupement des articles par lots |
| Applicabilité | Hydréa qualifiée d'**entité essentielle** (annexe I, eau potable) |
| Exigences extraites | **133**, dont **51 jugées applicables** à Hydréa ; les autres visent les États membres, la Commission ou l'ENISA |
| Vérification automatique | **122 citations retrouvées** dans le texte officiel (92 %) ; **11 signalées « à contrôler »**, dont 6 applicables |
| Couverture (M3) | 5 exigences couvertes, 40 partielles, 6 non couvertes |
| Risques résiduels (M4) | **17 critiques** (dont 9 sur la notification de l'art. 23), 16 élevés, 18 modérés |
| Lots d'action | 12 lots priorisés (6 P1, 4 P2, 2 P3), avec responsable et échéance |
| Gouvernance | Hybride TOGAF + ITIL (51 % / 49 %) ; décision humaine à saisir dans le cockpit |
| Notion | 6 bases reliées créées automatiquement et alimentées (133 exigences, 13 contrôles, risques, lots) |
| Assistant | Chatbot qui répond en direct (streaming) à partir des exigences extraites ; dépôt d'un document (PDF/HTML/texte) analysé depuis le cockpit |

### Erreurs de l'IA repérées, à corriger par la validation humaine
C'est l'enseignement principal du projet : **l'IA produit une première analyse rapide, mais elle se trompe, d'où la validation humaine.**

| Erreur | Exigences concernées | Décision humaine attendue |
|---|---|---|
| **Contradiction de qualification.** Hydréa est classée entité *essentielle*, mais l'IA lui applique l'article 33, qui ne vise que les entités *importantes* | REQ-NIS2-033-01 à 033-13 | **Rejeter** (Hydréa relève de l'art. 32) |
| Amende prévue pour les entités importantes, alors que celle des entités essentielles est plus élevée (art. 34 §4 : 10 M€ ou 2 % du CA) | REQ-NIS2-034-01 | **Corriger** |
| Dispositions de champ d'application ou d'objet présentées comme des obligations | REQ-NIS2-001-03, 001-04, 002-01, 004-01 | **Rejeter** |
| Citations non retrouvées dans le texte (reformulations de l'IA) | REQ-NIS2-023-08, 029-01, 029-02, 032-02, 032-03, 032-04 | **Vérifier dans le texte**, puis valider ou corriger |

Une fois ces décisions prises dans le cockpit, `npm run matrices` (ou le worker) recalcule les matrices : le nombre d'exigences applicables et de risques critiques baisse en conséquence.

### Mode démo (sans clé)
Avec l'extrait de travail `data/sources/nis2-extrait.md` et des réponses enregistrées, on obtient 23 exigences, dont 22 applicables et 1 citation volontairement reformulée, détectée par la vérification. Ce mode sert à présenter le projet sans connexion et à tester le code.

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
- L'extrait utilisé en mode démo (`data/sources/nis2-extrait.md`) est une **reconstitution de travail**, qui peut s'écarter légèrement du texte officiel. L'analyse réelle a été faite sur le texte officiel (`data/sources/nis2-officiel.html`).
- EUR-Lex bloque les téléchargements automatiques par une page anti-robot. Le connecteur essaie d'abord le service de diffusion de l'Office des publications ; en cas d'échec, il faut enregistrer la page depuis le navigateur.
- NIS 2 est une **directive** : en France, les obligations précises et les échéances dépendent de la **loi de transposition** et de ses décrets d'application, à suivre via Légifrance. Les échéances indiquées « dépend de la loi de transposition » sont à compléter.
- Le règlement d'exécution (UE) 2024/2690 et les référentiels de l'ANSSI ne sont pas encore analysés : la source est prévue mais désactivée dans `sources.json`.
- **Jurisprudence (M5) :** les décisions de justice portant directement sur NIS 2 sont encore rares. Judilibre renvoie surtout des décisions voisines (obligation de sécurité, fraude informatique). En mode démo, M5 ne contient que les requêtes préparées, sans aucune décision inventée.

**Sur l'IA**
- Le modèle peut **halluciner** ou mal découper une obligation. La vérification des citations réduit ce risque sans le supprimer : une citation exacte peut être mal interprétée. C'est pourquoi chaque exigence passe par une **validation humaine**.
- La **confiance** est une auto-évaluation du modèle, corrigée par des règles simples. Ce n'est pas une probabilité calibrée.
- L'IA peut **se contredire** : voir le tableau des erreurs ci-dessus. Les règles déterministes en aval (couverture, risques) héritent de ces erreurs tant qu'elles ne sont pas corrigées.
- Les offres gratuites (Gemini, Mistral) limitent le débit. Pendant le projet, Gemini limitait certains modèles à 20 requêtes par jour, d'où le regroupement des articles par lots et le cache de reprise (`data/cache-ia.json`). Un texte long comme le règlement 2024/2690 prend plusieurs minutes, et les requêtes peuvent servir à améliorer les modèles du fournisseur. C'est acceptable pour des textes publics, à proscrire pour des documents internes.

**Sur la méthode GRC**
- La couverture et le risque reposent sur des **règles volontairement simples** : correspondance de thèmes, maturité de 0 à 5, probabilité × impact. Elles sont explicables, mais elles ne remplacent pas une analyse EBIOS RM.
- Le profil d'Hydréa est **fictif** et déclaratif : la maturité des contrôles n'est pas mesurée sur le terrain.
- La recommandation TOGAF / ITIL est un **outil d'aide à la décision**. Le choix appartient à la direction.

**Sur la technique**
- Le chatbot retrouve les exigences par mots-clés, sans recherche sémantique : une question formulée avec des mots très différents du texte peut passer à côté. Chaque question consomme une requête du quota gratuit.
- Un PDF scanné (image) ne contient pas de texte : il faut utiliser la version HTML ou texte.
- Le découpage repose sur les lignes « Article N » : un format de texte inhabituel peut nécessiter d'adapter `parse.ts`.
- Le format des réponses des API Légifrance et Judilibre peut évoluer. Les connecteurs lisent les champs de façon défensive, mais doivent être testés avec de vrais identifiants PISTE.
- La synchronisation Notion respecte la limite d'environ 3 requêtes par seconde. Le premier envoi prend environ une minute.

## Pistes d'amélioration
- Analyser le règlement 2024/2690 et rattacher chaque exigence technique à l'article 21 correspondant.
- Suivre la loi française de transposition et produire un tableau directive → loi → décret.
- Ajouter le RGPD (art. 32 à 34) et DORA, avec un dédoublonnage des exigences communes (par exemple, la notification d'incident).
- Calibrer la confiance à partir des décisions humaines : taux de correction par type d'exigence.
- Ajouter une recherche de jurisprudence européenne (CJUE) et les sanctions de la CNIL.
