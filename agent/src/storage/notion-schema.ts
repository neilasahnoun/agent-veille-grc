/**
 * Schéma des 6 bases Notion reliées (Module 5 du TP) :
 *   Textes ─┬─< Exigences >─┬─ Contrôles
 *           │               ├─< Risques
 *           │               ├─< Jurisprudence
 *           │               └─< Lots d'action
 * Le titre de chaque page est l'identifiant (TXT-..., REQ-..., CTL-..., RSK-..., JUR-..., LOT-...),
 * ce qui permet de retrouver une page et de la mettre à jour au lieu de la dupliquer.
 * Les mêmes noms de propriétés sont utilisés par le cockpit Streamlit (cockpit/backend.py).
 */
import { DESTINATAIRES, THEMES } from "../schemas.js";

export type CleBase = "textes" | "exigences" | "controles" | "risques" | "jurisprudence" | "lots";

export const TITRES_BASES: Record<CleBase, string> = {
  textes: "Textes",
  exigences: "Exigences",
  controles: "Contrôles",
  risques: "Risques",
  jurisprudence: "Jurisprudence",
  lots: "Lots d'action",
};

const opts = (valeurs: readonly string[]) => ({ options: valeurs.map((name) => ({ name })) });
const texte = { rich_text: {} };
const nombre = { number: {} };

/** Propriétés sans relation (les relations sont ajoutées une fois les bases créées). */
export const PROPRIETES: Record<CleBase, Record<string, unknown>> = {
  textes: {
    ID: { title: {} },
    Titre: texte,
    Nature: { select: opts(["Texte analysé", "Signal de veille"]) },
    Source: { select: opts(["EUR-Lex", "Légifrance", "Judilibre", "CNIL", "CERT-FR (ANSSI)", "Assemblée nationale / Sénat", "Fichier local"]) },
    Référence: texte,
    URL: { url: {} },
    Empreinte: texte,
    Version: nombre,
    "Date détection": { date: {} },
    "Date publication": texte,
    Applicable: { checkbox: {} },
    Qualification: texte,
    Confiance: nombre,
  },
  exigences: {
    ID: { title: {} },
    Intitulé: texte,
    Article: texte,
    Obligation: texte,
    Citation: texte,
    Destinataire: { select: opts(DESTINATAIRES) },
    Type: { select: opts(["gouvernance", "organisationnelle", "technique", "notification", "documentaire"]) },
    Thèmes: { multi_select: opts(THEMES) },
    Échéance: texte,
    Sanction: texte,
    Applicable: { checkbox: {} },
    Justification: texte,
    Confiance: nombre,
    Vérifiée: { checkbox: {} },
    Vérification: texte,
    "Statut validation": { select: opts(["À valider", "Validée", "Corrigée", "Rejetée"]) },
    Commentaire: texte,
    "Validé par": texte,
    "Date validation": { date: {} },
    "URL source": { url: {} },
    Couverture: { select: opts(["Couverte", "Partielle", "Non couverte"]) },
  },
  controles: {
    ID: { title: {} },
    Nom: texte,
    Thèmes: { multi_select: opts(THEMES) },
    Maturité: nombre,
    Propriétaire: texte,
  },
  risques: {
    ID: { title: {} },
    Intitulé: texte,
    Probabilité: nombre,
    Impact: nombre,
    Inhérent: nombre,
    Couverture: nombre,
    Résiduel: nombre,
    Niveau: { select: opts(["Faible", "Modéré", "Élevé", "Critique"]) },
    Conséquences: texte,
  },
  jurisprudence: {
    ID: { title: {} },
    Juridiction: texte,
    Date: texte,
    Numéro: texte,
    URL: { url: {} },
    Résumé: texte,
    Requête: texte,
  },
  lots: {
    ID: { title: {} },
    Intitulé: texte,
    Thème: { select: opts(THEMES) },
    Priorité: { select: opts(["P1", "P2", "P3"]) },
    Échéance: { date: {} },
    Responsable: texte,
    Statut: { select: opts(["À lancer", "En cours", "Terminé"]) },
    Description: texte,
  },
};

/** Relations : [base qui porte la relation, nom de la propriété, base cible]. */
export const RELATIONS: [CleBase, string, CleBase][] = [
  ["exigences", "Texte", "textes"],
  ["exigences", "Contrôles", "controles"],
  ["risques", "Exigence", "exigences"],
  ["jurisprudence", "Exigences", "exigences"],
  ["lots", "Exigences", "exigences"],
];

// --- Constructeurs de valeurs de propriétés --------------------------------
const MAX = 1900; // Notion limite un bloc de texte à 2000 caractères
export const v = {
  titre: (s: string) => ({ title: [{ text: { content: s.slice(0, MAX) } }] }),
  texte: (s: string | null | undefined) => ({ rich_text: s ? [{ text: { content: String(s).slice(0, MAX) } }] : [] }),
  nombre: (n: number | null | undefined) => ({ number: n ?? null }),
  select: (s: string | null | undefined) => ({ select: s ? { name: s } : null }),
  multi: (l: string[]) => ({ multi_select: l.map((name) => ({ name })) }),
  case: (b: boolean) => ({ checkbox: b }),
  url: (s: string | null | undefined) => ({ url: s || null }),
  date: (s: string | null | undefined) => ({ date: s ? { start: s.slice(0, 10) } : null }),
  relation: (ids: string[]) => ({ relation: ids.map((id) => ({ id })) }),
};
