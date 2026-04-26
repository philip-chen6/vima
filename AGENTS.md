# AGENTS.md — vima project instructions

## Design System

**Always read `DESIGN.md` before making any visual or UI decisions.** All font choices, colors, spacing, motion, and aesthetic direction are defined there. Do not deviate without explicit user approval. In QA mode, flag any code that doesn't match `DESIGN.md`.

The current direction is **Phosphor Terminal** — Bloomberg/oscilloscope aesthetic. Reference prototype: `~/Downloads/output/reactbits-signal-lab/`.

**House rule — no all caps anywhere.** Brand text is lowercase: use `v i m a.` for the primary logo wordmark and `vima` in prose or metadata. Never use `VIMA` as a visual styling choice. All UI text is sentence case. Never `text-transform: uppercase`. Acronyms (CII, OSHA, COLMAP, SPL) keep canonical casing only because that IS their canonical form.

Key constants:
- Background: `#080503`, accent: `#f59e0b` (amber), body: `#e8d5c0` (cream)
- Type: Saans Mono for labels/data, Saans for prose, Saans SemiMono for sub-headings
- No light mode. No purple gradients. No bubble border-radius.
- Letter-spacing 0.02-0.06em on sentence-case mono (NOT 0.20-0.45em — that paired with all-caps)
- tabular-nums on every number

**Apply `~/.Codex/skills/taste-skill/SKILL.md` before writing any frontend code.** It names every AI design slop pattern; treat its section 7 forbidden list as a hard blocklist.

## Project Context

vima is a HackTech 2026 Caltech Ironsite Prize submission. Spatial safety intelligence for construction sites: bodycam video → CII (P/C/NC) classification → COLMAP zone attribution → Solana SPL payouts. Deadline: 9am PDT 2026-04-26.

- Backend: FastAPI on `:8765`, Codex Sonnet 4.6 vision judge
- Frontend: Next.js 16 + React 19 + Tailwind 4 + Framer Motion at `frontend/`
- Paper: `paper/spatial_main.pdf` (R13 final)
- Demo data: `backend/static/cii-results.json` (30 frames, 86.7% wrench time, mean P-confidence 0.939)
