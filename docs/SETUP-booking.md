# Online booking — setup guide (for Abby)

The booking page (`/book`, `/zh/book`) works like this:

1. A customer picks a service, a date and a time. The times shown come from **your Google Calendar**: only events whose title **starts with ❤️** make that time unavailable (see "The ❤️ rule" below). Customers never see your events.
2. They fill in their name and phone, then tap **Send by WhatsApp** or **Send by SMS**. Their phone opens a message to you, already written: it starts with `【预约 Booking】` and lists the service, date and time, price, name, phone, notes, the deposit terms and their photo answer. **The website books nothing.**
3. The message ends with a short **📅 Add to calendar** link, for example `…/c/k7hq2x9p`. The link shows nothing about the booking. Tap it on your iPhone within **24 hours**: Google Calendar opens a new event, already filled in (`❤️ ⏳ <name> – <service>`, the right time and length, and the details). Check the time is still free, then tap **Save**. After 24 hours the link expires: add the event by hand from the message.
4. Reply to the customer to confirm and send the bank details for the deposit.

Until steps A–D are done, the booking page can run in **Demo mode**: times are made up, and a small "Demo mode" note appears on the booking page. Demo mode is automatic on your own computer; on the live site it only runs if the environment variable `BOOKING_DEMO=1` is set (for previews). Without it, a missing setting makes the booking page show an error with your phone number, so a typo can never show made-up free times.

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
4. Set permission to **See all event details** → **Send**. The website needs the titles to find the ❤️ events. It only reads: it never changes your calendar, never shows your events to customers and never records their titles.
5. On the same settings page, scroll to **Integrate calendar** and copy the **Calendar ID**. For your main calendar this is simply your Gmail address.

## The ❤️ rule (which events block booking times)

- An event blocks booking times **only if its title starts with ❤️**, for example `❤️ Mia – Hybrid full set`.
- Everything else never blocks: personal events, reminders, all-day events such as `rent`, birthdays.
- Closed for a holiday or an appointment of your own? Add `❤️ 休假` (all day) or `❤️ Doctor` (with times). That time is then closed on the website.
- A ❤️ later in the title doesn't count (`给妈妈买花❤️` stays free time). Only the first character counts.
- Only the red heart ❤️ counts. Look-alikes such as 💗, 💓 or 🩷 do not block anything.
- No gap around ❤️ events: a new booking can start the moment one ends (`bufferMinutes: 0`).
- **Before going live:** put ❤️ at the start of every client booking that is already in your calendar. Without it, the website shows that time as free.

Typing ❤️ fast on iPhone: **Settings → General → Keyboard → Text Replacement → +**. Phrase: `❤️`, Shortcut: `yy`. Typing `yy` then gives ❤️.

## D. Put the keys into Cloudflare Pages

Cloudflare dashboard → **Workers & Pages** → your `abby-eyelash` project → **Settings** → **Variables and Secrets** → for **Production**, add:

| Name | Value | Type |
|---|---|---|
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | the service account email (B.3) | Text |
| `GOOGLE_PRIVATE_KEY` | from the JSON file: the value of `"private_key"`, starting with `-----BEGIN PRIVATE KEY-----` and ending with `-----END PRIVATE KEY-----\n` (paste it exactly as it appears, `\n` included) | **Secret** |
| `GOOGLE_CALENDAR_ID` | the Calendar ID (C.5) — usually your Gmail address | Text |

Also check **Settings** → **Runtime** → **Compatibility date** for **both Production and Preview**. It must be **2026-08-04 or later**. If it is older, add the compatibility flag `nodejs_compat` on the same page. Otherwise the database driver stops the Functions runtime from starting, and **every page of the site fails**, not only the booking page. (Tested locally on 2026-11-09: date 2026-08-03 fails, 2026-08-04 works.)

Then open `/book` on the live site: the "Demo mode" note should be gone, and the days/times should match the free time in your calendar. Send yourself a test request from another phone and tap its 📅 link: Google Calendar should open with the event filled in.

⚠ **Delete `BOOKING_DEMO`** once the calendar is connected.

## Confirming a booking

1. A `【预约 Booking】` message arrives by SMS or WhatsApp.
2. Tap **📅 Add to calendar**, check the time, tap **Save**: the time is now taken on the website too.
3. Reply to the customer to confirm and send the bank details.
4. Deposit received → edit the event title and remove "⏳". **Keep the ❤️.** Not going ahead → delete the event. The time becomes bookable again within about a minute.
5. Need to move it? Drag the event to the new time in Google Calendar.

Until you save the event, the time still looks free on the website, so two people can ask for the same time. Whoever you save first gets it; offer the other one a new time.

## The short calendar link (database)

The 📅 link needs the database: PostgreSQL, schema `abby`, user `abby_app`. Each request is kept for 24 hours, then deleted.

- **Local:** `npm run start` starts the database in Docker (`docker-compose.yml`, port 5434) and applies `db/migrations/`. Without Docker the site still starts, and messages go out without the link.
- **Live, until the Sydney server is ready (phase 1):** no database is set, so messages go out without the link. Add events by hand.
- **Live, phase 2:** the database runs on the BinaryLane server in Sydney, and Cloudflare Hyperdrive reaches it through a Cloudflare Tunnel. Only configuration changes. Add a `HYPERDRIVE` binding (a Hyperdrive config for the tunnel), then run `DATABASE_URL=… npm run db:migrate` once against the server. The code reads `HYPERDRIVE` first and `DATABASE_URL` second.

## Booking rules (change in `src/data/site.ts`)

Opening hours (`hours`), 30-minute slot grid (`slotMinutes`), gap around every calendar event (`bufferMinutes`, now 0), at least 3 hours' notice (`minNoticeHours`), up to 60 days ahead (`maxAdvanceDays`). Service lengths and prices are in `src/data/services.ts`. Times are always Sydney time, including daylight-saving changes.

## For a developer: running it locally

```sh
npm install
cp .dev.vars.example .dev.vars          # leave GOOGLE_* empty for demo mode
npm run start                           # build + http://localhost:8788/book with BOOKING_DEMO=1
npm run test:unit                       # unit tests (availability incl. DST, message + calendar link)
```

## Troubleshooting

- **The booking page says "We couldn't load availability"** — the calendar isn't reachable. Check in Cloudflare → your project → **Functions** / real-time logs. The usual causes: the calendar isn't shared with the service account (step C), the Calendar ID is wrong, or the private key was pasted incompletely.
