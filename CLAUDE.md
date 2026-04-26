# CLAUDE.md — vima project instructions

## Design System

**Always read `DESIGN.md` before making any visual or UI decisions.** All font choices, colors, spacing, motion, and aesthetic direction are defined there. Do not deviate without explicit user approval. In QA mode, flag any code that doesn't match `DESIGN.md`.

The current direction is **Yozakura Terminal** — sakura-pink phosphor on ink, Bloomberg/oscilloscope aesthetic. The previous Phosphor Terminal (amber on cream) was superseded — DESIGN.md is canonical.

**House rule — no all caps anywhere.** Brand text is lowercase: use `v i m a.` for the primary logo wordmark and `vima` in prose or metadata. Never use `VIMA` as a visual styling choice. All UI text is sentence case. Never `text-transform: uppercase`. Acronyms (CII, OSHA, COLMAP, SPL) keep canonical casing only because that IS their canonical form.

Key constants:
- Background: `#080503` (ink), accent: `#f2a7b8` (sakura-hot), body: `#f7ecef` (washi)
- Sakura: `#A64D79` for hover/secondary; lantern: `#ffd3a6` for warnings; red: `#ef476f` for NC/critical
- Type: Saans Mono for labels/data, Saans for prose, Saans SemiMono for sub-headings
- No light mode. No purple gradients. No bubble border-radius. NO amber/orange anywhere.
- Letter-spacing 0.02-0.06em on sentence-case mono (NOT 0.20-0.45em — that paired with all-caps)
- tabular-nums on every number

**Apply `~/.claude/skills/taste-skill/SKILL.md` before writing any frontend code.** It names every AI design slop pattern; treat its section 7 forbidden list as a hard blocklist.

## Project Context

vima is a HackTech 2026 Caltech Ironsite Prize submission. Spatial safety intelligence for construction sites: bodycam video → CII (P/C/NC) classification → COLMAP zone attribution → Solana SPL payouts. Deadline: 9am PDT 2026-04-26.

- Backend: FastAPI on `:8765`, Claude Sonnet 4.6 vision judge
- Frontend: Next.js 16 + React 19 + Tailwind 4 + Framer Motion at `frontend/`
- Paper: `paper/main.pdf` (10MB, served at `/paper.pdf` via `frontend/public/paper.pdf`)
- Routes: `/` landing, `/demo` live workspace, `/eval` temporal eval — separate routes, each with its own Yozakura sidebar (shadcn) + workspace nav.
- Demo data: `backend/cii-results.json` + `frontend/public/data/` (cii-results.json 30 frames 86.7% wrench time mean conf 0.939, episodes.json 118 episodes, eval-results.json 5-frame haiku-4-5 baseline-vs-vima A/B, depth-filter-log.json 59 pairs ~66% drop, cameras.json 19 COLMAP poses)
