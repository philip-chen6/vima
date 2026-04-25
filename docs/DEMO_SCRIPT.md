# VINNA Demo Video Script
## HackTech 2026 — Ironsite Prize Track
## Target: 60–90 seconds | Screen recording with narration

---

### SETUP (before you hit record)

- Backend running: `cd backend && uv run api.py` (confirm `:8765` is live)
- Frontend running: `cd frontend && bun dev` (confirm homepage loads)
- Browser tab 1: Frontend (`localhost:3000` or wherever it's running)
- Browser tab 2: `localhost:8765/demo` (have it pre-loaded, don't run live)
- Browser tab 3: `localhost:8765/cii/summary` (pre-loaded)
- Terminal: `raffle.py` ready to run, not yet executed
- Font size: bump to 16+ for readability in recording
- Window: full-screen browser, no distracting tabs visible

---

### SEGMENT 1 — Frontend Homepage (0–10s)

**Action:** Screen is on the VINNA frontend homepage. Slowly scroll or hover to show the headline and key sections. Don't rush.

**Narrate:**
> "This is VINNA — spatial intelligence for construction sites. Not a violation checker. A system that tracks what workers are actually doing, builds tamper-resistant evidence, and pays out on-chain based on verified productivity."

**What to show:** VINNA title, the spatial intelligence tagline, evidence architecture section if visible.

---

### SEGMENT 2 — Live Frame Classification (10–25s)

**Action:** Switch to Tab 2 — `localhost:8765/demo`. The JSON response should already be loaded. Scroll slowly through it to show 2–3 frames of output.

**Narrate:**
> "Here's the backend classifying real Ironsite masonry frames. Each frame gets a CII label — P for Productive, C for Contributory, NC for Non-Contributory — with confidence scores, spatial claims, and a full reasoning chain. Claude Sonnet 4.6 is the judge."

**What to show:** Scroll to highlight one frame where `pnc` is `"P"` and `confidence` is high (0.93+). Then briefly show one `"NC"` frame. The contrast sells it.

---

### SEGMENT 3 — Wrench Time Summary (25–40s)

**Action:** Switch to Tab 3 — `localhost:8765/cii/summary`. The JSON should be loaded.

**Narrate:**
> "Across 30 frames of real site footage: 86.7% productive. Mean P-confidence 0.939. High-confidence spatial classification on real-world construction data. This is the number that feeds the raffle."

**What to show:** Point at `wrench_time_pct`, `productive`, and `raffle_tickets` fields in the JSON. Pause briefly on each.

---

### SEGMENT 4 — Raffle Draw (40–55s)

**Action:** Switch to terminal. Run:
```
cd /Users/qtzx/Desktop/workspace/vinna/backend
uv run raffle.py
```
Let the output print live. Don't cut away before the winner line appears.

**Narrate (after output appears):**
> "The raffle engine takes wrench time percentages, issues proportional tickets — one ticket per 0.1% above baseline — draws a winner, and generates a Solana SPL transaction. W003 wins this round. The TX signature is on-chain, linkable on Solscan."

**What to show:** The terminal output. Specifically: worker rankings with ticket counts, the winner line, and the TX signature hash.

---

### SEGMENT 5 — Evidence Architecture (55–70s)

**Action:** Switch back to browser Tab 1 — frontend. Scroll to the evidence architecture or payout section.

**Narrate:**
> "Every payout is backed by an evidence chain: bodycam frame to spatial classification to wrench time percentage to raffle weight to on-chain SPL transfer. Tamper-resistant by construction. Workers can verify they're measured fairly. Site managers can audit every number. That's VINNA."

**What to show:** The evidence architecture visual if it's on the frontend. If not, hold on the homepage while narrating — the confidence is in the voice.

---

### CLOSING (optional, if under 75s)

**No extra narration needed.** Cut to black or fade. Let the last frame be the terminal with the TX signature visible.

---

### Recording Notes (Joshua — Stephen exited Apr 11, this is your solo task)

- Speak at a normal pace. The timestamps are loose guides, not hard cuts.
- If the backend is slow on `/demo` (595ms/frame × 5 = 3s total), pre-load the tab so it's already returned.
- The raffle output is deterministic (seed=42) so W003 will always win on the test data — you can practice it.
- Don't apologize for anything. No "uhh this is a bit rough" energy. Just narrate what you're seeing.
- If something breaks live: cut, fix, re-record the segment. Don't try to narrate through an error.
- Total talk time target: under 75 seconds of narration. Leave 5–10s of silence on the raffle run so viewers can read the output.
