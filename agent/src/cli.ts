/**
 * Point d'entrée en ligne de commande.
 *
 *   npm run demo                              parcours complet hors ligne (NIS 2 + Hydréa, aucune clé)
 *   npm run analyse -- --fichier <chemin> [--id TXT-NIS2]   analyse un texte téléchargé (.md, .txt ou .html)
 *   npm run analyse -- --celex 32022L2555     télécharge depuis EUR-Lex puis analyse
 *   npm run ingest  -- --celex 32022L2555     télécharge seulement (copie dans data/sources)
 *   npm run veille                            interroge toutes les sources de agent/sources.json
 *   npm run matrices                          recalcule matrices + plan (après des validations)
 *   npm run notion:push                       envoie le store local vers Notion
 */
import { config } from "./config.js";
import { QuotaJournalierError } from "./llm.js";
import { chargerOrganisation } from "./organisation.js";
import { empreinte } from "./parse.js";
import { analyserDocument, enrichirJurisprudence, finaliser } from "./pipeline.js";
import { collecter } from "./sources/index.js";
import { recupererEurLex } from "./sources/eurlex.js";
import { lireFichier } from "./sources/fichier.js";
import type { DocumentRecupere } from "./sources/types.js";
import { chargerStore, enregistrerStore } from "./storage/local.js";
import { comparer, ecrireEtat, estDoublon, lireEtat } from "./state.js";
import type { Store } from "./schemas.js";

function option(nom: string): string | undefined {
  const i = process.argv.indexOf(`--${nom}`);
  return i > 0 ? process.argv[i + 1] : undefined;
}

async function sauvegarder(store: Store): Promise<void> {
  enregistrerStore(store);
  console.log(`\n💾 Résultats enregistrés dans data/store.json`);
  if (config.stockage === "notion") {
    console.log("☁  Synchronisation Notion…");
    const { pousserVersNotion } = await import("./storage/notion.js");
    await pousserVersNotion(store, chargerOrganisation());
    console.log("   ✓ Notion à jour");
  }
}

function afficherSorties(fichiers: string[]): void {
  console.log("\n📊 Livrables générés :");
  for (const f of fichiers) console.log(`   - ${f.replace(`${process.cwd()}/`, "").replace(/^.*?\/outputs\//, "outputs/")}`);
  console.log("\nÉtape suivante : ouvrir le cockpit → streamlit run cockpit/app.py");
}

async function demo(): Promise<void> {
  config.fournisseur = "mock"; // réponses enregistrées : aucune clé ni réseau nécessaires
  const org = chargerOrganisation();
  const store = chargerStore(org.nom);
  console.log(`▶ Démo hors ligne — organisation fictive : ${org.nom}`);
  const doc = lireFichier("data/sources/nis2-extrait.md");
  await analyserDocument(doc, org, store, 1, { verbeux: true });
  store.signaux = demoSignaux();
  await enrichirJurisprudence(store);
  const fichiers = await finaliser(store, org);
  await sauvegarder(store);
  afficherSorties(fichiers);
}

/** Exemples de signaux pour le fil de veille en mode démo (clairement marqués comme tels). */
function demoSignaux(): Store["signaux"] {
  const maintenant = new Date().toISOString();
  return [
    { id: "DEMO-SIG-01", titre: "[Exemple] Suivi de la transposition française de NIS 2 (projet de loi « résilience »)", source: "Assemblée nationale / Sénat", url: "", date_publication: "", detecte_le: maintenant, statut: "nouveau", extrait: "Signal d'exemple : en mode réel, ce fil est alimenté par les flux configurés dans agent/sources.json." },
    { id: "DEMO-SIG-02", titre: "[Exemple] Règlement d'exécution (UE) 2024/2690 — exigences techniques NIS 2", source: "EUR-Lex", url: "https://eur-lex.europa.eu/eli/reg_impl/2024/2690/oj/fra", date_publication: "2024-10-18", detecte_le: maintenant, statut: "nouveau", extrait: "Précise les exigences techniques de l'article 21 §2 pour certaines catégories d'entités." },
  ];
}

async function analyse(): Promise<void> {
  const org = chargerOrganisation();
  const store = chargerStore(org.nom);
  const fichier = option("fichier");
  const celex = option("celex");
  let doc: DocumentRecupere;
  if (fichier) doc = lireFichier(fichier, { id: option("id"), titre: option("titre") });
  else if (celex) doc = await recupererEurLex(celex, option("id"));
  else throw new Error("Préciser --fichier <chemin> ou --celex <numéro>");
  await analyserDocument(doc, org, store, 1, { verbeux: true });
  await enrichirJurisprudence(store);
  const fichiers = await finaliser(store, org);
  await sauvegarder(store);
  afficherSorties(fichiers);
}

async function ingest(): Promise<void> {
  const celex = option("celex");
  if (!celex) throw new Error("Préciser --celex <numéro>, ex. 32022L2555");
  const doc = await recupererEurLex(celex, option("id"));
  console.log(`✓ ${doc.titre}\n  copie enregistrée dans data/sources/eurlex-${celex}.md`);
}

async function veille(): Promise<void> {
  const org = chargerOrganisation();
  const store = chargerStore(org.nom);
  const etat = lireEtat();
  console.log(`▶ Veille — ${new Date().toLocaleString("fr-FR")}`);
  const { documents, erreurs } = await collecter();
  let analyses = 0;
  for (const doc of documents) {
    const emp = empreinte(doc.contenu);
    const doublon = estDoublon(etat, doc.id, emp);
    if (doublon) {
      console.log(`  = ${doc.id} identique à ${doublon} (doublon ignoré)`);
      continue;
    }
    const { statut, version } = comparer(etat, doc.id, doc.url, emp);
    if (statut === "inchange") continue;
    if (doc.nature === "texte") {
      await analyserDocument(doc, org, store, version, { verbeux: true });
      analyses++;
    } else {
      store.signaux = [
        { id: doc.id, titre: doc.titre, source: doc.source, url: doc.url, date_publication: doc.date_publication ?? "", detecte_le: new Date().toISOString(), statut, extrait: doc.contenu.slice(0, 400) },
        ...store.signaux.filter((s) => s.id !== doc.id),
      ].slice(0, 200);
    }
  }
  ecrireEtat(etat);
  console.log(`\n${documents.length} document(s) collecté(s), ${analyses} texte(s) analysé(s), ${erreurs.length} source(s) en erreur`);
  if (analyses > 0) await enrichirJurisprudence(store);
  const fichiers = await finaliser(store, org, analyses > 0 || !store.gouvernance);
  await sauvegarder(store);
  afficherSorties(fichiers);
}

async function matrices(): Promise<void> {
  const org = chargerOrganisation();
  const store = chargerStore(org.nom);
  if (config.stockage === "notion") {
    const { lireDecisionsNotion } = await import("./storage/notion.js");
    console.log(`↓ ${await lireDecisionsNotion(store)} décision(s) récupérée(s) depuis Notion`);
  }
  afficherSorties(await finaliser(store, org, false));
  await sauvegarder(store);
}

async function push(): Promise<void> {
  const org = chargerOrganisation();
  const { pousserVersNotion } = await import("./storage/notion.js");
  await pousserVersNotion(chargerStore(org.nom), org);
  console.log("✓ Notion à jour");
}

const commandes: Record<string, () => Promise<void>> = { demo, analyse, ingest, veille, matrices, push };
const nom = process.argv[2] ?? "demo";
(commandes[nom] ?? (async () => { throw new Error(`Commande inconnue : ${nom}. Disponibles : ${Object.keys(commandes).join(", ")}`); }))().catch((err) => {
  if (err instanceof QuotaJournalierError) {
    console.error(`\n✗ ${err.message}\n→ Changer de modèle dans .env (ex. LLM_MODEL=gemini-flash-lite-latest), passer à Mistral, ou relancer demain.\nDétail : ${err.detail.slice(0, 300)}`);
    process.exit(1);
  }
  console.error(`\n✗ ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
