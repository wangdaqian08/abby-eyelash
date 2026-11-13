// Press-and-hold reorder for a grid of tiles (the photo admin). No library: pointer events, one finger.
// A short press or a swipe is left alone, so the page still scrolls and the buttons on a tile still work.
const HOLD_MS = 350; // how long a finger must rest before the tile lifts
const SLOP = 8; // px a resting finger may wander
const EDGE = 60; // px from the top/bottom of the screen where dragging scrolls the page

/** Press and hold a child of `grid` that matches `item`, then drag; `onMove(from, to)` is called once, on release. */
export function sortable(grid: HTMLElement, item: string, onMove: (from: number, to: number) => void): void {
  const items = () => [...grid.querySelectorAll<HTMLElement>(item)];
  let timer = 0, x = 0, y = 0;
  let drag: { el: HTMLElement; ghost: HTMLElement; from: number; dx: number; dy: number; frame: number } | undefined;

  const place = () => {
    if (!drag) return;
    if (!drag.el.isConnected) return drop(); // the screen was redrawn under the finger: this tile is gone, end the drag
    drag.ghost.style.translate = `${x - drag.dx}px ${y - drag.dy}px`;
    if (y < EDGE) scrollBy(0, -10); else if (y > innerHeight - EDGE) scrollBy(0, 10);
    const over = document.elementFromPoint(x, y)?.closest<HTMLElement>(item);
    if (over && over !== drag.el && grid.contains(over)) {
      const list = items();
      over.insertAdjacentElement(list.indexOf(over) > list.indexOf(drag.el) ? 'afterend' : 'beforebegin', drag.el);
    }
    drag.frame = requestAnimationFrame(place); // keeps scrolling while the finger rests at the edge
  };

  const lift = (el: HTMLElement) => {
    const box = el.getBoundingClientRect();
    const ghost = el.cloneNode(true) as HTMLElement;
    ghost.removeAttribute('data-tile');
    Object.assign(ghost.style, { position: 'fixed', left: '0', top: '0', width: `${box.width}px`, height: `${box.height}px`, margin: '0', zIndex: '50', pointerEvents: 'none', rotate: '2.5deg', boxShadow: 'var(--shadow-lift)' });
    document.body.append(ghost);
    grid.dataset.dragging = ''; el.dataset.placeholder = '';
    drag = { el, ghost, from: items().indexOf(el), dx: x - box.left, dy: y - box.top, frame: 0 };
    place();
  };

  const drop = () => {
    clearTimeout(timer);
    if (!drag) return;
    cancelAnimationFrame(drag.frame);
    const { el, ghost, from } = drag;
    drag = undefined;
    ghost.remove(); delete grid.dataset.dragging; delete el.dataset.placeholder;
    const to = items().indexOf(el); // -1: the screen was redrawn under the finger and this tile is gone; move nothing
    if (to >= 0 && to !== from) onMove(from, to);
  };

  grid.addEventListener('pointerdown', (e) => {
    const el = (e.target as Element).closest<HTMLElement>(item);
    if (!el || !e.isPrimary || (e.target as Element).closest('button, a')) return;
    x = e.clientX; y = e.clientY;
    const [sx, sy] = [x, y];
    clearTimeout(timer);
    timer = window.setTimeout(() => { if (Math.hypot(x - sx, y - sy) <= SLOP) lift(el); }, HOLD_MS);
  });
  addEventListener('pointermove', (e) => { if (e.isPrimary) { x = e.clientX; y = e.clientY; } });
  addEventListener('pointerup', drop);
  addEventListener('pointercancel', drop); // the browser took the gesture (a scroll that began before the tile lifted)
  // Once a tile is lifted the finger moves the tile, not the page. Must be non-passive to be allowed to say so.
  grid.addEventListener('touchmove', (e) => { if (drag) e.preventDefault(); }, { passive: false });
  grid.addEventListener('contextmenu', (e) => e.preventDefault()); // no "save image" menu on a long press
}
