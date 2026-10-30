/**
 * État de la veille : mémorise l'empreinte (hash) de chaque document déjà vu.
 * → détection des modifications (empreinte différente) et déduplication (même empreinte).
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { config } from "./config.js";

export interface EntreeEtat {
  id: string;
  url: string;
  empreinte: string;
  vu_le: string;
  version: number;
}

type Etat = Record<string, EntreeEtat>;

export function lireEtat(): Etat {
  return existsSync(config.chemins.etat) ? (JSON.parse(readFileSync(config.chemins.etat, "utf8")) as Etat) : {};
}

export function ecrireEtat(etat: Etat): void {
  writeFileSync(config.chemins.etat, JSON.stringify(etat, null, 2));
}

export type Nouveaute = "nouveau" | "modifie" | "inchange";

/** Compare un document avec l'état connu et met l'état à jour. */
export function comparer(etat: Etat, id: string, url: string, emp: string): { statut: Nouveaute; version: number } {
  const connu = etat[id];
  if (connu && connu.empreinte === emp) return { statut: "inchange", version: connu.version };
  const version = connu ? connu.version + 1 : 1;
  etat[id] = { id, url, empreinte: emp, vu_le: new Date().toISOString(), version };
  return { statut: connu ? "modifie" : "nouveau", version };
}

/** Déduplication : deux sources différentes peuvent publier le même contenu. */
export function estDoublon(etat: Etat, id: string, emp: string): string | null {
  const autre = Object.values(etat).find((e) => e.empreinte === emp && e.id !== id);
  return autre ? autre.id : null;
}
