// Usage: node scripts/photos.mjs <sourceDir>  — crops every manifest photo into src/assets/photos/<dir>/<id>.jpg
import sharp from 'sharp';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { photos } from '../src/data/photos.ts';

const src = resolve(process.argv[2] ?? '');
if (!process.argv[2]) throw new Error('usage: node scripts/photos.mjs <sourceDir>');
const out = new URL('../src/assets/photos/', import.meta.url).pathname;
const LONG = 1600;
const dims = { '4:3': [LONG, 1200], '3:4': [1200, LONG] };

for (const p of photos) {
  let file = isAbsolute(p.source) ? p.source : join(src, p.source);
  let tmp;
  if (/\.heic$/i.test(file)) { // macOS-only: sips converts HEIC, which sharp cannot read
    tmp = join(tmpdir(), `${p.id}-heic.jpg`);
    execFileSync('sips', ['-s', 'format', 'jpeg', file, '--out', tmp], { stdio: 'ignore' });
    file = tmp;
  }
  let img = sharp(file).rotate(); // apply EXIF orientation
  if (p.box) {
    const { width, height } = await sharp(await img.toBuffer()).metadata();
    img = sharp(await img.toBuffer()).extract({
      left: Math.round(p.box.left * width), top: Math.round(p.box.top * height),
      width: Math.round(p.box.width * width), height: Math.round(p.box.height * height),
    });
  }
  img = p.ratio === 'original'
    ? img.resize({ width: LONG, height: LONG, fit: 'inside', withoutEnlargement: true })
    : img.resize({ width: dims[p.ratio][0], height: dims[p.ratio][1], fit: 'cover', position: p.position ?? 'centre' });
  mkdirSync(join(out, p.dir), { recursive: true });
  await img.jpeg({ quality: 82 }).toFile(join(out, p.dir, `${p.id}.jpg`)); // no withMetadata = stripped
  if (tmp) rmSync(tmp);
}

const tile = (p) => `<figure><img src="file://${out}${p.dir}/${p.id}.jpg"><figcaption>${p.id} ${p.ratio}<br>${p.alt.en}</figcaption></figure>`;
writeFileSync('/tmp/abby-photos-review.html', `<!doctype html><meta charset=utf-8><style>body{display:grid;grid-template-columns:repeat(8,1fr);gap:8px;margin:8px;font:10px sans-serif;width:1600px}figure{margin:0}img{width:100%;display:block}</style>${photos.map(tile).join('')}`);
console.log(`${photos.length} masters`);
