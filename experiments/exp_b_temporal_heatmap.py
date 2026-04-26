#!/usr/bin/env python3
"""
VIMA Experiment B: Temporal Activity Heatmap
=============================================
Frame-by-frame P/C/NC classification over time rendered as a colored heatstrip,
showing the construction activity rhythm across the full video timeline.

Uses real CII data from both the Claude (30-frame) and Gemini (22-frame) runs,
interpolated to a dense timeline. Shows confidence as intensity.

Output: paper/figures/exp_b_temporal_heatmap.png (300 dpi)
"""

import json
import pathlib
import numpy as np

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.colors import ListedColormap, BoundaryNorm
from matplotlib.patches import FancyBboxPatch
from scipy.ndimage import gaussian_filter1d

# ── paths ────────────────────────────────────────────────────────────────────
BASE = pathlib.Path("/Users/qtzx/Desktop/workspace")
CLAUDE_CII = BASE / "vinna/backend/cii-results.json"
GEMINI_CII = BASE / "lifebase/.runtime/agents/ironsite-cii/cii-final.json"
SPATIAL   = BASE / "lifebase/.runtime/agents/ironsite-spatial/spatial-timeline.json"
FIG_OUT   = BASE / "vinna/paper/figures/exp_b_temporal_heatmap.png"

FIG_OUT.parent.mkdir(parents=True, exist_ok=True)

# ── palette ──────────────────────────────────────────────────────────────────
BG       = "#1a1a2e"
BG_DARK  = "#0f0f1e"
GOLD     = "#FFD700"
WHITE    = "#e8e8e8"
DIM      = "#666680"

CAT_COLORS = {"P": "#06d6a0", "C": "#FFD700", "NC": "#ff4444"}
CAT_IDX    = {"P": 0, "C": 1, "NC": 2}

VIDEO_DURATION_S = 21 * 60 + 16  # 21m16s = 1276s

# ── load data ────────────────────────────────────────────────────────────────
claude_data = json.loads(CLAUDE_CII.read_text())
gemini_raw = json.loads(GEMINI_CII.read_text())
gemini_data = gemini_raw["results"] if isinstance(gemini_raw, dict) else gemini_raw
spatial_data = json.loads(SPATIAL.read_text())

# Claude: 30 frames with timestamps
claude_ts = np.array([f["timestamp_s"] for f in claude_data])
claude_cats = [f["category"] for f in claude_data]
claude_conf = np.array([f["confidence"] for f in claude_data])

# Gemini: 22 frames, reconstruct timestamps from frame spacing
gemini_frame_spacing = VIDEO_DURATION_S / len(gemini_data)
gemini_ts = np.array([i * gemini_frame_spacing for i in range(len(gemini_data))])
gemini_cats = [f["category"] for f in gemini_data]
gemini_conf = np.array([f["confidence"] for f in gemini_data])

# Spatial: 39 batches with ts_start/ts_end
spatial_ts = np.array([(b["ts_start"] + b["ts_end"]) / 2 for b in spatial_data])
spatial_cats = [b["category"] for b in spatial_data]
spatial_conf = np.array([b["confidence"] for b in spatial_data])
spatial_acts = [b["activity"] for b in spatial_data]
spatial_zones = [b["zone"] for b in spatial_data]

# ── interpolate to dense timeline ───────────────────────────────────────────
dense_t = np.linspace(0, VIDEO_DURATION_S, 500)

def interpolate_cats(timestamps, categories, confs, target_t):
    """Nearest-neighbor interpolation of categories + confidence."""
    out_cats = np.zeros(len(target_t), dtype=int)
    out_conf = np.zeros(len(target_t))
    for i, t in enumerate(target_t):
        nearest_idx = np.argmin(np.abs(timestamps - t))
        out_cats[i] = CAT_IDX[categories[nearest_idx]]
        out_conf[i] = confs[nearest_idx]
    return out_cats, out_conf

claude_dense_cats, claude_dense_conf = interpolate_cats(claude_ts, claude_cats, claude_conf, dense_t)
gemini_dense_cats, gemini_dense_conf = interpolate_cats(gemini_ts, gemini_cats, gemini_conf, dense_t)
spatial_dense_cats, spatial_dense_conf = interpolate_cats(spatial_ts, spatial_cats, spatial_conf, dense_t)

# ── figure ───────────────────────────────────────────────────────────────────
fig, axes = plt.subplots(5, 1, figsize=(16, 7), facecolor=BG_DARK,
                          gridspec_kw={"height_ratios": [1, 1, 1, 0.6, 0.8], "hspace": 0.15})

cmap = ListedColormap(["#06d6a0", "#FFD700", "#ff4444"])
bounds = [-0.5, 0.5, 1.5, 2.5]
norm = BoundaryNorm(bounds, cmap.N)

labels = ["Claude Judge", "Gemini Judge", "Spatial Pipeline"]
data_pairs = [
    (claude_dense_cats, claude_dense_conf),
    (gemini_dense_cats, gemini_dense_conf),
    (spatial_dense_cats, spatial_dense_conf),
]

for ax, (cats, conf), label in zip(axes[:3], data_pairs, labels):
    ax.set_facecolor(BG)
    for spine in ax.spines.values():
        spine.set_visible(False)
    ax.grid(False)

    # Render as colored rectangles with alpha = confidence
    strip = cats.reshape(1, -1)
    conf_strip = conf.reshape(1, -1)

    im = ax.imshow(strip, cmap=cmap, norm=norm, aspect="auto",
                   extent=[0, VIDEO_DURATION_S / 60, 0, 1], interpolation="nearest")

    # Overlay confidence as darkening mask
    alpha_mask = np.ones_like(conf_strip) * 0.6
    alpha_mask[conf_strip > 0.5] = 0.3
    alpha_mask[conf_strip > 0.8] = 0.0
    ax.imshow(np.zeros((1, len(dense_t), 4)),
              extent=[0, VIDEO_DURATION_S / 60, 0, 1], aspect="auto")

    ax.set_yticks([])
    ax.set_xlim(0, VIDEO_DURATION_S / 60)
    ax.text(-0.5, 0.5, label, transform=ax.transData, fontsize=10,
            color=GOLD, fontweight="bold", va="center", ha="right",
            fontfamily="monospace")
    if ax != axes[2]:
        ax.set_xticks([])
    else:
        ax.set_xlabel("Time (minutes)", fontsize=10, color=WHITE, labelpad=6)
        ax.tick_params(colors=WHITE, length=3)

# -- confidence overlay panel --
ax_conf = axes[3]
ax_conf.set_facecolor(BG)
for spine in ax_conf.spines.values():
    spine.set_visible(False)
ax_conf.grid(False)

t_min = dense_t / 60.0
ax_conf.fill_between(t_min, 0, gaussian_filter1d(claude_dense_conf, 8),
                     alpha=0.4, color="#00d4ff", label="Claude conf.")
ax_conf.fill_between(t_min, 0, gaussian_filter1d(gemini_dense_conf, 8),
                     alpha=0.3, color=GOLD, label="Gemini conf.")
ax_conf.set_ylim(0, 1.05)
ax_conf.set_xlim(0, VIDEO_DURATION_S / 60)
ax_conf.set_ylabel("Conf.", fontsize=9, color=DIM, labelpad=4)
ax_conf.tick_params(colors=DIM, length=2, labelsize=8)
ax_conf.set_xticks([])
ax_conf.legend(fontsize=8, loc="upper right", facecolor=BG, edgecolor=GOLD,
               labelcolor=WHITE, ncol=2)

# -- activity zone panel --
ax_zone = axes[4]
ax_zone.set_facecolor(BG)
for spine in ax_zone.spines.values():
    spine.set_visible(False)
ax_zone.grid(False)

unique_zones = list(set(spatial_zones))
zone_colors = ["#06d6a0", "#FFD700", "#ff4444", "#00d4ff", "#ff006e",
               "#9b59b6", "#e67e22", "#1abc9c", "#3498db", "#e74c3c"]

for i, batch in enumerate(spatial_data):
    t_start = batch["ts_start"] / 60.0
    t_end = batch["ts_end"] / 60.0
    zone_idx = unique_zones.index(batch["zone"]) % len(zone_colors)
    ax_zone.barh(0, t_end - t_start, left=t_start, height=0.8,
                 color=zone_colors[zone_idx], alpha=0.7, edgecolor="none")

ax_zone.set_xlim(0, VIDEO_DURATION_S / 60)
ax_zone.set_yticks([])
ax_zone.set_xlabel("Time (minutes)", fontsize=10, color=WHITE, labelpad=6)
ax_zone.tick_params(colors=WHITE, length=3)
ax_zone.text(-0.5, 0, "Activity Zone", fontsize=9, color=GOLD, fontweight="bold",
             va="center", ha="right", fontfamily="monospace")

# Zone legend (compact)
from matplotlib.patches import Patch
zone_patches = [Patch(facecolor=zone_colors[i % len(zone_colors)], label=z)
                for i, z in enumerate(unique_zones[:6])]
ax_zone.legend(handles=zone_patches, fontsize=7, loc="upper right",
               facecolor=BG, edgecolor=GOLD, labelcolor=WHITE, ncol=3)

# -- category legend --
from matplotlib.lines import Line2D
cat_handles = [Line2D([0], [0], marker="s", color="w", markerfacecolor=CAT_COLORS[c],
                       markersize=10, linestyle="None", label=f"{c} = {{'P':'Productive','C':'Contributory','NC':'Non-Contrib.'}}[c]")
               for c in ["P", "C", "NC"]]
# Simpler approach
cat_handles = [
    Line2D([0], [0], marker="s", color="w", markerfacecolor="#06d6a0", markersize=10, linestyle="None", label="P  Productive"),
    Line2D([0], [0], marker="s", color="w", markerfacecolor="#FFD700", markersize=10, linestyle="None", label="C  Contributory"),
    Line2D([0], [0], marker="s", color="w", markerfacecolor="#ff4444", markersize=10, linestyle="None", label="NC Non-Contributory"),
]
fig.legend(handles=cat_handles, fontsize=9, loc="upper right",
           bbox_to_anchor=(0.98, 0.99), facecolor=BG, edgecolor=GOLD, labelcolor=WHITE)

# Title
fig.suptitle("Exp. B: Temporal Activity Heatmap — CII Classification Over Time",
             fontsize=15, color=GOLD, fontweight="bold", y=1.0, fontfamily="monospace")

fig.text(0.5, -0.01,
         f"Video duration: {VIDEO_DURATION_S//60}m{VIDEO_DURATION_S%60}s  |  "
         f"Claude: {len(claude_data)} frames  |  Gemini: {len(gemini_data)} frames  |  "
         f"Spatial: {len(spatial_data)} batches",
         ha="center", fontsize=9, color=DIM, fontfamily="monospace")

fig.savefig(FIG_OUT, dpi=300, facecolor=BG_DARK, bbox_inches="tight", pad_inches=0.3)
plt.close()

print(f"Saved: {FIG_OUT}")
print(f"  Claude distribution: P={sum(1 for c in claude_cats if c=='P')}, C={sum(1 for c in claude_cats if c=='C')}, NC={sum(1 for c in claude_cats if c=='NC')}")
print(f"  Gemini distribution: P={sum(1 for c in gemini_cats if c=='P')}, C={sum(1 for c in gemini_cats if c=='C')}, NC={sum(1 for c in gemini_cats if c=='NC')}")
