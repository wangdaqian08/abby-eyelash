# Abby Eyelash — Design System (MASTER)

Source of truth for every page. Built with ui-ux-pro-max (`--design-system "beauty lash nail salon editorial luxury"`, variance 4 / motion 3 / density 3) and adapted to the reference demo + owner decisions in `docs/SPEC.md`.

Skill output adopted: Soft-UI-Evolution depth (soft shadows, 200–300ms transitions), Playfair Display headings, light mode only (dark mode is an anti-pattern for this product), subtle scroll reveal that **never hides content without JS** (crawlers/AI must see all text).
Skill output rejected: its pink/lavender palette (owner chose 4 themes below) and Inter (demo's DM Sans kept).

## 1. Colour tokens (CSS variables, set per `[data-theme]` on `<html>`)

| Token | Use | A `mocha` (default) | B `rose` | C `sage` | D `plum` |
|---|---|---|---|---|---|
| `--bg` | page background | `#FAF6F2` | `#FBF6F4` | `#F6F5EF` | `#FAF7F4` |
| `--surface` | cards | `#FFFCF9` | `#FFFBFA` | `#FCFBF7` | `#FFF9F6` |
| `--surface-2` | tinted section bg | `#F1E7DE` | `#F5E6E3` | `#E7EAE0` | `#F2E8E0` |
| `--fg` | body text, headings | `#2E211C` | `#2E1A1E` | `#1F2A22` | `#1E1215` |
| `--muted` | secondary text | `#6E5A50` | `#75545B` | `#56635A` | `#7A5566` |
| `--primary` | buttons, italic accent words, inverted sections | `#7A5A4C` | `#9E5562` | `#56705C` | `#7D3F5E` |
| `--on-primary` | text on primary | `#FFFCF9` | `#FFFBFA` | `#FCFBF7` | `#FAF7F4` |
| `--accent` | **decorative only** (✦ icons, hairlines, stars next to a numeric rating) | `#B8927A` | `#C9A27E` | `#A9B59A` | `#C4856A` |
| `--accent-ink` | eyebrow labels, small accent text | `#7E5B47` | `#80603D` | `#55644A` | `#8E5239` |
| `--border` | hairlines | `color-mix(in srgb, var(--primary) 16%, transparent)` | ← | ← | ← |
| `--ring` | focus ring | `var(--primary)` | ← | ← | ← |
| `--danger` | form errors | `#B42318` | ← | ← | ← |

Verified contrast (WCAG 2.2): fg/bg ≥ 13.6, muted/bg ≥ 5.8, muted/surface-2 ≥ 5.2, on-primary/primary ≥ 5.2, accent-ink/bg ≥ 5.3, accent-ink/surface-2 ≥ 4.7. `--accent` is < 3:1 and must never carry meaning or text.
Rule: components use tokens only — no raw hex outside `src/styles/tokens.css`.

## 2. Typography
- Headings: **Playfair Display** 500 (italic 400/500 for accent phrases and quotes). Body/UI: **DM Sans** 400/500. Self-hosted via Fontsource, `font-display: swap`, preload the hero heading weight.
- Chinese (`:lang(zh)`): headings `"Noto Serif SC"`, body `"Noto Sans SC"`, system fallbacks `"PingFang SC","Hiragino Sans GB","Microsoft YaHei"`. Load subset via Google Fonts CSS2 with `text=`-free unicode-range (only on `/zh/` pages). No letter-spacing on CJK; no italics on CJK (use `--primary` colour only).
- Scale (desktop / mobile): H1 72/48 lh 1.08 · H2 48/36 lh 1.25 · H3 18 lh 1.55 · body 16 lh 1.65 · small 14 · eyebrow & button 12 uppercase, tracking 0.2–0.3em (Latin only). Min body text 16px; nothing below 12px.
- Heading pattern: `Line one<br><em>italic accent phrase.</em>` — `em` = italic + `--primary`.

## 3. Shape, space, depth
- Radius **0** on cards, images, buttons, inputs (editorial). Exceptions: calendar day cells and avatar are circles; focus ring follows element.
- Container max 1152px, gutter 24px (16px < 400px). Section padding 96px desktop / 64px mobile. Column gap 64px. Card padding 32px.
- Shadows (soft, warm): `--shadow-sm: 0 1px 2px rgb(46 33 28 / .06)`, `--shadow-lift: 0 12px 32px -12px rgb(46 33 28 / .22)`.

## 4. Interaction & motion
- Durations: hover/press 200ms, card lift 300ms, reveal 400ms. Easing `cubic-bezier(.2,.7,.2,1)`. Exit faster than enter.
- Card hover: `translateY(-4px)` + `--shadow-lift` + background fill to `--primary` with text → `--on-primary` (demo effect). Focus-visible gets the same state.
- Button: hover = 90% primary; active = `scale(.97)`; outline buttons fill `--surface-2` on hover.
- Links: muted → fg on hover; underline offset 4px for inline links.
- Scroll reveal: elements with `[data-reveal]` fade/translate 12px **only after JS adds `.js` to `<html>`** — without JS (and for crawlers) content is fully visible. IntersectionObserver, once.
- `@media (prefers-reduced-motion: reduce)`: disable transforms, reveals and smooth scroll.
- `scroll-margin-top` = header height on all anchored sections (demo bug fixed).
- All interactive elements: `cursor:pointer`, ≥ 44×44px hit area, visible `:focus-visible` ring 2px `--ring` offset 2px.

## 5. Icons
- Lucide (inline SVG, 1.5px stroke, 16–20px), `aria-hidden="true"` when decorative; icon-only buttons need `aria-label`. ✦ glyph for service cards (decorative). No emoji as icons.

## 6. Components (shared, in `src/components/ui/`)
`Button` (filled / outline / ghost, as `<a>` or `<button>`), `Eyebrow`, `SectionHeading` (title + accent), `Card`, `Stars`, `PriceTable`, `FaqList` (always-visible Q&A — no accordion, per GEO-STRATEGY #2), `LangSwitch`, `ThemePreview` (preview-only floating switcher, removed at launch), `Header` (fixed, translucent + blur, mobile menu), `Footer`.

## 7. Page overrides
- `pages/booking.md` — booking UI specifics.
