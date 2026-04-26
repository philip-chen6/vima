# Design System — vima

> Yozakura Terminal direction. Dark construction intelligence with night-sakura pink, sumi ink depth, and a thin spaced Times New Roman wordmark.

## House rule — no all caps

The brand wordmark is spaced lowercase Times New Roman: **`v i m a.`**. In prose, metadata, routes, and ordinary UI labels, use **`vima`**. Never use `VIMA` as a visual styling choice.

All UI text uses sentence case or lowercase. **No `text-transform: uppercase` anywhere.** This includes section headers, panel titles, button text, eyebrow labels, footer copy.

Acronyms keep their canonical casing because that's their grammatically-correct form, not stylistic uppercase: **CII**, **OSHA**, **COLMAP**, **SPL**, **API**, **JSON**, **HTTP**, **WebGL**.

Letter-spacing for sentence-case mono runs at `0.02-0.06em`, NOT the `0.20-0.45em` heavy tracking from the original signal-lab prototype. Heavy tracking was paired with all-caps; with caps gone, tighten the tracking too.

This rule overrides any conflicting earlier specification in this file.

## Product Context

- **What this is:** Spatial safety intelligence platform for construction sites. Egocentric bodycam video → CII (Productive / Contributory / Non-Contributory) classification → COLMAP zone attribution → Solana SPL token payouts weighted by verified productive time.
- **Who it's for:** Primary 30s — HackTech 2026 Ironsite Prize judges (next 27h). Secondary — construction ops/safety managers at 50-500 person GCs (Sarah at Acme Construction). Tertiary — the worker who gets paid.
- **Space/industry:** Construction tech, computer vision, safety compliance, on-chain incentives.
- **Project type:** Marketing/landing page. The live dashboard remains under `/demo`.
- **Current landing copy state:** Lorem ipsum placeholder copy is allowed while visual tuning is in progress. Do not replace placeholder copy with product copy unless explicitly asked.
- **Final tagline candidate:** *Video intelligence for construction sites. No lidar.*

## Aesthetic Direction

- **Direction:** Yozakura Terminal — nighttime cherry blossoms over an instrument interface. Think black sky, pale petals catching lantern light, precise construction telemetry underneath.
- **Decoration level:** Intentional. Sparse sakura-petal drift, thin pink hairlines, sumi ink surfaces, occasional lantern glow. No cute blossom wallpaper, no anime, no tourist-poster Japan.
- **Mood:** Quiet, nocturnal, expensive, slightly unreal. The page should feel like standing under illuminated cherry blossoms at night while reading a serious field instrument.
- **Memorable thing (forcing question answer):** "Just needs to be fucking beautiful." Translation: every pixel earns its place. Memorability through restraint and density, not flash.
- **Research anchor:** Yozakura means night cherry blossom viewing. The useful visual idea is contrast: pale pink petals glowing against a black sky, with lantern warmth and sumi-e style suggestion rather than literal detail.
- **Reference:** `~/Downloads/output/reactbits-signal-lab/` remains useful for density and instrumentation, but the palette and brand feel move from amber phosphor to nocturnal sakura pink.

### Anti-patterns — never ship these
- Purple/violet gradients
- 3-column icon-in-circle feature grids
- Centered-everything layouts with uniform spacing
- Glassmorphism cards
- Bubble border-radius (pill buttons, fully rounded cards)
- Gradient CTA buttons
- Stock-photo construction worker hero images
- system-ui / -apple-system fonts
- Anything that looks like Linear / Vercel / Cursor / generic-AI-startup
- Literal cherry blossom clip art, emoji petals, anime styling, torii gates, faux brush fonts, or decorative japanese characters used as props
- Times New Roman anywhere except the `v i m a.` wordmark

## Typography

Saans family by [Displaay Type Foundry](https://displaay.net/typeface/saans), TRIAL trial weights — installed at `frontend/public/fonts/`. License: TRIAL only. Production use requires the paid Saans Collection license.

| Role | Family | Weight | Notes |
|---|---|---|---|
| Hero wordmark (`v i m a.`) | **Times New Roman** | 400 | Lowercase, thin roman, literal spaces between letters, metallic or pale sakura treatment |
| Logo mark | shader-masked SVG/canvas | n/a | Hex nut mark, dark metal bevel, paired with spaced roman wordmark |
| Section labels (`spatial zones`, `CII timeline`) | **Saans Mono** | 700 | Sentence case, 9-10px, letter-spacing `0.04em` |
| Tiny metadata labels (`wrench time`, `live`) | **Saans Mono** | 500 | Sentence case, 8px, letter-spacing `0.04em` |
| Stats values (`86.7%`, `30`, `0:15`) | **Saans Mono** | 700 | tabular-nums, 17-26px, optional sakura glow |
| Sub-headings | **Saans SemiMono** | 600 | 12-14px, letter-spacing `0.05em` |
| Body copy (sentences ≥ 2 lines) | **Saans** | 400 | 14-16px, letter-spacing `0.01em`, line-height 1.6 |
| Hero subtext | **Saans** | 400 | 18-22px, letter-spacing `0.005em`, line-height 1.45 |
| Callout pull-quotes | **Saans** | 500 italic | Larger, slower reading |
| Footer / fine print | **Saans Mono** | 400 | 8px, letter-spacing `0.20em`, opacity 0.40 |

Loading: woff2, `font-display: swap`. Variable font (`SaansCollectionVF-TRIAL.woff2`, 160KB) covers Saans neutral; static woff2 files for Mono and SemiMono (~57KB each).
Times New Roman is a system font and is reserved for the `v i m a.` wordmark only. Do not load a web serif for the current wordmark direction.

CSS variables (already wired in `app/globals.css`):
```css
font-family: var(--font-mono);     /* Saans Mono */
font-family: var(--font-sans);     /* Saans */
font-family: var(--font-semimono); /* Saans SemiMono */
font-family: "Times New Roman";    /* wordmark only */
```

### Saans + roman rule

The type system is Saans everywhere except the `v i m a.` wordmark:

- **Times New Roman** = brand wordmark only. Use for `v i m a.` and nowhere else unless explicitly approved.
- **Saans Mono / Saans SemiMono** = instrument voice. Use for labels, telemetry, pipeline text, stats, navigation, timestamps, confidence values, and any copy that should feel measured.
- **Saans** = product voice. Use for hero subtext, factual body copy, technical explanation, panel descriptions, and longer paragraphs.

Rules:
- Do not use Times New Roman for subtext, section claims, buttons, nav, tables, data labels, panel headers, or metrics.
- Wordmark spacing is literal: render as `v i m a.` rather than relying only on CSS tracking.
- Keep wordmark weight thin. Do not bold it.
- Saans remains the default for all prose and UI text.
- Metallic wordmark animation should be per-glyph or phase-staggered. The whole word should not shimmer as one synchronized sheet.

### Modular scale
```
8px   tiny labels (`live`, status pulse text)
9px   pipeline status, ascii diagrams
10px  section labels, button text
11px  body in dense panels
13px  zone names, card headers
14px  body copy
17px  stat values
20px  panel-detail values
clamp(1.125rem, 1.6vw, 1.375rem)  hero subtext
26px  panel-detail confidence numbers
clamp(3rem, 9vw, 7rem)  hero `v i m a.` wordmark
```

## Color

| Token | Hex | Role |
|---|---|---|
| `--color-ink` | `#1A1A1D` | Background — charcoal night sky |
| `--color-ink-2` | `#3B1C32` | Slightly elevated plum surface |
| `--color-sumi` | `#1b1418` | Ink wash panels / deep dividers |
| `--color-washi` | `#f7ecef` | Primary body text — warm paper-pink white |
| `--color-washi-dim` | `rgba(247,236,239,0.58)` | Secondary body |
| `--color-washi-mute` | `rgba(247,236,239,0.28)` | Muted labels |
| `--color-sakura` | `#A64D79` | Primary accent — muted mature sakura rose |
| `--color-sakura-hot` | `#f2a7b8` | Rare blossom highlight / glow only |
| `--color-sakura-deep` | `#6A1E55` | Deep petal / shadow accent |
| `--color-sakura-line` | `rgba(166,77,121,0.18)` | Borders, hairlines |
| `--color-sakura-soft` | `rgba(166,77,121,0.07)` | Wash backgrounds |
| `--color-lantern` | `#ffd3a6` | Rare warm lantern highlight |
| `--color-red` | `#ef476f` | Non-contributory / alert |
| `--color-green` | `#78d7a3` | Live status only |

### Sakura glow
Accent numbers and active states can get a sakura glow. Do not use amber glow in the new direction.
```css
text-shadow: 0 0 10px rgba(166,77,121,0.35); /* small */
text-shadow: 0 0 18px rgba(166,77,121,0.34), 0 0 38px rgba(242,167,184,0.12); /* medium */
text-shadow: 0 0 28px rgba(166,77,121,0.44), 0 0 58px rgba(242,167,184,0.18); /* large */
```

### CII semantic colors
- **P (Productive)** → `--color-sakura`
- **C (Contributory)** → `--color-lantern`
- **NC (Non-Contributory)** → `--color-red`

Always use these three colors for CII categories. Never green for productive (saved for system-status only).

### Dark mode
There is no light mode. The page is dark-only. If light mode is ever needed, redesign — do not just invert.

## Spacing

- **Base unit:** 4px
- **Density:** compact (info-dense, panel-grid feels like Bloomberg, not Apple)

```
2xs  2px  hairline gap
xs   4px  inline gap, button padding
sm   8px  cell padding, between related items
md   12px panel padding bottom
lg   14-16px panel inner padding, section padding
xl   24px section vertical padding (mobile)
2xl  36-52px section vertical padding (desktop)
3xl  72-96px hero top
```

## Layout

- **Approach:** Grid-disciplined panel layout with one brand contrast: the thin spaced Times New Roman `v i m a.` wordmark. Everything else stays instrument-like.
- **Max content width:** 1400px
- **Border radius:** 0 default. 1-2px on outlined panels and pill tags. 50% only on status pulse dots. **No bubble-radius anywhere.**
- **Borders:** All borders 1px solid using `--color-sakura-line` or rgba variants at 4-14% opacity. The grid is implied by hairlines, not by heavy chrome.
- **Page anatomy (top to bottom):**
  1. **Sticky header ribbon** — `v i m a.` logo + spatial intelligence subtitle on left, date + live time + status pulse + live label on right. Backdrop blur over near-black.
  2. **Stats ribbon** — 6 cells separated by 1px verticals. Each cell: 8px label / 17px value. tabular-nums.
  3. **Hero** — small mono eyebrow → dark metallic hex mark + spaced Times New Roman `v i m a.` wordmark → Saans placeholder or product subtext → mono pipeline trail. Lorem placeholder copy is acceptable during visual tuning.
  4. **Live evidence panel grid** — 3 columns: CII timeline waveform, active frame detail, spatial zones list.
  5. **Pipeline section** — SquareMatrix sakura grid backdrop. 6 numbered steps (01-06) in a 3×2 grid, each with status pulse + active label.
  6. **Footer** — `vima spatial intelligence · HackTech 2026 · Ironsite track` left, `uptime 0h 12m 47s` right.

## Motion

- **Approach:** Minimal-functional + 2 deliberate flourishes.
- **Easing:** `cubic-bezier(0.2, 0.8, 0.2, 1)` for everything. Avoid linear and easeIn for entrances.
- **Duration:** `100ms` micro (hover, button press), `250ms` short (panel reveal), `400ms` medium (timeline scrub), `700ms` long (hero entrance).
- **Allowed flourishes:**
  - **Sakura pulse** — 2s ease-in-out infinite on status dots and live indicator. Class: `.vima-pulse`.
  - **Petal drift** — rare, slow, low-opacity particles or CSS petals. Use only in hero background, never over data panels.
  - **Glow on hover** — sakura text-shadow + box-shadow brightens on accent buttons.
- **Forbidden:**
  - Floating / parallax / scroll-driven hero animations
  - Text scatter or character reveal on every heading (overuse kills it)
  - Auto-playing carousels longer than 4s per slide
  - Petal storms, confetti, or looping blossom showers
  - Anything that takes >700ms

### Existing keyframes (already in `signal-lab/styles.css`, port to `frontend/app/globals.css`)
```css
@keyframes vima-pulse   { 0%,100%{opacity:1} 50%{opacity:.25} }
@keyframes vima-flicker { 0%,100%,92%,94%,98%{opacity:1} 93%{opacity:.7} 99%{opacity:.85} }
@keyframes vima-glow    { 0%,100%{box-shadow: 0 0 6px rgba(242,167,184,.15)} 50%{box-shadow: 0 0 18px rgba(242,167,184,.30)} }
```

## Component Primitives

These should be extracted from `signal-lab/src/App.tsx` into reusable React components and dropped into `frontend/components/phosphor/`:

- `<Panel title subtitle span>` — 1px sakura-line border, panel header with letter-spacing label, optional subtitle right-aligned
- `<StatCell label value accent>` — fixed 6-cell ribbon row, tabular-nums, optional sakura glow on value
- `<PulseDot color>` — 4-6px rounded dot with `vima-pulse` animation
- `<HazardRule />` — 1px sakura-line full-width separator
- `<EyebrowLabel>` — 8px sentence-case mono with `0.04em` letter-spacing, optional `▸` prefix
- `<PipelineStep num title desc status>` — for the 6-step pipeline grid

## Landing Page Current State

- `/` is a sparse hero-first landing page while the brand system is being tuned.
- The live dashboard route is `/demo`.
- `Logo size={200} variant="metallic" wordmark` is the current first-viewport brand signal.
- The wordmark reads `v i m a.` in thin Times New Roman through both the fallback text path and the metallic raster mask.
- Lorem ipsum copy may remain in eyebrow, subtext, pipeline trail, and footer until product copy is explicitly requested.
- Buttons, metadata, subtext, and pipeline text must stay in Saans/Saans Mono.

## React Bits Pro Component Picks

The local registry cache at `~/Downloads/output/reactbits-signal-lab/reactbits-registry-cache/` has all 285 entries. For Yozakura Terminal, use sparingly:

- ✅ `silk-waves` — black-plum / sakura-pink color ramp, low opacity (0.22), under hero only
- ✅ `square-matrix` — pipeline section background, sakura color, low brightness
- ✅ `text-scatter` — tagline only ("Video intelligence for construction sites. No lidar.")
- ⚠️ `3d-letter-swap` — skip for now; literal `v i m a.` spacing matters more than character theatrics
- ✅ `blur-highlight` — emphasizing key claims in evidence narrative
- ✅ `smooth-cursor` — global, sakura color, `lineWidth: 0.5`, low opacity
- ⚠️ `gradient-carousel` — only if showing real masonry frames with CII overlay
- ❌ `rotating-cards` — too playful for terminal aesthetic, skip
- ❌ `chroma-card` — too colorful, skip

For Pro blocks (in `components/blocks/`):
- ✅ `stats-3` — adapt to yozakura terminal palette
- ⚠️ `features-4` — only if heavily restyled (currently too marketing-y)
- ❌ `social-proof-1` — re-build from scratch in terminal style instead

## Decisions Log

| Date | Decision | Rationale |
|---|---|---|
| 2026-04-25 | Direction: Phosphor Terminal | Earlier direction based on the signal-lab prototype. Superseded by Yozakura Terminal for the landing page brand pass. |
| 2026-04-25 | Type: Saans + Saans Mono + Saans SemiMono | Replaces IBM Plex Mono. More intentional, paid foundry typeface, three-tier hierarchy without adding a fourth font family. TRIAL weights cover hackathon scope. |
| 2026-04-25 | Color: sakura pink over black plum | Replaces amber phosphor with nocturnal sakura pink, sumi ink surfaces, and rare lantern warmth. |
| 2026-04-25 | No light mode | Phosphor aesthetic is dark-only by definition. Inverting would break the metaphor. |
| 2026-04-25 | Saans license: TRIAL only | Paid Saans Collection should be purchased before any production / public deploy beyond hackathon. |
| 2026-04-25 | Use Times New Roman for `v i m a.` only | User explicitly wants a thin Times New Roman wordmark with literal spacing. Saans remains everywhere else. |
| 2026-04-25 | Keep lorem ipsum during visual tuning | User wants placeholder copy available while exploring the visual system. Product copy should not replace it unless requested. |
| 2026-04-25 | Direction shift: Yozakura Terminal | User wants a dark japanese-style direction with pink cherry blossom energy. Research supports nighttime sakura contrast: pale petals against black sky, lantern warmth, and sumi-e restraint. |

## Open Questions

- **Scope decision resolved for now** — current landing work is happening in `frontend/app/page.tsx`. `/demo` remains the dashboard route.
- **Demo embed** — should the live evidence panel grid hit `localhost:8765` (real backend) or use static JSON (`backend/static/cii-results.json`)? Real backend = "live" feel but breaks if API is down during judging.
