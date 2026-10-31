/**
 * Connecteur « page web officielle » : pour les sites sans flux RSS fiable
 * (ex. liste des dossiers législatifs de l'Assemblée nationale).
 * On lit la page, on garde les liens qui correspondent à un motif (ex. « /dossiers/ »)
 * et dont le titre contient un mot-clé du périmètre de veille.
 */
import { createHash } from "node:crypto";
import { htmlVersTexte } from "../parse.js";
import type { DocumentRecupere } from "./types.js";

export async function lirePage(nom: string, url: string, motifLien: string, motsCles: string[] = []): Promise<DocumentRecupere[]> {
  const rep = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (agent-veille-grc, atelier EPITA)", "Accept-Language": "fr" } });
  if (!rep.ok) throw new Error(`${nom} : réponse ${rep.status}`);
  const html = await rep.text();
  const base = new URL(url);
  const filtre = motsCles.map((m) => m.toLowerCase());
  const vus = new Set<string>();
  const docs: DocumentRecupere[] = [];
  for (const m of html.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)) {
    const lien = new URL(m[1], base).toString();
    const titre = htmlVersTexte(m[2]).replace(/\s+/g, " ").trim();
    if (!lien.includes(motifLien) || titre.length < 15 || vus.has(lien)) continue;
    if (filtre.length && !filtre.some((f) => titre.toLowerCase().includes(f))) continue;
    vus.add(lien);
    docs.push({
      id: `PAGE-${nom.replace(/\W+/g, "").toUpperCase()}-${createHash("md5").update(lien).digest("hex").slice(0, 10)}`,
      titre,
      source: nom,
      reference: lien,
      url: lien,
      nature: "actualite",
      contenu: titre,
    });
  }
  return docs.slice(0, 30);
}
