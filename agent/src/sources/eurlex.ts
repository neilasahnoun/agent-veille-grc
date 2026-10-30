/**
 * Connecteur EUR-Lex (droit européen).
 * Télécharge la version HTML officielle en français d'un acte à partir de son numéro CELEX
 * (NIS 2 = 32022L2555) et la convertit en texte. Aucune clé n'est nécessaire.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { config } from "../config.js";
import { htmlVersTexte } from "../parse.js";
import type { DocumentRecupere } from "./types.js";

const AIDE_MANUELLE = (celex: string) =>
  `EUR-Lex a renvoyé une page de vérification anti-robot au lieu du texte.\n` +
  `→ Solution : ouvrir https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:${celex} dans le navigateur,\n` +
  `  faire Ctrl+S (type « Page Web, HTML uniquement ») dans data/sources/, puis :\n` +
  `  npm run analyse -- --fichier data/sources/<nom-du-fichier>.html --id <identifiant>`;

const contientArticles = (texte: string) => /\nArticle (premier|1)\n/.test(texte);

async function telecharger(celex: string): Promise<{ html: string; url: string }> {
  const essais = [
    // Service de diffusion officiel de l'Office des publications (négociation de contenu)
    { url: `https://publications.europa.eu/resource/celex/${celex}`, headers: { Accept: "application/xhtml+xml, text/html;q=0.9", "Accept-Language": "fra" } },
    // Page HTML d'EUR-Lex
    { url: `https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:${celex}`, headers: { Accept: "text/html", "Accept-Language": "fr" } },
  ];
  for (const essai of essais) {
    try {
      const rep = await fetch(essai.url, { headers: { "User-Agent": "Mozilla/5.0 (agent-veille-grc, atelier EPITA)", ...essai.headers }, redirect: "follow" });
      if (rep.status !== 200) continue;
      const html = await rep.text();
      if (contientArticles(htmlVersTexte(html))) return { html, url: `https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:${celex}` };
    } catch {
      /* on essaie la source suivante */
    }
  }
  throw new Error(AIDE_MANUELLE(celex));
}

export async function recupererEurLex(celex: string, id?: string): Promise<DocumentRecupere> {
  const { html, url } = await telecharger(celex);
  const texte = htmlVersTexte(html);
  const { titreOfficiel } = await import("./fichier.js");
  const titre = titreOfficiel(texte) ?? `Acte CELEX ${celex}`;

  // On garde une copie locale du texte officiel (traçabilité + rejouer l'analyse hors ligne).
  mkdirSync(config.chemins.sources, { recursive: true });
  writeFileSync(
    resolve(config.chemins.sources, `eurlex-${celex}.md`),
    `---\nid: ${id ?? `TXT-${celex}`}\ntitre: ${titre}\nsource: EUR-Lex\nreference: CELEX ${celex}\nurl: ${url}\n---\n\n${texte}\n`,
  );

  return {
    id: id ?? `TXT-${celex}`,
    titre,
    source: "EUR-Lex",
    reference: `CELEX ${celex}`,
    url,
    nature: "texte",
    contenu: texte,
  };
}
