"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { generateClaims, levelForXP, RAFFLE_THRESHOLD, rollSpin, type Claim, type Prize } from "./mock";

export type Mode = "verify" | "levelup" | "raffle" | "spinning" | "claim";

export type Decision = "confirm" | "reject" | "skip";

export type PayoutRecord = {
  id: string;
  amount_sol: number;
  address: string;
  ts: number;
};

type State = {
  mode: Mode;
  pendingPrize: Prize | null;
  legendaryHit: boolean;

  xp: number;
  level: number;
  streak: number;
  claims_done: number;
  raffle_unlocked: boolean;
  spins_available: number;
  sol_pending: number;
  payouts_queued: PayoutRecord[];

  // session-only deck
  deckIndex: number;
  claims: Claim[];

  hydrated: boolean;
};

type Actions = {
  hydrate: () => void;
  verify: (decision: Decision) => { gainedXP: number; leveledUp: boolean; rafflePopped: boolean };
  consumeLevelUp: () => void;
  openRaffle: () => void;
  spin: () => { segmentIndex: number; prize: Prize; legendary: boolean };
  consumeSpinResult: () => void;
  submitPayout: (address: string) => void;
  reset: () => void;
};

const INITIAL: Omit<State, "hydrate" | "claims" | "hydrated"> = {
  mode: "verify",
  pendingPrize: null,
  legendaryHit: false,
  xp: 0,
  level: 1,
  streak: 0,
  claims_done: 0,
  raffle_unlocked: false,
  spins_available: 0,
  sol_pending: 0,
  payouts_queued: [],
  deckIndex: 0,
};

export const useStore = create<State & Actions>()(
  persist(
    (set, get) => ({
      ...INITIAL,
      claims: generateClaims(),
      hydrated: true,

      hydrate: () => {
        if (get().claims.length === 0) {
          set({ claims: generateClaims(), hydrated: true });
        }
      },

      verify: (decision) => {
        const s = get();
        const claim = s.claims[s.deckIndex % s.claims.length];
        if (!claim) return { gainedXP: 0, leveledUp: false, rafflePopped: false };

        let gainedXP = 0;
        let newStreak = s.streak;

        if (decision === "skip") {
          newStreak = 0;
        } else {
          gainedXP = claim.xp_reward;
          newStreak = s.streak + 1;
          if (newStreak >= 25) gainedXP = Math.round(gainedXP * 1.5);
          else if (newStreak >= 10) gainedXP = Math.round(gainedXP * 1.25);
        }

        const newXP = s.xp + gainedXP;
        const oldLevel = s.level;
        const { level: newLevel } = levelForXP(newXP);
        const leveledUp = newLevel > oldLevel;

        const newClaimsDone = decision === "skip" ? s.claims_done : s.claims_done + 1;

        let newRaffleUnlocked = s.raffle_unlocked;
        let newSpins = s.spins_available;
        let rafflePopped = false;
        if (newClaimsDone > 0 && newClaimsDone % RAFFLE_THRESHOLD === 0 && newClaimsDone !== s.claims_done) {
          newRaffleUnlocked = true;
          newSpins = s.spins_available + 1;
          rafflePopped = true;
        }

        set({
          xp: newXP,
          level: newLevel,
          streak: newStreak,
          claims_done: newClaimsDone,
          raffle_unlocked: newRaffleUnlocked,
          spins_available: newSpins,
          deckIndex: s.deckIndex + 1,
          mode: leveledUp ? "levelup" : s.mode,
        });

        return { gainedXP, leveledUp, rafflePopped };
      },

      consumeLevelUp: () => set({ mode: "verify" }),

      openRaffle: () => {
        if (get().spins_available <= 0) return;
        set({ mode: "raffle" });
      },

      spin: () => {
        const result = rollSpin();
        set({
          mode: "spinning",
          pendingPrize: result.prize,
          legendaryHit: result.legendary,
        });
        return result;
      },

      consumeSpinResult: () => {
        const s = get();
        if (!s.pendingPrize) return;
        const prize = s.pendingPrize;
        if (prize.amount_sol > 0) {
          set({
            mode: "claim",
            sol_pending: s.sol_pending + prize.amount_sol,
            spins_available: s.spins_available - 1,
            raffle_unlocked: s.spins_available - 1 > 0,
          });
        } else {
          set({
            mode: "verify",
            xp: s.xp + prize.xp_bonus,
            spins_available: s.spins_available - 1,
            raffle_unlocked: s.spins_available - 1 > 0,
            pendingPrize: null,
            legendaryHit: false,
          });
        }
      },

      submitPayout: (address) => {
        const s = get();
        if (!s.pendingPrize) return;
        const record: PayoutRecord = {
          id: `p${Date.now()}`,
          amount_sol: s.pendingPrize.amount_sol,
          address,
          ts: Date.now(),
        };
        set({
          payouts_queued: [...s.payouts_queued, record],
          sol_pending: Math.max(0, s.sol_pending - s.pendingPrize.amount_sol),
          pendingPrize: null,
          legendaryHit: false,
          mode: "verify",
        });
      },

      reset: () => {
        const claims = generateClaims();
        set({ ...INITIAL, claims, hydrated: true });
      },
    }),
    {
      name: "vima-session",
      partialize: (state) => ({
        xp: state.xp,
        level: state.level,
        streak: state.streak,
        claims_done: state.claims_done,
        raffle_unlocked: state.raffle_unlocked,
        spins_available: state.spins_available,
        sol_pending: state.sol_pending,
        payouts_queued: state.payouts_queued,
        deckIndex: state.deckIndex,
      }),
    }
  )
);
