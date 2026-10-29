import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePrice, parsePrices } from './prices.mjs';

const HEAD = '编号,服务,项目,价格,时长（分钟）,更新日期,备注\n';
const NOW = Date.parse('2026-10-29T00:00:00Z');

test('parsePrice: exact, from, range, percent; rejects nonsense', () => {
  assert.deepEqual(parsePrice('80'), { price: 80 });
  assert.deepEqual(parsePrice('$ 130起'), { price: 130, from: true });
  assert.deepEqual(parsePrice('130+'), { price: 130, from: true });
  assert.deepEqual(parsePrice('10-20'), { price: 10, maxPrice: 20, from: true });
  assert.deepEqual(parsePrice('50%'), { pct: 50 });
  for (const bad of ['', '八十', '20-10', '0%', '150%', '80.5']) assert.equal(parsePrice(bad), null, bad);
});

test('parsePrices: BOM, CRLF, quoted cells and blank lines', () => {
  const csv = `﻿${HEAD}a-b/c,服务,"项目, 带逗号",80,60,2026-10-29,"备注, 也有逗号"\r\n\r\nx-y/z,,,50%,45,2026-10-01,\r\n`;
  assert.deepEqual(parsePrices(csv, NOW), {
    'a-b/c': { price: 80, minutes: 60, updated: '2026-10-29' },
    'x-y/z': { pct: 50, minutes: 45, updated: '2026-10-01' },
  });
});

test('parsePrices: lists every bad row with its line number', () => {
  const csv = `${HEAD}a-b/c,,,八十,60,2026-10-29,\na-b/c,,,80,5,2026/10/29,\nBad Id,,,80,60,2026-12-31,\n`;
  assert.throws(() => parsePrices(csv, NOW), (e) => {
    for (const s of ['第 2 行', '价格“八十”', '第 3 行', '编号重复', '时长', '更新日期', '第 4 行', '编号不对']) assert.match(e.message, new RegExp(s));
    return true;
  });
});

test('the committed price table is valid', async () => {
  const { readFileSync } = await import('node:fs');
  assert.ok(Object.keys(parsePrices(readFileSync(new URL('../src/data/prices.csv', import.meta.url), 'utf8'))).length > 0);
});
