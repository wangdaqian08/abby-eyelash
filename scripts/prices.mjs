// Owner price table (src/data/prices.csv) → src/data/prices.generated.ts. Runs before dev, build and test.
// Abby edits the CSV; a bad row stops the build with a message she can act on, so the live site keeps the old prices.
import { writeFileSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const CSV = new URL('../src/data/prices.csv', import.meta.url);
const OUT = new URL('../src/data/prices.generated.ts', import.meta.url);

// One CSV line → cells; handles "quoted, cells" because Excel/Numbers quote any cell containing a comma.
const cells = (line) =>
  [...line.matchAll(/(?:^|,)(?:"((?:[^"]|"")*)"|([^,]*))/g)].map((m) => (m[1] ?? m[2] ?? '').replace(/""/g, '"').trim());

/** "80" exact · "130起"/"130+" from · "10-20" range · "50%" share of the cheapest full set · "480（原价580）" sale · "需咨询" on request. */
export function parsePrice(raw) {
  const s = raw.replace(/[$\s]/g, '');
  let m;
  if ((m = s.match(/^(\d+)$/))) return { price: +m[1] };
  if ((m = s.match(/^(\d+)(起|\+)$/))) return { price: +m[1], from: true };
  if ((m = s.match(/^(\d+)[-–~](\d+)$/)) && +m[1] < +m[2]) return { price: +m[1], maxPrice: +m[2], from: true };
  if ((m = s.match(/^(\d+)%$/)) && +m[1] > 0 && +m[1] <= 100) return { pct: +m[1] };
  if ((m = s.match(/^(\d+)[（(]原价(\d+)[）)]$/)) && +m[1] < +m[2]) return { price: +m[1], wasPrice: +m[2] };
  if (/^(需咨询|定制|定制价)$/.test(s)) return { onRequest: true };
  return null;
}

export function parsePrices(text, now = Date.now()) {
  const latest = new Date(now + 86_400_000).toISOString().slice(0, 10); // +1 day: Sydney is ahead of the UTC build machine
  const errors = [];
  const out = {};
  const seen = new Set();
  const lines = text.replace(/^﻿/, '').split(/\r?\n/);
  lines.forEach((line, i) => {
    if (i === 0 || !line.trim()) return; // header row
    const [id = '', , , price = '', minutes = '', updated = ''] = cells(line);
    const at = `第 ${i + 1} 行（${id || '没有编号'}）`;
    const p = parsePrice(price);
    if (!/^[a-z-]+\/[a-z0-9-]+$/.test(id)) errors.push(`${at}：编号不对，请不要修改“编号”这一列`);
    else if (seen.has(id)) errors.push(`${at}：编号重复`);
    seen.add(id);
    if (!p) errors.push(`${at}：价格“${price}”看不懂，请写成 80、130起、10-20、50%、480（原价580）或 需咨询`);
    if (!/^\d+$/.test(minutes) || +minutes < 10 || +minutes > 480) errors.push(`${at}：时长请填 10–480 之间的整数分钟`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(updated) || Number.isNaN(Date.parse(updated)) || updated > latest)
      errors.push(`${at}：更新日期请写成 2026-10-29 这样的格式，且不能晚于今天`);
    if (p) out[id] = { ...p, minutes: +minutes, updated };
  });
  if (errors.length) throw new Error(`价格表 src/data/prices.csv 有问题，网站没有更新：\n${errors.join('\n')}`);
  return out;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const prices = parsePrices(readFileSync(CSV, 'utf8'));
    const type = '{ price?: number; minutes: number; updated: string; from?: boolean; maxPrice?: number; pct?: number; wasPrice?: number; onRequest?: boolean }';
    writeFileSync(
      OUT,
      `// GENERATED from src/data/prices.csv by scripts/prices.mjs — edit the CSV, not this file.\nexport const prices = ${JSON.stringify(prices, null, 2)} as Record<string, ${type}>;\n`,
    );
    console.log(`价格表已读取：${Object.keys(prices).length} 项`);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
