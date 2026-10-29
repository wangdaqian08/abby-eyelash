// Single source of truth for business facts (NAP, hours, socials, booking rules).
// Used by pages, JSON-LD and the booking API. Values marked PLACEHOLDER must be replaced before launch.

export const site = {
  name: 'Abby Eyelash',
  owner: 'Abby',
  // Home studio: street name only, never the house number (Abby sends it when confirming). Must match Google Business Profile.
  address: {
    street: 'Burwood Rd',
    locality: 'Burwood',
    region: 'NSW',
    postcode: '2134',
    country: 'AU',
  },
  geo: { lat: -33.8774, lng: 151.1036 }, // deliberately approximate (Burwood centre) so the home studio can't be pinpointed
  // Texts and WhatsApp only — Abby doesn't take calls, so links open SMS/WhatsApp, never tel:.
  phone: '+61 457 058 649', // E.164
  phoneDisplay: '0457 058 649',
  email: '' as string, // not published; empty hides it everywhere
  timezone: 'Australia/Sydney',
  // About Abby — she chose not to publish these (2026-10-30). 0 / empty arrays hide the line.
  abby: {
    yearsExperience: 0,
    certifications: [] as string[],
    products: [] as string[],
  },
  // 24h "HH:MM"; day 0 = Sunday. `close` is the LAST START time (20:00 = the latest an appointment can begin).
  // Sundays: only the 3rd Sunday of the month (nth: 3); every other Sunday is closed.
  hours: [
    { day: 1, open: '10:00', close: '20:00' },
    { day: 2, open: '10:00', close: '20:00' },
    { day: 3, open: '10:00', close: '20:00' },
    { day: 4, open: '10:00', close: '20:00' },
    { day: 5, open: '10:00', close: '20:00' },
    { day: 6, open: '10:00', close: '20:00' },
    { day: 0, open: '09:00', close: '20:00', nth: 3 },
  ] as { day: number; open: string; close: string; nth?: number }[],
  social: {
    instagram: 'https://www.instagram.com/a.b_flora/',
    xiaohongshu: '' as string, // not published; empty hides it
    wechatId: 'AB_Flora',
  },
  google: {
    reviewsUrl: '' as string, // no Google Business Profile link yet; empty hides the review links
    mapsEmbed: '', // PLACEHOLDER — embed URL from Google Maps "Share > Embed a map"
    ga4Id: '', // PLACEHOLDER e.g. G-XXXXXXX — empty disables analytics
  },
  booking: {
    slotMinutes: 30,
    bufferMinutes: 15,
    minNoticeHours: 3,
    maxAdvanceDays: 60,
    deposit: 20, // AUD, paid by WeChat after booking; not refunded inside cancelHours
    cancelHours: 48,
  },
} as const;

export type Site = typeof site;
