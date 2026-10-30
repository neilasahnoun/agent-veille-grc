/**
 * Connecteur Légifrance (textes en vigueur, Journal officiel) via l'API PISTE.
 * Utilisé pour la VEILLE : on recherche les nouveaux textes correspondant à une requête
 * (ex. « résilience des infrastructures critiques cybersécurité » pour la transposition de NIS 2).
 * Chaque résultat apparaît dans le fil de veille ; un texte pertinent peut ensuite être
 * téléchargé puis analysé avec `npm run analyse -- --fichier ...`.
 *
 * ⚠ Le format exact des réponses de l'API peut évoluer : le code lit les champs de façon défensive.
 */
import { createHash } from "node:crypto";
import { jetonPiste, PISTE_API } from "./piste.js";
import type { DocumentRecupere } from "./types.js";

interface ResultatLf {
  titles?: { id?: string; cid?: string; title?: string }[];
  nature?: string;
  date?: string;
  datePublication?: string;
  text?: string;
}

export async function rechercherLegifrance(recherche: string, fond = "JORF"): Promise<DocumentRecupere[]> {
  const jeton = await jetonPiste();
  const rep = await fetch(`${PISTE_API()}/dila/legifrance/lf-engine-app/search`, {
    method: "POST",
    headers: { Authorization: `Bearer ${jeton}`, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      fond,
      recherche: {
        champs: [{ typeChamp: "ALL", criteres: [{ typeRecherche: "TOUS_LES_MOTS_DANS_UN_CHAMP", valeur: recherche, operateur: "ET" }], operateur: "ET" }],
        operateur: "ET",
        pageNumber: 1,
        pageSize: 10,
        sort: "SIGNATURE_DATE_DESC",
        typePagination: "DEFAUT",
      },
    }),
  });
  if (!rep.ok) throw new Error(`Légifrance a répondu ${rep.status} : ${(await rep.text()).slice(0, 300)}`);
  const json = (await rep.json()) as { results?: ResultatLf[] };
  return (json.results ?? []).map((r) => {
    const t = r.titles?.[0] ?? {};
    const idLf = t.id ?? t.cid ?? createHash("md5").update(JSON.stringify(r)).digest("hex").slice(0, 12);
    const chemin = idLf.startsWith("JORFTEXT") ? "jorf/id" : "loda/id";
    return {
      id: `LF-${idLf}`,
      titre: t.title ?? "(sans titre)",
      source: "Légifrance",
      reference: idLf,
      url: `https://www.legifrance.gouv.fr/${chemin}/${idLf}`,
      date_publication: r.datePublication ?? r.date,
      nature: "actualite" as const,
      contenu: `${t.title ?? ""}\n${r.nature ?? ""}\n${r.text ?? ""}`.trim(),
    };
  });
}
