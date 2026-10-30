/**
 * Découpage d'un texte juridique en articles, et utilitaires de normalisation.
 * Le découpage permet d'envoyer le texte article par article au modèle d'IA
 * (réponses plus précises, et chaque exigence garde la trace de son article).
 */
import { createHash } from "node:crypto";

export interface Article {
  numero: string; // "21"
  titre: string; // "Mesures de gestion des risques..."
  contenu: string;
}

export interface DocumentSource {
  meta: Record<string, string>;
  corps: string;
}

/** Lit l'en-tête YAML simple (--- clé: valeur ---) d'un fichier source. */
export function lireEnTete(brut: string): DocumentSource {
  const m = brut.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { meta: {}, corps: brut };
  const meta: Record<string, string> = {};
  let cleEnCours = "";
  for (const ligne of m[1].split("\n")) {
    const kv = ligne.match(/^([a-z_]+):\s*(.*)$/);
    if (kv) {
      cleEnCours = kv[1];
      meta[cleEnCours] = kv[2] === ">" ? "" : kv[2];
    } else if (cleEnCours && ligne.startsWith("  ")) {
      meta[cleEnCours] = `${meta[cleEnCours]} ${ligne.trim()}`.trim();
    }
  }
  return { meta, corps: m[2] };
}

/** Découpe le corps d'un texte sur les lignes « Article N ». */
export function decouperArticles(corps: string): Article[] {
  const lignes = corps.split(/\r?\n/);
  const articles: Article[] = [];
  let courant: Article | null = null;
  for (let i = 0; i < lignes.length; i++) {
    const m = lignes[i].trim().match(/^Article\s+(premier|\d+[a-z]?(?:\s?(?:bis|ter))?)\s*$/i);
    if (m) {
      if (courant) articles.push(courant);
      const titre = (lignes[i + 1] ?? "").trim();
      const numero = /^premier$/i.test(m[1]) ? "1" : m[1].replace(/\s/g, "");
      courant = { numero, titre, contenu: "" };
      i++; // la ligne suivante est le titre
      continue;
    }
    if (courant) courant.contenu += `${lignes[i]}\n`;
  }
  if (courant) articles.push(courant);
  // Une page web peut contenir deux fois le même article (sommaire, version consolidée...) :
  // on garde la première occurrence non vide pour que chaque identifiant d'exigence reste unique.
  const vus = new Map<string, Article>();
  for (const a of articles) {
    const contenu = a.contenu.trim();
    const deja = vus.get(a.numero);
    if (!deja || (!deja.contenu && contenu)) vus.set(a.numero, { ...a, contenu });
  }
  return [...vus.values()];
}

/** Normalise un texte pour comparer une citation avec la source (accents, espaces, apostrophes). */
export function normaliser(t: string): string {
  return t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’‘`´]/g, "'")
    .replace(/[«»“”"]/g, "")
    .replace(/\s+/g, " ")
    .replace(/\s([;:,.!?])/g, "$1")
    .trim();
}

export function empreinte(contenu: string): string {
  return createHash("sha256").update(normaliser(contenu)).digest("hex");
}

/** Convertit une page HTML (EUR-Lex, Légifrance) en texte brut avec retours à la ligne. */
export function htmlVersTexte(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<(br|\/p|\/div|\/tr|\/li|\/h\d|\/table)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&rsquo;/g, "'")
    .replace(/&laquo;/g, "«")
    .replace(/&raquo;/g, "»")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    // Dans les tableaux EUR-Lex, « a) » et son texte sont dans deux cellules : on les recolle.
    .replace(/\n([a-z]{1,2}\)|[ivx]+\)|\d+\.|\(\d+\))\n+/g, "\n$1 ")
    .trim();
}
