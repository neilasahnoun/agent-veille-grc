/**
 * Vérification des sorties du modèle d'IA contre le texte officiel.
 * Exigence du TP : « toutes les obligations extraites doivent être vérifiables ».
 *
 * Deux contrôles automatiques :
 *  1. la citation existe-t-elle mot pour mot dans le texte source ? (sinon : hallucination probable)
 *  2. l'article cité correspond-il bien à l'article analysé ?
 * La confiance finale combine la confiance du modèle et ces contrôles.
 */
import { normaliser, type Article } from "./parse.js";
import type { ExigenceExtraite } from "./schemas.js";

export interface ResultatVerification {
  verifiee: boolean;
  detail: string;
  confiance_finale: number;
}

/** Part des mots de la citation retrouvés dans une fenêtre du texte (tolère de petites variations). */
function recouvrement(citation: string, source: string): number {
  const mots = citation.split(" ").filter((m) => m.length > 2);
  if (mots.length === 0) return 0;
  // On cherche la meilleure fenêtre de même longueur dans la source.
  const motsSource = source.split(" ");
  const ensemble = new Set(mots);
  let meilleur = 0;
  const taille = mots.length + 5;
  for (let i = 0; i + 1 < motsSource.length; i += 3) {
    const fenetre = new Set(motsSource.slice(i, i + taille));
    let communs = 0;
    for (const m of ensemble) if (fenetre.has(m)) communs++;
    meilleur = Math.max(meilleur, communs / ensemble.size);
  }
  return meilleur;
}

export function verifierExigence(ex: ExigenceExtraite, article: Article, texteComplet: string): ResultatVerification {
  const citation = normaliser(ex.citation);
  const source = normaliser(texteComplet);
  const motifs: string[] = [];
  let facteur = 1;

  const exacte = citation.length > 15 && source.includes(citation);
  const taux = exacte ? 1 : recouvrement(citation, source);
  if (exacte) motifs.push("citation retrouvée mot pour mot");
  else if (taux >= 0.85) {
    motifs.push(`citation proche du texte (${Math.round(taux * 100)} % des mots)`);
    facteur *= 0.9;
  } else {
    motifs.push(`citation NON retrouvée dans le texte (${Math.round(taux * 100)} % des mots) — à contrôler`);
    facteur *= 0.4;
  }

  const numeroCite = article.numero.startsWith("S") ? article.numero : ex.article.match(/\d+/)?.[0];
  if (article.numero.startsWith("S")) motifs.push(`document sans articles : ${article.titre.toLowerCase()}`);
  else if (numeroCite === article.numero) motifs.push(`article ${article.numero} cohérent`);
  else {
    motifs.push(`article cité (${ex.article}) ≠ article analysé (${article.numero})`);
    facteur *= 0.7;
  }

  const verifiee = taux >= 0.85 && numeroCite === article.numero;
  return {
    verifiee,
    detail: motifs.join(" ; "),
    confiance_finale: Math.round(ex.confiance * facteur * 100) / 100,
  };
}
