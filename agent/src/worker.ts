/**
 * Worker de synchronisation (« worker Notion » du TP).
 * Tourne en continu et garde les livrables cohérents avec les décisions humaines :
 *   1. récupère les validations / corrections / rejets saisis dans Notion (ou dans data/store.json)
 *   2. recalcule risques, lots d'action, matrices M1–M5 et plan de gouvernance
 *   3. renvoie les risques et lots mis à jour vers Notion
 *
 *   npm run worker                 (vérifie toutes les 2 minutes)
 *   WORKER_INTERVAL_S=30 npm run worker
 */
import { statSync } from "node:fs";
import { config } from "./config.js";
import { chargerOrganisation } from "./organisation.js";
import { finaliser } from "./pipeline.js";
import { chargerStore, enregistrerStore } from "./storage/local.js";

const intervalle = Number(process.env.WORKER_INTERVAL_S ?? "120") * 1000;
let derniereModif = 0;

async function tour(): Promise<void> {
  const org = chargerOrganisation();
  const store = chargerStore(org.nom);
  let changements = 0;

  if (config.stockage === "notion") {
    const { lireDecisionsNotion, pousserVersNotion } = await import("./storage/notion.js");
    changements = await lireDecisionsNotion(store);
    if (changements > 0) {
      await finaliser(store, org, false);
      enregistrerStore(store);
      await pousserVersNotion(store, org);
    }
  } else {
    const modif = statSync(config.chemins.store).mtimeMs;
    if (modif > derniereModif + 1000) {
      changements = derniereModif === 0 ? 0 : 1;
      await finaliser(store, org, false);
      enregistrerStore(store);
    }
    derniereModif = statSync(config.chemins.store).mtimeMs;
  }
  const heure = new Date().toLocaleTimeString("fr-FR");
  console.log(changements > 0 ? `[${heure}] ✓ ${changements} décision(s) prise(s) en compte, livrables recalculés` : `[${heure}] rien de nouveau`);
}

console.log(`▶ Worker démarré (stockage : ${config.stockage}, intervalle : ${intervalle / 1000} s). Ctrl+C pour arrêter.`);
const boucle = async () => {
  try {
    await tour();
  } catch (err) {
    console.error(`✗ ${err instanceof Error ? err.message : err}`);
  }
  setTimeout(boucle, intervalle);
};
boucle();
