export type ClaimType = "object_presence" | "action_observed" | "state_change" | "progress_event";

export type Claim = {
  id: string;
  type: ClaimType;
  text: string;
  timestamp: string; // mm:ss in source video
  confidence: number; // 0..1
  xp_reward: number;
  rare: boolean;
  // visual
  gradient: [string, string]; // top-left, bottom-right
  glyph: string; // simple unicode marker for the card
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

const CLAIM_TEXTS: Array<{ text: string; type: ClaimType; rare?: boolean }> = [
  { text: "worker raises trowel toward block at frame 0:42", type: "action_observed" },
  { text: "wall section [E-3] grew 3 courses since 0:18", type: "progress_event", rare: true },
  { text: "mortar bucket present in foreground", type: "object_presence" },
  { text: "scaffolding plank now horizontal — was vertical at 0:11", type: "state_change" },
  { text: "second worker enters frame from left at 1:04", type: "action_observed" },
  { text: "rebar bundle stacked against wall [N-1]", type: "object_presence" },
  { text: "level tool lifted toward course 7", type: "action_observed", rare: true },
  { text: "brick count on wall [E-3]: 47 → predicted 52 by 1:30", type: "progress_event", rare: true },
  { text: "concrete mixer running, audible at 0:22", type: "state_change" },
  { text: "hard hat (yellow) visible top-right", type: "object_presence" },
  { text: "wheelbarrow moved 2.4m east since 0:08", type: "state_change" },
  { text: "worker turns head 90° right at 1:12", type: "action_observed" },
  { text: "dust cloud rises from cut zone at 0:33", type: "state_change" },
  { text: "tape measure extended along course base", type: "action_observed" },
  { text: "block delivery pallet (~24 units) at frame edge", type: "object_presence" },
  { text: "mortar joint width increasing across course 5 (1.2cm → 1.6cm)", type: "progress_event", rare: true },
  { text: "circular saw on workbench, off-state", type: "object_presence" },
  { text: "course 4 alignment drift: 3mm right of plumb at 0:55", type: "state_change", rare: true },
  { text: "second hard hat enters from doorway", type: "object_presence" },
  { text: "trowel motion: scoop → spread → tap (canonical)", type: "action_observed" },
  { text: "wall [W-2] insulation sheet partially installed", type: "progress_event" },
  { text: "ladder repositioned 1.1m left at 1:25", type: "state_change" },
  { text: "extension cord crosses walking path", type: "object_presence" },
  { text: "worker examines edge — likely measuring", type: "action_observed" },
  { text: "morning shadow direction: 312° az, sun low east", type: "state_change", rare: true },
  { text: "drop cloth on floor near doorway", type: "object_presence" },
  { text: "wood form lifted off slab — concrete visible", type: "state_change", rare: true },
  { text: "hammer swing at frame 1:48 — 3 strikes", type: "action_observed" },
  { text: "workspace clutter increasing: tool count 4 → 7", type: "progress_event" },
  { text: "PVC pipe (6\") stacked vertically against [S-1]", type: "object_presence" },
  { text: "bucket of fasteners present at 0:30, gone by 1:00", type: "state_change", rare: true },
  { text: "saw kerf depth ~14mm in stud frame", type: "object_presence" },
  { text: "concrete pour active — slurry visible at 1:34", type: "action_observed", rare: true },
  { text: "worker bent at waist, lifting heavy object", type: "action_observed" },
  { text: "blue tarp covering material stack [center]", type: "object_presence" },
  { text: "courses laid since session start: 11", type: "progress_event", rare: true },
  { text: "drill held bit-down, motor off", type: "object_presence" },
  { text: "vertical alignment laser visible on wall [E-3]", type: "object_presence", rare: true },
  { text: "worker walks 4.1m left → right path 0:58 to 1:05", type: "action_observed" },
  { text: "mortar consistency change: stiffer at 1:20 vs 0:45", type: "state_change", rare: true },
  { text: "joint compound bucket open, lid beside", type: "object_presence" },
  { text: "wall [S-1] now matches blueprint course-7 mark", type: "progress_event", rare: true },
  { text: "wheelbarrow tipped — small spill at 1:42", type: "state_change" },
  { text: "second worker holds level tool against [N-1]", type: "action_observed" },
  { text: "rope tied around scaffold leg, was loose at 0:20", type: "state_change" },
  { text: "two empty cement bags in corner", type: "object_presence" },
  { text: "trowel lifted, no follow-through swing — incomplete action", type: "action_observed", rare: true },
  { text: "framing square on top of stud bundle", type: "object_presence" },
  { text: "course 6 added — wall [E-3] at expected progress (~85%)", type: "progress_event", rare: true },
  { text: "worker steps back, raises phone — likely photo", type: "action_observed" },
];

function seededUnit(seed: number) {
  const x = Math.sin(seed * 991) * 10000;
  return x - Math.floor(x);
}

export function generateClaims(): Claim[] {
  return CLAIM_TEXTS.map((c, i) => {
    const minutes = Math.floor(i / 4);
    const seconds = (i % 4) * 15;
    const ts = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    const conf = 0.62 + seededUnit(i + 1) * 0.36;
    return {
      id: `c${String(i + 1).padStart(4, "0")}`,
      type: c.type,
      text: c.text,
      timestamp: ts,
      confidence: Math.round(conf * 100) / 100,
      xp_reward: c.rare ? 30 : 15,
      rare: c.rare ?? false,
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

export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return 50 * level * (level - 1);
}

export function levelForXP(xp: number): { level: number; into: number; needed: number } {
  let level = 1;
  while (xp >= xpForLevel(level + 1)) level++;
  const into = xp - xpForLevel(level);
  const needed = xpForLevel(level + 1) - xpForLevel(level);
  return { level, into, needed };
}
