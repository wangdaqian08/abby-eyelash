// GET /api/admin/status?pr=<number> → { state: 'review' | 'rejected' | 'building' | 'live' | 'failed' }; POST re-runs a failed build. Rules: src/lib/admin-api.ts
import type { AdminEnv } from '../../../src/lib/access.ts';
import { buildState, respond } from '../../../src/lib/admin-api.ts';

type Ctx = { request: Request; env: AdminEnv };
const pr = (request: Request) => new URL(request.url).searchParams.get('pr') ?? '';
export const onRequestGet = ({ request, env }: Ctx) => respond(request, env, (_email, demo) => buildState(env, demo, pr(request), false));
export const onRequestPost = ({ request, env }: Ctx) => respond(request, env, (_email, demo) => buildState(env, demo, pr(request), true));
