// Who may use the photo admin API (functions/api/admin). Production: Cloudflare Access sits in front of /admin and /api/admin
// and adds a signed token to every request; it is verified here too, so the *.pages.dev address is not a way round Access.
// Docs: https://developers.cloudflare.com/cloudflare-one/identity/authorization-cookie/validating-json/
export interface AdminEnv {
  ADMIN_DEMO?: string;
  ACCESS_TEAM_DOMAIN?: string; // <team>.cloudflareaccess.com
  ACCESS_AUD?: string; // the Access application's AUD tag
  ADMIN_GITHUB_TOKEN?: string;
  ADMIN_REPO?: string; // owner/name
}

/** Demo mode (local preview, E2E): no sign-in, and the API never calls GitHub (src/lib/admin-api.ts), so nothing can be published. */
export const adminDemo = (env: AdminEnv, url: string) =>
  env.ADMIN_DEMO === '1' || ['localhost', '127.0.0.1'].includes(new URL(url).hostname);

const bytes = (b64url: string) => Uint8Array.from(atob(b64url.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
const json = (b64url: string) => JSON.parse(new TextDecoder().decode(bytes(b64url)));

let keys: { domain: string; byKid: Map<string, CryptoKey> } | undefined; // per isolate

async function keyFor(domain: string, kid: string, fetcher: typeof fetch): Promise<CryptoKey | undefined> {
  if (keys?.domain !== domain || !keys.byKid.has(kid)) { // also re-read when Access has rotated its keys
    const r = await fetcher(`https://${domain}/cdn-cgi/access/certs`);
    if (!r.ok) return undefined;
    const byKid = new Map<string, CryptoKey>();
    for (const k of ((await r.json()) as { keys: (JsonWebKey & { kid: string })[] }).keys)
      byKid.set(k.kid, await crypto.subtle.importKey('jwk', { kty: k.kty, n: k.n, e: k.e }, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']));
    keys = { domain, byKid };
  }
  return keys.byKid.get(kid);
}

/** The signed-in email, or null. Demo: 'demo@localhost'. Else the Cf-Access-Jwt-Assertion header must be a valid token for this application. */
export async function adminEmail(request: Request, env: AdminEnv, fetcher: typeof fetch = fetch): Promise<string | null> {
  if (adminDemo(env, request.url)) return 'demo@localhost';
  const token = request.headers.get('cf-access-jwt-assertion');
  const domain = env.ACCESS_TEAM_DOMAIN;
  if (!token || !domain || !env.ACCESS_AUD) return null; // not configured: refuse everyone
  try {
    const [h, p, s] = token.split('.');
    const header = json(h), claims = json(p);
    if (header.alg !== 'RS256' || typeof header.kid !== 'string') return null;
    const key = await keyFor(domain, header.kid, fetcher);
    if (!key || !(await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, bytes(s), new TextEncoder().encode(`${h}.${p}`)))) return null;
    const aud: unknown[] = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    if (claims.iss !== `https://${domain}` || !aud.includes(env.ACCESS_AUD) || !(claims.exp > Date.now() / 1000)) return null;
    return typeof claims.email === 'string' && claims.email ? claims.email : null;
  } catch {
    return null; // not a token
  }
}
