import { test } from 'node:test';
import assert from 'node:assert/strict';
import { convertMarked, convertPage, fixes, simplifiedLeft, toHant } from './zh-hant.mjs';
import { linkText } from '../functions/c/[code].ts';

test('Taiwan character forms, characters only; ASCII and character references untouched', () => {
  assert.equal(toHant('宝活 Burwood 雾眉'), '寶活 Burwood 霧眉');
  assert.equal(toHant('里面为了着急'), '裡面為了著急'); // Taiwan forms, not 裏/爲/着
  assert.equal(toHant('<a href="/x/?a=1">&#31616;</a>'), '<a href="/x/?a=1">&#31616;</a>');
});

test("Abby's wording fixes are applied after the conversion", () => {
  assert.ok(fixes.length >= 1);
  assert.equal(toHant('可以只延长几只吗？'), '可以只延長幾支嗎？');
  // Abby, review of rows 1–300: 帳 and 黏 everywhere (not 賬 / 粘), 回補 (not 迴補).
  assert.equal(toHant('银行转账，账户信息，社交账号'), '銀行轉帳，帳戶信息，社交帳號');
  assert.equal(toHant('逐根粘在真睫毛上，胶水粘得更牢，粘贴甲片'), '逐根黏在真睫毛上，膠水黏得更牢，黏貼甲片');
  assert.equal(toHant('每 2–3 周回补一次，越早回补越便宜'), '每 2–3 週回補一次，越早回補越便宜');
  assert.equal(toHant('悉尼宝活 Burwood'), '雪梨寶活 Burwood'); // Sydney is 雪梨 in Taiwan (Abby)
  // Nail unit: 支 in Taiwan (Abby: 隻 is for animals). Pages show "$6 / 只"; the booking app reads the bare string from data-config.
  assert.equal(toHant('$6 / 只，10 分钟 / 只，每只 $6，一只到十只，只按数量收费'), '$6 / 支，10 分鐘 / 支，每支 $6，一支到十支，只按數量收費');
  assert.equal(convertPage('data-config="[&quot;只&quot;,&quot;只在尾端&quot;]"'), 'data-config="[&quot;支&quot;,&quot;只在尾端&quot;]"');
});

test('Traditional page: links in the text move to /zh-hant/, switcher and hreflang links keep their target', () => {
  const html = '<a href="/zh/lash-lift-burwood/" class="u">翘睫</a> <a href="/zh/" class="x">首页</a> <a href="/zh/?lang=zh" hreflang="zh-Hans">&#31616;</a> <link rel="alternate" hreflang="zh-Hans" href="https://www.abbyeyelashes.com/zh/">';
  const out = convertPage(html);
  assert.ok(out.includes('<a href="/zh-hant/lash-lift-burwood/" class="u">翹睫</a>'));
  assert.ok(out.includes('<a href="/zh-hant/" class="x">首頁</a>'));
  assert.ok(out.includes('<a href="/zh/?lang=zh" hreflang="zh-Hans">&#31616;</a>'));
  assert.ok(out.includes('href="https://www.abbyeyelashes.com/zh/"'));
});

test('other pages: only data-hant elements are converted (404 page)', () => {
  const html = '<div lang="zh-Hans"><h1>页面不存在</h1></div><div lang="zh-Hant" data-hant=""><h1>页面不存在</h1><a href="/zh/">首页</a></div>';
  assert.equal(convertMarked(html), '<div lang="zh-Hans"><h1>页面不存在</h1></div><div lang="zh-Hant" data-hant=""><h1>頁面不存在</h1><a href="/zh-hant/">首頁</a></div>');
});

test('leftover check: Simplified characters are caught, correct Traditional words are not', () => {
  assert.deepEqual(simplifiedLeft('預約时間'), ['时']);
  assert.deepEqual(simplifiedLeft('避免游泳，濃郁色'), []); // in "keep"
  assert.deepEqual(simplifiedLeft('也用來了解 &#31616;'), []); // phrase-level forms and character references don't count
});

test('the calendar-link page (written out in the Function) matches the converter', () => {
  assert.equal(linkText.down.hant, toHant(linkText.down.zh));
  const e = linkText.expired(24);
  assert.equal(e.hant, toHant(e.zh));
});
