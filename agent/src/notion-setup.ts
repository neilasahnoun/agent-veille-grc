/**
 * Crée automatiquement les 6 bases Notion reliées dans la page indiquée par NOTION_PARENT_PAGE_ID,
 * puis écrit leurs identifiants dans le fichier .env.
 *
 * Avant de lancer : dans Notion, ouvrir la page parente → « ••• » → « Connexions » →
 * ajouter votre intégration (sinon l'API n'a pas le droit d'y écrire).
 *
 *   npm run notion:setup
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { config, exiger, ROOT } from "./config.js";
import { chargerOrganisation } from "./organisation.js";
import { clientNotion, pousserVersNotion } from "./storage/notion.js";
import { PROPRIETES, RELATIONS, TITRES_BASES, type CleBase } from "./storage/notion-schema.js";
import { storeVide } from "./storage/local.js";

/** Accepte un identifiant brut ou une URL de page Notion copiée depuis le navigateur. */
function extraireIdPage(valeur: string): string {
  // Lien du type https://www.notion.so/Veille-GRC-409fe7ba...?source=copy_link :
  // l'identifiant est formé des 32 derniers caractères hexadécimaux du dernier segment.
  const segment = valeur.split("?")[0].split("#")[0].split("/").pop() ?? valeur;
  const hex = segment.replace(/-/g, "").match(/[0-9a-f]{32}$/i)?.[0];
  if (!hex) throw new Error(`NOTION_PARENT_PAGE_ID ne ressemble pas à un identifiant de page Notion : ${valeur}`);
  return hex;
}

function majEnv(valeurs: Record<string, string>): void {
  const chemin = resolve(ROOT, ".env");
  let contenu = existsSync(chemin) ? readFileSync(chemin, "utf8") : "";
  for (const [cle, val] of Object.entries(valeurs)) {
    const ligne = `${cle}=${val}`;
    contenu = new RegExp(`^${cle}=.*$`, "m").test(contenu) ? contenu.replace(new RegExp(`^${cle}=.*$`, "m"), ligne) : `${contenu.trimEnd()}\n${ligne}\n`;
  }
  writeFileSync(chemin, contenu);
}

async function main(): Promise<void> {
  const notion = await clientNotion();
  const parent = extraireIdPage(exiger(config.notion.pageParente, "NOTION_PARENT_PAGE_ID", "Créer une page vide dans Notion, la partager avec l'intégration et copier son lien"));
  const ids = {} as Record<CleBase, string>;

  for (const cle of Object.keys(PROPRIETES) as CleBase[]) {
    if (config.notion.bases[cle]) {
      ids[cle] = config.notion.bases[cle];
      console.log(`• ${TITRES_BASES[cle]} existe déjà (${ids[cle]})`);
      continue;
    }
    const db = await notion.databases.create({
      parent: { type: "page_id", page_id: parent },
      title: [{ type: "text", text: { content: TITRES_BASES[cle] } }],
      properties: PROPRIETES[cle],
    });
    ids[cle] = db.id;
    console.log(`✓ Base « ${TITRES_BASES[cle]} » créée`);
  }

  for (const [source, nom, cible] of RELATIONS) {
    await notion.databases.update({
      database_id: ids[source],
      properties: { [nom]: { relation: { database_id: ids[cible], type: "dual_property", dual_property: {} } } },
    });
    console.log(`✓ Relation ${TITRES_BASES[source]}.${nom} → ${TITRES_BASES[cible]}`);
  }

  const env = Object.fromEntries((Object.keys(ids) as CleBase[]).map((c) => [`NOTION_DB_${c.toUpperCase()}`, ids[c]]));
  majEnv(env);
  Object.assign(config.notion.bases, ids);
  console.log("\n✓ Identifiants enregistrés dans .env :");
  for (const [k, val] of Object.entries(env)) console.log(`  ${k}=${val}`);

  // Les contrôles existants de l'organisation sont chargés tout de suite.
  const org = chargerOrganisation();
  await pousserVersNotion(storeVide(org.nom), org);
  console.log("\nTerminé. Étape suivante : `npm run demo` (ou `npm run veille`) avec STORAGE=notion.");
}

main().catch((err) => {
  console.error(`\n✗ ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
