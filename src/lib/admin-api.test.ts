import test from 'node:test';
import assert from 'node:assert/strict';
import type { AdminData } from '../data/photos.ts';
import { fixture } from '../data/photo-admin.fixture.ts';
import { ADMIN_JSON, gitBlobSha } from './photo-admin.ts';
import { buildState, publish, putBlob, respond } from './admin-api.ts';

const adminData = fixture(); // never the live file: Abby's publishes change it
const env = { ADMIN_GITHUB_TOKEN: 'ghp_x', ADMIN_REPO: 'o/r', ACCESS_TEAM_DOMAIN: 't', ACCESS_AUD: 'a' };
const HEAD = 'a'.repeat(40), TREE = 'b'.repeat(40), BLOB = 'c'.repeat(40), NEWTREE = 'e'.repeat(40), COMMIT = 'f'.repeat(40);
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
const repo = async (prev: AdminData, extra: Record<string, unknown> = {}) => ({
  'GET git/ref/heads/main': { object: { sha: HEAD } },
  [`GET contents/${ADMIN_JSON}?ref=${HEAD}`]: { sha: await gitBlobSha(text(prev)), encoding: 'base64', content: Buffer.from(text(prev)).toString('base64').replace(/(.{60})/g, '$1\n') },
  [`GET git/commits/${HEAD}`]: { tree: { sha: TREE } },
  'POST git/trees': { sha: NEWTREE },
  'POST git/commits': { sha: COMMIT },
  'PATCH git/refs/heads/main': { object: { sha: COMMIT } },
  ...extra,
});
// The repository already holds one admin upload; the draft removes it and adds another.
const prev = structuredClone(adminData); prev.uploads['u-oldoldold1'] = { dir: 'lash', ratio: '4:3', where: 'styled' }; prev.groups.styled.unshift('u-oldoldold1');
const next = structuredClone(adminData); next.uploads['u-abcdefghij'] = { dir: 'lash', ratio: '4:3', where: 'styled' }; next.groups.styled.unshift('u-abcdefghij');
const body = async () => ({ base: await gitBlobSha(text(prev)), data: next, blobs: { 'u-abcdefghij': BLOB } });

test('publish: one commit with the JSON, the new master and the removed master', async () => {
  const gh = github(await repo(prev));
  const r = await publish(env, false, 'abby@example.com', await body(), gh.fetcher);
  assert.deepEqual(r, { status: 200, body: { commit: COMMIT, base: await gitBlobSha(text(next)) } });
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
  assert.deepEqual(gh.calls.at(-1), { method: 'PATCH', path: 'git/refs/heads/main', body: { sha: COMMIT } });
});
test('publish: the repository moved on → 409 conflict, nothing written', async () => {
  const other = fixture(); other.groups.face.reverse();
  const gh = github(await repo(other)); // the file in the repository is not the one the draft started from
  assert.deepEqual(await publish(env, false, 'a@b.c', await body(), gh.fetcher), { status: 409, body: { error: 'conflict' } });
  assert.deepEqual(gh.writes(), []);
});
test('publish: sent again after its reply was lost → accepted, nothing written twice', async () => {
  const gh = github(await repo(next)); // the repository already holds exactly this data
  assert.deepEqual(await publish(env, false, 'a@b.c', await body(), gh.fetcher), { status: 200, body: { commit: HEAD, base: await gitBlobSha(text(next)) } });
  assert.deepEqual(gh.writes(), []);
});
test('publish: main moved between read and write (PATCH 422) → 409 conflict', async () => {
  const gh = github(await repo(prev, { 'PATCH git/refs/heads/main': () => new Response('{"message":"Update is not a fast forward"}', { status: 422 }) }));
  assert.deepEqual(await publish(env, false, 'a@b.c', await body(), gh.fetcher), { status: 409, body: { error: 'conflict' } });
});
test('publish: a branch rule refuses the commit (PATCH 422 rule violation) → 502, not a false conflict', async () => {
  const gh = github(await repo(prev, { 'PATCH git/refs/heads/main': () => new Response('{"message":"Repository rule violations found\\n\\nChanges must be made through a pull request."}', { status: 422 }) }));
  assert.deepEqual(await publish(env, false, 'a@b.c', await body(), gh.fetcher), { status: 502, body: { error: 'github' } });
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
  assert.deepEqual(await publish({}, true, 'demo@localhost', { base: 'whatever', data: d, blobs: {} }, gh.fetcher), { status: 200, body: { commit: 'demo', base: await gitBlobSha(text(d)) } });
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
test('buildState: no run yet and running → building; success → live; failure → failed; rerun posts rerun-failed-jobs', async () => {
  const runs = (list: object[]) => github({ [`GET actions/runs?head_sha=${COMMIT}&event=push&per_page=1`]: { workflow_runs: list }, 'POST actions/runs/7/rerun-failed-jobs': () => new Response('{}', { status: 201 }) });
  const state = async (list: object[], rerun = false) => { const gh = runs(list); return { r: await buildState(env, false, COMMIT, rerun, gh.fetcher), gh }; };
  assert.deepEqual((await state([])).r, { status: 200, body: { state: 'building' } });
  assert.deepEqual((await state([{ id: 7, status: 'in_progress', conclusion: null }])).r.body, { state: 'building' });
  assert.deepEqual((await state([{ id: 7, status: 'completed', conclusion: 'success' }])).r.body, { state: 'live' });
  assert.deepEqual((await state([{ id: 7, status: 'completed', conclusion: 'failure' }])).r.body, { state: 'failed' });
  const again = await state([{ id: 7, status: 'completed', conclusion: 'failure' }], true);
  assert.deepEqual(again.r.body, { state: 'building' });
  assert.equal(again.gh.writes()[0].path, 'actions/runs/7/rerun-failed-jobs');
  assert.deepEqual((await state([{ id: 7, status: 'completed', conclusion: 'success' }], true)).gh.writes(), []); // nothing to re-run
  assert.deepEqual(await buildState(env, false, 'main; rm -rf', false, runs([]).fetcher), { status: 400, body: { error: 'bad-request' } });
  assert.deepEqual(await buildState({}, true, 'demo', false, runs([]).fetcher), { status: 200, body: { state: 'live' } });
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
