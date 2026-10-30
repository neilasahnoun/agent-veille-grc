/**
 * Construction des 5 matrices GRC à partir des exigences validées ou à valider.
 * Toutes les matrices utilisent le MÊME identifiant d'exigence (REQ-...) → traçabilité.
 *
 *  M1 Traçabilité   : exigence ↔ article, citation, URL officielle, échéance
 *  M2 Impact        : exigence ↔ processus, systèmes, données, contrats concernés
 *  M3 Couverture    : exigence ↔ contrôles existants (maturité) → écart
 *  M4 Risque        : conséquences potentielles, risque inhérent et résiduel
 *  M5 Jurisprudence : exigence ↔ décisions pertinentes (Judilibre)
 *
 * Les calculs sont volontairement simples et déterministes (explicables à l'oral) :
 * l'IA extrait, les règles calculent, l'humain valide.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { config } from "./config.js";
import type { ElementOrg, Organisation } from "./organisation.js";
import type { Exigence, LotAction, Risque, Store, Theme } from "./schemas.js";

export const LIBELLES_THEMES: Record<Theme, string> = {
  "gouvernance": "Gouvernance et responsabilité de la direction",
  "gestion-risques": "Analyse et gestion des risques",
  "gestion-incidents": "Gestion des incidents",
  "notification": "Notification des incidents",
  "continuite": "Continuité d'activité et gestion de crise",
  "chaine-approvisionnement": "Sécurité de la chaîne d'approvisionnement",
  "developpement-securise": "Acquisition, développement et maintenance sécurisés",
  "vulnerabilites": "Traitement des vulnérabilités",
  "evaluation-efficacite": "Évaluation de l'efficacité des mesures",
  "cyberhygiene-formation": "Cyberhygiène et formation",
  "cryptographie": "Cryptographie et chiffrement",
  "rh-securite": "Sécurité des ressources humaines",
  "controle-acces": "Contrôle d'accès",
  "gestion-actifs": "Gestion des actifs",
  "authentification-mfa": "Authentification multifacteur",
  "communications-securisees": "Communications sécurisées et d'urgence",
  "supervision-audit": "Supervision par l'autorité et audits",
};

/** Exigences prises en compte : applicables et non rejetées par un humain. */
export const exigencesActives = (s: Store): Exigence[] =>
  s.exigences.filter((e) => e.applicable && e.statut_validation !== "Rejetée");

// ---------------------------------------------------------------------------
// M3 — couverture par les contrôles existants
// ---------------------------------------------------------------------------
export interface Couverture {
  taux: number; // 0..1
  statut: "Couverte" | "Partielle" | "Non couverte";
  controles: string[];
  ecart: string;
}

export function calculerCouverture(ex: Exigence, org: Organisation): Couverture {
  const controles = new Set<string>();
  const parTheme = ex.themes.map((t) => {
    const ctl = org.controles.filter((c) => c.themes.includes(t));
    ctl.forEach((c) => controles.add(c.id));
    return { theme: t, maturite: Math.max(0, ...ctl.map((c) => c.maturite)) };
  });
  const taux = parTheme.reduce((s, p) => s + p.maturite / 5, 0) / parTheme.length;
  const statut = taux >= 0.6 ? "Couverte" : taux >= 0.3 ? "Partielle" : "Non couverte";
  const manques = parTheme.filter((p) => p.maturite < 3).map((p) => `${LIBELLES_THEMES[p.theme]} (maturité ${p.maturite}/5)`);
  return {
    taux: Math.round(taux * 100) / 100,
    statut,
    controles: [...controles],
    ecart: manques.length ? `À renforcer : ${manques.join(", ")}` : "Aucun écart majeur",
  };
}

// ---------------------------------------------------------------------------
// M2 — impact sur l'organisation
// ---------------------------------------------------------------------------
export interface Impact {
  processus: ElementOrg[];
  systemes: ElementOrg[];
  donnees: ElementOrg[];
  contrats: ElementOrg[];
  criticite_max: number;
}

export function calculerImpact(ex: Exigence, org: Organisation): Impact {
  const touche = (els: ElementOrg[]) => els.filter((e) => e.themes.some((t) => ex.themes.includes(t)));
  const processus = touche(org.processus);
  const systemes = touche(org.systemes);
  const criticites = [...processus, ...systemes].map((e) => e.criticite ?? 3);
  return {
    processus,
    systemes,
    donnees: touche(org.donnees),
    contrats: touche(org.contrats),
    criticite_max: criticites.length ? Math.max(...criticites) : 3,
  };
}

// ---------------------------------------------------------------------------
// M4 — risque
// ---------------------------------------------------------------------------
const niveau = (score: number): Risque["niveau"] =>
  score >= 15 ? "Critique" : score >= 10 ? "Élevé" : score >= 5 ? "Modéré" : "Faible";

const IMPACT_MINIMUM: Partial<Record<Theme, number>> = {
  "gouvernance": 4,
  "cyberhygiene-formation": 4,
  "supervision-audit": 3,
  "gestion-risques": 4,
};

export function calculerRisque(ex: Exigence, org: Organisation): Risque {
  const imp = calculerImpact(ex, org);
  const couv = calculerCouverture(ex, org);
  // Probabilité inhérente : le secteur de l'eau est une cible fréquente (4/5) ;
  // les exigences purement documentaires ou de gouvernance exposent un peu moins (3/5).
  const probabilite = ex.type === "gouvernance" || ex.type === "documentaire" ? 3 : 4;
  // Impact : criticité maximale des processus/systèmes touchés, avec un plancher pour
  // certains thèmes transverses (ex. un défaut de formation expose toute l'organisation à
  // l'hameçonnage ; un défaut de gouvernance engage la responsabilité des dirigeants).
  const plancher = Math.max(0, ...ex.themes.map((t) => IMPACT_MINIMUM[t] ?? 0));
  const impact = Math.min(5, Math.max(imp.criticite_max, plancher));
  const inherent = probabilite * impact;
  const residuel = Math.max(1, Math.round(inherent * (1 - 0.8 * couv.taux)));
  const cibles = [...imp.processus, ...imp.systemes].slice(0, 3).map((e) => e.nom);
  return {
    id: ex.id.replace("REQ", "RSK"),
    exigence_id: ex.id,
    intitule: `Non-conformité : ${ex.intitule}`,
    probabilite,
    impact,
    score_inherent: inherent,
    couverture: couv.taux,
    score_residuel: residuel,
    niveau: niveau(residuel),
    consequences: [
      ex.sanction ? `Sanction : ${ex.sanction}` : "Mise en demeure ou injonction de l'autorité",
      cibles.length ? `Atteinte possible à : ${cibles.join(", ")}` : null,
    ].filter(Boolean).join(" — "),
  };
}

// ---------------------------------------------------------------------------
// Lots d'action : regroupement des écarts par thème
// ---------------------------------------------------------------------------
const RESPONSABLES: Partial<Record<Theme, string>> = {
  "gouvernance": "Direction générale",
  "notification": "RSSI",
  "chaine-approvisionnement": "Achats + RSSI",
  "supervision-audit": "Direction générale + Audit interne",
  "evaluation-efficacite": "Audit interne",
};

function ajouterMois(mois: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + mois);
  return d.toISOString().slice(0, 10);
}

export function construireLots(store: Store, org: Organisation): LotAction[] {
  const groupes = new Map<Theme, Exigence[]>();
  for (const ex of exigencesActives(store)) {
    if (calculerCouverture(ex, org).statut === "Couverte") continue;
    const theme = ex.themes[0];
    groupes.set(theme, [...(groupes.get(theme) ?? []), ex]);
  }
  let n = 0;
  return [...groupes.entries()]
    .map(([theme, exs]) => {
      const pire = Math.max(...exs.map((e) => calculerRisque(e, org).score_residuel));
      // Notification : délais légaux très courts → toujours P1. Gouvernance : préalable aux autres lots → au moins P2.
      const priorite: LotAction["priorite"] =
        pire >= 15 || theme === "notification" ? "P1" : pire >= 10 || theme === "gouvernance" ? "P2" : "P3";
      const proprietaire = org.controles.find((c) => c.themes.includes(theme))?.proprietaire;
      return {
        id: "",
        intitule: exs.length === 1 ? exs[0].intitule : LIBELLES_THEMES[theme],
        theme,
        exigence_ids: exs.map((e) => e.id),
        priorite,
        echeance: ajouterMois(priorite === "P1" ? 3 : priorite === "P2" ? 6 : 12),
        responsable: RESPONSABLES[theme] ?? proprietaire ?? "RSSI",
        statut: "À lancer" as const,
        description: exs.map((e) => `${e.id} : ${e.intitule}`).join(" | "),
      };
    })
    .sort((a, b) => a.priorite.localeCompare(b.priorite))
    .map((lot) => ({ ...lot, id: `LOT-${String(++n).padStart(2, "0")}` }));
}

// ---------------------------------------------------------------------------
// Export des matrices (CSV pour Excel + JSON pour le cockpit)
// ---------------------------------------------------------------------------
type Ligne = Record<string, string | number>;

export function lignesMatrices(store: Store, org: Organisation): Record<string, Ligne[]> {
  const actives = exigencesActives(store);
  const texte = (id: string) => store.textes.find((t) => t.id === id);
  const noms = (els: ElementOrg[]) => els.map((e) => `${e.id} ${e.nom}`).join(" ; ");

  const M1_tracabilite = store.exigences.map((e) => ({
    "ID exigence": e.id,
    "Texte": texte(e.texte_id)?.titre ?? e.texte_id,
    "Article": e.article,
    "Intitulé": e.intitule,
    "Obligation": e.obligation,
    "Citation (texte officiel)": e.citation,
    "Destinataire": e.destinataire,
    "Échéance": e.echeance ?? "—",
    "Applicable": e.applicable ? "Oui" : "Non",
    "Vérifiée": e.verifiee ? "Oui" : "Non",
    "Confiance": e.confiance_finale,
    "Statut validation": e.statut_validation,
    "URL officielle": e.url_source,
  }));

  const M2_impact = actives.map((e) => {
    const i = calculerImpact(e, org);
    return {
      "ID exigence": e.id,
      "Intitulé": e.intitule,
      "Processus": noms(i.processus),
      "Systèmes": noms(i.systemes),
      "Données": noms(i.donnees),
      "Contrats": noms(i.contrats),
      "Criticité max": i.criticite_max,
    };
  });

  const M3_couverture = actives.map((e) => {
    const c = calculerCouverture(e, org);
    return {
      "ID exigence": e.id,
      "Intitulé": e.intitule,
      "Contrôles existants": c.controles.map((id) => `${id} ${org.controles.find((x) => x.id === id)?.nom ?? ""}`).join(" ; ") || "Aucun",
      "Taux de couverture": c.taux,
      "Statut": c.statut,
      "Écart": c.ecart,
    };
  });

  const M4_risque = actives.map((e) => {
    const r = calculerRisque(e, org);
    return {
      "ID exigence": e.id,
      "ID risque": r.id,
      "Risque": r.intitule,
      "Probabilité (1-5)": r.probabilite,
      "Impact (1-5)": r.impact,
      "Risque inhérent": r.score_inherent,
      "Couverture": r.couverture,
      "Risque résiduel": r.score_residuel,
      "Niveau": r.niveau,
      "Conséquences": r.consequences,
    };
  });

  const M5_jurisprudence = actives.map((e) => {
    const decisions = store.jurisprudence.filter((j) => j.exigence_ids.includes(e.id));
    return {
      "ID exigence": e.id,
      "Intitulé": e.intitule,
      "Requête Judilibre": store.requetes_jurisprudence[e.id] ?? "",
      "Décisions": decisions.map((d) => `${d.juridiction} ${d.date} n° ${d.numero}`).join(" ; ") || "Aucune décision trouvée",
      "Liens": decisions.map((d) => d.url).join(" ; "),
    };
  });

  return { M1_tracabilite, M2_impact, M3_couverture, M4_risque, M5_jurisprudence };
}

function versCsv(lignes: Ligne[]): string {
  if (lignes.length === 0) return "";
  const colonnes = Object.keys(lignes[0]);
  const echapper = (v: string | number) => {
    const s = String(v);
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  // BOM + « ; » : s'ouvre directement et proprement dans Excel en français.
  return "﻿" + [colonnes.join(";"), ...lignes.map((l) => colonnes.map((c) => echapper(l[c] ?? "")).join(";"))].join("\n");
}

export function exporterMatrices(store: Store, org: Organisation): string[] {
  const dossier = resolve(config.chemins.sorties, "matrices");
  mkdirSync(dossier, { recursive: true });
  const matrices = lignesMatrices(store, org);
  const fichiers: string[] = [];
  for (const [nom, lignes] of Object.entries(matrices)) {
    const chemin = resolve(dossier, `${nom}.csv`);
    writeFileSync(chemin, versCsv(lignes));
    fichiers.push(chemin);
  }
  writeFileSync(resolve(dossier, "matrices.json"), JSON.stringify(matrices, null, 2));
  return fichiers;
}
