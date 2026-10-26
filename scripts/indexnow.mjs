#!/usr/bin/env node
// IndexNow (Bing/Copilot, Yandex, Naver, Seznam, Yep — not Google). Protocol: https://www.indexnow.org/documentation
// The key is NOT a secret (it is published as /<key>.txt) but it lives only in env, never in the repo.
//
//   Write the key file into the build (Cloudflare Pages build command, after `npm run build`):
//     node scripts/indexnow.mjs --write-key dist
//   Ping after a deploy that changed content (from any machine):
//     SITE_URL=https://example.com.au INDEXNOW_KEY=… npm run indexnow   [--dry-run]
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const key = process.env.INDEXNOW_KEY ?? '';
const siteUrl = process.env.SITE_URL ?? '';
const die = (msg, code = 1) => { console.error(`indexnow: ${msg}`); process.exit(code); };
const skip = (msg) => { console.log(`indexnow: skipped — ${msg}`); process.exit(0); };

if (!key) skip('INDEXNOW_KEY is not set');
// Spec: 8–128 chars of a-z, A-Z, 0-9 and "-".
if (!/^[A-Za-z0-9-]{8,128}$/.test(key)) die('INDEXNOW_KEY must be 8–128 characters of a-z, A-Z, 0-9 or "-"');

const outIdx = args.indexOf('--write-key');
if (outIdx !== -1) {
  const dir = args[outIdx + 1] ?? die('--write-key needs a directory, e.g. dist');
  writeFileSync(join(dir, `${key}.txt`), key, 'utf8'); // spec: UTF-8 file at the site root containing the key
  console.log(`indexnow: wrote ${join(dir, key + '.txt')}`);
  process.exit(0);
}

let site;
try { site = new URL(siteUrl); } catch { skip('SITE_URL is not set to a URL'); }
// Only real, owned domains: not localhost, not the *.pages.dev placeholder, not example.*.
if (site.protocol !== 'https:' || /(^localhost$|\.pages\.dev$|(^|\.)example\.)/.test(site.hostname) || !site.hostname.includes('.'))
  skip(`SITE_URL ${site.origin} is not a real production domain`);

const get = async (url) => {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) die(`GET ${url} → HTTP ${res.status}`);
  return res.text();
};
const locs = (xml) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());

// Check the key file is live first — otherwise the engines answer 403.
const keyLocation = new URL(`/${key}.txt`, site).href;
if ((await get(keyLocation)).trim() !== key) die(`${keyLocation} does not contain the key (deploy with --write-key first)`);

const urlList = [];
for (const sm of locs(await get(new URL('/sitemap-index.xml', site).href))) urlList.push(...locs(await get(sm)));
const own = urlList.filter((u) => new URL(u).hostname === site.hostname);
if (own.length !== urlList.length) die(`sitemap has URLs outside ${site.hostname} — was the build made with the right SITE_URL?`);
if (!own.length) die('sitemap is empty');

const body = { host: site.hostname, key, keyLocation, urlList: own.slice(0, 10000) }; // spec max 10,000 per POST
if (args.includes('--dry-run')) { console.log(JSON.stringify(body, null, 2)); process.exit(0); }

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify(body),
});
const meaning = {
  200: 'OK — URLs submitted',
  202: 'Accepted — key validation pending',
  400: 'Bad request — invalid format',
  403: 'Forbidden — key not valid (key file missing or wrong)',
  422: "Unprocessable — URLs don't belong to the host or key doesn't match",
  429: 'Too many requests — slow down',
}[res.status] ?? 'unexpected response';
console.log(`indexnow: POST ${body.urlList.length} URLs → HTTP ${res.status} ${meaning}`);
if (res.status >= 400) process.exit(1);
