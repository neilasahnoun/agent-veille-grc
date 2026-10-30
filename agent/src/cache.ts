/**
 * Cache des réponses du modèle d'IA (data/cache-ia.json).
 * Les offres gratuites limitent le nombre de requêtes PAR JOUR : si l'analyse s'arrête
 * (quota atteint, coupure réseau), les articles déjà analysés sont conservés et la
 * commande suivante reprend là où elle s'était arrêtée, même avec un autre modèle.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { config } from "./config.js";

const CHEMIN = () => resolve(config.chemins.sorties, "..", "data", "cache-ia.json");
let memoire: Record<string, unknown> | null = null;

function charger(): Record<string, unknown> {
  if (!memoire) memoire = existsSync(CHEMIN()) ? (JSON.parse(readFileSync(CHEMIN(), "utf8")) as Record<string, unknown>) : {};
  return memoire;
}

export const cleCache = (...parties: string[]) => createHash("sha256").update(parties.join("\u0000")).digest("hex").slice(0, 32);

export function lireCache<T>(cle: string): T | undefined {
  return charger()[cle] as T | undefined;
}

export function ecrireCache(cle: string, valeur: unknown): void {
  if (config.fournisseur === "mock") return; // la démo n'a pas besoin de cache
  charger()[cle] = valeur;
  writeFileSync(CHEMIN(), JSON.stringify(memoire));
}
