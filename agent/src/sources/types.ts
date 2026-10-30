/** Format commun renvoyé par tous les connecteurs de sources. */
export interface DocumentRecupere {
  id: string; // identifiant stable (ex. TXT-NIS2, LF-JORFTEXT000..., RSS-CNIL-<hash>)
  titre: string;
  source: string; // "EUR-Lex", "Légifrance", "CNIL", "CERT-FR (ANSSI)", "Fichier local"...
  reference: string;
  url: string;
  date_publication?: string;
  /**
   * - "texte"     : texte juridique complet → découpé en articles et analysé par l'IA
   * - "actualite" : signal de veille (projet de loi, recommandation, alerte) → affiché dans le fil de veille
   */
  nature: "texte" | "actualite";
  contenu: string;
  avertissement?: string;
}

export type ConfigSource =
  | { type: "fichier"; chemin: string; actif?: boolean }
  | { type: "eurlex"; celex: string; id?: string; actif?: boolean }
  | { type: "legifrance"; recherche: string; fond?: string; actif?: boolean }
  | { type: "rss"; nom: string; url: string; motsCles?: string[]; actif?: boolean };
