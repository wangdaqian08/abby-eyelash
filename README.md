# Abby Eyelashes website

The website for Abby's lash, brow and nail studio in Burwood NSW. Astro builds the pages in English and Chinese. Cloudflare Pages hosts them. Pages Functions (`functions/`) serve the free booking times from Abby's Google Calendar.

## Run it locally

```sh
npm install
npm run start   # build, then http://localhost:8788 with the mock booking API (BOOKING_DEMO=1)
npm test        # unit tests
```

More documents are in `docs/`: `SPEC.md`, `SETUP-booking.md`, `DEPLOY-CHECKLIST.md` and `PRICES.md`.

## Booking by message (decided 2026-11-08, work in progress)

1. The website does not take bookings. The customer picks the services, a date and a time.
2. The booking page writes an SMS or WhatsApp message to Abby. The customer sends it from their own phone.
3. The message ends with a short calendar link, for example `/c/k7Hq2x9P`. The link holds only a random code, so nobody can read the booking from the link.
4. The server keeps the booking details in the `abby` database schema. When Abby opens the link, the server sends her to a Google Calendar "new event" page with the details filled in.
5. Abby saves the event and replies to the customer. Her reply makes the booking final.

Not decided yet: which calendar events block booking times. Abby's calendar also holds personal events, for example an all-day "rent" reminder, and these must not block bookings. A fixed title marker is the proposal.

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

### Not decided yet

- Before you buy: check that the BinaryLane plan includes a public IPv4 address.
- Each application gets its own database user that can use only its own schema.
- If the Abby website cannot reach the database, the booking message still goes out, without the calendar link.
- The first database table holds only booking requests for the short calendar link. Tables for birthdays and referrals come later, through migrations.
