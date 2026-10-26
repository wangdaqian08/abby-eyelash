# Online booking — setup guide (for Abby)

The booking page (`/book`, `/zh/book`) works like this:

1. A customer picks a service, a date and a time. The times shown come from **your Google Calendar**: any event in your calendar makes that time unavailable (customers never see what the event is).
2. When they press **Book appointment**, the website adds an event called **`⏳ PENDING – <name> – <service>`** to your calendar, with their phone, email, notes and price in the description.
3. You get an **email** about the new request (sent by Web3Forms).
4. You call or text the customer to confirm, then rename the event (see "Confirming a booking" at the end).

Until steps A–E are done, the booking page can run in **Demo mode**: times are made up, nothing is written to your calendar, and a small "Demo mode" note appears on the booking page. Demo mode is automatic on your own computer; on the live site it only runs if the environment variable `BOOKING_DEMO=1` is set (for previews). Without it, a missing setting makes the booking page show an error with your phone number — so a typo can never silently fake bookings.

You need about 30 minutes. Do the steps on a computer, signed in to the Gmail account whose calendar you use for appointments.

---

## A. Create a Google Cloud project and turn on the Calendar API

1. Go to <https://console.cloud.google.com/> and sign in with your Gmail account. Accept the terms if asked (no payment details are needed).
2. At the top left, click the project picker → **New project**. Name it `abby-eyelash-booking` → **Create**. Make sure the new project is selected at the top.
3. Open <https://console.cloud.google.com/apis/library/calendar-json.googleapis.com>, check that your project is selected, and click **Enable**.

## B. Create a "service account" (a robot user for the website) and download its key

1. Open <https://console.cloud.google.com/iam-admin/serviceaccounts> → **Create service account**.
2. Name: `website-booking` → **Create and continue** → skip the optional "roles" and "users" steps → **Done**.
3. Copy the service account's email address from the list. It looks like
   `website-booking@abby-eyelash-booking.iam.gserviceaccount.com`. You will need it twice below.
4. Click the service account → **Keys** tab → **Add key** → **Create new key** → **JSON** → **Create**. A `.json` file downloads.
   - Treat this file like a password. Don't email it or put it in the website folder.
   - If Google says key creation is disabled by an organisation policy, you are signed in to a work/school account — use your personal Gmail.

## C. Share your calendar with the service account

1. Open Google Calendar on a computer: <https://calendar.google.com/>.
2. On the left, under **My calendars**, hover over your calendar (usually your name) → ⋮ → **Settings and sharing**.
3. Under **Share with specific people or groups** → **Add people and groups** → paste the service account email from B.3.
4. Set permission to **Make changes to events** → **Send**. (It needs this to add the PENDING events; it only ever reads busy/free times and adds new events.)
5. On the same settings page, scroll to **Integrate calendar** and copy the **Calendar ID**. For your main calendar this is simply your Gmail address.

Tip: every event in this calendar blocks booking time — including personal ones (lunch, school pickup, holidays). Add an all-day or timed event whenever you want to close the books.

## D. Web3Forms (email notifications)

1. Go to <https://web3forms.com/>, enter the email address where you want booking notifications, and click **Create Access Key**. The key arrives by email.
2. The free plan allows 250 emails per month.

Why the email is sent from the customer's browser, not from the server: Web3Forms' API documentation says *"Server side usage requires paid plan + server IP whitelisting"* (<https://docs.web3forms.com/getting-started/api-reference>), and Cloudflare's servers don't have a fixed IP to whitelist anyway. Web3Forms access keys are designed to be public, so the booking page sends the email itself right after the booking has been saved to your calendar. If an email ever goes missing, the calendar event is still there — your calendar is the source of truth.

## E. Cloudflare Turnstile (stops spam bots)

1. In the Cloudflare dashboard, open **Turnstile** → **Add widget**.
2. Name: `Abby Eyelash booking`. Hostnames: your site's address, e.g. `abby-eyelash.pages.dev` (add your own domain later too).
3. Widget mode: **Managed** → **Create**.
4. Copy the **Site key** and the **Secret key**.

## F. Put the keys into Cloudflare Pages

Cloudflare dashboard → **Workers & Pages** → your `abby-eyelash` project → **Settings** → **Variables and Secrets** → for **Production**, add:

| Name | Value | Type |
|---|---|---|
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | the service account email (B.3) | Text |
| `GOOGLE_PRIVATE_KEY` | from the JSON file: the value of `"private_key"`, starting with `-----BEGIN PRIVATE KEY-----` and ending with `-----END PRIVATE KEY-----\n` (paste it exactly as it appears, `\n` included) | **Secret** |
| `GOOGLE_CALENDAR_ID` | the Calendar ID (C.5) — usually your Gmail address | Text |
| `TURNSTILE_SECRET_KEY` | Turnstile secret key (E.4) | **Secret** |
| `PUBLIC_TURNSTILE_SITE_KEY` | Turnstile site key (E.4) | Text |
| `PUBLIC_WEB3FORMS_ACCESS_KEY` | Web3Forms access key (D.1) | Text |

The two `PUBLIC_…` values are built into the page, so after saving go to **Deployments** → latest deployment → ⋯ → **Retry deployment** (a rebuild is needed for them to take effect).

Then open `/book` on the live site: the "Demo mode" note should be gone, and the days/times should match the free time in your calendar. Make a test booking with your own phone number — a PENDING event should appear in your calendar and an email should arrive.

⚠ Always set `TURNSTILE_SECRET_KEY` in production, and **delete `BOOKING_DEMO`** once the calendar is connected. If the Turnstile secret is missing and `BOOKING_DEMO` is not set, bookings are refused (error 503) rather than accepted unchecked.

## Confirming a booking

1. You get the email / see `⏳ PENDING – Mia Chen – Lash Lift – Lash lift & tint` in your calendar.
2. Call or text the customer using the phone number in the event description.
3. Confirmed → edit the event title, e.g. `Mia Chen – Lash lift & tint` (remove "⏳ PENDING").
   Not going ahead → delete the event; the time becomes bookable again straight away.
4. Need to move it? Drag the event to the new time in Google Calendar. The website always reads your calendar fresh, so it won't double-book.

## Booking rules (change in `src/data/site.ts`)

Opening hours (`hours`), 30-minute slot grid (`slotMinutes`), 15-minute gap around every calendar event (`bufferMinutes`), at least 3 hours' notice (`minNoticeHours`), up to 60 days ahead (`maxAdvanceDays`). Service lengths and prices are in `src/data/services.ts`. Times are always Sydney time, including daylight-saving changes.

## For a developer: running it locally

```sh
npm install
cp .dev.vars.example .dev.vars          # leave GOOGLE_* empty for demo mode
PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA npx astro build   # Cloudflare test key, always passes
npx wrangler pages dev ./dist           # http://localhost:8788/book
node --test                             # availability unit tests (incl. DST)
```

Cloudflare's Turnstile test keys are listed at <https://developers.cloudflare.com/turnstile/troubleshooting/testing/>.

## Troubleshooting

- **The booking page says "We couldn't load availability"** — the calendar isn't reachable. Check in Cloudflare → your project → **Functions** / real-time logs. The usual causes: the calendar isn't shared with the service account (step C), the Calendar ID is wrong, or the private key was pasted incompletely.
- **"Please complete the security check"** keeps appearing — the Turnstile hostname (E.2) doesn't match the site address, or the site key/secret pair don't belong together.
- **No emails** — check spam, check the Web3Forms key, and that you haven't used up the 250 free emails this month. Bookings still land in your calendar.
