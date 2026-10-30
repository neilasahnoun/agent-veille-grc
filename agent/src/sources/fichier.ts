/**
 * Source « fichier local » : un texte officiel téléchargé au préalable (autorisé par le TP).
 * Accepte .md / .txt (avec en-tête optionnel) et .html (page EUR-Lex ou Légifrance
 * enregistrée depuis le navigateur avec Ctrl+S).
 */
import { readFileSync } from "node:fs";
import { basename, isAbsolute, resolve } from "node:path";
import { ROOT } from "../config.js";
import { htmlVersTexte, lireEnTete } from "../parse.js";
import type { DocumentRecupere } from "./types.js";

/** Cherche le titre officiel (« DIRECTIVE (UE) 2022/2555 ... du 14 décembre 2022 ») dans le texte. */
export function titreOfficiel(texte: string): string | null {
  const lignes = texte.split("\n").map((l) => l.trim());
  const i = lignes.findIndex((l) => /^(DIRECTIVE|RÈGLEMENT|REGLEMENT|DÉCISION|DECISION|LOI|DÉCRET|DECRET|ORDONNANCE)\b.{5,}/.test(l));
  if (i < 0) return null;
  const suite = /^du \d/i.test(lignes[i + 1] ?? "") ? ` ${lignes[i + 1]}` : "";
  return `${lignes[i]}${suite}`.replace(/\s+/g, " ").slice(0, 250);
}

/** « DIRECTIVE (UE) 2022/2555 » → 32022L2555 ; « RÈGLEMENT (UE) 2024/2690 » → 32024R2690. */
export function celexDepuisTitre(titre: string): string | undefined {
  const m = titre.match(/^(DIRECTIVE|R[ÈE]GLEMENT|D[ÉE]CISION)\b.*?\b(\d{4})\/(\d{1,4})\b/i);
  if (!m) return undefined;
  const type = /^DIR/i.test(m[1]) ? "L" : /^R/i.test(m[1]) ? "R" : "D";
  return `3${m[2]}${type}${m[3].padStart(4, "0")}`;
}

export function lireFichier(chemin: string, opts: { id?: string; titre?: string } = {}): DocumentRecupere {
  const complet = isAbsolute(chemin) ? chemin : resolve(ROOT, chemin);
  const brut = readFileSync(complet, "utf8");
  const nom = basename(complet).replace(/\.[^.]+$/, "");

  if (/\.html?$/i.test(complet)) {
    const texte = htmlVersTexte(brut);
    const titre = opts.titre || titreOfficiel(texte) || brut.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim() || nom;
    const celex =
      brut.match(/CELEX[:%3A]+(\d{5}[A-Z]\d{4})/i)?.[1] ??
      texte.match(/CELEX[:\s]+(\d{5}[A-Z]\d{4})/i)?.[1] ??
      celexDepuisTitre(titre);
    const eurlex = /eur-lex\.europa\.eu/i.test(brut) || Boolean(celex);
    const legifrance = /legifrance\.gouv\.fr/i.test(brut);
    return {
      id: opts.id || `TXT-${nom.toUpperCase()}`,
      titre,
      source: legifrance && !eurlex ? "Légifrance" : eurlex ? "EUR-Lex" : "Fichier local",
      reference: celex ? `CELEX ${celex}` : nom,
      url: celex ? `https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:${celex}` : "",
      nature: "texte",
      contenu: texte,
    };
  }

  const { meta, corps } = lireEnTete(brut);
  const titre = opts.titre || meta.titre || titreOfficiel(corps) || nom;
  const celex = meta.reference ? undefined : celexDepuisTitre(titre);
  return {
    id: opts.id || meta.id || `TXT-${nom.toUpperCase()}`,
    titre,
    source: meta.source || (celex ? "EUR-Lex" : "Fichier local"),
    reference: meta.reference || (celex ? `CELEX ${celex}` : nom),
    url: meta.url || (celex ? `https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:${celex}` : ""),
    date_publication: meta.date_publication,
    nature: "texte",
    contenu: corps,
    avertissement: meta.avertissement,
  };
}
