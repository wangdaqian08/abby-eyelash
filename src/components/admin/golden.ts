// Golden-spiral crop guide for the admin editor: SVG markup stretched over the frame, plus where the spiral ends (as a share
// of the frame, for a round dot drawn in HTML). Turn 0..3 puts the spiral's tail in each corner; a portrait frame runs it down.
const PHI = (1 + Math.sqrt(5)) / 2;

// In a landscape golden rectangle (PHI × 1): cut a square from the left, top, right, bottom in turn, one quarter arc per square.
let x = 0, y = 0, w = PHI, h = 1, arcs = 'M0 1', squares = '';
for (let i = 0; i < 12; i++) {
  const side = i % 4;
  if (side === 0) { arcs += ` A${h} ${h} 0 0 1 ${x + h} ${y}`; squares += `M${x + h} ${y}V${y + h}`; x += h; w -= h; }
  else if (side === 1) { arcs += ` A${w} ${w} 0 0 1 ${x + w} ${y + w}`; squares += `M${x} ${y + w}H${x + w}`; y += w; h -= w; }
  else if (side === 2) { arcs += ` A${h} ${h} 0 0 1 ${x + w - h} ${y + h}`; squares += `M${x + w - h} ${y}V${y + h}`; w -= h; }
  else { arcs += ` A${w} ${w} 0 0 1 ${x} ${y + h - w}`; squares += `M${x} ${y + h - w}H${x + w}`; h -= w; }
}
const END = [x + w / 2, y + h / 2];
const MIRROR = ['', `matrix(-1 0 0 1 ${PHI} 0)`, `matrix(-1 0 0 -1 ${PHI} 1)`, 'matrix(1 0 0 -1 0 1)'];

// Each line twice: a dark halo underneath, so it shows on light and dark photos alike. Fixed colours: they sit on a photo, not the page.
const line = (d: string, color: string, width: number, halo: string, haloWidth: number, dash = '') =>
  [[halo, haloWidth, ''], [color, width, dash]].map(([c, wd, ds]) =>
    `<path d="${d}" fill="none" stroke="${c}" stroke-width="${wd}" stroke-linecap="round" vector-effect="non-scaling-stroke"${ds ? ` stroke-dasharray="${ds}"` : ''}/>`).join('');

export function goldenGuide(portrait: boolean, turn: number) {
  const t = turn % 4;
  const [W, H] = portrait ? [1, PHI] : [PHI, 1];
  const a = 1 / PHI / PHI, b = 1 / PHI; // 0.382, 0.618
  const sections = `M${W * a} 0V${H}M${W * b} 0V${H}M0 ${H * a}H${W}M0 ${H * b}H${W}`;
  const svg = `<svg data-golden viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true" class="absolute inset-0 size-full overflow-visible">`
    + line(sections, 'rgb(255 255 255 / .85)', 1.25, 'rgb(30 18 21 / .3)', 3, '4 4')
    + `<g transform="${portrait ? 'matrix(0 1 1 0 0 0) ' : ''}${MIRROR[t]}">`
    + line(squares, 'rgb(255 255 255 / .55)', 1, 'rgb(30 18 21 / .25)', 2.5)
    + line(arcs, '#f3d08a', 3, 'rgb(30 18 21 / .55)', 6)
    + '</g></svg>';
  let [ex, ey] = END;
  if (t === 1 || t === 2) ex = PHI - ex;
  if (t >= 2) ey = 1 - ey;
  return { svg, end: portrait ? [ey, ex / PHI] : [ex / PHI, ey] };
}
