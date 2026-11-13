import test from 'node:test';
import assert from 'node:assert/strict';
import { adminDemo, adminEmail } from './access.ts';

const env = { ACCESS_TEAM_DOMAIN: 'abby.cloudflareaccess.com', ACCESS_AUD: 'aud-123' };
const URL_ = 'https://www.abbyeyelashes.com/api/admin/publish';
const b64url = (bytes: Uint8Array) => Buffer.from(bytes).toString('base64url');
const part = (o: unknown) => b64url(new TextEncoder().encode(JSON.stringify(o)));
const pair = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const jwk = { ...(await crypto.subtle.exportKey('jwk', pair.publicKey)), kid: 'k1' };
let certFetches = 0;
const certs = (async (url: string) => {
  certFetches++;
  assert.equal(url, 'https://abby.cloudflareaccess.com/cdn-cgi/access/certs');
  return new Response(JSON.stringify({ keys: [jwk] }));
}) as unknown as typeof fetch;
const now = () => Math.floor(Date.now() / 1000);
const claims = () => ({ iss: 'https://abby.cloudflareaccess.com', aud: ['aud-123'], exp: now() + 600, email: 'abby@example.com' });
async function token(payload: object, header: object = { alg: 'RS256', kid: 'k1' }) {
  const body = `${part(header)}.${part(payload)}`;
  const sig = new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', pair.privateKey, new TextEncoder().encode(body)));
  return `${body}.${b64url(sig)}`;
}
const ask = (jwt?: string, e: object = env, url = URL_) =>
  adminEmail(new Request(url, { method: 'POST', headers: jwt ? { 'cf-access-jwt-assertion': jwt } : {} }), e, certs);

test('a valid Access token gives the email; the keys are fetched once', async () => {
  assert.equal(await ask(await token(claims())), 'abby@example.com');
  assert.equal(await ask(await token(claims())), 'abby@example.com');
  assert.equal(certFetches, 1);
});
test('a token that is not ours, expired, or tampered with gives null', async () => {
  const good = await token(claims());
  assert.equal(await ask(await token({ ...claims(), aud: ['other-app'] })), null, 'wrong audience');
  assert.equal(await ask(await token({ ...claims(), iss: 'https://evil.cloudflareaccess.com' })), null, 'wrong issuer');
  assert.equal(await ask(await token({ ...claims(), exp: now() - 5 })), null, 'expired');
  assert.equal(await ask(await token({ ...claims(), email: undefined })), null, 'no email');
  const [h, p, s] = good.split('.');
  assert.equal(await ask(`${h}.${part({ ...claims(), email: 'evil@example.com' })}.${s}`), null, 'payload changed after signing');
  assert.equal(await ask(`${part({ alg: 'none', kid: 'k1' })}.${p}.`), null, 'alg none');
  assert.equal(await ask(await token(claims(), { alg: 'RS256', kid: 'unknown' })), null, 'unknown key');
  assert.equal(await ask('not-a-token'), null);
  assert.equal(await ask(), null, 'no header');
});
test('outside demo mode, missing ACCESS_* settings refuse everyone', async () => {
  assert.equal(await ask(await token(claims()), {}), null);
  assert.equal(await ask(await token(claims()), { ACCESS_TEAM_DOMAIN: env.ACCESS_TEAM_DOMAIN }), null);
});
test('demo mode (ADMIN_DEMO=1 or localhost) needs no token', async () => {
  assert.equal(await ask(undefined, { ADMIN_DEMO: '1' }), 'demo@localhost');
  assert.equal(await ask(undefined, {}, 'http://localhost:8788/api/admin/publish'), 'demo@localhost');
  assert.equal(adminDemo({}, URL_), false);
  assert.equal(adminDemo({ ADMIN_DEMO: '0' }, URL_), false);
});
