// /admin/state.json — what the photo admin starts from: the live photo-admin.json, as built, with a thumbnail and the
// Traditional Chinese name of everything it lists. Static: it changes only when the site is rebuilt.
import type { APIRoute } from 'astro';
import { getImage } from 'astro:assets';
import raw from '../../data/photo-admin.json?raw';
import { adminData, adminGroups, adminLabels, adminSlots, lookName, videos, writtenAlt } from '../../data/photos';
import { findOption, services, writtenNames } from '../../data/services';
import { gitBlobSha, nameKeys, type AdminState } from '../../lib/photo-admin';
import { photoSrc } from '../../lib/photo-src';
import { ogImage } from '../../lib/og-image';
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
      alt: { en: writtenAlt(id).en, zh: writtenAlt(id).zh },
    };
  }
  const state: AdminState = {
    base: await gitBlobSha(raw),
    data: adminData,
    groups: adminGroups.map((g) => ({ id: g.id, part: PART[g.dir], service: g.service, serviceName: toHant(services.find((s) => s.id === g.service)!.name.zh),
      name: toHant(g.name.zh), dir: g.dir, ratio: g.ratio, visible: g.visible, cols: g.cols })),
    slots: await Promise.all(adminSlots.map(async (s) => {
      const page = s.key.startsWith('page:'), og = s.key.endsWith(':og');
      return { key: s.key, section: page ? toHant(s.name.zh) : s.key === 'home-hero' ? 'hero' : 'cards',
        name: page ? (s.key.endsWith(':hero') ? '主圖' : og ? '預覽圖' : '細節圖') : toHant(s.name.zh), dir: s.dir, ratio: s.ratio, def: s.def,
        ...(og && { auto: (await ogImage({ hero: s.def }, 480))!.src }) };
    })),
    labels: adminLabels.map((l) => ({ key: l.key, group: l.group, name: toHant(l.name.zh) })),
    names: nameKeys.map((key) => {
      const [service, option] = key.split('/');
      const live = option ? findOption(service, option)!.name : services.find((s) => s.id === service)!.name;
      return { key, service, label: toHant(live.zh), text: { en: writtenNames[key].en, zh: writtenNames[key].zh } };
    }),
    photos,
  };
  return new Response(JSON.stringify(state), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};
