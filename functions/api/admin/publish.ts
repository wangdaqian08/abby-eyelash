// POST /api/admin/publish — { base, data, blobs } → { pr, base } | 409 conflict | 400 <reason>. Rules: src/lib/admin-api.ts
import type { AdminEnv } from '../../../src/lib/access.ts';
import { publish, respond } from '../../../src/lib/admin-api.ts';

export const onRequestPost = ({ request, env }: { request: Request; env: AdminEnv }) =>
  respond(request, env, async (email, demo) => {
    const text = await request.text();
    if (text.length > 200_000) return { status: 413, body: { error: 'too-large' } }; // the JSON only: photos go through /api/admin/blob
    let body: unknown;
    try { body = JSON.parse(text); } catch { body = null; }
    return publish(env, demo, email, body);
  });
