// /admin/state.json — what the photo admin starts from: the live photo-admin.json, as built, with a thumbnail and the
// Traditional Chinese name of everything it lists. Static: it changes only when the site is rebuilt.
import type { APIRoute } from 'astro';
import { getImage } from 'astro:assets';
import raw from '../../data/photo-admin.json?raw';
import { adminData, adminGroups, adminLabels, adminSlots, lookName, videos } from '../../data/photos';
import { gitBlobSha, type AdminState } from '../../lib/photo-admin';
import { photoSrc } from '../../lib/photo-src';
// @ts-ignore: no types
import * as OpenCC from 'opencc-js';
import wording from '../../i18n/zh-hant-fixes.json';

// The conversion of the /zh-hant/ pages (scripts/zh-hant.mjs: OpenCC cn → tw, then Abby's corrections, longest first).
// Repeated here in three lines: that script reads its files from disk and cannot be bundled into a page.
const convert = OpenCC.Converter({ from: 'cn', to: 'tw' });
const fixes = Object.entries(wording.fixes as Record<string, string>).sort(([x], [y]) => y.length - x.length);
const toHant = (s: string): string => fixes.reduce((t, [from, to]) => t.split(from).join(to), convert(s));

const PART = { lash: 'lashes', nails: 'nails', brows: 'brows' } as const;

export const GET: APIRoute = async () => {
  const ids = new Set([...Object.values(adminData.groups).flat(), ...Object.values(adminData.slots), ...adminSlots.map((s) => s.def)]);
  const photos: AdminState['photos'] = {};
  for (const id of ids) {
    const name = lookName(id);
    photos[id] = {
      thumb: (await getImage({ src: photoSrc(videos[id]?.poster ?? id), width: 480, format: 'webp' })).src,
      ...(videos[id] && { video: true as const }),
      ...(name && { name: toHant(name.zh) }),
    };
  }
  const state: AdminState = {
    base: await gitBlobSha(raw),
    data: adminData,
    groups: adminGroups.map((g) => ({ id: g.id, part: PART[g.dir], name: toHant(g.name.zh), dir: g.dir, ratio: g.ratio, visible: g.visible, cols: g.cols })),
    slots: adminSlots.map((s) => {
      const page = s.key.startsWith('page:');
      return { key: s.key, section: page ? toHant(s.name.zh) : s.key === 'home-hero' ? 'hero' : 'cards',
        name: page ? (s.key.endsWith(':hero') ? '主圖' : '細節圖') : toHant(s.name.zh), dir: s.dir, ratio: s.ratio, def: s.def };
    }),
    labels: adminLabels.map((l) => ({ key: l.key, dir: l.dir, styledOnly: l.styledOnly, name: toHant(l.name.zh) })),
    photos,
  };
  return new Response(JSON.stringify(state), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};
