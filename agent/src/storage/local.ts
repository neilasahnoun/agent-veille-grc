/** Stockage local : data/store.json (utilisé en mode démo et comme copie de travail). */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { config } from "../config.js";
import type { Store } from "../schemas.js";

export function storeVide(organisation: string): Store {
  return {
    genere_le: new Date().toISOString(),
    organisation,
    signaux: [],
    textes: [],
    exigences: [],
    controles: [],
    risques: [],
    jurisprudence: [],
    lots: [],
    requetes_jurisprudence: {},
    gouvernance: null,
  };
}

export function chargerStore(organisation: string): Store {
  if (!existsSync(config.chemins.store)) return storeVide(organisation);
  return { ...storeVide(organisation), ...(JSON.parse(readFileSync(config.chemins.store, "utf8")) as Store) };
}

export function enregistrerStore(store: Store): void {
  mkdirSync(dirname(config.chemins.store), { recursive: true });
  store.genere_le = new Date().toISOString();
  writeFileSync(config.chemins.store, JSON.stringify(store, null, 2));
}
