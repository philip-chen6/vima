"""
exp_k_risk_terrain.py
VINNA — Risk Terrain + SNRA Dual-Panel Visualization
Sources:
  proof/cold_path_results.json  — 10 frames, CII labels, violation counts
  demo/event_timeline.json      — 32 frames, change_score, similarity_to_prev
Output:
  paper/figures/exp_k_risk_terrain.png (200dpi, tight bbox, #050505 bg)
"""

import json
import os
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.ticker import MultipleLocator

# ── paths ──────────────────────────────────────────────────────────────────
BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
COLD_PATH = os.path.join(BASE, "proof", "cold_path_results.json")
EVENT_TL  = os.path.join(BASE, "demo",  "event_timeline.json")
OUT_PNG   = os.path.join(BASE, "paper", "figures", "exp_k_risk_terrain.png")

BG        = "#050505"
GRID_CLR  = "#ffffff11"
NC_CLR    = "#ff2200"
C_CLR     = "#ffaa00"
P_CLR     = "#00ff88"
SNRA_CLR  = "#00ccff"
SPIKE_CLR = "#ff2200"
TEXT_CLR  = "#ffffff"
SUBTEXT   = "#aaaaaa"

CII_COLOR = {"NC": NC_CLR, "C": C_CLR, "P": P_CLR}

# ── load data ──────────────────────────────────────────────────────────────
with open(COLD_PATH) as f:
    cold = json.load(f)

with open(EVENT_TL) as f:
    evt = json.load(f)

frames      = cold["frames"]
video_dur   = cold["video_duration_s"]          # 1276.0

timestamps  = [fr["timestamp_s"]                for fr in frames]
severities  = [fr["high_severity_violations"]   for fr in frames]
labels      = [fr["classification"]             for fr in frames]
confidences = [fr["confidence"]                 for fr in frames]
activities  = [fr["activity"][:25]              for fr in frames]

et_frames   = evt["frames"]
et_ts       = [f["timestamp_est"]  for f in et_frames]
et_change   = [f["change_score"]   for f in et_frames]

# top-5 change peaks
sorted_idx = sorted(range(len(et_change)), key=lambda i: et_change[i], reverse=True)
top5_idx   = sorted(sorted_idx[:5])

# ── figure setup ──────────────────────────────────────────────────────────
fig = plt.figure(figsize=(16, 10), facecolor=BG)
gs  = fig.add_gridspec(2, 1, hspace=0.52, top=0.93, bottom=0.08,
                        left=0.06, right=0.97,
                        height_ratios=[1.6, 1.0])

# ═══════════════════════════════════════════════════════════════════════════
# PANEL A — CII Classification Timeline
# ═══════════════════════════════════════════════════════════════════════════
ax_a = fig.add_subplot(gs[0])
ax_a.set_facecolor(BG)

for spine in ax_a.spines.values():
    spine.set_color("#333333")

ax_a.set_xlim(-30, video_dur + 30)
ax_a.set_ylim(-0.25, 3.8)

# grid
ax_a.xaxis.set_minor_locator(MultipleLocator(50))
ax_a.xaxis.set_major_locator(MultipleLocator(200))
ax_a.yaxis.set_major_locator(MultipleLocator(1))
ax_a.grid(which="major", color=GRID_CLR, linewidth=0.6, linestyle="--")
ax_a.grid(which="minor", color=GRID_CLR, linewidth=0.3, linestyle=":")
ax_a.tick_params(colors=SUBTEXT, labelsize=8)
ax_a.set_xlabel("Time (seconds)", color=SUBTEXT, fontsize=9, labelpad=4)
ax_a.set_ylabel("High-Severity Violations", color=SUBTEXT, fontsize=9, labelpad=6)

BAR_W = 80  # bar half-width in seconds for visual fill

for i, (ts, sev, lbl, conf, act) in enumerate(
        zip(timestamps, severities, labels, confidences, activities)):

    base_color = CII_COLOR[lbl]

    # glow layer (wide, very transparent)
    ax_a.bar(ts, sev + 0.35, width=BAR_W * 2.2, bottom=-0.25,
             color=base_color, alpha=0.06, zorder=1)
    # mid glow
    ax_a.bar(ts, sev + 0.35, width=BAR_W * 1.3, bottom=-0.25,
             color=base_color, alpha=0.12, zorder=2)
    # solid bar
    ax_a.bar(ts, sev + 0.15, width=BAR_W, bottom=-0.25,
             color=base_color, alpha=0.85, zorder=3,
             linewidth=0.8, edgecolor=base_color)
    # bright spine on top
    ax_a.bar(ts, 0.08, width=BAR_W * 0.25, bottom=sev + 0.06,
             color="#ffffff", alpha=0.55, zorder=4)

    # confidence indicator — small diamond
    ax_a.scatter(ts, sev + 0.45, marker="D", s=18,
                 color=base_color, alpha=0.9, zorder=5)

    # activity label
    ax_a.text(ts, sev + 0.62, act,
              color=base_color, fontsize=5.5, ha="center", va="bottom",
              rotation=38, rotation_mode="anchor",
              fontfamily="monospace", alpha=0.88, zorder=5)

    # confidence number below
    ax_a.text(ts, -0.22, f"{conf:.2f}",
              color=SUBTEXT, fontsize=5.5, ha="center", va="bottom",
              fontfamily="monospace", alpha=0.7, zorder=5)

# confidence label on x-axis bottom
ax_a.text(-28, -0.22, "conf →", color=SUBTEXT,
          fontsize=5.5, va="bottom", fontfamily="monospace", alpha=0.6)

# wrench-time annotation box
wt = cold["classification_distribution"]["wrench_time_pct"]
nc_pct = cold["classification_distribution"]["non_contributory_pct"]
info = (f"wrench time: {wt:.0f}%   NC: {nc_pct:.0f}%   "
        f"frames analyzed: {cold['total_frames_analyzed']}")
ax_a.text(video_dur + 25, 3.7, info,
          color=SUBTEXT, fontsize=7, ha="right", va="top",
          fontfamily="monospace",
          bbox=dict(boxstyle="round,pad=0.3", facecolor="#111111",
                    edgecolor="#333333", alpha=0.85))

# legend
legend_patches = [
    mpatches.Patch(color=NC_CLR, label="NC — Non-Contributory", alpha=0.85),
    mpatches.Patch(color=C_CLR,  label="C  — Contributory",     alpha=0.85),
    mpatches.Patch(color=P_CLR,  label="P  — Productive",       alpha=0.85),
]
leg = ax_a.legend(handles=legend_patches, loc="upper right",
                  framealpha=0.15, facecolor="#111111",
                  edgecolor="#333333", fontsize=7.5,
                  labelcolor=TEXT_CLR)

ax_a.set_title("VINNA — CII Classification Timeline",
               color=TEXT_CLR, fontsize=14, pad=10, loc="left",
               fontweight="bold")

# ═══════════════════════════════════════════════════════════════════════════
# PANEL B — Spatial Change Sensor (SNRA)
# ═══════════════════════════════════════════════════════════════════════════
ax_b = fig.add_subplot(gs[1])
ax_b.set_facecolor(BG)

for spine in ax_b.spines.values():
    spine.set_color("#333333")

ax_b.set_xlim(-30, video_dur + 30)
ax_b.set_ylim(-0.005, max(et_change) * 1.35)
ax_b.xaxis.set_major_locator(MultipleLocator(200))
ax_b.xaxis.set_minor_locator(MultipleLocator(50))
ax_b.grid(which="major", color=GRID_CLR, linewidth=0.6, linestyle="--")
ax_b.grid(which="minor", color=GRID_CLR, linewidth=0.3, linestyle=":")
ax_b.tick_params(colors=SUBTEXT, labelsize=8)
ax_b.set_xlabel("Time (seconds)", color=SUBTEXT, fontsize=9, labelpad=4)
ax_b.set_ylabel("Change Score", color=SUBTEXT, fontsize=9, labelpad=6)

ts_arr = np.array(et_ts)
cs_arr = np.array(et_change)

# filled area — glow layers
ax_b.fill_between(ts_arr, cs_arr, alpha=0.08,
                  color=SNRA_CLR, zorder=1)
ax_b.fill_between(ts_arr, cs_arr * 0.5, alpha=0.14,
                  color=SNRA_CLR, zorder=2)
# solid curve
ax_b.plot(ts_arr, cs_arr, color=SNRA_CLR, linewidth=1.8,
          alpha=0.9, zorder=3)
# spine dot markers
ax_b.scatter(ts_arr, cs_arr, color=SNRA_CLR, s=12,
             alpha=0.7, zorder=4)

# horizontal mean line
mean_cs = np.mean(cs_arr)
ax_b.axhline(mean_cs, color="#ffffff22", linewidth=0.8,
             linestyle="--", zorder=2)
ax_b.text(video_dur + 25, mean_cs, f"μ={mean_cs:.3f}",
          color=SUBTEXT, fontsize=6.5, va="center",
          fontfamily="monospace")

# top-5 peaks — red spike annotations
for rank, idx in enumerate(top5_idx):
    x = et_ts[idx]
    y = et_change[idx]
    # spike line
    ax_b.vlines(x, y, y + max(et_change) * 0.28,
                color=SPIKE_CLR, linewidth=1.2, alpha=0.85, zorder=5)
    # spike dot
    ax_b.scatter(x, y, color=SPIKE_CLR, s=40, zorder=6, alpha=0.95,
                 marker="^")
    # label
    ax_b.text(x, y + max(et_change) * 0.30,
              f"Δ spatial event\n{x:.0f}s",
              color=SPIKE_CLR, fontsize=5.8, ha="center", va="bottom",
              fontfamily="monospace", alpha=0.9, zorder=6)

ax_b.set_title("Spatial Change Sensor (SNRA)",
               color=TEXT_CLR, fontsize=12, pad=8, loc="left",
               fontweight="bold")

# ── supra figure label ─────────────────────────────────────────────────────
fig.text(0.97, 0.97,
         "source: 01_production_masonry.mp4 · model: claude-sonnet-4-6 · "
         "generated: 2026-04-25",
         color="#444444", fontsize=6, ha="right", va="top",
         fontfamily="monospace")

# ── save ──────────────────────────────────────────────────────────────────
os.makedirs(os.path.dirname(OUT_PNG), exist_ok=True)
fig.savefig(OUT_PNG, dpi=200, bbox_inches="tight", facecolor=BG)
print(f"saved → {OUT_PNG}")
print(f"size  → {os.path.getsize(OUT_PNG) / 1024:.1f} KB")
