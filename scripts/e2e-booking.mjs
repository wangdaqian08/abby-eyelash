// Browser test of the booking flow: every lash-extension choice (main × bottom × removal), in every click order the
// form allows, through to the step-5 message. Run against a served build: `npm run start`, then `node scripts/e2e-booking.mjs`.
// BASE=http://localhost:8788 by default. Expected totals come from src/data/services.ts, the code the APIs use.
// SHARD=k/n runs every n-th case starting at the k-th, so `npm run test:e2e` can run n copies side by side.
import { chromium } from 'playwright';
import { quoteAll, quoteAllText, services } from '../src/data/services.ts';

const BASE = process.env.BASE ?? 'http://localhost:8788';
const [K, N] = (process.env.SHARD ?? '1/1').split('/').map(Number);
let unit = 0;
const mine = () => unit++ % N === K - 1; // true for this shard's share of the test cases
const L = 'lash-extensions';
const lash = services.find((s) => s.id === L);
const mains = lash.options.filter((o) => !o.addon);
const name = (id, svc = lash) => svc.options.find((o) => o.id === id).name.en;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
let pass = 0;
const fails = [];
const check = (ok, msg) => (ok ? pass++ : fails.push(msg));

const open = async (path = '/book/') => {
  await page.goto(BASE + path);
  await page.waitForSelector('input[name="bk-service"]');
};
const tick = (svc) => page.click(`label:has(input[name="bk-service"][value="${svc}"])`);
const radio = (sel) => page.click(`label:has(${sel})`);
const act = {
  main: (id) => radio(`input[name="bk-option-${L}"][value="${id}"]`),
  bottom: (id) => radio(`input[data-service="${L}"][value="${id}"]`),
  removal: () => radio(`input[data-service="${L}"][value="removal"]`),
};
const isChecked = (sel) => page.$eval(sel, (e) => e.checked).catch(() => null);
const continueOn = () => page.$eval('[data-action="to-date"]', (b) => !b.disabled);
const noJunk = async (ctx) => {
  const text = await page.$eval('[data-booking]', (e) => e.innerText);
  check(!/undefined|NaN|null/.test(text), `${ctx}: page shows undefined/NaN/null`);
};

// Walks steps 2-5 and checks the message against the shared quote.
async function finish(ctx, items, label) {
  await page.click('[data-action="to-date"]');
  await page.waitForSelector('[data-grid] button[data-date]:not([aria-disabled])');
  check((await page.textContent('[data-stepper] li:first-child')).includes(label), `${ctx}: step-1 summary should read "${label}"`);
  await page.click('[data-grid] button[data-date]:not([aria-disabled])');
  await page.click('button[data-time]');
  await page.click('[data-action="to-details"]');
  await page.fill('#bk-name', 'Test Client');
  await page.fill('#bk-phone', '0412 345 678');
  await page.check('#bk-deposit');
  await page.click('form[data-form] button[type="submit"]');
  await page.waitForSelector('#bk-message');
  const msg = await page.inputValue('#bk-message');
  const q = quoteAll(items);
  check(msg.includes(`Service: ${label}`), `${ctx}: message service line\n${msg}`);
  check(msg.includes(`Price: ${quoteAllText(q, 'en')}`), `${ctx}: message price should be ${quoteAllText(q, 'en')}\n${msg}`);
  check(msg.includes(`(${q.minutes} min`), `${ctx}: message duration should be ${q.minutes} min\n${msg}`);
  await noJunk(ctx);
}

// 1. All lash permutations × every click order the form allows (bottom lashes only appear once a set is picked).
const orders = (m, b, r) => {
  const steps = [m && 'main', b && 'bottom', r && 'removal'].filter(Boolean);
  const perms = (a) => (a.length < 2 ? [a] : a.flatMap((x, i) => perms([...a.slice(0, i), ...a.slice(i + 1)]).map((p) => [x, ...p])));
  return perms(steps).filter((p) => !p.includes('bottom') || p.indexOf('main') < p.indexOf('bottom'));
};
let cases = 0;
for (const main of [undefined, ...mains])
  for (const bottom of [undefined, 'bottom-natural', 'bottom-full'])
    for (const rem of [false, true]) {
      if (!main && bottom) {
        // not reachable: no bottom-lash choice is shown before a set is picked
        if (!mine()) continue;
        await open();
        await tick(L);
        if (rem) await act.removal();
        check((await page.$$(`input[data-service="${L}"][value^="bottom"]`)).length === 0, `bottom lashes shown without a set (removal=${rem})`);
        continue;
      }
      if (main?.noRemoval && rem) {
        // infill: removal is hidden once it is picked, and a removal ticked before is dropped
        if (!mine()) continue;
        const ctx = `${main.id} / ${bottom ?? 'no-bottom'} / removal`;
        cases++;
        await open();
        await tick(L);
        await act.main(main.id);
        check((await page.$$(`input[data-service="${L}"][value="removal"]`)).length === 0, `${ctx}: removal shown with infill`);
        await open();
        await tick(L);
        await act.removal();
        await act.main(main.id);
        if (bottom) await act.bottom(bottom);
        check((await page.$$(`input[data-service="${L}"][value="removal"]`)).length === 0, `${ctx}: removal still shown after picking infill`);
        check(await continueOn(), `${ctx}: infill should continue`);
        const addons = bottom ? { [bottom]: 1 } : {};
        await finish(`${ctx} [removal→infill]`, [{ service: L, option: main.id, addons }], `${lash.name.en} · ${[main.id, bottom].filter(Boolean).map((id) => name(id)).join(' + ')}`);
        continue;
      }
      for (const order of orders(main?.id, bottom, rem).length ? orders(main?.id, bottom, rem) : [[]]) {
        if (!mine()) continue;
        const ctx = `${main?.id ?? 'no-set'} / ${bottom ?? 'no-bottom'} / ${rem ? 'removal' : 'no-removal'} [${order.join('→') || 'nothing'}]`;
        cases++;
        await open();
        await tick(L);
        for (const step of order) await act[step](step === 'main' ? main.id : bottom);
        if (main) check(await isChecked(`input[name="bk-option-${L}"][value="${main.id}"]`), `${ctx}: set lost`);
        if (bottom) check(await isChecked(`input[data-service="${L}"][value="${bottom}"]`), `${ctx}: bottom lashes lost`);
        check(!!(await isChecked(`input[data-service="${L}"][value="removal"]`)) === rem, `${ctx}: removal tick wrong`); // missing (infill) = not ticked
        const valid = !!main || rem;
        check((await continueOn()) === valid, `${ctx}: Continue should be ${valid ? 'enabled' : 'disabled'}`);
        await noJunk(ctx);
        if (!valid) continue;
        const addons = { ...(bottom && { [bottom]: 1 }), ...(rem && main && { removal: 1 }) };
        const items = [{ service: L, option: main?.id ?? 'removal', addons }];
        const label = `${lash.name.en} · ${main ? [main.id, bottom, rem && 'removal'].filter(Boolean).map((id) => name(id)).join(' + ') : name('removal')}`;
        await finish(ctx, items, label);
      }
    }

// 2. Changing your mind keeps the other choices.
if (mine()) {
  await open();
  await tick(L);
  await act.removal();
  await act.main('classic-natural');
  await act.bottom('bottom-full');
  await act.main('hybrid-full');
  check(await isChecked(`input[data-service="${L}"][value="bottom-full"]`), 'switching set dropped bottom lashes');
  check(await isChecked(`input[data-service="${L}"][value="removal"]`), 'switching set dropped removal');
  await page.click(`label:has(input[data-service="${L}"][value="removal"]) >> xpath=preceding-sibling::label[1]`);
  check(!(await isChecked(`input[data-service="${L}"][value="removal"]`)), 'removal "None" did not untick removal');
  check(await isChecked(`input[name="bk-option-${L}"][value="hybrid-full"]`), 'removal "None" dropped the set');
  check(await continueOn(), 'set + bottom without removal should continue');

  await open();
  await tick(L);
  await act.removal();
  await page.click(`label:has(input[data-service="${L}"][value="removal"]) >> xpath=preceding-sibling::label[1]`);
  check(!(await continueOn()), 'removal ticked then un-ticked with no set should not continue');

  await open();
  await tick(L);
  await act.main('styled');
  await act.removal();
  await tick(L);
  await tick(L);
  check(!(await continueOn()) && !(await isChecked(`input[data-service="${L}"][value="removal"]`)), 'untick + retick the service should start clean');
}

// 3. Back from step 2 keeps step-1 choices.
if (mine()) {
  await open();
  await tick(L);
  await act.main('classic-full');
  await act.removal();
  await page.click('[data-action="to-date"]');
  await page.click('[data-stepper] button[data-goto="1"]');
  await page.waitForSelector(`input[name="bk-option-${L}"]`);
  check(
    (await isChecked(`input[name="bk-option-${L}"][value="classic-full"]`)) && (await isChecked(`input[data-service="${L}"][value="removal"]`)),
    'going back to step 1 lost the choices',
  );
}

// 4. Deep links.
if (mine()) {
  await open(`/book/?service=${L}&option=removal`);
  check((await isChecked(`input[data-service="${L}"][value="removal"]`)) && (await continueOn()), 'deep link option=removal');
  await open(`/book/?service=${L}&option=classic-natural`);
  check((await isChecked(`input[name="bk-option-${L}"][value="classic-natural"]`)) && !(await isChecked(`input[data-service="${L}"][value="removal"]`)), 'deep link option=classic-natural');
}

// 5. Several services: removal alone + gel with 3 extensions + lash lift.
if (mine()) {
  await open();
  await tick(L);
  await act.removal();
  await tick('gel-nails');
  await radio('input[name="bk-option-gel-nails"][value="cat-eye"]');
  await page.selectOption('select[data-service="gel-nails"]', '3');
  await tick('lash-lift');
  const gel = services.find((s) => s.id === 'gel-nails');
  const lift = services.find((s) => s.id === 'lash-lift');
  await finish(
    'multi-service',
    [{ service: L, option: 'removal', addons: {} }, { service: 'lash-lift', option: 'keratin-lift', addons: {} }, { service: 'gel-nails', option: 'cat-eye', addons: { extension: 3 } }],
    `${lash.name.en} · ${name('removal')} + ${lift.name.en} · ${name('keratin-lift', lift)} + ${gel.name.en} · ${name('cat-eye', gel)} + ${name('extension', gel)} × 3`,
  );
  check((await page.textContent('[data-stepper]')).includes('Send') && !(await page.textContent('[data-stepper]')).includes('undefined'), 'step-5 rail label');
}

// 6. Chinese page and a phone-width screen: removal + set, no junk text.
if (mine()) {
  await open('/zh/book/');
  await tick(L);
  await act.removal();
  await act.main('classic-natural');
  check(await continueOn(), 'zh: removal + set should continue');
  await noJunk('zh');
  await page.setViewportSize({ width: 390, height: 844 });
  await open();
  await tick(L);
  await act.main('hybrid-natural');
  await act.removal();
  await act.bottom('bottom-natural');
  check(await continueOn(), 'mobile: set + removal + bottom should continue');
  await noJunk('mobile');
}

check(errors.length === 0, `page errors: ${errors.join(' | ')}`);
await browser.close();
console.log(`${cases} lash click-order cases, ${pass} checks passed, ${fails.length} failed`);
for (const f of fails) console.log('FAIL', f);
process.exit(fails.length ? 1 : 0);
process.exit(fails.length ? 1 : 0);
