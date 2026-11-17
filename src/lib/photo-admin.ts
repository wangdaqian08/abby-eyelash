// Rules of the photo admin (/admin/), shared by its page, the publish API (functions/api/admin) and the site build.
// Pure: no DOM, no network. Spec: docs/superpowers/specs/2026-11-14-admin-photos-design.md
import { adminGroups, adminLabels, adminSlots, numberPrefixes, photos, videos, type AdminData, type AdminRatio, type Dir } from '../data/photos.ts';
import { mainOptions, services } from '../data/services.ts';

/** Master size per ratio: the values of scripts/photos.mjs. */
export const OUT: Record<AdminRatio, [number, number]> = { '4:3': [1600, 1200], '3:4': [1200, 1600], '1.91:1': [1200, 630] }; // 1.91:1 = the og:image size
export const JPEG_QUALITY = 0.82;
export const MAX_SOURCE_BYTES = 6 * 1024 * 1024; // the photo picked on the phone (owner's decision, 2026-11-14); only the cropped ~0.3 MB JPEG is uploaded
export const MAX_BLOB_BASE64 = 2_000_000; // characters; a 1600 × 1200 JPEG at 0.82 is far below this
export const UPLOAD_ID = /^u-[a-z0-9]{10}$/;
export const ADMIN_JSON = 'src/data/photo-admin.json';

/** What /admin/state.json holds: the live data as built, with thumbnails and Traditional Chinese names. */
export interface AdminState {
  base: string; // gitBlobSha of photo-admin.json as built
  data: AdminData;
  groups: { id: string; part: 'lashes' | 'nails' | 'brows'; service: string; serviceName: string; name: string; dir: Dir; ratio: AdminRatio; visible: number; cols: 2 | 3 }[];
  slots: { key: string; section: string; name: string; dir: Dir; ratio: AdminRatio; def: string; auto?: string }[]; // auto: thumbnail of a link preview's automatic cut
  labels: { key: string; group: string; name: string }[];
  names: { key: string; service: string; label: string; text: { en: string; zh: string } }[]; // services, then their styles; text: as written in the code
  photos: Record<string, { thumb: string; video?: true; name?: string; alt: { en: string; zh: string } }>;
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
export const MAX_ZOOM = 3;
const cover = (sw: number, sh: number, ratio: AdminRatio) => {
  const target = OUT[ratio][0] / OUT[ratio][1];
  return sw / sh > target ? [sh * target, sh] : [sw, sw / target];
};
/** Source rectangle that covers the ratio, `zoom` (1–3) times smaller; fx, fy in 0..1 choose which part is kept (0.5 = centre). */
export function cropRect(sw: number, sh: number, ratio: AdminRatio, fx: number, fy: number, zoom = 1) {
  const z = Math.min(MAX_ZOOM, Math.max(1, zoom)); // never below 1: zooming out would leave white edges
  const [cw, ch] = cover(sw, sh, ratio);
  const w = Math.round(cw / z), h = Math.round(ch / z);
  return { sx: Math.round(clamp01(fx) * (sw - w)), sy: Math.round(clamp01(fy) * (sh - h)), sw: w, sh: h };
}
/** The zoom up to which the part used is at least as wide as the output; beyond it the photo is stretched (shown as a warning). */
export const sharpLimit = (sw: number, sh: number, ratio: AdminRatio) => Math.round((cover(sw, sh, ratio)[0] / OUT[ratio][0]) * 100) / 100;

export const masterPath = (id: string, dir: Dir) => `src/assets/photos/${dir}/${id}.jpg`;

// Photos and videos that were on the site before the admin: their dir and ratio never change.
const legacy = new Map<string, { dir: Dir; ratio: string; ai: boolean }>([
  ...photos.filter((p) => p.source).map((p) => [p.id, { dir: p.dir, ratio: p.ratio, ai: p.id.startsWith('ai-') }] as const),
]);
for (const [id, v] of Object.entries(videos)) legacy.set(id, { ...legacy.get(v.poster)!, ai: false });

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

/** What the admin may rename: each service, and each style (main option) of it. */
export const nameKeys = services.flatMap((s) => [s.id, ...mainOptions(s).map((o) => `${s.id}/${o.id}`)]);
export const MAX_NAME = 80, MAX_ALT = 300; // characters
const isText = (v: unknown, max: number) => isRecord(v) && Object.keys(v).sort().join() === 'en,zh'
  && [v.en, v.zh].every((x) => typeof x === 'string' && x.trim().length > 0 && x.length <= max);

/** `data` with every photo numbered: a photo keeps its number while its style stays; a new photo, or one whose style changed,
 * gets the next number of its prefix ('gel-nails-cat-eye-3'). Counters only go up, so a number is never given twice. */
export function withNumbers(data: AdminData): AdminData {
  const numbers: Record<string, string> = {}, counters = { ...data.counters };
  for (const [id, prefix] of numberPrefixes(data)) {
    const was = data.numbers[id];
    numbers[id] = was && new RegExp(`^${prefix}-[1-9]\\d*$`).test(was) ? was : `${prefix}-${(counters[prefix] = (counters[prefix] ?? 0) + 1)}`;
  }
  return { ...data, numbers, counters };
}

/** null when `next` may be published over `prev`; else 'groups' | 'item' | 'duplicate' | 'slot' | 'upload' | 'label' | 'name' | 'alt' | 'number'. */
export function validateAdmin(next: AdminData, prev: AdminData, newBlobs: ReadonlySet<string>): string | null {
  if (!isRecord(next) || !['groups', 'slots', 'uploads', 'labels', 'names', 'alts', 'numbers', 'counters'].every((k) => isRecord(next[k as keyof AdminData]))) return 'groups';
  if (Object.keys(next.groups).sort().join() !== adminGroups.map((g) => g.id).sort().join()) return 'groups';

  for (const [id, u] of Object.entries(next.uploads)) {
    if (!UPLOAD_ID.test(id) || !isRecord(u) || !['lash', 'nails', 'brows'].includes(u.dir) || !Object.hasOwn(OUT, u.ratio as string) || typeof u.where !== 'string') return 'upload';
    const was = prev.uploads[id];
    if (was ? was.dir !== u.dir || was.ratio !== u.ratio || newBlobs.has(id) : !newBlobs.has(id)) return 'upload';
  }
  for (const id of newBlobs) if (!next.uploads[id] || prev.uploads[id]) return 'upload';

  // An id is usable in a group or place when it is a real (non-AI) legacy photo or video, or an upload, of that dir and ratio.
  // A portfolio group takes either orientation (the site crops it to the group's shape): a photo can move to any style of its dir.
  const fits = (id: unknown, dir: Dir, ratio: AdminRatio | 'portfolio') => {
    if (typeof id !== 'string') return false;
    const p = Object.hasOwn(next.uploads, id) ? next.uploads[id] : legacy.get(id);
    return !!p && p.dir === dir && (ratio === 'portfolio' ? p.ratio === '4:3' || p.ratio === '3:4' : p.ratio === ratio) && !(p as { ai?: boolean }).ai;
  };
  const used = new Set<string>();
  for (const g of adminGroups) {
    const ids = next.groups[g.id];
    if (!Array.isArray(ids)) return 'groups';
    for (const id of ids) {
      if (!fits(id, g.dir, 'portfolio')) return 'item';
      if (used.has(id)) return 'duplicate'; // one group per photo: its group is its style
      used.add(id);
    }
  }
  for (const [key, id] of Object.entries(next.slots)) {
    const s = adminSlots.find((x) => x.key === key);
    if (!s || !fits(id, s.dir, s.ratio) || videos[id]) return 'slot';
    used.add(id);
  }
  for (const id of Object.keys(next.uploads)) if (!used.has(id)) return 'upload';

  for (const [id, key] of Object.entries(next.labels)) {
    const l = adminLabels.find((x) => x.key === key);
    if (!l || !next.groups[l.group].includes(id)) return 'label'; // a style only in 整脸效果, a look name only in the styled set
  }
  for (const [key, text] of Object.entries(next.names)) if (!nameKeys.includes(key) || !isText(text, MAX_NAME)) return 'name';
  const shown = new Set([...adminGroups.flatMap((g) => next.groups[g.id]), ...adminSlots.map((s) => next.slots[s.key] ?? s.def)]);
  for (const [id, text] of Object.entries(next.alts)) if (!shown.has(id) || !isText(text, MAX_ALT)) return 'alt';

  // Numbers: exactly the photos shown, each under its style's prefix, never one given before (to another photo or style).
  const want = numberPrefixes(next);
  if (Object.keys(next.numbers).length !== want.size) return 'number';
  if (Object.entries(next.counters).some(([, n]) => !Number.isSafeInteger(n) || n < 0)) return 'number';
  if (Object.entries(prev.counters ?? {}).some(([k, n]) => !((next.counters[k] ?? 0) >= n))) return 'number';
  for (const [id, prefix] of want) {
    const num = next.numbers[id], n = typeof num === 'string' && num.startsWith(`${prefix}-`) ? num.slice(prefix.length + 1) : '';
    if (!/^[1-9]\d*$/.test(n) || Number(n) > (next.counters[prefix] ?? 0)) return 'number';
    if (prev.numbers?.[id] !== num && Number(n) <= (prev.counters?.[prefix] ?? 0)) return 'number'; // a number new to this photo is above every earlier one
  }
  if (new Set(Object.values(next.numbers)).size !== want.size) return 'number';
  return null;
}

/** Master paths of uploads that are in prev and not in next: the files a publish deletes. Legacy masters are never deleted. */
export const removedMasters = (prev: AdminData, next: AdminData): string[] =>
  Object.keys(prev.uploads).filter((id) => !next.uploads[id]).map((id) => masterPath(id, prev.uploads[id].dir));

/** The id git gives a file with this text (git hash-object): how the admin tells whether photo-admin.json changed. */
export async function gitBlobSha(text: string): Promise<string> {
  const body = new TextEncoder().encode(text);
  const head = new TextEncoder().encode(`blob ${body.length}\0`);
  const all = new Uint8Array(head.length + body.length);
  all.set(head); all.set(body, head.length);
  return [...new Uint8Array(await crypto.subtle.digest('SHA-1', all))].map((b) => b.toString(16).padStart(2, '0')).join('');
}
