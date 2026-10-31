/** Orchestration des connecteurs déclarés dans agent/sources.json. */
import { readFileSync } from "node:fs";
import { config } from "../config.js";
import { recupererEurLex } from "./eurlex.js";
import { lireFichier } from "./fichier.js";
import { rechercherLegifrance } from "./legifrance.js";
import { pisteConfiguree } from "./piste.js";
import { lirePage } from "./page.js";
import { lireFluxRss } from "./rss.js";
import type { ConfigSource, DocumentRecupere } from "./types.js";

export function lireConfigSources(): ConfigSource[] {
  const json = JSON.parse(readFileSync(config.chemins.configSources, "utf8")) as { sources: ConfigSource[] };
  return json.sources.filter((s) => s.actif !== false);
}

/** Interroge chaque source ; une source en échec n'arrête pas les autres. */
export async function collecter(sources = lireConfigSources()): Promise<{ documents: DocumentRecupere[]; erreurs: string[] }> {
  const documents: DocumentRecupere[] = [];
  const erreurs: string[] = [];
  for (const s of sources) {
    const nom = s.type === "rss" || s.type === "page" ? s.nom : s.type === "eurlex" ? `EUR-Lex ${s.celex}` : s.type === "legifrance" ? `Légifrance « ${s.recherche} »` : `Fichier ${s.chemin}`;
    const avant = documents.length;
    try {
      if (s.type === "fichier") documents.push(lireFichier(s.chemin));
      else if (s.type === "eurlex") documents.push(await recupererEurLex(s.celex, s.id));
      else if (s.type === "legifrance") {
        if (!pisteConfiguree()) throw new Error("identifiants PISTE absents du .env (source ignorée)");
        documents.push(...(await rechercherLegifrance(s.recherche, s.fond)));
      } else if (s.type === "rss") documents.push(...(await lireFluxRss(s.nom, s.url, s.motsCles)));
      else if (s.type === "page") documents.push(...(await lirePage(s.nom, s.url, s.motifLien, s.motsCles)));
      console.log(`  ✓ ${nom} (${documents.length - avant} élément(s) retenu(s))`);
    } catch (err) {
      const msg = `${nom} : ${err instanceof Error ? err.message : String(err)}`;
      erreurs.push(msg);
      console.warn(`  ✗ ${msg}`);
    }
  }
  return { documents, erreurs };
}

export type { DocumentRecupere } from "./types.js";
