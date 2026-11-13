// POST /api/admin/blob — body: one cropped photo as base64 JPEG text → { sha }. Rules: src/lib/admin-api.ts
import type { AdminEnv } from '../../../src/lib/access.ts';
import { putBlob, respond } from '../../../src/lib/admin-api.ts';

export const onRequestPost = ({ request, env }: { request: Request; env: AdminEnv }) =>
  respond(request, env, async (_email, demo) => putBlob(env, demo, await request.text()));
