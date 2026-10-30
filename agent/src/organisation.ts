/** Chargement du profil de l'organisation analysée (data/organisation/*.json). */
import { readFileSync } from "node:fs";
import { config } from "./config.js";
import type { Controle, Theme } from "./schemas.js";

export interface ElementOrg {
  id: string;
  nom: string;
  themes: Theme[];
  criticite?: number;
  sensibilite?: number;
}

export interface Organisation {
  id: string;
  nom: string;
  forme: string;
  pays: string;
  effectif: number;
  chiffre_affaires_meur: number;
  secteur_nis2: string;
  taille: string;
  description: string;
  processus: ElementOrg[];
  systemes: ElementOrg[];
  donnees: ElementOrg[];
  contrats: ElementOrg[];
  controles: Controle[];
}

export function chargerOrganisation(chemin = config.organisation): Organisation {
  return JSON.parse(readFileSync(chemin, "utf8")) as Organisation;
}

/** Résumé compact envoyé au modèle d'IA (pas besoin de tout lui donner). */
export function resumePourPrompt(org: Organisation): string {
  const liste = (els: ElementOrg[]) => els.map((e) => `${e.id} ${e.nom}`).join(" ; ");
  return [
    `Organisation : ${org.nom} — ${org.forme} (${org.pays}).`,
    `Effectif : ${org.effectif} salariés ; chiffre d'affaires : ${org.chiffre_affaires_meur} M€ ; ${org.taille}.`,
    `Secteur : ${org.secteur_nis2}.`,
    `Activité : ${org.description}`,
    `Processus : ${liste(org.processus)}.`,
    `Systèmes : ${liste(org.systemes)}.`,
  ].join("\n");
}
