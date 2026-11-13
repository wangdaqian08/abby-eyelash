// The photo admin's API (functions/api/admin/*): a publish is one commit to main, made with GitHub's Git Data API.
// CI then tests, builds and deploys it, as for any other commit. In demo mode nothing here calls GitHub.
// Docs: https://docs.github.com/en/rest/git · https://docs.github.com/en/rest/actions/workflow-runs
import { adminData, type AdminData } from '../data/photos.ts';
import { adminDemo, adminEmail, type AdminEnv } from './access.ts';
import { ADMIN_JSON, MAX_BLOB_BASE64, gitBlobSha, masterPath, removedMasters, validateAdmin } from './photo-admin.ts';

export type Reply = { status: number; body: Record<string, unknown> };
const reply = (status: number, body: Record<string, unknown>): Reply => ({ status, body });
const SHA = /^[0-9a-f]{40}$/;
const configured = (env: AdminEnv) => Boolean(env.ADMIN_GITHUB_TOKEN && env.ADMIN_REPO);
const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

class GitHubError extends Error {
  status: number;
  constructor(status: number, path: string) { super(`GitHub ${status} for ${path}`); this.status = status; }
}
async function gh<T = any>(env: AdminEnv, fetcher: typeof fetch, method: string, path: string, body?: unknown): Promise<T> {
  const r = await fetcher(`https://api.github.com/repos/${env.ADMIN_REPO}/${path}`, {
    method,
    headers: { Authorization: `Bearer ${env.ADMIN_GITHUB_TOKEN}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'abby-admin', 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!r.ok) throw new GitHubError(r.status, path);
  return (await r.json().catch(() => ({}))) as T;
}
/** A GitHub failure becomes 502 (and is logged); the site and the draft are untouched. */
const guarded = (work: () => Promise<Reply>) => work().catch((e) => {
  if (!(e instanceof GitHubError)) throw e;
  console.error(`admin: ${e.message}`);
  return reply(502, { error: 'github' });
});

/** POST /api/admin/blob — one cropped master (base64 JPEG) → the id GitHub stored it under. One photo per request keeps each call small. */
export async function putBlob(env: AdminEnv, demo: boolean, base64: string, fetcher: typeof fetch = fetch): Promise<Reply> {
  if (base64.length > MAX_BLOB_BASE64) return reply(413, { error: 'too-large' });
  if (!base64.startsWith('/9j/') || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) return reply(400, { error: 'not-jpeg' }); // /9j/ = FF D8 FF
  if (demo) return reply(200, { sha: 'd'.repeat(40) });
  if (!configured(env)) return reply(503, { error: 'not-configured' });
  return guarded(async () => reply(200, { sha: (await gh(env, fetcher, 'POST', 'git/blobs', { content: base64, encoding: 'base64' })).sha }));
}

/** POST /api/admin/publish — { base, data, blobs } → one commit: the new photo-admin.json, the new masters, the removed masters. */
export async function publish(env: AdminEnv, demo: boolean, email: string, body: unknown, fetcher: typeof fetch = fetch): Promise<Reply> {
  if (!isRecord(body) || typeof body.base !== 'string' || !isRecord(body.data) || !isRecord(body.blobs)
    || !Object.values(body.blobs).every((s) => typeof s === 'string' && SHA.test(s))) return reply(400, { error: 'bad-request' });
  const data = body.data as unknown as AdminData, blobs = body.blobs as Record<string, string>;
  const check = (prev: AdminData) => validateAdmin(data, prev, new Set(Object.keys(blobs)));
  const text = (d: AdminData) => JSON.stringify(d, null, 2) + '\n';

  if (demo) { // local preview and E2E: same checks, nothing is written
    // There is no repository to compare with: an upload that comes without a blob counts as published by an earlier demo publish.
    const earlier = Object.fromEntries(Object.entries(isRecord(data.uploads) ? data.uploads : {}).filter(([id]) => !(id in blobs)));
    const bad = check({ ...adminData, uploads: { ...adminData.uploads, ...earlier } });
    return bad ? reply(400, { error: bad }) : reply(200, { commit: 'demo', base: await gitBlobSha(text(data)) });
  }
  if (!configured(env)) return reply(503, { error: 'not-configured' });
  return guarded(async () => {
    const head: string = (await gh(env, fetcher, 'GET', 'git/ref/heads/main')).object.sha;
    const file = await gh(env, fetcher, 'GET', `contents/${ADMIN_JSON}?ref=${head}`);
    if (file.sha !== body.base) {
      // The repository already holds exactly this data: this publish was sent before and its reply was lost. Say yes again.
      if (file.sha === await gitBlobSha(text(data))) return reply(200, { commit: head, base: file.sha });
      return reply(409, { error: 'conflict' }); // someone published since this draft was started
    }
    const prevText = new TextDecoder().decode(Uint8Array.from(atob(file.content.replace(/\s/g, '')), (c) => c.charCodeAt(0)));
    const prev = JSON.parse(prevText) as AdminData;
    const bad = check(prev);
    if (bad) return reply(400, { error: bad });
    if (text(data) === prevText) return reply(400, { error: 'no-change' });

    const entry = (path: string, rest: object) => ({ path, mode: '100644', type: 'blob', ...rest });
    const tree = await gh(env, fetcher, 'POST', 'git/trees', {
      base_tree: (await gh(env, fetcher, 'GET', `git/commits/${head}`)).tree.sha,
      tree: [
        entry(ADMIN_JSON, { content: text(data) }),
        ...Object.entries(blobs).map(([id, sha]) => entry(masterPath(id, data.uploads[id].dir), { sha })),
        ...removedMasters(prev, data).map((path) => entry(path, { sha: null })), // sha null = delete
      ],
    });
    const commit = await gh(env, fetcher, 'POST', 'git/commits', { message: 'Photos: published from the admin', tree: tree.sha, parents: [head] });
    console.log(`admin: ${email} published ${commit.sha}`); // who published: in the Functions log, not in the repository's history
    try {
      await gh(env, fetcher, 'PATCH', 'git/refs/heads/main', { sha: commit.sha }); // not forced: fails if main moved meanwhile
    } catch (e) {
      if (e instanceof GitHubError && e.status === 422) return reply(409, { error: 'conflict' });
      throw e;
    }
    return reply(200, { commit: commit.sha, base: await gitBlobSha(text(data)) });
  });
}

/** GET /api/admin/status?commit= — has CI deployed that commit? `rerun` (POST) re-runs the failed jobs of a failed run. */
export async function buildState(env: AdminEnv, demo: boolean, commit: string, rerun: boolean, fetcher: typeof fetch = fetch): Promise<Reply> {
  if (demo) return reply(200, { state: 'live' });
  if (!SHA.test(commit)) return reply(400, { error: 'bad-request' });
  if (!configured(env)) return reply(503, { error: 'not-configured' });
  return guarded(async () => {
    const run = (await gh(env, fetcher, 'GET', `actions/runs?head_sha=${commit}&event=push&per_page=1`)).workflow_runs?.[0];
    if (!run || run.status !== 'completed') return reply(200, { state: 'building' }); // the deploy job is part of the run
    if (run.conclusion === 'success') return reply(200, { state: 'live' });
    if (!rerun) return reply(200, { state: 'failed' });
    await gh(env, fetcher, 'POST', `actions/runs/${run.id}/rerun-failed-jobs`);
    return reply(200, { state: 'building' });
  });
}

/** Every admin endpoint: sign-in first, then the work; JSON out, never cached. */
export async function respond(request: Request, env: AdminEnv, work: (email: string, demo: boolean) => Promise<Reply>, signIn = adminEmail): Promise<Response> {
  const email = await signIn(request, env);
  const demo = adminDemo(env, request.url);
  // A write must come from the admin page itself. Without this, any site Abby visits while signed in could make her
  // browser post a publish (the Access cookie travels with it); browsers always state the Origin of a POST.
  const foreign = request.method !== 'GET' && !demo && request.headers.get('origin') !== new URL(request.url).origin;
  const { status, body } = !email ? reply(401, { error: 'signin' }) : foreign ? reply(403, { error: 'origin' }) : await work(email, demo);
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
}
