// GET /c/<code> — the "Add to calendar" link in a booking message. Looks up the request and redirects to Google Calendar's
// new-event page, filled in. Nothing is written: Abby taps Save. Unknown or expired (24 h) codes get a short page.
import { site } from '../../src/data/site.ts';
import { CODE_RE, googleCalendarUrl } from '../../src/lib/booking-message.ts';
import { findRequest, KEEP_HOURS, type DbEnv } from '../../src/lib/db.ts';

// Abby reads these. Traditional is written out here (Functions don't run the converter); scripts/zh-hant.test.mjs checks it
// equals the converter's output, so a wording fix in src/i18n/zh-hant-fixes.json shows up here as a failing test.
export const linkText = {
  down: { en: 'This link isn’t working right now. Please add the booking from the message by hand.', zh: '链接暂时无法使用，请按消息内容手动添加预约。', hant: '鏈接暫時無法使用，請按消息內容手動添加預約。' },
  expired: (h: number) => ({ en: `This link has expired (links last ${h} hours). Please add the booking from the message by hand.`, zh: `链接已过期（有效期 ${h} 小时），请按消息内容手动添加预约。`, hant: `鏈接已過期（有效期 ${h} 小時），請按消息內容手動添加預約。` }),
};

const page = (status: number, { en, zh, hant }: { en: string; zh: string; hant: string }) =>
  new Response(
    `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>${site.name}</title><body style="font:16px/1.6 system-ui,sans-serif;max-width:32rem;margin:15vh auto;padding:0 1.25rem;color:#3a2530">
<p>${en}</p><p lang="zh-Hant">${hant}</p><p lang="zh-Hans">${zh}</p></body></html>`,
    { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' } },
  );

export const onRequestGet = async ({ params, env }: { params: { code: string }; env: DbEnv }) => {
  const code = String(params.code);
  let r = null;
  try {
    r = CODE_RE.test(code) ? await findRequest(env, code) : null;
  } catch (err) {
    console.error('c: database error', err);
    return page(503, linkText.down);
  }
  if (!r)
    return page(410, linkText.expired(KEEP_HOURS));
  return new Response(null, { status: 302, headers: { location: googleCalendarUrl(r, site.timezone), 'cache-control': 'no-store' } });
};
