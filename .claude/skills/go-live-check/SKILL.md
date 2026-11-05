---
name: go-live-check
description: Use whenever the user asks to go live, launch, deploy, publish, prepare for production / prod, release the site, or says 上线, 发布, 生产, 部署, 正式上线 for the Abby Eyelash site. Checks the code against every go-live reminder before anything ships.
---

# Go-live check

Run this before any production deploy, and whenever the user asks about going live. Do not deploy or merge as part of it; report, then let the user decide.

1. `npm run check:go-live` — the code-vs-reminders gate (`scripts/check-go-live.mjs`). Every BLOCK must be fixed before production; every WARN needs the owner's answer.
2. `npm test`
3. `LAUNCH=1 npm run build` — fails on purpose while dummy reviews remain (decision D3). Use the real `SITE_URL` if the domain exists.
4. `npm run check:seo`
5. Walk `docs/DEPLOY-CHECKLIST.md` parts A–F and mark which items can be confirmed from the repo and which only the owner can confirm (Cloudflare settings, env vars, Google tools).

Report as one list, blockers first: what fails, the file to change, and who must act (code change vs. owner material such as photos or real reviews). Keep it short.

When the user adds a new "remind me before production" item, add a `check(...)` line to `scripts/check-go-live.mjs` so it is enforced, rather than keeping it only in notes.
