# Abby Eyelash — Design System (MASTER)

Source of truth for every page. Built with ui-ux-pro-max (`--design-system "beauty lash nail salon editorial luxury"`, variance 4 / motion 3 / density 3) and adapted to the reference demo + owner decisions in `docs/SPEC.md`.

Skill output adopted: Soft-UI-Evolution depth (soft shadows, 200–300ms transitions), Playfair Display headings, light mode only (dark mode is an anti-pattern for this product), subtle scroll reveal that **never hides content without JS** (crawlers/AI must see all text).
Skill output rejected: its pink/lavender palette (owner chose 4 themes below) and Inter (demo's DM Sans kept).

## 1. Colour tokens (CSS variables on `:root`)

Owner chose **plum** on 2026-11-06; the other three preview themes (mocha, rose, sage) and the theme switcher were removed.

| Token | Use | Value |
|---|---|---|
| `--bg` | page background | `#FAF7F4` |
| `--surface` | cards (bg +1.5% L) | `#FEFCFA` |
| `--surface-2` | sunken: tinted section bg, inputs (bg −2.5% L) | `#F4EEE8` |
| `--surface-3` | raised: popovers, floating bars (bg +3% L) | `#FFFFFF` |
| `--fg` | body text, headings | `#1E1215` |
| `--muted` | secondary text | `#7A5566` |
| `--primary` | buttons, italic accent words, inverted sections | `#7D3F5E` |
| `--on-primary` | text on primary | `#FAF7F4` |
| `--accent` | **decorative only** (✦ icons, hairlines, stars next to a numeric rating) | `#C4856A` |
| `--accent-ink` | eyebrow labels, small accent text | `#8E5239` |
| `--border` | hairlines (prefer surface layers to separate) | `color-mix(in oklch, var(--fg) 8%, transparent)` |
| `--ring` | focus ring | `var(--primary)` |
| `--focus-ring` | input focus: double-ring shadow, no outline | `0 0 0 1px` ring 80% + `0 0 0 4px` ring 25% |
| `--danger` | form errors | `#B42318` |

Verified contrast (WCAG 2.2): fg/bg ≥ 13.6, muted/bg ≥ 5.8, muted/surface-2 ≥ 5.2, on-primary/primary ≥ 5.2, accent-ink/bg ≥ 5.3, accent-ink/surface-2 ≥ 4.7. `--accent` is < 3:1 and must never carry meaning or text.
Button depth: filled buttons use `btn-raise` (plum-tinted `--shadow-btn`, lift 2px on hover for pointer devices, sink into `--shadow-btn-press` on press); outline/quiet buttons use `btn-soft`. Both animate translate and box-shadow only (no layout shift) and stop under reduced motion.
Rule: components use tokens only — no raw hex outside `src/styles/tokens.css`.

## 2. Typography
- Headings: **Playfair Display** 500 (italic 400/500 for accent phrases and quotes). Body/UI: **DM Sans** 400/500. Self-hosted via Fontsource, `font-display: swap`, preload the hero heading weight.
- Chinese (`:lang(zh)`): headings `"Noto Serif SC"`, body `"Noto Sans SC"`, system fallbacks `"PingFang SC","Hiragino Sans GB","Microsoft YaHei"`. No CJK web font is loaded: these resolve to the device's own fonts (iPhone/Mac: Songti SC / PingFang SC; Android: Noto Sans CJK, so headings fall back to sans; Windows: Microsoft YaHei). A CJK web font cost ~1.5 MB and pushed /zh/ LCP to ~2.4 s. No letter-spacing on CJK; no italics on CJK (use `--primary` colour only).
- Scale (desktop / mobile): H1 72/48 lh 1.08 · H2 48/36 lh 1.25 · H3 18 lh 1.55 · body 16 lh 1.65 · small 14 · eyebrow & button 13 uppercase, tracking 0.2–0.3em (Latin only). Min body text 16px; nothing meant to be read below 13px.
- Heading pattern: `Line one<br><em>italic accent phrase.</em>` — `em` = italic + `--primary`.

## 3. Shape, space, depth
- Radius (2026-11-06, was 0): cards, images, video, map and FAQ items `--radius` 16px (`rounded-card`); inputs, time slots and gallery tiles `--radius-sm` 10px (`rounded-field`); buttons and badges are pills (`rounded-full`). Calendar day cells and avatar stay circles; focus ring follows the element. Full-bleed media (home hero) stays square.
- Container max 1152px, gutter 24px (16px < 400px). Section padding 96px desktop / 64px mobile. Column gap 64px. Card padding 32px.
- Depth comes from tone steps (surface-2 < bg < surface < surface-3), not lines: card grids use `gap-3`/`gap-4` with `bg-surface` cards, never `gap-px` + `bg-border` hairlines. Shadows only on things that move or float: `--shadow-lift` on hover, the header once scrolled. Nothing casts a shadow at rest.

## 4. Interaction & motion
- Tokens (global.css): `--t-press` 140ms · `--t-hover` 180ms · `--t-ui` 240ms · `--t-reveal` 700ms · `--stagger` 70ms. Easing: `--ease-out` quint (default, `--ease`), `--ease-expo` for reveals ≥ 700ms, `--ease-soft` for slow photo moves. No bounce or elastic curves. Exit faster than enter. Transform and opacity only — never animate size, position or layout (CLS).
- Mobile first: phones get the full set (entrances, press feedback, menu); hover-only effects are a desktop extra. Every control has an `:active` press (`scale(.97–.98)`).
- Home hero load sequence: `[data-hero-line]` lines rise in order (800ms expo, 90ms apart), then `[data-hero-in]` paragraph/CTAs/rating; the hero photo settles from `scale(1.06)` over 1.4s (`[data-hero-img]`). Only under `html.js`; done by ~1.2s; the heading is in the HTML from the first byte.
- Staggered entrances: `[data-reveal][data-stagger]` keeps the container visible and lets its children arrive 70ms apart (the observer writes `--i`; delay capped at 8 items). Used on card grids, lash looks, gallery groups, FAQ lists, reviews.
- Header: no border; `.is-scrolled` adds a soft edge after 8px of scroll. Mobile menu opens with the grid-collapse (0fr → 1fr) and its items fade up 40ms apart; `hidden` in the HTML keeps it closed without JS.
- Page-to-page: `@view-transition { navigation: auto }` crossfade (CSS only, no client router); off under reduced motion.
- Card hover: `translateY(-4px)` + `--shadow-lift` + background fill to `--primary` with text → `--on-primary` (demo effect). Focus-visible gets the same state.
- Button: hover = 90% primary; active = `scale(.97)`; outline buttons fill `--surface-2` on hover.
- Links: muted → fg on hover; underline offset 4px for inline links.
- Scroll reveal: elements with `[data-reveal]` fade/translate 20px **only after JS adds `.js` to `<html>`** — without JS (and for crawlers) content is fully visible. IntersectionObserver, once.
- `@media (prefers-reduced-motion: reduce)`: disable transforms, reveals, the hero sequence, view transitions and smooth scroll (content shown in its final state).
- `scroll-margin-top` = header height on all anchored sections (demo bug fixed).
- All interactive elements: `cursor:pointer`, ≥ 44×44px hit area, visible `:focus-visible` ring 2px `--ring` offset 2px; inputs, selects and textareas use `--focus-ring` (`focus-ring` utility) instead. No dark borders: outline buttons use `border-primary/30`. Numbers that line up use `tabular-nums`; body copy uses `text-wrap: pretty`; inline icons are sized in `em` and sit `0.125em` lower.

## 5. Icons
- Lucide (inline SVG, 1.5px stroke, 16–20px), `aria-hidden="true"` when decorative; icon-only buttons need `aria-label`. ✦ glyph only as a list marker and the booking service picker (decorative) — not on top of cards. No emoji as icons.

## 6. Components (shared, in `src/components/ui/`)
`Button` (filled / outline / ghost, as `<a>` or `<button>`), `Eyebrow`, `SectionHeading` (title + accent), `Card`, `Stars`, `PriceTable`, `FaqList` (always-visible Q&A — no accordion, per GEO-STRATEGY #2), `LangSwitch`, `ThemePreview` (preview-only floating switcher, removed at launch), `Header` (fixed, translucent + blur, mobile menu), `Footer`.

## 7. Page overrides
- `pages/booking.md` — booking UI specifics.
