// Single source of truth for business facts (NAP, hours, socials, booking rules).
// Used by pages, JSON-LD and the booking API. Values marked PLACEHOLDER must be replaced before launch.

export const site = {
  name: 'Abby Eyelash',
  owner: 'Abby',
  // PLACEHOLDER — real street address must match Google Business Profile exactly.
  address: {
    street: 'Shop 1, 1 Burwood Road', // PLACEHOLDER
    locality: 'Burwood',
    region: 'NSW',
    postcode: '2134',
    country: 'AU',
  },
  geo: { lat: -33.8774, lng: 151.1036 }, // approx. Burwood centre — PLACEHOLDER until real address
  phone: '+61 400 000 000', // PLACEHOLDER (E.164)
  phoneDisplay: '0400 000 000', // PLACEHOLDER
  email: 'hello@example.com', // PLACEHOLDER
  timezone: 'Australia/Sydney',
  // About Abby — PLACEHOLDER facts (D4); owner supplies real ones. Empty arrays hide the line.
  abby: {
    yearsExperience: 6, // PLACEHOLDER
    certifications: ['Certified lash technician (PLACEHOLDER)'],
    products: ['PLACEHOLDER lash adhesive brand', 'PLACEHOLDER gel system'],
  },
  // 24h "HH:MM"; day 0 = Sunday.
  hours: [
    { day: 0, open: '10:00', close: '17:00' },
    { day: 1, open: '09:00', close: '19:00' },
    { day: 2, open: '09:00', close: '19:00' },
    { day: 3, open: '09:00', close: '19:00' },
    { day: 4, open: '09:00', close: '19:00' },
    { day: 5, open: '09:00', close: '19:00' },
    { day: 6, open: '09:00', close: '18:00' },
  ],
  social: {
    instagram: 'https://www.instagram.com/', // PLACEHOLDER
    xiaohongshu: 'https://www.xiaohongshu.com/', // PLACEHOLDER
    wechatId: 'abbyeyelash', // PLACEHOLDER
  },
  google: {
    reviewsUrl: 'https://www.google.com/maps', // PLACEHOLDER — Google Business Profile review link
    mapsEmbed: '', // PLACEHOLDER — embed URL from Google Maps "Share > Embed a map"
    ga4Id: '', // PLACEHOLDER e.g. G-XXXXXXX — empty disables analytics
  },
  booking: {
    slotMinutes: 30,
    bufferMinutes: 15,
    minNoticeHours: 3,
    maxAdvanceDays: 60,
  },
} as const;

export type Site = typeof site;
