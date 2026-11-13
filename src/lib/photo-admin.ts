// Rules of the photo admin (/admin/), shared by its page, the publish API (functions/api/admin) and the site build.
// Pure: no DOM, no network. Spec: docs/superpowers/specs/2026-11-14-admin-photos-design.md
import { adminGroups, adminLabels, adminSlots, photos, videos, type AdminData, type AdminRatio, type Dir } from '../data/photos.ts';

/** Master size per ratio: the values of scripts/photos.mjs. */
export const OUT: Record<AdminRatio, [number, number]> = { '4:3': [1600, 1200], '3:4': [1200, 1600] };
export const JPEG_QUALITY = 0.82;
export const MAX_SOURCE_BYTES = 20 * 1024 * 1024;
export const MAX_BLOB_BASE64 = 2_000_000; // characters; a 1600 × 1200 JPEG at 0.82 is far below this
export const UPLOAD_ID = /^u-[a-z0-9]{10}$/;
export const ADMIN_JSON = 'src/data/photo-admin.json';

/** What /admin/state.json holds: the live data as built, with thumbnails and Traditional Chinese names. */
export interface AdminState {
  base: string; // gitBlobSha of photo-admin.json as built
  data: AdminData;
  groups: { id: string; part: 'lashes' | 'nails' | 'brows'; name: string; dir: Dir; ratio: AdminRatio; visible: number; cols: 2 | 3 }[];
  slots: { key: string; section: string; name: string; dir: Dir; ratio: AdminRatio; def: string }[];
  labels: { key: string; dir: Dir; styledOnly: boolean; name: string }[];
  photos: Record<string, { thumb: string; video?: true; name?: string }>;
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
/** Source rectangle that covers the ratio; fx, fy in 0..1 choose which part is kept (0.5 = centre). */
export function cropRect(sw: number, sh: number, ratio: AdminRatio, fx: number, fy: number) {
  const target = OUT[ratio][0] / OUT[ratio][1];
  const w = sw / sh > target ? Math.round(sh * target) : sw;
  const h = sw / sh > target ? sh : Math.round(sw / target);
  return { sx: Math.round(clamp01(fx) * (sw - w)), sy: Math.round(clamp01(fy) * (sh - h)), sw: w, sh: h };
}

export const masterPath = (id: string, dir: Dir) => `src/assets/photos/${dir}/${id}.jpg`;

// Photos and videos that were on the site before the admin: their dir and ratio never change.
const legacy = new Map<string, { dir: Dir; ratio: string; ai: boolean }>([
  ...photos.filter((p) => p.source).map((p) => [p.id, { dir: p.dir, ratio: p.ratio, ai: p.id.startsWith('ai-') }] as const),
]);
for (const [id, v] of Object.entries(videos)) legacy.set(id, { ...legacy.get(v.poster)!, ai: false });

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

/** null when `next` may be published over `prev`; else 'groups' | 'item' | 'duplicate' | 'slot' | 'upload' | 'label'. */
export function validateAdmin(next: AdminData, prev: AdminData, newBlobs: ReadonlySet<string>): string | null {
  if (!isRecord(next) || !isRecord(next.groups) || !isRecord(next.slots) || !isRecord(next.uploads) || !isRecord(next.labels)) return 'groups';
  if (Object.keys(next.groups).sort().join() !== adminGroups.map((g) => g.id).sort().join()) return 'groups';

  for (const [id, u] of Object.entries(next.uploads)) {
    if (!UPLOAD_ID.test(id) || !isRecord(u) || !['lash', 'nails', 'brows'].includes(u.dir) || !['4:3', '3:4'].includes(u.ratio) || typeof u.where !== 'string') return 'upload';
    const was = prev.uploads[id];
    if (was ? was.dir !== u.dir || was.ratio !== u.ratio || newBlobs.has(id) : !newBlobs.has(id)) return 'upload';
  }
  for (const id of newBlobs) if (!next.uploads[id] || prev.uploads[id]) return 'upload';

  // An id is usable in a group or place when it is a real (non-AI) legacy photo or video, or an upload, of that dir and ratio.
  const fits = (id: unknown, dir: Dir, ratio: AdminRatio) => {
    if (typeof id !== 'string') return false;
    const p = Object.hasOwn(next.uploads, id) ? next.uploads[id] : legacy.get(id);
    return !!p && p.dir === dir && p.ratio === ratio && !(p as { ai?: boolean }).ai;
  };
  const used = new Set<string>();
  for (const g of adminGroups) {
    const ids = next.groups[g.id];
    if (!Array.isArray(ids)) return 'groups';
    for (const id of ids) { if (!fits(id, g.dir, g.ratio)) return 'item'; used.add(id); }
    if (new Set(ids).size !== ids.length) return 'duplicate';
  }
  for (const [key, id] of Object.entries(next.slots)) {
    const s = adminSlots.find((x) => x.key === key);
    if (!s || !fits(id, s.dir, s.ratio) || videos[id]) return 'slot';
    used.add(id);
  }
  for (const id of Object.keys(next.uploads)) if (!used.has(id)) return 'upload';

  for (const [id, key] of Object.entries(next.labels)) {
    const p = Object.hasOwn(next.uploads, id) ? next.uploads[id] : legacy.get(id);
    const l = adminLabels.find((x) => x.key === key);
    if (!p || !used.has(id) || !l || l.dir !== p.dir || (l.styledOnly && !next.groups.styled.includes(id))) return 'label';
  }
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
