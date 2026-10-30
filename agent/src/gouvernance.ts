/**
 * Module 4 — proposition de cadre de gouvernance (TOGAF, ITIL ou hybride).
 *
 * 1. L'agent calcule un score objectif : chaque thème d'exigence relève plutôt
 *    de l'architecture d'entreprise (TOGAF) ou de la gestion des services (ITIL).
 * 2. Le modèle d'IA rédige la recommandation et la justification.
 * 3. La décision finale reste HUMAINE (champ `decision_humaine`, saisi dans le cockpit).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { config } from "./config.js";
import { QuotaJournalierError, recommanderGouvernance } from "./llm.js";
import { calculerCouverture, construireLots, exigencesActives, LIBELLES_THEMES } from "./matrices.js";
import type { Organisation } from "./organisation.js";
import type { Store, Theme } from "./schemas.js";

/** Rattachement de chaque thème au cadre qui le traite le mieux. */
export const CADRE_PAR_THEME: Record<Theme, "TOGAF" | "ITIL"> = {
  "gouvernance": "TOGAF",
  "gestion-risques": "TOGAF",
  "chaine-approvisionnement": "TOGAF",
  "developpement-securise": "TOGAF",
  "gestion-actifs": "TOGAF",
  "evaluation-efficacite": "TOGAF",
  "supervision-audit": "TOGAF",
  "cryptographie": "TOGAF",
  "gestion-incidents": "ITIL",
  "notification": "ITIL",
  "continuite": "ITIL",
  "vulnerabilites": "ITIL",
  "controle-acces": "ITIL",
  "authentification-mfa": "ITIL",
  "communications-securisees": "ITIL",
  "cyberhygiene-formation": "ITIL",
  "rh-securite": "ITIL",
};

export function scoresGouvernance(store: Store): Record<string, number> {
  const compte = { TOGAF: 0, ITIL: 0 };
  for (const ex of exigencesActives(store)) for (const t of ex.themes) compte[CADRE_PAR_THEME[t]]++;
  const total = compte.TOGAF + compte.ITIL || 1;
  return { TOGAF: Math.round((compte.TOGAF / total) * 100) / 100, ITIL: Math.round((compte.ITIL / total) * 100) / 100 };
}

export async function produireGouvernance(store: Store, org: Organisation): Promise<Store["gouvernance"]> {
  const scores = scoresGouvernance(store);
  const synthese = exigencesActives(store)
    .map((e) => `${e.id} [${e.type}] ${e.intitule} — thèmes : ${e.themes.join(", ")}`)
    .join("\n");
  let reco;
  try {
    reco = await recommanderGouvernance(synthese, scores, org);
  } catch (err) {
    if (!(err instanceof QuotaJournalierError)) throw err;
    console.warn("   ⚠ quota IA atteint : recommandation de gouvernance calculée sans IA (à partir des scores)");
    reco = recommandationSansIA(scores);
  }
  return { ...reco, scores, decision_humaine: store.gouvernance?.decision_humaine ?? null };
}

/** Recommandation de repli, entièrement déterministe, si le modèle n'est pas disponible. */
function recommandationSansIA(scores: Record<string, number>): Awaited<ReturnType<typeof recommanderGouvernance>> {
  const cadre = Math.min(scores.TOGAF, scores.ITIL) >= 0.3 ? "Hybride TOGAF + ITIL" : scores.TOGAF > scores.ITIL ? "TOGAF" : "ITIL";
  return {
    cadre_recommande: cadre,
    justification: `Part des thèmes d'exigences relevant de l'architecture d'entreprise (TOGAF) : ${Math.round(scores.TOGAF * 100)} % ; relevant de la gestion des services (ITIL) : ${Math.round(scores.ITIL * 100)} %. ${cadre.startsWith("Hybride") ? "Aucune famille ne domine nettement : TOGAF sert à concevoir la cible et la feuille de route, ITIL à exploiter et mesurer les processus au quotidien." : `La famille ${cadre} domine nettement.`}`,
    apports_togaf: ["Cartographie et architecture cible (phases A à D de l'ADM)", "Feuille de route de mise en conformité (phases E et F)"],
    apports_itil: ["Pratiques de gestion des incidents, de la continuité et de la sécurité de l'information", "Indicateurs et amélioration continue"],
    points_de_vigilance: ["Recommandation calculée sans IA (quota du modèle atteint) : relancer `npm run analyse` plus tard pour une justification détaillée", "La décision finale appartient à la direction"],
  };
}

/** Écrit outputs/plan-gouvernance.md (livrable lisible directement sur GitHub). */
export function ecrirePlanGouvernance(store: Store, org: Organisation): string {
  const g = store.gouvernance;
  const actives = exigencesActives(store);
  const lots = construireLots(store, org);
  const couv = actives.map((e) => calculerCouverture(e, org).statut);
  const nb = (s: string) => couv.filter((c) => c === s).length;

  const lignesLots = lots
    .map((l) => `| ${l.id} | ${l.intitule} | ${l.priorite} | ${l.responsable} | ${l.echeance} | ${l.exigence_ids.join(", ")} |`)
    .join("\n");
  const parCadre = (cadre: "TOGAF" | "ITIL") =>
    (Object.keys(CADRE_PAR_THEME) as Theme[])
      .filter((t) => CADRE_PAR_THEME[t] === cadre)
      .map((t) => `- ${LIBELLES_THEMES[t]} (${actives.filter((e) => e.themes.includes(t)).length} exigence(s))`)
      .join("\n");

  const md = `# Plan de gouvernance — ${org.nom}

> Document généré automatiquement par l'agent de veille GRC le ${new Date().toLocaleDateString("fr-FR")}.
> **La décision finale sur le cadre de gouvernance appartient à la direction** (voir § 5).

## 1. Synthèse

- Textes analysés : ${store.textes.map((t) => t.titre).join(" ; ")}
- Exigences applicables retenues : **${actives.length}** (sur ${store.exigences.length} extraites)
- Couverture actuelle : ${nb("Couverte")} couvertes, ${nb("Partielle")} partielles, ${nb("Non couverte")} non couvertes
- Lots d'action proposés : ${lots.length}

## 2. Recommandation de l'agent : **${g?.cadre_recommande ?? "—"}**

Scores (part des thèmes d'exigences) : TOGAF ${Math.round((g?.scores.TOGAF ?? 0) * 100)} % — ITIL ${Math.round((g?.scores.ITIL ?? 0) * 100)} %

${g?.justification ?? ""}

### Ce qu'apporte TOGAF
${(g?.apports_togaf ?? []).map((a) => `- ${a}`).join("\n")}

### Ce qu'apporte ITIL
${(g?.apports_itil ?? []).map((a) => `- ${a}`).join("\n")}

### Points de vigilance
${(g?.points_de_vigilance ?? []).map((a) => `- ${a}`).join("\n")}

## 3. Répartition des thèmes par cadre

**TOGAF (architecture d'entreprise, ADM)**
${parCadre("TOGAF")}

**ITIL 4 (gestion des services)**
${parCadre("ITIL")}

## 4. Feuille de route (lots d'action)

| Lot | Intitulé | Priorité | Responsable | Échéance proposée | Exigences |
|---|---|---|---|---|---|
${lignesLots}

## 5. Décision humaine

${g?.decision_humaine ? `**Décision enregistrée :** ${g.decision_humaine}` : "_En attente : la décision est saisie dans le cockpit Streamlit (onglet « Pilotage »)._"}
`;
  mkdirSync(config.chemins.sorties, { recursive: true });
  const chemin = resolve(config.chemins.sorties, "plan-gouvernance.md");
  writeFileSync(chemin, md);
  return chemin;
}
