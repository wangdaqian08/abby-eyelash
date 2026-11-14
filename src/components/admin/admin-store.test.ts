import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture } from '../../data/photo-admin.fixture.ts';
import { UPLOAD_ID, validateAdmin, type AdminState } from '../../lib/photo-admin.ts';
import { addToGroup, afterPublish, changeCount, changes, finalData, fromState, isDirty, kv, move, newId, replaceSlot, resetSlot, resume, setFocus, setLabel, toggleRemoved } from './admin-store.ts';

const adminData = fixture(); // never the live file: Abby's publishes change it
const state = (base = 'base-0', data = adminData): AdminState => ({ base, data: structuredClone(data), groups: [], slots: [], labels: [], photos: {} });
const LASH = { dir: 'lash', ratio: '4:3', where: 'styled' } as const;
const HERO = { dir: 'lash', ratio: '3:4', where: 'home-hero' } as const;
const fresh = () => fromState(state());
const styled = adminData.groups.styled;

test('newId gives upload ids', () => {
  assert.match(newId(), UPLOAD_ID);
  assert.notEqual(newId(), newId());
});
test('addToGroup puts the upload first, centred, and leaves the live data alone', () => {
  const d0 = fresh();
  const d = addToGroup(d0, 'styled', 'u-aaaaaaaaaa', LASH);
  assert.deepEqual(d.data.groups.styled, ['u-aaaaaaaaaa', ...styled]);
  assert.deepEqual(d.data.uploads['u-aaaaaaaaaa'], LASH);
  assert.deepEqual(d.focus['u-aaaaaaaaaa'], { x: 0.5, y: 0.5 });
  assert.deepEqual(d0.data.groups.styled, styled); // no mutation
  assert.deepEqual(d.clean, adminData);
});
test('toggleRemoved marks and restores a live photo, and drops an unpublished upload with its label and focus', () => {
  let d = toggleRemoved(fresh(), 'styled', styled[1]);
  assert.deepEqual(d.removed, [`styled/${styled[1]}`]);
  assert.deepEqual(d.data.groups.styled, styled); // still listed, shown grey
  d = toggleRemoved(d, 'styled', styled[1]);
  assert.deepEqual(d.removed, []);
  d = setLabel(addToGroup(d, 'styled', 'u-aaaaaaaaaa', LASH), 'u-aaaaaaaaaa', 'look:mermaid');
  d = toggleRemoved(d, 'styled', 'u-aaaaaaaaaa');
  assert.deepEqual([d.data.groups.styled, d.data.uploads, d.data.labels, d.focus, d.removed], [styled, {}, {}, {}, []]);
});
test('move reorders within the group only', () => {
  const d = move(fresh(), 'styled', 2, 0);
  assert.deepEqual(d.data.groups.styled, [styled[2], styled[0], styled[1], ...styled.slice(3)]);
  assert.deepEqual(d.data.groups.face, adminData.groups.face);
  assert.deepEqual(move(fresh(), 'styled', 0, 99).data.groups.styled.at(-1), styled[0]); // clamped
});
test('replaceSlot twice keeps one upload; resetSlot goes back to the live photo', () => {
  let d = replaceSlot(fresh(), 'home-hero', 'u-aaaaaaaaaa', HERO);
  d = replaceSlot(d, 'home-hero', 'u-bbbbbbbbbb', HERO);
  assert.deepEqual(d.data.slots, { 'home-hero': 'u-bbbbbbbbbb' });
  assert.deepEqual(Object.keys(d.data.uploads), ['u-bbbbbbbbbb']);
  assert.deepEqual(Object.keys(d.focus), ['u-bbbbbbbbbb']);
  d = resetSlot(d, 'home-hero');
  assert.deepEqual([d.data.slots, d.data.uploads, d.focus], [{}, {}, {}]);
  assert.equal(isDirty(d), false);
});
test('finalData applies removals, drops unreferenced uploads, and is publishable', () => {
  const live = structuredClone(adminData); live.uploads['u-oldoldold1'] = LASH; live.groups.styled.unshift('u-oldoldold1'); live.labels['u-oldoldold1'] = 'look:manga';
  let d = fromState(state('base-0', live));
  d = toggleRemoved(d, 'styled', 'u-oldoldold1'); // a published upload: marked, deleted at publish
  d = toggleRemoved(d, 'styled', styled[3]);
  d = setFocus(addToGroup(d, 'styled', 'u-aaaaaaaaaa', LASH), 'u-aaaaaaaaaa', 0.5, 0.2);
  const out = finalData(d);
  assert.deepEqual(out.groups.styled, ['u-aaaaaaaaaa', ...styled.filter((id) => id !== styled[3])]);
  assert.deepEqual([out.uploads, out.labels], [{ 'u-aaaaaaaaaa': LASH }, {}]);
  assert.equal(validateAdmin(out, live, new Set(['u-aaaaaaaaaa'])), null);
  assert.deepEqual(d.data.groups.styled.includes('u-oldoldold1'), true); // the draft still shows it, grey
});
test('changes lists what a publish will do', () => {
  let d = fresh();
  assert.deepEqual(changes(d), { added: [], removed: [], reordered: [], replaced: [], relabelled: [] });
  assert.equal(isDirty(d), false);
  d = addToGroup(d, 'styled', 'u-aaaaaaaaaa', LASH);
  d = toggleRemoved(d, 'styled', styled[5]);
  d = move(d, 'nude-french', 0, 2);
  d = replaceSlot(d, 'home-hero', 'u-bbbbbbbbbb', HERO);
  d = setLabel(d, styled[2], 'look:fairy');
  assert.deepEqual(changes(d), { added: ['u-aaaaaaaaaa'], removed: [`styled/${styled[5]}`], reordered: ['nude-french'], replaced: ['home-hero'], relabelled: [styled[2]] });
  assert.equal(changeCount(d), 5);
  assert.equal(isDirty(d), true);
  assert.deepEqual(changes(move(fresh(), 'styled', 0, 0)).reordered, []); // dropped where it was
});
test('afterPublish: the published data becomes the clean state on the new base, waiting for review', () => {
  let d = toggleRemoved(addToGroup(fresh(), 'styled', 'u-aaaaaaaaaa', LASH), 'styled', styled[1]);
  const final = finalData(d);
  d = afterPublish(d, 42, 'base-1');
  assert.deepEqual([d.base, d.data, d.clean, d.removed, d.pending], ['base-1', final, final, [], { pr: 42, state: 'review' }]);
  assert.deepEqual(afterPublish(d, 0, 'base-1').pending, { pr: 0, state: 'live' }); // already on the site
  assert.equal(isDirty(d), false);
  assert.deepEqual(d.focus['u-aaaaaaaaaa'], { x: 0.5, y: 0.5 }); // its thumbnail is still drawn from the source until the site has it
});
test('resume: a second visit while the first publish is still building keeps the published state (the snapshot is older)', () => {
  const published = afterPublish(addToGroup(fresh(), 'styled', 'u-aaaaaaaaaa', LASH), 42, 'base-1');
  const again = resume(published, state('base-0'));
  assert.deepEqual([again.draft, again.stale], [published, false]);
  const edited = move(published, 'styled', 0, 1); // and it can be edited and published again on base-1
  assert.deepEqual(resume(edited, state('base-0')), { draft: edited, stale: false });
  const failed = { ...published, pending: { ...published.pending!, state: 'failed' as const } };
  assert.deepEqual(resume(failed, state('base-0')).draft, failed); // a failed build: the site never gets it; keep it for "try again"
});
test('resume: CI says live but the old snapshot is still served for a few seconds — keep the published state', () => {
  const published = afterPublish(addToGroup(fresh(), 'styled', 'u-aaaaaaaaaa', LASH), 42, 'base-1');
  const live = { ...published, pending: { ...published.pending!, state: 'live' as const } };
  assert.deepEqual(resume(live, state('base-0')), { draft: live, stale: false }); // not a false "網站已被更新"
  const edited = move(live, 'styled', 0, 1);
  assert.deepEqual(resume(edited, state('base-0')), { draft: edited, stale: false });
  // two publishes in a row: the site may still show either older version
  const twice = afterPublish(edited, 42, 'base-2');
  assert.equal(resume(twice, state('base-0')).draft, twice);
  assert.equal(resume(twice, state('base-1')).draft, twice);
  assert.deepEqual(resume(twice, state('base-2', twice.data)).draft, fromState(state('base-2', twice.data)));
});
test('resume: a turned-down PR — a clean phone goes back to the site; a draft built on it is flagged', () => {
  const published = afterPublish(addToGroup(fresh(), 'styled', 'u-aaaaaaaaaa', LASH), 42, 'base-1');
  const rejected = { ...published, pending: { ...published.pending!, state: 'rejected' as const } };
  assert.deepEqual(resume(rejected, state('base-0')), { draft: fromState(state('base-0')), stale: false });
  const edited = move(rejected, 'styled', 0, 1); // a draft built on the rejected version cannot be published either
  assert.deepEqual(resume(edited, state('base-0')), { draft: edited, stale: true });
});
test('resume: once the snapshot has caught up it is the truth again', () => {
  const published = afterPublish(addToGroup(fresh(), 'styled', 'u-aaaaaaaaaa', LASH), 42, 'base-1');
  const caughtUp = state('base-1', published.data);
  assert.deepEqual(resume(published, caughtUp), { draft: fromState(caughtUp), stale: false });
  const edited = move(published, 'styled', 0, 1);
  assert.deepEqual(resume(edited, caughtUp).draft.data, edited.data); // unpublished edits survive, pending is over
  assert.equal(resume(edited, caughtUp).draft.pending, undefined);
  assert.deepEqual(resume(undefined, state()).draft, fresh());
});
test('resume: the site was changed by someone else — a clean phone follows it, a dirty draft is flagged stale', () => {
  const other = structuredClone(adminData); other.groups.styled.reverse();
  assert.deepEqual(resume(fresh(), state('base-9', other)), { draft: fromState(state('base-9', other)), stale: false });
  const dirty = move(fresh(), 'styled', 0, 1);
  assert.deepEqual(resume(dirty, state('base-9', other)), { draft: dirty, stale: true });
  const live = { ...afterPublish(fresh(), 42, 'base-1'), pending: { pr: 42, state: 'live' as const } };
  assert.deepEqual(resume(live, state('base-9', other)).draft, fromState(state('base-9', other))); // ours went live, then theirs
});
test('kv falls back to memory when IndexedDB is missing (private browsing)', async () => {
  assert.equal(typeof indexedDB, 'undefined');
  assert.equal(await kv.get('draft'), undefined);
  await kv.set('draft', { a: 1 });
  assert.deepEqual(await kv.get('draft'), { a: 1 });
  await kv.set('src:u-aaaaaaaaaa', 'a photo');
  assert.deepEqual((await kv.keys()).sort(), ['draft', 'src:u-aaaaaaaaaa']); // so sources nothing needs any more can be cleared
  await kv.del('draft');
  assert.equal(await kv.get('draft'), undefined);
  assert.equal(kv.persistent, false);
});
