// GET /api/admin/status?commit=<sha> → { state: 'building' | 'live' | 'failed' }; POST re-runs a failed build. Rules: src/lib/admin-api.ts
import type { AdminEnv } from '../../../src/lib/access.ts';
import { buildState, respond } from '../../../src/lib/admin-api.ts';

type Ctx = { request: Request; env: AdminEnv };
const commit = (request: Request) => new URL(request.url).searchParams.get('commit') ?? '';
export const onRequestGet = ({ request, env }: Ctx) => respond(request, env, (_email, demo) => buildState(env, demo, commit(request), false));
export const onRequestPost = ({ request, env }: Ctx) => respond(request, env, (_email, demo) => buildState(env, demo, commit(request), true));
