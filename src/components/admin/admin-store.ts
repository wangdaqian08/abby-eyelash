// The photo admin's draft: every change Abby makes before "發佈", kept on the phone.
// Operations are pure (each returns a new Draft); `kv` is the small on-phone store they are saved in.
import type { AdminData, Upload } from '../../data/photos.ts';
import type { AdminState } from '../../lib/photo-admin.ts';

export interface Draft {
  base: string; // git id of the photo-admin.json this draft changes
  data: AdminData; // includes not-yet-published uploads; still lists the items marked removed (shown grey)
  clean: AdminData; // the data without this draft's changes: the live site, or what was last published from this phone
  removed: string[]; // `${groupId}/${id}`: deleted at publish, restorable until then
  focus: Record<string, { x: number; y: number }>; // crop position of uploads whose source is still on this phone
  pending?: { commit: string; state: 'building' | 'live' | 'failed' }; // the last publish from this phone
}

const copy = <T>(v: T): T => structuredClone(v);
const edit = (d: Draft, change: (next: Draft) => void): Draft => { const next = copy(d); change(next); return next; };
const used = (data: AdminData) => new Set([...Object.values(data.groups).flat(), ...Object.values(data.slots)]);
/** An upload made in this draft: it can still be re-cropped, and deleting it needs no "restore". */
export const unpublished = (d: Draft, id: string) => id in d.data.uploads && !(id in d.clean.uploads);
const forget = (d: Draft, id: string) => { delete d.data.uploads[id]; delete d.data.labels[id]; delete d.focus[id]; };

export const fromState = (s: AdminState): Draft => ({ base: s.base, data: copy(s.data), clean: copy(s.data), removed: [], focus: {} });

export function newId(): string {
  const n = crypto.getRandomValues(new Uint8Array(10));
  return 'u-' + [...n].map((b) => (b % 36).toString(36)).join('');
}

export const addToGroup = (d: Draft, groupId: string, id: string, u: Upload): Draft => edit(d, (n) => {
  n.data.uploads[id] = u; n.data.groups[groupId].unshift(id); n.focus[id] = { x: 0.5, y: 0.5 };
});

export const replaceSlot = (d: Draft, key: string, id: string, u: Upload): Draft => edit(d, (n) => {
  const old = n.data.slots[key];
  if (old && unpublished(d, old)) forget(n, old);
  n.data.uploads[id] = u; n.data.slots[key] = id; n.focus[id] = { x: 0.5, y: 0.5 };
});

export const resetSlot = (d: Draft, key: string): Draft => edit(d, (n) => {
  const now = n.data.slots[key];
  if (now && unpublished(d, now)) forget(n, now);
  if (key in d.clean.slots) n.data.slots[key] = d.clean.slots[key]; else delete n.data.slots[key];
});

export const toggleRemoved = (d: Draft, groupId: string, id: string): Draft => edit(d, (n) => {
  const mark = `${groupId}/${id}`;
  if (unpublished(d, id)) { n.data.groups[groupId] = n.data.groups[groupId].filter((x) => x !== id); forget(n, id); }
  else n.removed = n.removed.includes(mark) ? n.removed.filter((m) => m !== mark) : [...n.removed, mark];
});

export const move = (d: Draft, groupId: string, from: number, to: number): Draft => edit(d, (n) => {
  const ids = n.data.groups[groupId];
  const [id] = ids.splice(from, 1);
  ids.splice(Math.max(0, Math.min(ids.length, to)), 0, id);
});

export const setLabel = (d: Draft, id: string, key: string): Draft => edit(d, (n) => {
  if (key) n.data.labels[id] = key; else delete n.data.labels[id];
});

export const setFocus = (d: Draft, id: string, x: number, y: number): Draft => edit(d, (n) => { n.focus[id] = { x, y }; });

/** What a publish sends: removals applied; uploads nothing shows any more, and their style names, dropped. */
export function finalData(d: Draft): AdminData {
  const out = copy(d.data);
  for (const g of Object.keys(out.groups)) out.groups[g] = out.groups[g].filter((id) => !d.removed.includes(`${g}/${id}`));
  const keep = used(out);
  for (const id of Object.keys(out.uploads)) if (!keep.has(id)) delete out.uploads[id];
  for (const id of Object.keys(out.labels)) if (!keep.has(id)) delete out.labels[id];
  return out;
}

/** What a publish will change, for the banner and the publish screen: upload ids, `group/id` marks, group ids, place keys, photo ids. */
export function changes(d: Draft) {
  const now = finalData(d), was = d.clean, keep = used(now);
  const groups = Object.keys(now.groups);
  const isNew = (id: string) => id in now.uploads && !(id in was.uploads);
  return {
    added: groups.flatMap((g) => now.groups[g].filter(isNew)),
    removed: groups.flatMap((g) => (was.groups[g] ?? []).filter((id) => !now.groups[g].includes(id)).map((id) => `${g}/${id}`)),
    reordered: groups.filter((g) => {
      const before = (was.groups[g] ?? []).filter((id) => now.groups[g].includes(id));
      return before.join() !== now.groups[g].filter((id) => before.includes(id)).join();
    }),
    replaced: [...new Set([...Object.keys(now.slots), ...Object.keys(was.slots)])].filter((k) => now.slots[k] !== was.slots[k]),
    relabelled: [...new Set([...Object.keys(now.labels), ...Object.keys(was.labels)])].filter((id) => keep.has(id) && !isNew(id) && now.labels[id] !== was.labels[id]),
  };
}
export const changeCount = (d: Draft) => Object.values(changes(d)).reduce((n, list) => n + list.length, 0);
export const isDirty = (d: Draft) => changeCount(d) > 0;

/** After a 200 from /api/admin/publish: the published data is the clean state, on the new base, while CI builds it. */
export function afterPublish(d: Draft, commit: string, base: string): Draft {
  const data = finalData(d);
  return { base, data, clean: copy(data), removed: [], focus: Object.fromEntries(Object.entries(d.focus).filter(([id]) => id in data.uploads)), pending: { commit, state: 'building' } };
}

/**
 * Which state the page starts from. The snapshot (/admin/state.json) is the deployed site; right after a publish it is
 * older than what this phone published, so the phone's own state wins until the build is live or the snapshot has caught up.
 * `stale`: the draft was started on a site that someone else has changed since; a publish would be refused.
 */
export function resume(stored: Draft | undefined, s: AdminState): { draft: Draft; stale: boolean } {
  if (!stored) return { draft: fromState(s), stale: false };
  const dirty = isDirty(stored);
  if (stored.base === s.base) { // the site is what this draft was started on (or has caught up with our publish)
    if (!dirty) return { draft: fromState(s), stale: false };
    const { pending: _over, ...draft } = stored;
    return { draft, stale: false };
  }
  if (stored.pending && stored.pending.state !== 'live') return { draft: stored, stale: false }; // our publish is building, or failed
  return dirty ? { draft: stored, stale: true } : { draft: fromState(s), stale: false };
}

// ── On-phone store: IndexedDB (photos are too large for localStorage). Keys: 'draft', `src:<uploadId>` (the picked File).
const memory = new Map<string, unknown>();
let db: Promise<IDBDatabase | null> | undefined;
const open = () => (db ??= new Promise<IDBDatabase | null>((done) => {
  try {
    const req = indexedDB.open('abby-admin', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('kv');
    req.onsuccess = () => done(req.result);
    req.onerror = req.onblocked = () => done(null);
  } catch {
    done(null); // no IndexedDB (some private modes): work in memory for this visit
  }
}).then((d) => { kv.persistent = !!d; return d; }));

const run = async <T>(mode: IDBTransactionMode, work: (s: IDBObjectStore) => IDBRequest<T>, fallback: () => T): Promise<T> => {
  const d = await open();
  if (!d) return fallback();
  return new Promise<T>((done, fail) => {
    const tx = d.transaction('kv', mode);
    const req = work(tx.objectStore('kv'));
    tx.oncomplete = () => done(req.result);
    tx.onerror = tx.onabort = () => fail(tx.error); // e.g. the phone's storage is full
  });
};

export const kv = {
  /** false once the first call found no IndexedDB: the draft then lasts only until the page is closed. */
  persistent: true,
  get: <T>(k: string) => run<T | undefined>('readonly', (s) => s.get(k), () => memory.get(k) as T | undefined),
  set: (k: string, v: unknown) => run('readwrite', (s) => s.put(v, k), () => { memory.set(k, v); return k as IDBValidKey; }).then(() => {}),
  del: (k: string) => run('readwrite', (s) => s.delete(k), () => { memory.delete(k); return undefined; }).then(() => {}),
  keys: () => run<IDBValidKey[]>('readonly', (s) => s.getAllKeys(), () => [...memory.keys()]).then((list) => list.map(String)),
};
