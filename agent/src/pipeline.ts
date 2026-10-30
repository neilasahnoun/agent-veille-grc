/**
 * Chaîne de traitement complète :
 *   document → articles → applicabilité → extraction IA → vérification → store
 *   → jurisprudence → risques / lots / matrices → plan de gouvernance → (Notion)
 */
import { config } from "./config.js";
import { ecrirePlanGouvernance, produireGouvernance } from "./gouvernance.js";
import { cleCache, ecrireCache, lireCache } from "./cache.js";
import { analyserApplicabilite, extraireExigencesLot, QuotaJournalierError } from "./llm.js";
import { calculerRisque, construireLots, exigencesActives, exporterMatrices } from "./matrices.js";
import type { Organisation } from "./organisation.js";
import { decouperArticles, empreinte, type Article } from "./parse.js";
import type { Applicabilite, Exigence, ExigenceExtraite, Store, Texte, Theme } from "./schemas.js";
import { rechercherJurisprudence } from "./sources/judilibre.js";
import { pisteConfiguree } from "./sources/piste.js";
import type { DocumentRecupere } from "./sources/types.js";
import { verifierExigence } from "./verify.js";

/** Requêtes Judilibre par thème (formulées comme un juriste les taperait). */
const REQUETES_THEME: Record<Theme, string> = {
  "gouvernance": "responsabilité dirigeant sécurité informatique manquement",
  "gestion-risques": "obligation de sécurité système d'information analyse des risques",
  "gestion-incidents": "incident de sécurité informatique responsabilité",
  "notification": "notification violation de données délai autorité",
  "continuite": "interruption de service informatique continuité responsabilité",
  "chaine-approvisionnement": "prestataire informatique obligation de sécurité sous-traitant",
  "developpement-securise": "défaut de sécurité logiciel prestataire obligation de conseil",
  "vulnerabilites": "faille de sécurité informatique négligence",
  "evaluation-efficacite": "audit de sécurité informatique manquement",
  "cyberhygiene-formation": "hameçonnage salarié faute virement frauduleux",
  "cryptographie": "chiffrement données personnelles sécurité",
  "rh-securite": "salarié accès système informatique licenciement données",
  "controle-acces": "accès frauduleux système de traitement automatisé de données",
  "gestion-actifs": "inventaire matériel informatique sécurité responsabilité",
  "authentification-mfa": "authentification forte fraude responsabilité",
  "communications-securisees": "interception communications électroniques sécurité",
  "supervision-audit": "contrôle autorité administrative sécurité des systèmes d'information sanction",
};

const court = (texteId: string) => texteId.replace(/^TXT-/, "");

export interface OptionsAnalyse {
  /** Affiche la progression article par article. */
  verbeux?: boolean;
}

/** Analyse un texte juridique complet et fusionne les résultats dans le store. */
export async function analyserDocument(doc: DocumentRecupere, org: Organisation, store: Store, version = 1, opts: OptionsAnalyse = {}): Promise<Texte> {
  const articles = decouperArticles(doc.contenu);
  if (articles.length === 0) throw new Error(`Aucun article détecté dans « ${doc.titre} » (le texte doit contenir des lignes « Article N »).`);
  const nums = articles.map((a) => a.numero);
  console.log(`\n📄 ${doc.titre}\n   ${articles.length} article(s) détecté(s) (${nums[0]} à ${nums[nums.length - 1]}) — modèle : ${config.fournisseur}${config.modele ? ` / ${config.modele}` : ""}`);

  const cleApp = cleCache("applicabilite", org.id, doc.id, empreinte(doc.contenu));
  const app = lireCache<Applicabilite>(cleApp) ?? (await analyserApplicabilite(doc.titre, articles, org, doc.id));
  ecrireCache(cleApp, app);
  console.log(`   Applicabilité : ${app.applicable ? "OUI" : "NON"} — ${app.qualification} (confiance ${app.confiance})`);

  const texte: Texte = {
    id: doc.id,
    titre: doc.titre,
    source: doc.source,
    reference: doc.reference,
    url: doc.url,
    empreinte: empreinte(doc.contenu),
    date_detection: new Date().toISOString(),
    date_publication: doc.date_publication,
    applicable: app.applicable,
    qualification: app.qualification,
    raisonnement: app.raisonnement + (doc.avertissement ? `\n\n⚠ ${doc.avertissement}` : ""),
    confiance: app.confiance,
    version,
  };
  store.textes = [...store.textes.filter((t) => t.id !== texte.id), texte];

  const anciennes = new Map(store.exigences.filter((e) => e.texte_id === doc.id).map((e) => [e.id, e]));
  const nouvelles: Exigence[] = [];
  const extraites = await extraireAvecReprise(articles, doc.titre, org, doc.id, opts);
  for (const article of articles) {
    const exigences = extraites.get(article.numero) ?? [];
    exigences.forEach((ex, i) => {
      const id = `REQ-${court(doc.id)}-${article.numero.padStart(3, "0")}-${String(i + 1).padStart(2, "0")}`;
      const verif = verifierExigence(ex, article, doc.contenu);
      const ancienne = anciennes.get(id);
      // Une décision humaine est conservée tant que la citation (donc le texte) n'a pas changé.
      const garder = ancienne && ancienne.citation === ex.citation;
      nouvelles.push({
        ...ex,
        applicable: app.applicable && ex.applicable,
        id,
        texte_id: doc.id,
        url_source: doc.url,
        verifiee: verif.verifiee,
        verification_detail: verif.detail,
        confiance_finale: verif.confiance_finale,
        statut_validation: garder ? ancienne.statut_validation : "À valider",
        commentaire_validation: garder ? ancienne.commentaire_validation : ancienne ? "Texte modifié : nouvelle validation nécessaire" : "",
        date_validation: garder ? ancienne.date_validation : null,
        valide_par: garder ? ancienne.valide_par : null,
        obligation: garder && ancienne.statut_validation === "Corrigée" ? ancienne.obligation : ex.obligation,
      });
    });
  }
  store.exigences = [...store.exigences.filter((e) => e.texte_id !== doc.id), ...nouvelles];
  const ok = nouvelles.filter((e) => e.verifiee).length;
  console.log(`   ${nouvelles.length} exigences extraites, ${ok} vérifiées dans le texte, ${nouvelles.filter((e) => e.applicable).length} applicables`);
  return texte;
}

/** Taille maximale d'un lot d'articles envoyé en une seule requête. */
const LOT_MAX_CARACTERES = 15_000;
const LOT_MAX_ARTICLES = 10;

function former_lots(articles: Article[]): Article[][] {
  const lots: Article[][] = [];
  let courant: Article[] = [];
  let taille = 0;
  for (const a of articles) {
    if (courant.length && (taille + a.contenu.length > LOT_MAX_CARACTERES || courant.length >= LOT_MAX_ARTICLES)) {
      lots.push(courant);
      courant = [];
      taille = 0;
    }
    courant.push(a);
    taille += a.contenu.length;
  }
  if (courant.length) lots.push(courant);
  return lots;
}

/** Analyse les articles par lots, en réutilisant le cache : une analyse interrompue reprend où elle s'était arrêtée. */
async function extraireAvecReprise(articles: Article[], titre: string, org: Organisation, texteId: string, opts: OptionsAnalyse): Promise<Map<string, ExigenceExtraite[]>> {
  const resultat = new Map<string, ExigenceExtraite[]>();
  const cle = (a: Article) => cleCache("article", org.id, texteId, a.numero, empreinte(a.contenu));
  const restants: Article[] = [];
  for (const a of articles) {
    const enCache = lireCache<ExigenceExtraite[]>(cle(a));
    if (enCache) resultat.set(a.numero, enCache);
    else restants.push(a);
  }
  if (config.fournisseur !== "mock" && resultat.size > 0) console.log(`   ${resultat.size} article(s) déjà analysé(s) lors d'un passage précédent (repris du cache)`);
  const lots = former_lots(restants);
  if (config.fournisseur !== "mock" && lots.length) console.log(`   ${restants.length} article(s) à analyser en ${lots.length} requête(s)`);
  for (const [i, lot] of lots.entries()) {
    try {
      const reponse = await extraireExigencesLot(lot, titre, org, texteId);
      for (const a of lot) {
        const ex = reponse.get(a.numero) ?? [];
        resultat.set(a.numero, ex);
        ecrireCache(cle(a), ex);
        if (opts.verbeux) console.log(`   Art. ${a.numero.padEnd(4)} → ${ex.length} exigence(s)`);
      }
      if (config.fournisseur !== "mock") console.log(`   — requête ${i + 1}/${lots.length} terminée`);
    } catch (err) {
      const faits = resultat.size;
      if (err instanceof QuotaJournalierError) {
        throw new Error(
          `Quota quotidien gratuit atteint (${faits}/${articles.length} articles analysés, ils sont gardés en mémoire).\n` +
            `→ Solution 1 : changer de modèle (chaque modèle a son propre quota) : dans .env, LLM_MODEL=gemini-flash-lite-latest, puis relancer la même commande.\n` +
            `→ Solution 2 : utiliser Mistral (quota beaucoup plus large) : LLM_PROVIDER=mistral et MISTRAL_API_KEY=...\n` +
            `→ Solution 3 : relancer la même commande demain, l'analyse reprendra à l'article suivant.\n` +
            `Détail : ${err.detail.slice(0, 300)}`,
        );
      }
      throw new Error(`${err instanceof Error ? err.message : err}\n(${faits}/${articles.length} articles analysés et gardés en mémoire : relancer la même commande pour reprendre.)`);
    }
  }
  return resultat;
}

/** Module 2 + M5 : recherche de jurisprudence pour chaque exigence applicable. */
export async function enrichirJurisprudence(store: Store): Promise<void> {
  const actives = exigencesActives(store);
  for (const e of actives) store.requetes_jurisprudence[e.id] = REQUETES_THEME[e.themes[0]];
  if (config.fournisseur === "mock" || !pisteConfiguree()) {
    console.log("\n⚖  Jurisprudence : requêtes préparées (Judilibre non interrogé : mode démo ou identifiants PISTE absents)");
    return;
  }
  console.log("\n⚖  Recherche de jurisprudence sur Judilibre…");
  const parRequete = new Map<string, string[]>();
  for (const e of actives) parRequete.set(store.requetes_jurisprudence[e.id], [...(parRequete.get(store.requetes_jurisprudence[e.id]) ?? []), e.id]);
  const decisions = new Map(store.jurisprudence.map((d) => [d.id, d]));
  for (const [requete, ids] of parRequete) {
    try {
      for (const d of await rechercherJurisprudence(requete, ids[0])) {
        const existante = decisions.get(d.id);
        decisions.set(d.id, { ...d, exigence_ids: [...new Set([...(existante?.exigence_ids ?? []), ...ids])] });
      }
    } catch (err) {
      console.warn(`   ✗ « ${requete} » : ${err instanceof Error ? err.message : err}`);
    }
  }
  store.jurisprudence = [...decisions.values()];
  console.log(`   ${store.jurisprudence.length} décision(s) associée(s)`);
}

/** Recalcule tout ce qui découle des exigences (après analyse OU après validation humaine). */
export async function finaliser(store: Store, org: Organisation, avecGouvernance = true): Promise<string[]> {
  store.controles = org.controles;
  store.risques = exigencesActives(store).map((e) => calculerRisque(e, org));
  store.lots = construireLots(store, org);
  if (avecGouvernance) store.gouvernance = await produireGouvernance(store, org);
  const fichiers = exporterMatrices(store, org);
  fichiers.push(ecrirePlanGouvernance(store, org));
  return fichiers;
}
