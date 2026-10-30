/**
 * Schémas Zod : ils décrivent la forme EXACTE des données.
 * - Le modèle d'IA doit répondre en respectant `ReponseAnalyseSchema` (sortie structurée).
 * - Toutes les autres structures (contrôles, risques, matrices...) sont typées ici,
 *   ce qui garantit que les 5 matrices partagent les mêmes identifiants d'exigence.
 */
import { z } from "zod";

/** Thèmes communs : ils relient les exigences aux contrôles, processus, systèmes, données et contrats. */
export const THEMES = [
  "gouvernance",
  "gestion-risques",
  "gestion-incidents",
  "notification",
  "continuite",
  "chaine-approvisionnement",
  "developpement-securise",
  "vulnerabilites",
  "evaluation-efficacite",
  "cyberhygiene-formation",
  "cryptographie",
  "rh-securite",
  "controle-acces",
  "gestion-actifs",
  "authentification-mfa",
  "communications-securisees",
  "supervision-audit",
] as const;
export const ThemeSchema = z.enum(THEMES);
export type Theme = z.infer<typeof ThemeSchema>;

export const DESTINATAIRES = [
  "Entités essentielles et importantes",
  "Entités essentielles",
  "Entités importantes",
  "Organes de direction",
  "États membres / autorités",
  "Commission européenne",
  "Autre",
] as const;

/** Ce que le modèle d'IA doit produire pour UNE exigence. */
export const ExigenceExtraiteSchema = z.object({
  article: z.string().describe("Référence précise, ex. « Art. 21 §2 b) »"),
  intitule: z.string().describe("Titre court de l'exigence (moins de 12 mots)"),
  obligation: z.string().describe("Reformulation claire de ce que l'organisation doit faire"),
  citation: z
    .string()
    .describe("Extrait copié MOT POUR MOT du texte source qui fonde l'obligation (10 à 40 mots)"),
  destinataire: z.enum(DESTINATAIRES),
  type: z.enum(["gouvernance", "organisationnelle", "technique", "notification", "documentaire"]),
  themes: z.array(ThemeSchema).min(1).max(4),
  echeance: z.string().nullable().describe("Délai ou date imposée par le texte, sinon null"),
  sanction: z.string().nullable().describe("Sanction prévue en cas de manquement, sinon null"),
  applicable: z.boolean().describe("L'exigence s'applique-t-elle à l'organisation décrite ?"),
  justification_applicabilite: z.string(),
  confiance: z.number().min(0).max(1).describe("Confiance du modèle dans cette extraction (0 à 1)"),
});
export type ExigenceExtraite = z.infer<typeof ExigenceExtraiteSchema>;

/** Réponse attendue du modèle pour un article. */
export const ReponseAnalyseSchema = z.object({
  exigences: z.array(ExigenceExtraiteSchema),
});
export type ReponseAnalyse = z.infer<typeof ReponseAnalyseSchema>;

/** Réponse attendue du modèle pour l'applicabilité globale du texte. */
export const ApplicabiliteSchema = z.object({
  applicable: z.boolean(),
  qualification: z.string().describe("Ex. « Entité essentielle (annexe I, eau potable) »"),
  raisonnement: z.string(),
  confiance: z.number().min(0).max(1),
});
export type Applicabilite = z.infer<typeof ApplicabiliteSchema>;

/** Recommandation de cadre de gouvernance. */
export const RecommandationGouvernanceSchema = z.object({
  cadre_recommande: z.enum(["TOGAF", "ITIL", "Hybride TOGAF + ITIL"]),
  justification: z.string(),
  apports_togaf: z.array(z.string()),
  apports_itil: z.array(z.string()),
  points_de_vigilance: z.array(z.string()),
});
export type RecommandationGouvernance = z.infer<typeof RecommandationGouvernanceSchema>;

// ---------------------------------------------------------------------------
// Objets stockés (dans data/store.json ou dans Notion)
// ---------------------------------------------------------------------------

export type StatutValidation = "À valider" | "Validée" | "Corrigée" | "Rejetée";

export interface Texte {
  id: string; // ex. TXT-NIS2
  titre: string;
  source: string; // EUR-Lex, Légifrance, Judilibre, CNIL...
  reference: string; // CELEX, NOR, ECLI...
  url: string;
  empreinte: string; // hash SHA-256 du contenu → détection des modifications
  date_detection: string;
  date_publication?: string;
  applicable: boolean;
  qualification: string;
  raisonnement: string;
  confiance: number;
  version: number;
}

export interface Exigence extends ExigenceExtraite {
  id: string; // ex. REQ-NIS2-021-03
  texte_id: string;
  url_source: string;
  verifiee: boolean; // citation retrouvée dans le texte officiel ?
  verification_detail: string;
  confiance_finale: number;
  statut_validation: StatutValidation;
  commentaire_validation: string;
  date_validation: string | null;
  valide_par: string | null;
}

export interface Controle {
  id: string;
  nom: string;
  themes: Theme[];
  maturite: number; // 0 à 5
  proprietaire: string;
}

export interface Risque {
  id: string; // RSK-...
  exigence_id: string;
  intitule: string;
  probabilite: number; // 1 à 5
  impact: number; // 1 à 5
  score_inherent: number; // P x I
  couverture: number; // 0 à 1
  score_residuel: number;
  niveau: "Faible" | "Modéré" | "Élevé" | "Critique";
  consequences: string;
}

export interface DecisionJurisprudence {
  id: string; // JUR-...
  exigence_ids: string[];
  juridiction: string;
  date: string;
  numero: string;
  url: string;
  resume: string;
  requete: string;
}

export interface LotAction {
  id: string; // LOT-...
  intitule: string;
  theme: Theme;
  exigence_ids: string[];
  priorite: "P1" | "P2" | "P3";
  echeance: string; // date ISO proposée
  responsable: string;
  statut: "À lancer" | "En cours" | "Terminé";
  description: string;
}

/** Signal du fil de veille (actualité, projet de texte, alerte) non encore analysé. */
export interface Signal {
  id: string;
  titre: string;
  source: string;
  url: string;
  date_publication: string;
  detecte_le: string;
  statut: "nouveau" | "modifie";
  extrait: string;
}

export interface Store {
  genere_le: string;
  organisation: string;
  signaux: Signal[];
  textes: Texte[];
  exigences: Exigence[];
  controles: Controle[];
  risques: Risque[];
  jurisprudence: DecisionJurisprudence[];
  lots: LotAction[];
  /** Requêtes jurisprudence préparées pour chaque exigence (utilisées par M5). */
  requetes_jurisprudence: Record<string, string>;
  gouvernance: (RecommandationGouvernance & { scores: Record<string, number>; decision_humaine: string | null }) | null;
}
