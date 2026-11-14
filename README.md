# Abby Eyelashes website

The website for Abby's lash, brow and nail studio in Burwood NSW. Astro builds the pages in English and Chinese. Cloudflare Pages hosts them. Pages Functions (`functions/`) serve the free booking times from Abby's Google Calendar.

## Run it locally

```sh
npm install
npm run start   # build, then http://localhost:8788 with the mock booking API (BOOKING_DEMO=1)
npm test            # unit + E2E tests side by side; fails if any test fails
npm run test:unit   # unit tests only (node runs the files in parallel)
npm run test:e2e    # E2E only: booking flow + layout check (every page and booking step, 360–1280px), split into
                    # shards that run at once. Uses a running `npm run start`, or builds and serves the site itself.
```

CI (`.github/workflows/ci.yml`) runs the unit and E2E jobs side by side on every pull request and every push to `main`. The site goes to Cloudflare only when both pass: a pull request gets a preview deployment, `main` goes to production. A failing test means no deployment. Setup: `docs/DEPLOY-CHECKLIST.md` part B2.

```sh
npm run check:layout  # the layout check alone, against a running site
```

More documents are in `docs/`: `SPEC.md`, `SETUP-booking.md`, `DEPLOY-CHECKLIST.md` and `PRICES.md`.

## Photo admin (decided 2026-11-14)

`/admin/` is a phone page where Abby adds, deletes, reorders and replaces the site's photos (Traditional Chinese, two people
only, behind Cloudflare Access). What it edits is one file, `src/data/photo-admin.json`; `src/data/photos.ts` builds the site's
photo lists from it. A new photo is cropped in the browser to the sizes of `scripts/photos.mjs` (1600 × 1200 or 1200 × 1600, JPEG).
"發佈" opens a pull request (branch `admin/photos`) through `functions/api/admin/`; the administrator reviews and merges it, and
CI deploys `main` as for any other commit, so the site stays static and nothing goes live unreviewed. Locally (`npm run start`) the admin runs in demo mode: no sign-in, nothing is
published. Setup and checks: `docs/DEPLOY-CHECKLIST.md`, part K. Design: `docs/superpowers/specs/2026-11-14-admin-photos-design.md`.

## Booking by message (decided 2026-11-08)

1. The website does not take bookings. The customer picks the services, a date and a time.
2. The booking page writes an SMS or WhatsApp message to Abby. The customer sends it from their own phone.
3. The message ends with a short calendar link, for example `/c/k7Hq2x9P`. The link holds only a random code, so nobody can read the booking from the link.
4. The server keeps the booking details in the `abby` database schema. When Abby opens the link, the server sends her to a Google Calendar "new event" page with the details filled in.
5. Abby saves the event and replies to the customer. Her reply makes the booking final.

Booking times (decided 2026-11-09): only events whose title starts with ❤️ block a time. Personal events, for example an all-day "rent" reminder, never block. Abby writes `❤️ 休假` to close a day. The calendar link creates events that start with `❤️ ⏳`.

## Booking combinations that are not allowed (decided 2026-11-10)

Every other combination can be booked. `quote()` in `src/data/services.ts` rejects each one below, so the booking APIs refuse it too, not only the form. Tests: `src/data/services.test.ts` (every permutation) and `scripts/e2e-booking.mjs` (every click order in the browser).

**Eyelash extensions, in one booking**

| # | Not allowed | Example | What the form does |
|---|---|---|---|
| 1 | Nothing chosen | Only the "Eyelash Extensions" card ticked | Continue stays disabled |
| 2 | Bottom lashes without a full set or infill | Bottom lashes – full on its own | Bottom lashes appear only after a set or infill is picked |
| 3 | Bottom lashes + removal, no full set or infill | Removal + bottom lashes – natural | Same as 2 |
| 4 | Infill + removal | Infill within 2 weeks + removal | Removal is hidden once an infill is picked; a removal ticked before is dropped |
| 5 | Two full sets or infills | Classic natural + hybrid full, or a set + an infill | One choice only (radio) |
| 6 | Bottom lashes natural + full | Both bottom-lash options | One choice only (radio) |

Why 4: an infill means Abby did the lashes, and removal is charged only for lashes done elsewhere ($10–$20). Removal is allowed on its own, or with a full set and bottom lashes in any order. A total that includes removal reads "from", for example "from $90".

**Nails**

| # | Not allowed | What the form does |
|---|---|---|
| 7 | Nail extensions without a gel or hand-painted design | The extensions link opens Gel Nails, and the client picks a design |
| 8 | More than 10 extensions | The menu stops at 10 |

**Several services**

| # | Not allowed | What the form does |
|---|---|---|
| 9 | The same service twice, for example two sets of lash extensions | Each service can be ticked once |

## Hosting and data (decided 2026-11-09)

One plan covers the Abby Eyelashes website, broker-agent and, later, werewolf-simple.

### What runs where

| Part | Where it runs | Cost a month |
|---|---|---|
| Abby Eyelashes website | Cloudflare Pages (static pages and Pages Functions) | Free |
| broker-agent frontend and backend | One BinaryLane VPS in Sydney: 2 vCPU, 4 GB RAM. docker-compose runs the stack. nginx serves the frontend and sends `/api` to the backend. | About AUD 21.56, GST included |
| Database for all applications | One PostgreSQL 16 on the same VPS. Each application has its own schema: `abby`, `broker_agent`, and later `werewolf`. | Included in the VPS |
| Link from the Abby website to the database | Cloudflare Hyperdrive through a Cloudflare Tunnel. A `cloudflared` process on the VPS opens the tunnel. The database port stays closed to the internet. | Free |
| Backups | A nightly `pg_dump` of the database, copied to Cloudflare R2. | Free up to 10 GB |

### Why

1. The broker-agent backend is Kotlin and Spring Boot on the JVM. Cloudflare Workers cannot run a JVM. The backend also runs a scheduler and long AI jobs, so it needs a server that is always on.
2. The Abby website stays on Cloudflare Pages. Its code uses Pages Functions. A fault or a restart on the VPS must not stop a live business website.
3. One database with one schema for each application gives one place to manage. Traffic is low at the start. We can move an application to its own database later.
4. The broker-agent frontend stays with its backend. One domain for both means no CORS setup, no cookie-domain change and no new Google sign-in callback.

### Options we rejected

| Option | Reason |
|---|---|
| Neon (free serverless PostgreSQL) for all data | The broker-agent scheduler keeps the database awake. That use is more than the free 100 compute hours a month. At the limit, Neon stops the compute, and all applications stop with it. |
| GCP (Compute Engine e2-medium, Sydney) | About USD 45 a month with IPv4 and disk. Cloud SQL has no free tier. Its smallest Sydney instance costs about USD 12–13 a month. |
| GoDaddy VPS | No Australian data centre. The nearest is Singapore. The intro price needs a 3-year prepayment, and the renewal price is about AUD 50 a month. |
| Shared web hosting (GoDaddy, Hostinger, SiteGround, VentraIP, Skyrack, FastComet) | No root access, no Docker, no JVM and no PostgreSQL. |
| Vultr, Lightsail, DigitalOcean, Linode (Sydney) | They can do the work, but cost USD 20–24 a month. BinaryLane costs about USD 14. |
| Oracle Cloud Always Free | Oracle can take back an idle free instance. A quiet demo can be idle for 7 days. |

Prices come from the providers' pages on 2026-11-09. Promotional prices change, so check them again before you buy.

### Also decided (2026-11-09)

- Each application gets its own database user that can use only its own schema.
- If the Abby website cannot reach the database, the booking message still goes out, without the calendar link.
- The first database table holds only the booking requests behind the short calendar link. Each request is deleted 24 hours after it was created.
- Tables for birthdays and referrals come later, through migrations.

To do before you buy the VPS: check that the BinaryLane plan includes a public IPv4 address.
