/**
 * Connecteur RSS générique : CNIL, CERT-FR (ANSSI), flux de l'Assemblée nationale ou du Sénat...
 * Chaque article du flux devient un signal du « fil de veille ». Un filtre par mots-clés
 * évite de remonter des actualités hors sujet.
 */
import { createHash } from "node:crypto";
import { htmlVersTexte } from "../parse.js";
import type { DocumentRecupere } from "./types.js";

const balise = (xml: string, nom: string) =>
  xml.match(new RegExp(`<${nom}[^>]*>([\\s\\S]*?)<\\/${nom}>`, "i"))?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, "").trim() ?? "";

export async function lireFluxRss(nom: string, url: string, motsCles: string[] = []): Promise<DocumentRecupere[]> {
  const rep = await fetch(url, { headers: { "User-Agent": "agent-veille-grc (atelier EPITA)" } });
  if (!rep.ok) throw new Error(`Flux ${nom} : réponse ${rep.status}`);
  const xml = await rep.text();
  const items = xml.match(/<(item|entry)[\s>][\s\S]*?<\/(item|entry)>/gi) ?? [];
  const filtre = motsCles.map((m) => m.toLowerCase());
  return items
    .map((item) => {
      const titre = htmlVersTexte(balise(item, "title"));
      const lien = balise(item, "link") || item.match(/<link[^>]*href="([^"]+)"/i)?.[1] || "";
      const description = htmlVersTexte(balise(item, "description") || balise(item, "summary"));
      const date = balise(item, "pubDate") || balise(item, "updated") || balise(item, "published");
      const id = `RSS-${nom.replace(/\W+/g, "").toUpperCase()}-${createHash("md5").update(lien || titre).digest("hex").slice(0, 10)}`;
      return { id, titre, source: nom, reference: lien, url: lien, date_publication: date, nature: "actualite" as const, contenu: `${titre}\n${description}` };
    })
    .filter((d) => filtre.length === 0 || filtre.some((m) => d.contenu.toLowerCase().includes(m)));
}
