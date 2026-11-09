// Every text the booking app (booking-client.ts) shows. On a Traditional Chinese page, BookingApp.astro puts
// zhStrings(bookingText) into data-config; the page, data-config included, is converted after the build
// (scripts/zh-hant.mjs), and the app maps the converted copy back onto these objects (src/lib/hant.ts).
import { priceWords, services } from '../../data/services.ts';
import { bookingStrings } from '../../i18n/booking.ts';

export const bookingText = { bookingStrings, services, priceWords };
