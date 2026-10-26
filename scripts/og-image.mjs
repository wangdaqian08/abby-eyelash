// Generates public/og-default.jpg (1200×630) in the default "mocha" theme colours (src/styles/global.css).
// Run: node scripts/og-image.mjs  — rerun after the owner picks a theme or a real photo replaces it.
import sharp from 'sharp';

const c = { bg: '#faf6f2', fg: '#2e211c', primary: '#7a5a4c', accent: '#b8927a', muted: '#6e5a50' };
const serif = "'Playfair Display', Georgia, 'Times New Roman', serif";
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <rect width="1200" height="630" fill="${c.bg}"/>
  <rect x="40" y="40" width="1120" height="550" fill="none" stroke="${c.accent}" stroke-width="2"/>
  <text x="600" y="230" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="26" letter-spacing="8" fill="${c.muted}">BURWOOD · SYDNEY</text>
  <text x="600" y="345" text-anchor="middle" font-family="${serif}" font-size="104" fill="${c.fg}">Abby Eyelash</text>
  <line x1="520" y1="390" x2="680" y2="390" stroke="${c.accent}" stroke-width="2"/>
  <text x="600" y="455" text-anchor="middle" font-family="${serif}" font-style="italic" font-size="40" fill="${c.primary}">Lash &amp; nail studio</text>
</svg>`;

const out = new URL('../public/og-default.jpg', import.meta.url).pathname;
const info = await sharp(Buffer.from(svg)).jpeg({ quality: 85, mozjpeg: true }).toFile(out);
console.log(`wrote ${out} (${info.width}×${info.height}, ${info.size} bytes)`);
