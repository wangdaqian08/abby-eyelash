import test from 'node:test';
import assert from 'node:assert/strict';
import type { AdminData } from '../data/photos.ts';
import { fixture } from '../data/photo-admin.fixture.ts';
import { ADMIN_JSON, gitBlobSha } from './photo-admin.ts';
import { buildState, publish, putBlob, respond } from './admin-api.ts';

const adminData = fixture(); // never the live file: Abby's publishes change it
const env = { ADMIN_GITHUB_TOKEN: 'ghp_x', ADMIN_REPO: 'o/r', ACCESS_TEAM_DOMAIN: 't', ACCESS_AUD: 'a' };
const HEAD = 'a'.repeat(40), PRHEAD = '9'.repeat(40), TREE = 'b'.repeat(40), BLOB = 'c'.repeat(40), NEWTREE = 'e'.repeat(40), COMMIT = 'f'.repeat(40);
const text = (d: AdminData) => JSON.stringify(d, null, 2) + '\n';
type Call = { method: string; path: string; body?: any };
/** A fake GitHub: answers from `table` (key "METHOD path"), records every call. */
function github(table: Record<string, unknown | (() => Response)>) {
  const calls: Call[] = [];
  const fetcher = (async (url: string, init: RequestInit = {}) => {
    const path = url.replace('https://api.github.com/repos/o/r/', '');
    const method = init.method ?? 'GET';
    assert.equal((init.headers as Record<string, string>).Authorization, 'Bearer ghp_x');
    calls.push({ method, path, body: init.body ? JSON.parse(init.body as string) : undefined });
    const answer = table[`${method} ${path}`];
    if (answer === undefined) return new Response('{}', { status: 404 });
    return typeof answer === 'function' ? (answer as () => Response)() : new Response(JSON.stringify(answer));
  }) as unknown as typeof fetch;
  return { calls, fetcher, writes: () => calls.filter((c) => c.method !== 'GET') };
}
const OPEN = 'GET pulls?state=open&head=o:admin/photos';
const file = async (d: AdminData) => ({ sha: await gitBlobSha(text(d)), encoding: 'base64', content: Buffer.from(text(d)).toString('base64').replace(/(.{60})/g, '$1\n') });
/** A repository whose main holds `prev`, with no open admin PR (pass `extra` to change that). */
const repo = async (prev: AdminData, extra: Record<string, unknown> = {}) => ({
  [OPEN]: [],
  'GET git/ref/heads/main': { object: { sha: HEAD } },
  [`GET contents/${ADMIN_JSON}?ref=${HEAD}`]: await file(prev),
  [`GET git/commits/${HEAD}`]: { tree: { sha: TREE } },
  'POST git/trees': { sha: NEWTREE },
  'POST git/commits': { sha: COMMIT },
  'POST git/refs': { ref: 'refs/heads/admin/photos' },
  'POST pulls': { number: 42 },
  ...extra,
});
/** The same, but an admin PR is open whose branch holds `onBranch`. */
const reviewing = async (onBranch: AdminData) => repo(fixture(), {
  [OPEN]: [{ number: 42, head: { sha: PRHEAD } }],
  [`GET contents/${ADMIN_JSON}?ref=${PRHEAD}`]: await file(onBranch),
  [`GET git/commits/${PRHEAD}`]: { tree: { sha: TREE } },
  'PATCH git/refs/heads/admin/photos': { object: { sha: COMMIT } },
});
// The repository already holds one admin upload; the draft removes it and adds another.
const prev = structuredClone(adminData); prev.uploads['u-oldoldold1'] = { dir: 'lash', ratio: '4:3', where: 'styled' }; prev.groups.styled.unshift('u-oldoldold1');
const next = structuredClone(adminData); next.uploads['u-abcdefghij'] = { dir: 'lash', ratio: '4:3', where: 'styled' }; next.groups.styled.unshift('u-abcdefghij');
const body = async () => ({ base: await gitBlobSha(text(prev)), data: next, blobs: { 'u-abcdefghij': BLOB } });

test('publish: one commit with the JSON, the new master and the removed master, opened as a PR for review', async () => {
  const gh = github(await repo(prev));
  const r = await publish(env, false, 'abby@example.com', await body(), gh.fetcher);
  assert.deepEqual(r, { status: 200, body: { pr: 42, base: await gitBlobSha(text(next)) } });
  const tree = gh.calls.find((c) => c.path === 'git/trees')!.body;
  assert.equal(tree.base_tree, TREE);
  assert.deepEqual(tree.tree, [
    { path: ADMIN_JSON, mode: '100644', type: 'blob', content: text(next) },
    { path: 'src/assets/photos/lash/u-abcdefghij.jpg', mode: '100644', type: 'blob', sha: BLOB },
    { path: 'src/assets/photos/lash/u-oldoldold1.jpg', mode: '100644', type: 'blob', sha: null },
  ]);
  const commit = gh.calls.find((c) => c.path === 'git/commits')!.body;
  assert.deepEqual([commit.tree, commit.parents], [NEWTREE, [HEAD]]);
  assert.doesNotMatch(commit.message, /@/); // the repository may be public: no email address in its history
  assert.deepEqual(gh.calls.find((c) => c.path === 'git/refs')!.body, { ref: 'refs/heads/admin/photos', sha: COMMIT });
  const pr = gh.calls.find((c) => c.path === 'pulls')!.body;
  assert.deepEqual([pr.head, pr.base], ['admin/photos', 'main']);
  assert.doesNotMatch(JSON.stringify(pr), /@/);
  assert.ok(!gh.calls.some((c) => c.method !== 'GET' && c.path.includes('heads/main')), 'main itself is never written');
});
test('publish: while a PR is waiting for review, the next publish is added to it', async () => {
  const gh = github(await reviewing(prev));
  assert.deepEqual(await publish(env, false, 'a@b.c', await body(), gh.fetcher), { status: 200, body: { pr: 42, base: await gitBlobSha(text(next)) } });
  assert.deepEqual(gh.calls.find((c) => c.path === 'git/commits')!.body.parents, [PRHEAD]);
  assert.deepEqual(gh.writes().map((c) => `${c.method} ${c.path}`), ['POST git/trees', 'POST git/commits', 'PATCH git/refs/heads/admin/photos']);
  assert.equal(gh.writes().at(-1)!.body.force, undefined); // not forced: fails if the branch moved meanwhile
});
test('publish: an admin branch left over from a merged or closed PR is reset to the new commit', async () => {
  const gh = github(await repo(prev, {
    'POST git/refs': () => new Response('{"message":"Reference already exists"}', { status: 422 }),
    'PATCH git/refs/heads/admin/photos': { object: { sha: COMMIT } },
  }));
  assert.equal((await publish(env, false, 'a@b.c', await body(), gh.fetcher)).status, 200);
  assert.deepEqual(gh.calls.find((c) => c.method === 'PATCH')!.body, { sha: COMMIT, force: true });
  assert.ok(gh.calls.some((c) => c.path === 'pulls' && c.method === 'POST'));
});
test('publish: the repository moved on → 409 conflict, nothing written', async () => {
  const other = fixture(); other.groups.face.reverse();
  const gh = github(await repo(other)); // the file in the repository is not the one the draft started from
  assert.deepEqual(await publish(env, false, 'a@b.c', await body(), gh.fetcher), { status: 409, body: { error: 'conflict' } });
  assert.deepEqual(gh.writes(), []);
});
test('publish: sent again after its reply was lost → accepted, nothing written twice', async () => {
  const waiting = github(await reviewing(next)); // the open PR already holds exactly this data
  assert.deepEqual(await publish(env, false, 'a@b.c', await body(), waiting.fetcher), { status: 200, body: { pr: 42, base: await gitBlobSha(text(next)) } });
  assert.deepEqual(waiting.writes(), []);
  const merged = github(await repo(next)); // …or it was merged meanwhile
  assert.deepEqual(await publish(env, false, 'a@b.c', await body(), merged.fetcher), { status: 200, body: { pr: 0, base: await gitBlobSha(text(next)) } });
  assert.deepEqual(merged.writes(), []);
});
test('publish: the PR branch moved between read and write (PATCH 422) → 409 conflict', async () => {
  const gh = github({ ...(await reviewing(prev)), 'PATCH git/refs/heads/admin/photos': () => new Response('{"message":"Update is not a fast forward"}', { status: 422 }) });
  assert.deepEqual(await publish(env, false, 'a@b.c', await body(), gh.fetcher), { status: 409, body: { error: 'conflict' } });
});
test('publish: a GitHub refusal that is not a moved branch → 502, not a false conflict', async () => {
  const gh = github({ ...(await reviewing(prev)), 'PATCH git/refs/heads/admin/photos': () => new Response('{"message":"Repository rule violations found"}', { status: 422 }) });
  assert.deepEqual(await publish(env, false, 'a@b.c', await body(), gh.fetcher), { status: 502, body: { error: 'github' } });
});
test('publish: the other person opened an admin PR at the same moment → 409 conflict, their work kept', async () => {
  let opened = false; // the second look finds their PR
  const gh = github(await repo(prev, {
    [OPEN]: () => new Response(JSON.stringify(opened ? [{ number: 41, head: { sha: PRHEAD } }] : (opened = true, []))),
    'POST git/refs': () => new Response('{"message":"Reference already exists"}', { status: 422 }),
  }));
  assert.deepEqual(await publish(env, false, 'a@b.c', await body(), gh.fetcher), { status: 409, body: { error: 'conflict' } });
  assert.ok(!gh.calls.some((c) => c.method === 'PATCH'), 'their branch is not overwritten');
});
test('publish: invalid data → 400 with the validateAdmin code, nothing written', async () => {
  const gh = github(await repo(prev));
  const b = await body(); b.data = structuredClone(next); b.data.groups.styled.push('nail-6920');
  assert.deepEqual(await publish(env, false, 'a@b.c', b, gh.fetcher), { status: 400, body: { error: 'item' } });
  assert.deepEqual(await publish(env, false, 'a@b.c', { ...(await body()), blobs: {} }, gh.fetcher), { status: 400, body: { error: 'upload' } });
  assert.deepEqual(gh.writes(), []);
});
test('publish: a malformed body, an unchanged draft, a GitHub failure, a missing token', async () => {
  const gh = github(await repo(prev));
  for (const bad of [null, 'x', {}, { base: 1, data: next, blobs: {} }, { ...(await body()), blobs: { 'u-abcdefghij': 'not-a-sha' } }])
    assert.deepEqual(await publish(env, false, 'a@b.c', bad, gh.fetcher), { status: 400, body: { error: 'bad-request' } });
  assert.deepEqual(await publish(env, false, 'a@b.c', { base: await gitBlobSha(text(prev)), data: prev, blobs: {} }, gh.fetcher), { status: 400, body: { error: 'no-change' } });
  assert.deepEqual(gh.writes(), []);
  const down = github({ 'GET git/ref/heads/main': () => new Response('{}', { status: 500 }) });
  assert.deepEqual(await publish(env, false, 'a@b.c', await body(), down.fetcher), { status: 502, body: { error: 'github' } });
  assert.deepEqual(await publish({}, false, 'a@b.c', await body(), gh.fetcher), { status: 503, body: { error: 'not-configured' } });
});
test('publish: demo mode validates and calls no fetch at all', async () => {
  const gh = github({});
  const d = structuredClone(adminData); d.groups.styled.reverse();
  assert.deepEqual(await publish({}, true, 'demo@localhost', { base: 'whatever', data: d, blobs: {} }, gh.fetcher), { status: 200, body: { pr: 1, base: await gitBlobSha(text(d)) } });
  d.groups.styled.push('nope');
  assert.equal((await publish({}, true, 'demo@localhost', { base: 'whatever', data: d, blobs: {} }, gh.fetcher)).status, 400);
  assert.deepEqual(gh.calls, []);
});
test('publish: demo mode has no repository, so a later publish may keep the photos an earlier one added', async () => {
  const first = await publish({}, true, 'demo@localhost', { base: 'x', data: next, blobs: { 'u-abcdefghij': BLOB } });
  assert.equal(first.status, 200);
  const later = structuredClone(next); later.groups.styled.reverse(); // the first publish's photo stays; nothing new
  assert.equal((await publish({}, true, 'demo@localhost', { base: first.body.base, data: later, blobs: {} })).status, 200);
  later.groups.styled.push('nail-6920');
  assert.deepEqual(await publish({}, true, 'demo@localhost', { base: first.body.base, data: later, blobs: {} }), { status: 400, body: { error: 'item' } }); // still checked
});
test('putBlob: not a JPEG → 400; over the limit → 413; a JPEG → the blob sha', async () => {
  const gh = github({ 'POST git/blobs': { sha: BLOB } });
  assert.deepEqual(await putBlob(env, false, 'iVBORw0KGgo=', gh.fetcher), { status: 400, body: { error: 'not-jpeg' } });
  assert.deepEqual(await putBlob(env, false, '/9j/' + 'A'.repeat(2_000_000), gh.fetcher), { status: 413, body: { error: 'too-large' } });
  assert.deepEqual(await putBlob(env, false, '/9j/4AAQ not base64!', gh.fetcher), { status: 400, body: { error: 'not-jpeg' } });
  assert.deepEqual(gh.calls, []);
  assert.deepEqual(await putBlob(env, false, '/9j/4AAQSkZJRg==', gh.fetcher), { status: 200, body: { sha: BLOB } });
  assert.deepEqual(gh.calls[0].body, { content: '/9j/4AAQSkZJRg==', encoding: 'base64' });
  assert.deepEqual(await putBlob({}, true, '/9j/4AAQSkZJRg==', gh.fetcher), { status: 200, body: { sha: 'd'.repeat(40) } });
  assert.equal(gh.calls.length, 1);
});
test('buildState: waiting for review → review; closed unmerged → rejected; merged → the build of the merge on main', async () => {
  const M = 'd'.repeat(40);
  const gh = (pr: object, list: object[] = []) => github({
    'GET pulls/42': pr,
    [`GET actions/runs?head_sha=${M}&event=push&per_page=1`]: { workflow_runs: list },
    'POST actions/runs/7/rerun-failed-jobs': () => new Response('{}', { status: 201 }),
  });
  const ask = async (pr: object, list: object[] = [], rerun = false) => { const g = gh(pr, list); return { r: await buildState(env, false, '42', rerun, g.fetcher), g }; };
  const merged = { state: 'closed', merged_at: '2026-11-14T03:00:00Z', merge_commit_sha: M };
  assert.deepEqual((await ask({ state: 'open', merged_at: null })).r, { status: 200, body: { state: 'review' } });
  assert.deepEqual((await ask({ state: 'closed', merged_at: null })).r.body, { state: 'rejected' });
  assert.deepEqual((await ask(merged)).r.body, { state: 'building' });
  assert.deepEqual((await ask(merged, [{ id: 7, status: 'in_progress', conclusion: null }])).r.body, { state: 'building' });
  assert.deepEqual((await ask(merged, [{ id: 7, status: 'completed', conclusion: 'success' }])).r.body, { state: 'live' });
  assert.deepEqual((await ask(merged, [{ id: 7, status: 'completed', conclusion: 'failure' }])).r.body, { state: 'failed' });
  const again = await ask(merged, [{ id: 7, status: 'completed', conclusion: 'failure' }], true);
  assert.deepEqual(again.r.body, { state: 'building' });
  assert.equal(again.g.writes()[0].path, 'actions/runs/7/rerun-failed-jobs');
  assert.deepEqual((await ask(merged, [{ id: 7, status: 'completed', conclusion: 'success' }], true)).g.writes(), []);
  assert.deepEqual(await buildState(env, false, '42; rm -rf', false, gh({}).fetcher), { status: 400, body: { error: 'bad-request' } });
  assert.deepEqual(await buildState({}, true, '1', false, gh({}).fetcher), { status: 200, body: { state: 'live' } });
});
test('respond: a write that another site made the browser send is refused', async () => {
  const signedIn = { ADMIN_DEMO: '0' };
  const ask = async (headers: Record<string, string>, method = 'POST') => {
    let ran = false;
    // signed in (stubbed): what is tested here is the origin rule
    const out = await respond(new Request('https://www.abbyeyelashes.com/api/admin/publish', { method, headers }), signedIn, async () => { ran = true; return { status: 200, body: {} }; }, async () => 'abby@example.com');
    return [out.status, ran];
  };
  assert.deepEqual(await ask({ origin: 'https://evil.example' }), [403, false]);
  assert.deepEqual(await ask({}), [403, false]); // browsers always send Origin on a POST
  assert.deepEqual(await ask({ origin: 'https://www.abbyeyelashes.com' }), [200, true]);
  assert.deepEqual(await ask({}, 'GET'), [200, true]); // reading the build status changes nothing
});
test('respond: no sign-in → 401 and the work never runs; replies are JSON and never cached', async () => {
  let ran = false;
  const out = await respond(new Request('https://www.abbyeyelashes.com/api/admin/publish', { method: 'POST' }), env, async () => { ran = true; return { status: 200, body: {} }; });
  assert.equal(out.status, 401); assert.deepEqual(await out.json(), { error: 'signin' }); assert.equal(ran, false);
  const ok = await respond(new Request('http://localhost:8788/api/admin/status'), {}, async (email, demo) => ({ status: 200, body: { email, demo } }));
  assert.deepEqual(await ok.json(), { email: 'demo@localhost', demo: true });
  assert.equal(ok.headers.get('cache-control'), 'no-store'); assert.match(ok.headers.get('content-type')!, /application\/json/);
});
