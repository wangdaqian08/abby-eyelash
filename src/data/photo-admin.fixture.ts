// A fixed, valid AdminData for tests: the photo lists as they were when the portfolio was regrouped by service and style (2026-11-17).
// The live file (photo-admin.json) is edited by Abby in the admin and CI runs on each of her publishes, so a test that
// reads a count or an id from the live file would turn her publish red. Tests take their data from here instead.
import { adminGroups, type AdminData } from './photos.ts';
import { withNumbers } from '../lib/photo-admin.ts';

const LISTS: Record<string, string[]> = {
  face: ['face-natural', 'selfie', 'face-smile', 'styled-half-face', 'styled-mermaid-selfie'],
  'lash-extensions/classic-natural': ['classic-natural-2', 'classic-natural-colour'],
  'lash-extensions/hybrid-full': ['hybrid-full-eye', 'hybrid-full-bottom'],
  'lash-extensions/styled': ['styled-fairy', 'styled-layered', 'styled-mermaid', 'styled-manga', 'styled-liner', 'styled-liner-2', 'styled-liner-bottom', 'styled-sunflower', 'styled-pompom', 'styled-bottom', 'styled-bottom-2', 'styled-close'],
  'gel-nails/solid': ['nail-6920', 'nail-4067', 'nail-2112', 'nail-2441'],
  'gel-nails/cat-eye': ['nail-fc1a'],
  'gel-nails/french': ['nail-3406', 'nail-video', 'nail-7334'],
  'gel-nails/other': ['nail-2223', 'nail-4915', 'nail-2020', 'nail-9011', 'nail-3029', 'nail-9024', 'nail-2473'],
  'handcrafted-nails/nail-art': ['nail-b029', 'nail-6e6c', 'nail-8353', 'nail-1848', 'nail-8351', 'nail-4630', 'nail-9264', 'nail-7242'],
  'powder-brows/powder': ['brow-video', 'brow-8979', 'brow-8645', 'brow-3166', 'brow-6069'],
};
const FIXTURE: AdminData = withNumbers({
  groups: Object.fromEntries(adminGroups.map((g) => [g.id, LISTS[g.id] ?? []])),
  slots: {},
  uploads: {},
  labels: { selfie: 'option:lash-extensions/styled', 'styled-half-face': 'option:lash-extensions/classic-full' },
  names: {}, alts: {}, numbers: {}, counters: {},
});
/** A fresh copy each time, so one test cannot change another's data. */
export const fixture = (): AdminData => structuredClone(FIXTURE);
