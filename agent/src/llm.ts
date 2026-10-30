/**
 * Accès au modèle d'IA via l'AI SDK (Vercel).
 *
 * - `google`  → Gemini (offre gratuite, clé sur https://aistudio.google.com)
 * - `mistral` → Mistral (offre gratuite « Experiment », https://console.mistral.ai)
 * - `mock`    → aucun appel réseau : réponses préparées dans data/demo (démo hors ligne)
 *
 * Les bibliothèques `ai` et `@ai-sdk/*` sont importées dynamiquement : le mode démo
 * fonctionne donc même sans clé API.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { config, exiger } from "./config.js";
import { resumePourPrompt, type Organisation } from "./organisation.js";
import type { Article } from "./parse.js";
import {
  ApplicabiliteSchema,
  RecommandationGouvernanceSchema,
  ReponseAnalyseSchema,
  type Applicabilite,
  type RecommandationGouvernance,
  type ReponseAnalyse,
} from "./schemas.js";
import type { z } from "zod";

const MODELES_PAR_DEFAUT = { google: "gemini-3.8-flash", mistral: "mistral-small-latest" } as const;

const SYSTEME = `Tu es un juriste spécialisé en conformité cybersécurité (GRC) au sein d'une équipe d'audit.
Règles impératives :
1. Tu n'inventes RIEN : chaque obligation doit provenir du texte fourni.
2. Le champ "citation" est un extrait copié MOT POUR MOT du texte fourni (pas de reformulation).
3. Le champ "article" donne la référence la plus précise possible (article, paragraphe, point).
4. Une exigence par obligation distincte. Les dispositions qui ne visent que les États membres
   ou la Commission sans créer d'obligation pour l'organisation sont marquées applicable=false.
5. "confiance" reflète ta certitude : baisse-la si le texte est ambigu ou incomplet.
Réponds en français.`;

/** Quota quotidien de l'offre gratuite épuisé : inutile de réessayer avant le lendemain. */
export class QuotaJournalierError extends Error {
  constructor(public detail: string) {
    super("Quota quotidien gratuit atteint pour ce modèle.");
  }
}

let dernierAppel = 0;
async function patienter(): Promise<void> {
  const attente = dernierAppel + config.delaiAppelsMs - Date.now();
  if (attente > 0) await new Promise((r) => setTimeout(r, attente));
  dernierAppel = Date.now();
}

/** Crée le modèle selon le fournisseur choisi dans le .env. */
async function modele(): Promise<unknown> {
  if (config.fournisseur === "google") {
    exiger(config.googleApiKey, "GOOGLE_GENERATIVE_AI_API_KEY", "Créer une clé gratuite sur https://aistudio.google.com/apikey");
    const { createGoogleGenerativeAI } = await import("@ai-sdk/google");
    return createGoogleGenerativeAI({ apiKey: config.googleApiKey })(config.modele || MODELES_PAR_DEFAUT.google);
  }
  if (config.fournisseur === "mistral") {
    exiger(config.mistralApiKey, "MISTRAL_API_KEY", "Créer une clé gratuite sur https://console.mistral.ai/api-keys");
    const { createMistral } = await import("@ai-sdk/mistral");
    return createMistral({ apiKey: config.mistralApiKey })(config.modele || MODELES_PAR_DEFAUT.mistral);
  }
  throw new Error(`LLM_PROVIDER inconnu : ${config.fournisseur}`);
}

/** Appel structuré : le modèle DOIT répondre selon le schéma Zod (sinon erreur + nouvel essai). */
async function genererObjet<T extends z.ZodTypeAny>(schema: T, prompt: string): Promise<z.infer<T>> {
  const { generateObject } = await import("ai");
  const model = await modele();
  for (let essai = 1; ; essai++) {
    await patienter();
    try {
      const { object } = await generateObject({
        model: model as Parameters<typeof generateObject>[0]["model"],
        schema,
        system: SYSTEME,
        prompt,
        temperature: 0,
        maxRetries: 0, // les nouveaux essais sont gérés ici (messages en français, pauses adaptées)
      });
      return object as z.infer<T>;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/no longer available|not found|is not supported|404/i.test(msg)) {
        throw new Error(`Le modèle « ${config.modele || "par défaut"} » n'est pas disponible pour ce compte.\n→ Mettre un autre modèle dans .env, par exemple LLM_MODEL=gemini-flash-latest\nDétail : ${msg}`);
      }
      if (/per ?day|PerDay|daily/i.test(msg)) throw new QuotaJournalierError(msg);
      const quota = /429|quota|rate|RESOURCE_EXHAUSTED/i.test(msg);
      if (essai >= 4) throw new Error(`Échec de l'appel au modèle après ${essai} essais : ${msg}`);
      const pause = quota ? 20_000 * essai : 3_000 * essai;
      console.warn(`  ⚠ ${quota ? "limite de débit atteinte" : "réponse invalide"} — nouvel essai dans ${pause / 1000} s`);
      await new Promise((r) => setTimeout(r, pause));
    }
  }
}

// ---------------------------------------------------------------------------
// Mode démo : réponses enregistrées
// ---------------------------------------------------------------------------
function fixture<T>(nom: string): T {
  return JSON.parse(readFileSync(resolve(config.chemins.demo, nom), "utf8")) as T;
}

// ---------------------------------------------------------------------------
// API utilisée par le reste de l'agent
// ---------------------------------------------------------------------------

export async function analyserApplicabilite(
  titre: string,
  articles: Article[],
  org: Organisation,
  texteId: string,
): Promise<Applicabilite> {
  if (config.fournisseur === "mock") {
    const toutes = fixture<Record<string, Applicabilite>>("applicabilite.json");
    return toutes[texteId] ?? { applicable: false, qualification: "Inconnu (démo)", raisonnement: "Pas de réponse enregistrée pour ce texte en mode démo.", confiance: 0 };
  }
  const champ = articles
    .filter((a) => /champ|entit|définition|application/i.test(a.titre))
    .map((a) => `Article ${a.numero} — ${a.titre}\n${a.contenu}`)
    .join("\n\n")
    .slice(0, 12_000);
  return genererObjet(
    ApplicabiliteSchema,
    `Texte : ${titre}\n\nDispositions sur le champ d'application :\n${champ || "(aucune trouvée, raisonne à partir du titre)"}\n\n${resumePourPrompt(org)}\n\nLe texte s'applique-t-il à cette organisation ? Si oui, avec quelle qualification ?`,
  );
}

/**
 * Extrait les exigences de PLUSIEURS articles en une seule requête (économise le quota gratuit).
 * Renvoie les exigences rangées par numéro d'article (chaque article du lot a une entrée, même vide).
 */
export async function extraireExigencesLot(
  articles: Article[],
  titreTexte: string,
  org: Organisation,
  texteId: string,
): Promise<Map<string, ReponseAnalyse["exigences"]>> {
  const resultat = new Map<string, ReponseAnalyse["exigences"]>(articles.map((a) => [a.numero, []]));
  if (config.fournisseur === "mock") {
    const toutes = fixture<Record<string, ReponseAnalyse>>(`exigences-${texteId}.json`);
    for (const a of articles) resultat.set(a.numero, toutes[a.numero]?.exigences ?? []);
    return resultat;
  }
  const corps = articles.map((a) => `### Article ${a.numero} — ${a.titre}\n"""\n${a.contenu}\n"""`).join("\n\n");
  const reponse = ReponseAnalyseSchema.parse(
    await genererObjet(
      ReponseAnalyseSchema,
      `${resumePourPrompt(org)}\n\nTexte : ${titreTexte}\n\n${corps}\n\nExtrais toutes les obligations de ces ${articles.length} article(s). Pour chaque exigence, le champ "article" commence par le numéro de l'article d'origine (ex. « Art. ${articles[0].numero} §1 »). Indique pour chacune si elle s'applique à l'organisation.`,
    ),
  );
  for (const ex of reponse.exigences) {
    const numero = ex.article.match(/\d+/)?.[0];
    const cible = numero && resultat.has(numero) ? numero : articles[0].numero; // un article inconnu sera signalé par la vérification
    resultat.get(cible)!.push(ex);
  }
  return resultat;
}

export async function recommanderGouvernance(
  syntheseExigences: string,
  scores: Record<string, number>,
  org: Organisation,
): Promise<RecommandationGouvernance> {
  if (config.fournisseur === "mock") return fixture<RecommandationGouvernance>("gouvernance.json");
  return genererObjet(
    RecommandationGouvernanceSchema,
    `${resumePourPrompt(org)}\n\nExigences applicables (identifiant, type, thèmes) :\n${syntheseExigences}\n\nScores calculés par l'agent (part des exigences relevant de chaque cadre) : ${JSON.stringify(scores)}.\n\nRecommande le cadre de gouvernance le plus pertinent pour intégrer ces exigences : TOGAF (architecture d'entreprise), ITIL (gestion des services) ou un hybride. Justifie en t'appuyant sur les exigences. Rappelle que la décision finale appartient à la direction.`,
  );
}
