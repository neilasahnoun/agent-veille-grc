/**
 * Configuration de l'agent.
 * Toutes les valeurs viennent du fichier `.env` placé à la racine du dépôt
 * (copier `.env.example` en `.env`, puis remplir ses propres clés).
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Racine du dépôt (le dossier qui contient agent/, cockpit/, data/...). */
export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

/**
 * Charge le `.env` de la racine. On lit le fichier nous-mêmes (format CLÉ=valeur)
 * pour ne dépendre d'aucune bibliothèque ; les variables déjà définies dans
 * l'environnement (ex. secrets GitHub Actions) sont prioritaires.
 */
function chargerEnv(): void {
  const chemin = resolve(ROOT, ".env");
  if (!existsSync(chemin)) return;
  for (const ligne of readFileSync(chemin, "utf8").split(/\r?\n/)) {
    const m = ligne.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m || ligne.trim().startsWith("#")) continue;
    const [, cle, brut] = m;
    const valeur = brut.replace(/^["']|["']$/g, "");
    if (process.env[cle] === undefined) process.env[cle] = valeur;
  }
}
chargerEnv();

const env = (cle: string, defaut = ""): string => (process.env[cle] ?? defaut).trim();

export type Fournisseur = "google" | "mistral" | "mock";
export type Stockage = "local" | "notion";

export const config = {
  /** Fournisseur du modèle d'IA : google (Gemini, gratuit), mistral (gratuit), mock (démo hors ligne). */
  fournisseur: (env("LLM_PROVIDER", "mock") as Fournisseur),
  modele: env("LLM_MODEL"),
  googleApiKey: env("GOOGLE_GENERATIVE_AI_API_KEY"),
  mistralApiKey: env("MISTRAL_API_KEY"),
  /** Pause entre deux appels au modèle (les offres gratuites limitent le débit). */
  delaiAppelsMs: Number(env("LLM_DELAY_MS", "4000")),

  /** Où sont enregistrés les résultats : local (data/store.json) ou notion. */
  stockage: (env("STORAGE", "local") as Stockage),
  notion: {
    token: env("NOTION_TOKEN"),
    pageParente: env("NOTION_PARENT_PAGE_ID"),
    bases: {
      textes: env("NOTION_DB_TEXTES"),
      exigences: env("NOTION_DB_EXIGENCES"),
      controles: env("NOTION_DB_CONTROLES"),
      risques: env("NOTION_DB_RISQUES"),
      jurisprudence: env("NOTION_DB_JURISPRUDENCE"),
      lots: env("NOTION_DB_LOTS"),
    },
  },

  /** Identifiants PISTE (Légifrance + Judilibre). Optionnels. */
  piste: {
    clientId: env("PISTE_CLIENT_ID"),
    clientSecret: env("PISTE_CLIENT_SECRET"),
    sandbox: env("PISTE_SANDBOX", "false") === "true",
  },

  /** Fichier décrivant l'organisation analysée. */
  organisation: resolve(ROOT, env("ORGANISATION_FILE", "data/organisation/hydrea.json")),

  chemins: {
    store: resolve(ROOT, "data/store.json"),
    etat: resolve(ROOT, "data/etat-veille.json"),
    demo: resolve(ROOT, "data/demo"),
    sources: resolve(ROOT, "data/sources"),
    sorties: resolve(ROOT, "outputs"),
    configSources: resolve(ROOT, "agent/sources.json"),
  },
};

/** Vérifie qu'une clé est présente et explique quoi faire sinon. */
export function exiger(valeur: string, nom: string, aide: string): string {
  if (!valeur) {
    throw new Error(`Variable ${nom} manquante dans le fichier .env.\n→ ${aide}`);
  }
  return valeur;
}
