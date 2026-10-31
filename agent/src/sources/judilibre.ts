/**
 * Connecteur Judilibre (jurisprudence de la Cour de cassation et des cours d'appel) via PISTE.
 * Sert à remplir la matrice M5 : pour chaque exigence, on lance une requête et on garde
 * les décisions les plus pertinentes.
 * Documentation : https://github.com/Cour-de-cassation/judilibre-search
 */
import { jetonPiste, PISTE_API } from "./piste.js";
import type { DecisionJurisprudence } from "../schemas.js";

interface ResultatJudilibre {
  id: string;
  jurisdiction?: string;
  chamber?: string;
  number?: string;
  decision_date?: string;
  summary?: string;
  highlights?: { text?: string[] };
}

export async function rechercherJurisprudence(requete: string, exigenceId: string, max = 3): Promise<DecisionJurisprudence[]> {
  const jeton = await jetonPiste();
  const params = new URLSearchParams({ query: requete, page_size: String(max), resolve_references: "true" });
  const rep = await fetch(`${PISTE_API()}/cassation/judilibre/v1.0/search?${params}`, {
    headers: { Authorization: `Bearer ${jeton}`, Accept: "application/json" },
  });
  if (rep.status === 401 || rep.status === 403)
    throw new Error(`Judilibre refuse l'accès (${rep.status}) : vérifier sur piste.gouv.fr que l'API JUDILIBRE (PROD) est cochée dans l'application et ses CGU acceptées.`);
  if (!rep.ok) throw new Error(`Judilibre a répondu ${rep.status} : ${(await rep.text()).slice(0, 300)}`);
  const json = (await rep.json()) as { results?: ResultatJudilibre[] };
  return (json.results ?? []).map((r) => ({
    id: `JUR-${r.id}`,
    exigence_ids: [exigenceId],
    juridiction: [r.jurisdiction, r.chamber].filter(Boolean).join(" — ") || "Cour de cassation",
    date: r.decision_date ?? "",
    numero: r.number ?? r.id,
    url: `https://www.courdecassation.fr/decision/${r.id}`,
    resume: (r.summary ?? r.highlights?.text?.join(" … ") ?? "").replace(/<[^>]+>/g, "").slice(0, 600),
    requete,
  }));
}
