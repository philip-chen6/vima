#!/usr/bin/env python3
"""
VINNA Experiment C: Embedding Space UMAP Projection
====================================================
Takes the 3072-dimensional spatial embeddings from the ironsite spatial pipeline
(39 batches, each with a vision-model embedding of the construction scene),
reduces to 2D via UMAP, and clusters by activity type / zone.

Demonstrates that the embedding space captures meaningful semantic structure
(similar activities cluster together) -- a key claim for the VINNA spatial
reward function.

Output: paper/figures/exp_c_embedding_umap.png (300 dpi)
"""

import json
import pathlib
import numpy as np

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch
from matplotlib.lines import Line2D

import umap
from sklearn.cluster import DBSCAN

# ── paths ────────────────────────────────────────────────────────────────────
BASE = pathlib.Path("/Users/qtzx/Desktop/workspace")
SPATIAL = BASE / "lifebase/.runtime/agents/ironsite-spatial/spatial-timeline.json"
FIG_OUT = BASE / "vinna/paper/figures/exp_c_embedding_umap.png"

FIG_OUT.parent.mkdir(parents=True, exist_ok=True)
np.random.seed(42)

# ── palette ──────────────────────────────────────────────────────────────────
BG       = "#1a1a2e"
BG_DARK  = "#0f0f1e"
GOLD     = "#FFD700"
WHITE    = "#e8e8e8"
DIM      = "#666680"

# Activity-based coloring
ACTIVITY_COLORS = {
    "brick laying":           "#06d6a0",
    "laying mortar":          "#06d6a0",
    "mortar mixing":          "#06d6a0",
    "material mixing":        "#06d6a0",
    "scaffolding work":       "#FFD700",
    "scaffolding assembly":   "#FFD700",
    "scaffold assembly":      "#FFD700",
    "scaffolding climb":      "#FFD700",
    "walking on scaffolding": "#FFD700",
    "working on scaffolding": "#FFD700",
    "material handling":      "#00d4ff",
    "material placement":     "#00d4ff",
    "construction work":      "#9b59b6",
    "rebar tying":            "#ff006e",
    "metal structure assembly":"#ff006e",
    "structure manipulation": "#ff006e",
    "operating crane":        "#e67e22",
    "observing site":         "#ff4444",
}

# Zone-based marker shapes
ZONE_MARKERS = {
    "wall surface":           "o",
    "scaffolding":            "^",
    "scaffold":               "^",
    "mixing area":            "s",
    "material bin":           "D",
    "raised platform":        "P",
    "lift platform":          "P",
    "crane operator's cab":   "*",
    "structure":              "h",
    "rebar cage":             "X",
}

# ── load data ────────────────────────────────────────────────────────────────
data = json.loads(SPATIAL.read_text())
n = len(data)

embeddings = np.array([b["embedding"] for b in data])
activities = [b["activity"] for b in data]
zones = [b["zone"] for b in data]
confidences = np.array([b["confidence"] for b in data])
ts_labels = [b["ts_label"] for b in data]

print(f"Loaded {n} batches, embedding dim = {embeddings.shape[1]}")

# ── UMAP reduction ──────────────────────────────────────────────────────────
reducer = umap.UMAP(
    n_neighbors=8,
    min_dist=0.3,
    n_components=2,
    metric="cosine",
    random_state=42,
)
proj = reducer.fit_transform(embeddings)

# ── DBSCAN clustering ───────────────────────────────────────────────────────
clusterer = DBSCAN(eps=1.5, min_samples=2)
cluster_labels = clusterer.fit_predict(proj)
n_clusters = len(set(cluster_labels) - {-1})
print(f"DBSCAN found {n_clusters} clusters (eps=1.5, min_samples=2)")

# ── figure ───────────────────────────────────────────────────────────────────
fig, (ax_main, ax_time) = plt.subplots(
    1, 2, figsize=(16, 8), width_ratios=[2, 1],
    facecolor=BG_DARK
)

# -- left: UMAP scatter colored by activity --
ax_main.set_facecolor(BG)
for spine in ax_main.spines.values():
    spine.set_visible(False)
ax_main.grid(False)

for i in range(n):
    color = ACTIVITY_COLORS.get(activities[i], "#888888")
    marker = ZONE_MARKERS.get(zones[i], "o")
    size = 80 + confidences[i] * 120

    ax_main.scatter(proj[i, 0], proj[i, 1],
                    c=color, marker=marker, s=size,
                    alpha=0.85, edgecolors=WHITE, linewidths=0.5,
                    zorder=3)

    # Time label for selected points
    if i % 5 == 0:
        ax_main.annotate(ts_labels[i], (proj[i, 0], proj[i, 1]),
                         fontsize=7, color=DIM, fontfamily="monospace",
                         xytext=(5, 5), textcoords="offset points")

# Draw cluster hulls
from scipy.spatial import ConvexHull
cluster_colors_hull = ["#06d6a055", "#FFD70055", "#00d4ff55", "#ff006e55", "#9b59b655"]
for cl in sorted(set(cluster_labels)):
    if cl == -1:
        continue
    mask = cluster_labels == cl
    pts = proj[mask]
    if len(pts) >= 3:
        try:
            hull = ConvexHull(pts)
            hull_pts = np.append(hull.vertices, hull.vertices[0])
            ax_main.fill(pts[hull_pts, 0], pts[hull_pts, 1],
                         color=cluster_colors_hull[cl % len(cluster_colors_hull)],
                         edgecolor=WHITE, linewidth=0.8, alpha=0.2, zorder=1)
        except Exception:
            pass

ax_main.set_xlabel("UMAP 1", fontsize=12, color=WHITE, fontweight="bold")
ax_main.set_ylabel("UMAP 2", fontsize=12, color=WHITE, fontweight="bold")
ax_main.tick_params(colors=DIM, length=0, labelsize=9)

# Activity legend (grouped)
activity_groups = {
    "Masonry":      ("#06d6a0", "o"),
    "Scaffolding":  ("#FFD700", "^"),
    "Material":     ("#00d4ff", "D"),
    "Structural":   ("#ff006e", "h"),
    "Crane Ops":    ("#e67e22", "*"),
    "Observation":  ("#ff4444", "s"),
    "General":      ("#9b59b6", "o"),
}
legend_handles = [
    Line2D([0], [0], marker=m, color="w", markerfacecolor=c, markersize=9,
           linestyle="None", label=lbl)
    for lbl, (c, m) in activity_groups.items()
]
ax_main.legend(handles=legend_handles, fontsize=9, loc="upper left",
               facecolor=BG, edgecolor=GOLD, labelcolor=WHITE, title="Activity Group",
               title_fontsize=10)
ax_main.get_legend().get_title().set_color(GOLD)

# -- right: temporal trajectory through embedding space --
ax_time.set_facecolor(BG)
for spine in ax_time.spines.values():
    spine.set_visible(False)
ax_time.grid(False)

# Color-coded trajectory
from matplotlib.collections import LineCollection
points = proj.reshape(-1, 1, 2)
segments = np.concatenate([points[:-1], points[1:]], axis=1)
t_norm = np.linspace(0, 1, len(segments))

lc = LineCollection(segments, cmap="cool", linewidths=1.5, alpha=0.6)
lc.set_array(t_norm)
ax_time.add_collection(lc)

# Scatter with time colormap
sc = ax_time.scatter(proj[:, 0], proj[:, 1],
                     c=np.arange(n), cmap="cool", s=60,
                     edgecolors=WHITE, linewidths=0.3, zorder=3)

for i in range(n):
    if i % 4 == 0:
        ax_time.annotate(f"t={ts_labels[i]}", (proj[i, 0], proj[i, 1]),
                         fontsize=6, color=WHITE, fontfamily="monospace",
                         xytext=(4, 4), textcoords="offset points", alpha=0.7)

cbar = fig.colorbar(sc, ax=ax_time, fraction=0.046, pad=0.04)
cbar.set_label("Batch Index (time)", fontsize=9, color=WHITE)
cbar.ax.yaxis.set_tick_params(color=WHITE)
cbar.outline.set_visible(False)
plt.setp(cbar.ax.yaxis.get_ticklabels(), color=DIM, fontsize=8)

ax_time.set_xlabel("UMAP 1", fontsize=12, color=WHITE, fontweight="bold")
ax_time.set_ylabel("UMAP 2", fontsize=12, color=WHITE, fontweight="bold")
ax_time.tick_params(colors=DIM, length=0, labelsize=9)
ax_time.set_title("Temporal Trajectory", fontsize=11, color=GOLD,
                   fontweight="bold", fontfamily="monospace", pad=10)

# Title
fig.suptitle("Exp. C: Spatial Embedding Space (3072-dim → UMAP 2D)",
             fontsize=16, color=GOLD, fontweight="bold", y=0.98, fontfamily="monospace")

fig.text(0.5, 0.01,
         f"n = {n} scene batches  |  dim = 3072  |  "
         f"UMAP (cosine, k=8)  |  {n_clusters} DBSCAN clusters  |  "
         f"{len(set(activities))} unique activities  |  {len(set(zones))} zones",
         ha="center", fontsize=9, color=DIM, fontfamily="monospace")

plt.tight_layout(rect=[0, 0.04, 1, 0.95])
fig.savefig(FIG_OUT, dpi=300, facecolor=BG_DARK, bbox_inches="tight", pad_inches=0.3)
plt.close()

print(f"Saved: {FIG_OUT}")
print(f"  Activities: {sorted(set(activities))}")
print(f"  Zones: {sorted(set(zones))}")
print(f"  Clusters: {n_clusters}")
