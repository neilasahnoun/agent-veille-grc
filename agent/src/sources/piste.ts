/**
 * Authentification PISTE (portail des API de l'État : Légifrance, Judilibre).
 * Inscription gratuite sur https://piste.gouv.fr → créer une application → activer
 * les API « Légifrance » et « JUDILIBRE » → accepter les CGU → récupérer client_id / client_secret.
 */
import { config, exiger } from "../config.js";

let jeton: { valeur: string; expire: number } | null = null;

export const PISTE_API = () => (config.piste.sandbox ? "https://sandbox-api.piste.gouv.fr" : "https://api.piste.gouv.fr");
const PISTE_OAUTH = () =>
  config.piste.sandbox ? "https://sandbox-oauth.piste.gouv.fr/api/oauth/token" : "https://oauth.piste.gouv.fr/api/oauth/token";

export const pisteConfiguree = () => Boolean(config.piste.clientId && config.piste.clientSecret);

export async function jetonPiste(): Promise<string> {
  if (jeton && jeton.expire > Date.now() + 30_000) return jeton.valeur;
  const aide = "Créer une application sur https://piste.gouv.fr et copier ses identifiants OAuth dans le .env";
  const corps = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: exiger(config.piste.clientId, "PISTE_CLIENT_ID", aide),
    client_secret: exiger(config.piste.clientSecret, "PISTE_CLIENT_SECRET", aide),
    scope: "openid",
  });
  const rep = await fetch(PISTE_OAUTH(), { method: "POST", body: corps, headers: { "Content-Type": "application/x-www-form-urlencoded" } });
  if (!rep.ok) throw new Error(`Authentification PISTE refusée (${rep.status}) : ${await rep.text()}`);
  const json = (await rep.json()) as { access_token: string; expires_in: number };
  jeton = { valeur: json.access_token, expire: Date.now() + json.expires_in * 1000 };
  return jeton.valeur;
}
