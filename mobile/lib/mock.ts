export type ClaimType = "object_presence" | "action_observed" | "state_change" | "progress_event";

export type Domain = "traffic" | "security" | "pets" | "kitchen" | "fitness" | "construction";

export type Claim = {
  id: string;
  type: ClaimType;
  domain: Domain;
  text: string;
  subject: string;
  timestamp: string;
  confidence: number;
  xp_reward: number;
  rare: boolean;
  // ironsite pipeline output
  before_image: string;
  after_image: string;
  segment_polygon: [number, number][];   // 36-pt SAM mask boundary, normalized 0-1
  edge_polygon: [number, number][];      // [[0,0],[1,0],[1,1],[0,1]] — frame corners
  outline_rgb: [number, number, number]; // deterministic per-class color
  // legacy visual (kept for floater + fallbacks)
  gradient: [string, string];
  glyph: string;
};

const TYPE_GRADIENTS: Record<ClaimType, [string, string]> = {
  object_presence: ["#ffb8c8", "#0e0e14"],
  action_observed: ["#ffc9d4", "#13131a"],
  state_change: ["#ff9eb1", "#0a0a10"],
  progress_event: ["#ffd1de", "#13131a"],
};

const TYPE_GLYPH: Record<ClaimType, string> = {
  object_presence: "◫",
  action_observed: "▷",
  state_change: "△",
  progress_event: "⌖",
};

// Real claims from the ironsite spatial pipeline (Gemini → SAM → Depth-Anything-V2).
// Each entry includes before_image (raw frame), after_image (depth-plasma), the SAM
// segment polygon for tap-to-expand, and a deterministic per-class outline color.
import IRONSITE_CLAIMS from "./ironsite-claims.json";

type IronsiteClaim = {
  id: string;
  type: ClaimType;
  domain: Domain;
  text: string;
  subject: string;
  timestamp: string;
  confidence: number;
  xp_reward: number;
  rare: boolean;
  before_image: string;
  after_image: string;
  segment_polygon: [number, number][];
  edge_polygon: [number, number][];
  outline_rgb: [number, number, number];
};

// _LEGACY: fallback synthetic claims kept for reference; the real pipeline output
// above is what generateClaims() returns. Underscore-prefixed so eslint
// no-unused-vars doesn't bark while we keep the array around for safety.
const _LEGACY_CLAIM_TEXTS: Array<{ text: string; label: string; type: ClaimType; rare?: boolean }> = [
  { text: "worker raises trowel toward block at frame 0:42", label: "Worker", type: "action_observed" },
  { text: "wall section [E-3] grew 3 courses since 0:18", label: "Wall Section", type: "progress_event", rare: true },
  { text: "mortar bucket present in foreground", label: "Mortar Bucket", type: "object_presence" },
  { text: "scaffolding plank now horizontal — was vertical at 0:11", label: "Scaffolding", type: "state_change" },
  { text: "second worker enters frame from left at 1:04", label: "Second Worker", type: "action_observed" },
  { text: "rebar bundle stacked against wall [N-1]", label: "Rebar", type: "object_presence" },
  { text: "level tool lifted toward course 7", label: "Level Tool", type: "action_observed", rare: true },
  { text: "brick count on wall [E-3]: 47 → predicted 52 by 1:30", label: "Brick Count", type: "progress_event", rare: true },
  { text: "concrete mixer running, audible at 0:22", label: "Mixer", type: "state_change" },
  { text: "hard hat (yellow) visible top-right", label: "Hard Hat", type: "object_presence" },
  { text: "wheelbarrow moved 2.4m east since 0:08", label: "Wheelbarrow", type: "state_change" },
  { text: "worker turns head 90° right at 1:12", label: "Head Turn", type: "action_observed" },
  { text: "dust cloud rises from cut zone at 0:33", label: "Dust Cloud", type: "state_change" },
  { text: "tape measure extended along course base", label: "Tape Measure", type: "action_observed" },
  { text: "block delivery pallet (~24 units) at frame edge", label: "Pallet", type: "object_presence" },
  { text: "mortar joint width increasing across course 5 (1.2cm → 1.6cm)", label: "Joint Width", type: "progress_event", rare: true },
  { text: "circular saw on workbench, off-state", label: "Circular Saw", type: "object_presence" },
  { text: "course 4 alignment drift: 3mm right of plumb at 0:55", label: "Plumb Drift", type: "state_change", rare: true },
  { text: "second hard hat enters from doorway", label: "Second Hat", type: "object_presence" },
  { text: "trowel motion: scoop → spread → tap (canonical)", label: "Trowel Motion", type: "action_observed" },
  { text: "wall [W-2] insulation sheet partially installed", label: "Insulation", type: "progress_event" },
  { text: "ladder repositioned 1.1m left at 1:25", label: "Ladder", type: "state_change" },
  { text: "extension cord crosses walking path", label: "Cord", type: "object_presence" },
  { text: "worker examines edge — likely measuring", label: "Edge Check", type: "action_observed" },
  { text: "morning shadow direction: 312° az, sun low east", label: "Sun Angle", type: "state_change", rare: true },
  { text: "drop cloth on floor near doorway", label: "Drop Cloth", type: "object_presence" },
  { text: "wood form lifted off slab — concrete visible", label: "Wood Form", type: "state_change", rare: true },
  { text: "hammer swing at frame 1:48 — 3 strikes", label: "Hammer", type: "action_observed" },
  { text: "workspace clutter increasing: tool count 4 → 7", label: "Tool Count", type: "progress_event" },
  { text: "PVC pipe (6\") stacked vertically against [S-1]", label: "PVC Pipe", type: "object_presence" },
  { text: "bucket of fasteners present at 0:30, gone by 1:00", label: "Fasteners", type: "state_change", rare: true },
  { text: "saw kerf depth ~14mm in stud frame", label: "Saw Kerf", type: "object_presence" },
  { text: "concrete pour active — slurry visible at 1:34", label: "Pour", type: "action_observed", rare: true },
  { text: "worker bent at waist, lifting heavy object", label: "Lift", type: "action_observed" },
  { text: "blue tarp covering material stack [center]", label: "Tarp", type: "object_presence" },
  { text: "courses laid since session start: 11", label: "Courses Laid", type: "progress_event", rare: true },
  { text: "drill held bit-down, motor off", label: "Drill", type: "object_presence" },
  { text: "vertical alignment laser visible on wall [E-3]", label: "Laser Line", type: "object_presence", rare: true },
  { text: "worker walks 4.1m left → right path 0:58 to 1:05", label: "Walking Path", type: "action_observed" },
  { text: "mortar consistency change: stiffer at 1:20 vs 0:45", label: "Mortar State", type: "state_change", rare: true },
  { text: "joint compound bucket open, lid beside", label: "Compound", type: "object_presence" },
  { text: "wall [S-1] now matches blueprint course-7 mark", label: "On Blueprint", type: "progress_event", rare: true },
  { text: "wheelbarrow tipped — small spill at 1:42", label: "Spill", type: "state_change" },
  { text: "second worker holds level tool against [N-1]", label: "Level Held", type: "action_observed" },
  { text: "rope tied around scaffold leg, was loose at 0:20", label: "Scaffold Tie", type: "state_change" },
  { text: "two empty cement bags in corner", label: "Cement Bags", type: "object_presence" },
  { text: "trowel lifted, no follow-through swing — incomplete action", label: "Incomplete", type: "action_observed", rare: true },
  { text: "framing square on top of stud bundle", label: "Framing Square", type: "object_presence" },
  { text: "course 6 added — wall [E-3] at expected progress (~85%)", label: "Course 6", type: "progress_event", rare: true },
  { text: "worker steps back, raises phone — likely photo", label: "Photo Op", type: "action_observed" },
];

export function generateClaims(): Claim[] {
  const claims: Claim[] = (IRONSITE_CLAIMS as IronsiteClaim[]).map((c) => ({
    ...c,
    gradient: TYPE_GRADIENTS[c.type],
    glyph: TYPE_GLYPH[c.type],
  }));
  // Pin a specific Worker claim as the first card (the one whose SAM mask
  // sits cleanly on the human). Phrase it as a yes/no question so the user
  // can answer with the swipe.
  const FIRST_ID = "inc-eve00";
  const firstIdx = claims.findIndex((c) => c.id === FIRST_ID);
  let pinned: Claim | null = null;
  if (firstIdx >= 0) {
    pinned = { ...claims[firstIdx], text: "is this a man?", subject: "Worker" };
    claims.splice(firstIdx, 1);
  }
  // Shuffle the rest so cards aren't grouped by source event in a row.
  for (let i = claims.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [claims[i], claims[j]] = [claims[j], claims[i]];
  }
  return pinned ? [pinned, ...claims] : claims;
}

function _legacyGenerateClaims(): unknown[] {
  return _LEGACY_CLAIM_TEXTS.map((c, i) => {
    const minutes = Math.floor(i / 4);
    const seconds = (i % 4) * 15;
    const ts = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    const conf = 0.62 + Math.random() * 0.36;
    // Seeded picsum thumbnail per claim — gives a consistent random photo
    // per label so demo cards look like real captured frames. Swap to real
    // generated stills (gpt-image-2) when assets are ready.
    const seed = `${c.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${i}`;
    return {
      id: `c${String(i + 1).padStart(4, "0")}`,
      type: c.type,
      text: c.text,
      timestamp: ts,
      confidence: Math.round(conf * 100) / 100,
      // 10 XP per swipe — flat — so the per-level swipe budgets in
       // xpForLevel() resolve to exact swipe counts. Rare claims keep
       // their visual flag for the floater color but pay the same.
      xp_reward: 10,
      rare: c.rare ?? false,
      label: c.label,
      image: `https://picsum.photos/seed/${seed}/600/400`,
      gradient: TYPE_GRADIENTS[c.type],
      glyph: TYPE_GLYPH[c.type],
    };
  });
}

export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export type Prize = {
  rarity: Rarity;
  label: string;
  sublabel: string;
  amount_sol: number; // 0 means xp boost
  xp_bonus: number;
  color: string;
};

export const WHEEL_SEGMENTS: Prize[] = [
  { rarity: "common", label: "+50", sublabel: "XP", amount_sol: 0, xp_bonus: 50, color: "#ffe4ec" },
  { rarity: "uncommon", label: "0.001", sublabel: "SOL", amount_sol: 0.001, xp_bonus: 0, color: "#ffd1de" },
  { rarity: "common", label: "+50", sublabel: "XP", amount_sol: 0, xp_bonus: 50, color: "#ffe4ec" },
  { rarity: "rare", label: "0.01", sublabel: "SOL", amount_sol: 0.01, xp_bonus: 0, color: "#ffb8c8" },
  { rarity: "common", label: "+50", sublabel: "XP", amount_sol: 0, xp_bonus: 50, color: "#ffe4ec" },
  { rarity: "uncommon", label: "0.001", sublabel: "SOL", amount_sol: 0.001, xp_bonus: 0, color: "#ffd1de" },
  { rarity: "common", label: "+50", sublabel: "XP", amount_sol: 0, xp_bonus: 50, color: "#ffe4ec" },
  { rarity: "epic", label: "0.05", sublabel: "SOL", amount_sol: 0.05, xp_bonus: 0, color: "#ff7090" },
];

export const LEGENDARY_PRIZE: Prize = {
  rarity: "legendary",
  label: "0.5",
  sublabel: "SOL",
  amount_sol: 0.5,
  xp_bonus: 0,
  color: "#ffe9b3",
};

export const LEGENDARY_OVERRIDE_CHANCE = 0.01;
export const RAFFLE_THRESHOLD = 25;

export function rollSpin(): { segmentIndex: number; prize: Prize; legendary: boolean } {
  const segmentIndex = Math.floor(Math.random() * WHEEL_SEGMENTS.length);
  const legendary = Math.random() < LEGENDARY_OVERRIDE_CHANCE;
  const prize = legendary ? LEGENDARY_PRIZE : WHEEL_SEGMENTS[segmentIndex];
  return { segmentIndex, prize, legendary };
}

/**
 * Swipes needed to advance FROM (level-1) TO `level`.
 *   L1 → L2: 10  (the "learn the loop" first raffle)
 *   L2 → L3: round(10 * 1.3) = 13
 *   L3 → L4: round(10 * 1.4) = 14
 *   L4 → L5: round(10 * 1.5) = 15
 *   ... swipes(L) = round(10 * (1 + 0.1 * L))
 */
export function swipesForLevel(level: number): number {
  if (level <= 1) return 0;
  if (level === 2) return 10;
  return Math.round(10 * (1 + 0.1 * level));
}

export function xpForLevel(level: number): number {
  // 10 XP per swipe (xp_reward), so cumulative XP cap is 10 × cumulative
  // swipe budget through `level`. Cumulative swipes:
  //   L2: 10   → 100 XP
  //   L3: 23   → 230 XP
  //   L4: 37   → 370 XP
  //   L5: 52   → 520 XP
  //   L6: 68   → 680 XP
  if (level <= 1) return 0;
  let total = 0;
  for (let k = 2; k <= level; k++) total += swipesForLevel(k) * 10;
  return total;
}

export function levelForXP(xp: number): { level: number; into: number; needed: number } {
  let level = 1;
  while (xp >= xpForLevel(level + 1)) level++;
  const into = xp - xpForLevel(level);
  const needed = xpForLevel(level + 1) - xpForLevel(level);
  return { level, into, needed };
}
