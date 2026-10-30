/**
 * Synchronisation avec Notion (API officielle, @notionhq/client).
 *  - pousserVersNotion : crée ou met à jour les pages des 6 bases (upsert par identifiant)
 *  - lireDecisionsNotion : récupère les décisions de validation saisies dans le cockpit/Notion
 */
import { config, exiger } from "../config.js";
import type { Organisation } from "../organisation.js";
import { calculerCouverture, calculerRisque, construireLots } from "../matrices.js";
import type { Exigence, StatutValidation, Store } from "../schemas.js";
import { v, type CleBase } from "./notion-schema.js";

// Typage minimal du client (évite de dépendre des types internes de la bibliothèque).
interface PageNotion {
  id: string;
  properties: Record<string, any>;
}
interface ClientNotion {
  databases: {
    query(a: { database_id: string; start_cursor?: string; page_size?: number }): Promise<{ results: PageNotion[]; has_more: boolean; next_cursor: string | null }>;
    create(a: unknown): Promise<{ id: string }>;
    update(a: unknown): Promise<unknown>;
  };
  pages: {
    create(a: unknown): Promise<{ id: string }>;
    update(a: unknown): Promise<unknown>;
  };
}

export async function clientNotion(): Promise<ClientNotion> {
  const token = exiger(config.notion.token, "NOTION_TOKEN", "Créer une intégration interne sur https://www.notion.so/profile/integrations et copier son « Internal Integration Secret »");
  const { Client } = await import("@notionhq/client");
  return new Client({ auth: token }) as unknown as ClientNotion;
}

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Notion autorise environ 3 requêtes/s : on espace les appels et on réessaie si besoin. */
async function appel<T>(fn: () => Promise<T>): Promise<T> {
  for (let essai = 1; ; essai++) {
    try {
      await pause(350);
      return await fn();
    } catch (err: any) {
      if (essai >= 4 || !(err?.status === 429 || err?.status >= 500)) throw err;
      await pause(1500 * essai);
    }
  }
}

function idBase(cle: CleBase): string {
  return exiger(config.notion.bases[cle], `NOTION_DB_${cle.toUpperCase()}`, "Lancer `npm run notion:setup` puis copier les identifiants affichés dans le .env");
}

/** Index « identifiant métier → id de page Notion » pour une base. */
async function indexer(notion: ClientNotion, cle: CleBase): Promise<Map<string, PageNotion>> {
  const index = new Map<string, PageNotion>();
  let curseur: string | undefined;
  do {
    const rep = await appel(() => notion.databases.query({ database_id: idBase(cle), start_cursor: curseur, page_size: 100 }));
    for (const p of rep.results) {
      const titre = p.properties.ID?.title?.[0]?.plain_text;
      if (titre) index.set(titre, p);
    }
    curseur = rep.has_more ? rep.next_cursor ?? undefined : undefined;
  } while (curseur);
  return index;
}

async function upsert(notion: ClientNotion, cle: CleBase, index: Map<string, PageNotion>, id: string, proprietes: Record<string, unknown>): Promise<string> {
  const existante = index.get(id);
  if (existante) {
    await appel(() => notion.pages.update({ page_id: existante.id, properties: proprietes }));
    return existante.id;
  }
  const page = await appel(() => notion.pages.create({ parent: { database_id: idBase(cle) }, properties: { ID: v.titre(id), ...proprietes } }));
  index.set(id, { id: page.id, properties: {} });
  return page.id;
}

export async function pousserVersNotion(store: Store, org: Organisation): Promise<void> {
  const notion = await clientNotion();
  const idx = {
    textes: await indexer(notion, "textes"),
    exigences: await indexer(notion, "exigences"),
    controles: await indexer(notion, "controles"),
    risques: await indexer(notion, "risques"),
    jurisprudence: await indexer(notion, "jurisprudence"),
    lots: await indexer(notion, "lots"),
  };
  const pageDe: Record<string, string> = {};

  console.log(`  → Textes (${store.textes.length}) et signaux (${store.signaux.length})`);
  for (const t of store.textes) {
    pageDe[t.id] = await upsert(notion, "textes", idx.textes, t.id, {
      Titre: v.texte(t.titre), Nature: v.select("Texte analysé"), Source: v.select(t.source), Référence: v.texte(t.reference),
      URL: v.url(t.url), Empreinte: v.texte(t.empreinte), Version: v.nombre(t.version), "Date détection": v.date(t.date_detection),
      "Date publication": v.texte(t.date_publication), Applicable: v.case(t.applicable), Qualification: v.texte(t.qualification), Confiance: v.nombre(t.confiance),
    });
  }
  for (const s of store.signaux) {
    await upsert(notion, "textes", idx.textes, s.id, {
      Titre: v.texte(s.titre), Nature: v.select("Signal de veille"), Source: v.select(s.source), URL: v.url(s.url),
      "Date détection": v.date(s.detecte_le), "Date publication": v.texte(s.date_publication), Applicable: v.case(false),
    });
  }

  console.log(`  → Contrôles (${org.controles.length})`);
  for (const c of org.controles) {
    pageDe[c.id] = await upsert(notion, "controles", idx.controles, c.id, {
      Nom: v.texte(c.nom), Thèmes: v.multi(c.themes), Maturité: v.nombre(c.maturite), Propriétaire: v.texte(c.proprietaire),
    });
  }

  console.log(`  → Exigences (${store.exigences.length})`);
  for (const e of store.exigences) {
    const couv = calculerCouverture(e, org);
    pageDe[e.id] = await upsert(notion, "exigences", idx.exigences, e.id, {
      Intitulé: v.texte(e.intitule), Article: v.texte(e.article), Obligation: v.texte(e.obligation), Citation: v.texte(e.citation),
      Destinataire: v.select(e.destinataire), Type: v.select(e.type), Thèmes: v.multi(e.themes), Échéance: v.texte(e.echeance),
      Sanction: v.texte(e.sanction), Applicable: v.case(e.applicable), Justification: v.texte(e.justification_applicabilite),
      Confiance: v.nombre(e.confiance_finale), Vérifiée: v.case(e.verifiee), Vérification: v.texte(e.verification_detail),
      "Statut validation": v.select(e.statut_validation), Commentaire: v.texte(e.commentaire_validation), "Validé par": v.texte(e.valide_par),
      "Date validation": v.date(e.date_validation), "URL source": v.url(e.url_source), Couverture: v.select(e.applicable ? couv.statut : null),
      Texte: v.relation(pageDe[e.texte_id] ? [pageDe[e.texte_id]] : []),
      Contrôles: v.relation(couv.controles.map((id) => pageDe[id]).filter(Boolean)),
    });
  }

  console.log(`  → Risques, jurisprudence et lots d'action`);
  for (const e of store.exigences.filter((x) => x.applicable && x.statut_validation !== "Rejetée")) {
    const r = calculerRisque(e, org);
    await upsert(notion, "risques", idx.risques, r.id, {
      Intitulé: v.texte(r.intitule), Probabilité: v.nombre(r.probabilite), Impact: v.nombre(r.impact), Inhérent: v.nombre(r.score_inherent),
      Couverture: v.nombre(r.couverture), Résiduel: v.nombre(r.score_residuel), Niveau: v.select(r.niveau), Conséquences: v.texte(r.consequences),
      Exigence: v.relation([pageDe[e.id]]),
    });
  }
  for (const j of store.jurisprudence) {
    await upsert(notion, "jurisprudence", idx.jurisprudence, j.id, {
      Juridiction: v.texte(j.juridiction), Date: v.texte(j.date), Numéro: v.texte(j.numero), URL: v.url(j.url), Résumé: v.texte(j.resume),
      Requête: v.texte(j.requete), Exigences: v.relation(j.exigence_ids.map((id) => pageDe[id]).filter(Boolean)),
    });
  }
  for (const l of construireLots(store, org)) {
    await upsert(notion, "lots", idx.lots, l.id, {
      Intitulé: v.texte(l.intitule), Thème: v.select(l.theme), Priorité: v.select(l.priorite), Échéance: v.date(l.echeance),
      Responsable: v.texte(l.responsable), Statut: v.select(l.statut), Description: v.texte(l.description),
      Exigences: v.relation(l.exigence_ids.map((id) => pageDe[id]).filter(Boolean)),
    });
  }
}

/** Lit dans Notion les décisions humaines (statut, commentaire, correction) et les reporte dans le store. */
export async function lireDecisionsNotion(store: Store): Promise<number> {
  const notion = await clientNotion();
  const index = await indexer(notion, "exigences");
  const lireTexte = (p: PageNotion, nom: string) => (p.properties[nom]?.rich_text ?? []).map((t: any) => t.plain_text).join("");
  let changements = 0;
  for (const e of store.exigences as Exigence[]) {
    const page = index.get(e.id);
    if (!page) continue;
    const statut = (page.properties["Statut validation"]?.select?.name ?? e.statut_validation) as StatutValidation;
    const commentaire = lireTexte(page, "Commentaire");
    const obligation = lireTexte(page, "Obligation") || e.obligation;
    if (statut !== e.statut_validation || commentaire !== e.commentaire_validation || obligation !== e.obligation) {
      e.statut_validation = statut;
      e.commentaire_validation = commentaire;
      e.obligation = obligation;
      e.valide_par = lireTexte(page, "Validé par") || e.valide_par;
      e.date_validation = page.properties["Date validation"]?.date?.start ?? e.date_validation;
      changements++;
    }
  }
  return changements;
}
