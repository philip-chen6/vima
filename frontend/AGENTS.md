<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes: APIs, conventions, and file structure may
all differ from your training data. Read the relevant guide in
`node_modules/next/dist/docs/` before writing any Next.js code. Heed
deprecation notices.
<!-- END:nextjs-agent-rules -->

# VIMA Frontend Agent Notes

## Scope

This directory is the Next.js product/marketing frontend. The current
spatial-memory review tool is the standalone dashboard in `../dashboard/`.
Do not rebuild the dashboard inside Next.js unless the user asks.

## Stack

- Next.js 16
- React 19
- Tailwind 4
- Three.js / React Three Fiber
- Framer Motion / Motion
- lucide-react

## Commands

```bash
bun install
NEXT_PUBLIC_API_URL=http://localhost:8766 bun run dev -- --port 3001
bun run build
```

## Visual Rules

- Read `../DESIGN.md` before visual edits.
- Keep visual brand copy lowercase when it is styled as the logo or UI chrome:
  use `vima` or `v i m a.` according to the existing design.
- Prose may use `VIMA` for the project name.
- Do not add new VINNA references.
- No all-caps styling, no purple gradients, no decorative blobs, and no generic
  AI dashboard filler.
- Use lucide icons for tool buttons where available.
- Keep UI text sentence case and make dense technical surfaces easy to scan.

## Product Rules

- The active story is spatial memory for construction video:
  boxes -> masks -> depth -> episodes -> cited answer.
- Do not center stale CII, Solana raffle, or wrench-time messaging unless the
  user explicitly asks to work on those legacy surfaces.
- If frontend copy mentions evidence, ground it in current artifacts:
  `../demo/episodic_memory.json`, `../demo/memory_answer_gemini.json`, and the
  dashboard previews.
- When changing data contracts, update backend docs and root `AGENTS.md` too.

## Team

VIMA is built by Philip Chen, Joshua Lin, Stephen Hung, and Lucas He for the
Hacktech 2026 Spatial Intelligence Track.
