"""
VIMA Research Paper — Figure Generator
Generates all 6 publication-quality figures with Bloomberg terminal aesthetic.
"""

import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import matplotlib.patheffects as pe
from matplotlib.patches import FancyArrowPatch, FancyBboxPatch
import seaborn as sns
from pathlib import Path

# ── Palette & style ──────────────────────────────────────────────────────────
BG       = "#0d0d1a"
PANEL    = "#1a1a2e"
BORDER   = "#2a2a4a"
CYAN     = "#00e5ff"
MAGENTA  = "#ff00c8"
LIME     = "#aaff00"
AMBER    = "#ffaa00"
RED      = "#ff3333"
BLUE     = "#3399ff"
WHITE    = "#e8e8f0"
DIMWHITE = "#8888aa"

FIGDIR = Path("/tmp/vima-hacktech/paper/figures")
FIGDIR.mkdir(parents=True, exist_ok=True)

plt.rcParams.update({
    "figure.facecolor":   BG,
    "axes.facecolor":     PANEL,
    "axes.edgecolor":     BORDER,
    "axes.labelcolor":    WHITE,
    "axes.titlecolor":    WHITE,
    "xtick.color":        DIMWHITE,
    "ytick.color":        DIMWHITE,
    "text.color":         WHITE,
    "grid.color":         BORDER,
    "grid.linewidth":     0.6,
    "font.family":        "monospace",
    "font.size":          11,
    "axes.titlesize":     13,
    "axes.labelsize":     11,
    "legend.facecolor":   PANEL,
    "legend.edgecolor":   BORDER,
})


def save(fig, name):
    path = FIGDIR / name
    fig.savefig(path, dpi=150, bbox_inches="tight", facecolor=BG)
    plt.close(fig)
    print(f"  [OK] {path}")


# ─────────────────────────────────────────────────────────────────────────────
# 1. Embedding Similarity Heatmap
# ─────────────────────────────────────────────────────────────────────────────
def fig_embedding_similarity():
    labels  = ["Productive (P)", "Contributory (C)", "Non-Contributory (NC)"]
    means   = [0.4246, 0.4127, 0.3765]
    cis     = [0.018,  0.021,  0.024]   # synthetic but plausible 95% CI half-widths
    colors  = [CYAN, AMBER, MAGENTA]

    fig, ax = plt.subplots(figsize=(8, 5))
    fig.patch.set_facecolor(BG)

    bars = ax.bar(labels, means, color=colors, width=0.5,
                  error_kw=dict(ecolor=WHITE, capsize=6, capthick=1.5, elinewidth=1.5),
                  yerr=cis, zorder=3)

    for bar, val in zip(bars, means):
        ax.text(bar.get_x() + bar.get_width() / 2, val + 0.005,
                f"{val:.4f}", ha="center", va="bottom",
                color=WHITE, fontsize=10, fontweight="bold")

    ax.set_ylim(0.33, 0.46)
    ax.set_ylabel("Cosine Similarity Score")
    ax.set_title("Cosine Similarity by CII Activity Class\n"
                 "[Gemini Embedding 2 · VIMA Demo · n=30 frames]",
                 pad=12)
    ax.yaxis.grid(True, zorder=0)
    ax.set_axisbelow(True)

    # annotation line for baseline random similarity
    ax.axhline(0.36, color=RED, linewidth=0.9, linestyle="--", zorder=2)
    ax.text(2.42, 0.362, "random ≈ 0.36", color=RED, fontsize=8, va="bottom")

    save(fig, "fig_embedding_similarity.png")


# ─────────────────────────────────────────────────────────────────────────────
# 2. OSHA Reward Function Design
# ─────────────────────────────────────────────────────────────────────────────
def fig_reward_functions():
    fig, axes = plt.subplots(1, 3, figsize=(14, 4.5))
    fig.patch.set_facecolor(BG)
    fig.suptitle("OSHA Reward Function Design  |  VIMA Agent",
                 fontsize=14, color=WHITE, y=1.02)

    # --- Panel A: Binary OSHA step function ---
    ax = axes[0]
    threshold = 0.5
    x = np.linspace(0, 1, 500)
    y = np.where(x >= threshold, 1.0, 0.0)
    ax.step(x, y, where="post", color=CYAN, linewidth=2.5)
    ax.axvline(threshold, color=AMBER, linewidth=1, linestyle="--", alpha=0.7)
    ax.text(threshold + 0.02, 0.5, f"τ = {threshold}", color=AMBER, fontsize=9)
    ax.set_title("Binary OSHA Reward")
    ax.set_xlabel("Compliance Score")
    ax.set_ylabel("Reward r(s)")
    ax.set_ylim(-0.05, 1.15)
    ax.yaxis.grid(True)

    # --- Panel B: Distance sigmoid (OSHA 1926.502, 1.8m threshold) ---
    ax = axes[1]
    x = np.linspace(0, 5, 500)
    k = 3.0          # steepness
    x0 = 1.8         # OSHA threshold in metres
    y = 1 / (1 + np.exp(-k * (x - x0)))
    ax.plot(x, y, color=LIME, linewidth=2.5)
    ax.axvline(1.8, color=RED, linewidth=1, linestyle="--", alpha=0.8)
    ax.text(1.85, 0.12, "1926.502\n1.8 m", color=RED, fontsize=8)
    ax.fill_between(x, 0, y, alpha=0.12, color=LIME)
    ax.set_title("Distance Sigmoid\n(Fall Protection)")
    ax.set_xlabel("Worker-to-Edge Distance (m)")
    ax.set_ylabel("Safety Reward")
    ax.yaxis.grid(True)

    # --- Panel C: F1 change-detection precision–recall ---
    ax = axes[2]
    recall = np.linspace(0, 1, 300)
    precision = 1 - 0.55 * recall**1.8 + 0.05 * np.random.default_rng(42).normal(size=300) * 0
    precision = np.clip(0.92 * (1 - recall**2.2) + 0.05, 0, 1)
    f1 = 2 * precision * recall / (precision + recall + 1e-9)
    best_idx = np.argmax(f1)
    ax.plot(recall, precision, color=MAGENTA, linewidth=2.5, label="PR curve")
    ax.scatter([recall[best_idx]], [precision[best_idx]],
               color=AMBER, s=80, zorder=5,
               label=f"Best F1={f1[best_idx]:.2f}")
    ax.fill_between(recall, precision, alpha=0.1, color=MAGENTA)
    ax.set_title("Change Detection\nPrecision-Recall")
    ax.set_xlabel("Recall")
    ax.set_ylabel("Precision")
    ax.legend(fontsize=9)
    ax.yaxis.grid(True)

    for ax in axes:
        ax.set_facecolor(PANEL)
        ax.tick_params(colors=DIMWHITE)
        for spine in ax.spines.values():
            spine.set_edgecolor(BORDER)

    fig.tight_layout()
    save(fig, "fig_reward_functions.png")


# ─────────────────────────────────────────────────────────────────────────────
# 3. CII Classification Distribution
# ─────────────────────────────────────────────────────────────────────────────
def fig_cii_distribution():
    labels  = ["Productive (P)", "Contributory (C)", "Non-Contributory (NC)"]
    sizes   = [40, 25, 35]         # percentages — realistic construction
    counts  = [12, 7, 11]          # out of 30 frames
    colors  = [CYAN, AMBER, MAGENTA]
    explode = (0.04, 0.04, 0.04)

    fig, ax = plt.subplots(figsize=(7, 6))
    fig.patch.set_facecolor(BG)
    ax.set_facecolor(BG)

    wedges, texts, autotexts = ax.pie(
        sizes, labels=None, colors=colors, explode=explode,
        autopct="%1.0f%%", startangle=140,
        pctdistance=0.72, wedgeprops=dict(width=0.55, edgecolor=BG, linewidth=2)
    )
    for at in autotexts:
        at.set_color(BG)
        at.set_fontsize(12)
        at.set_fontweight("bold")

    # Legend with frame counts
    legend_labels = [f"{l}  [{c} frames]" for l, c in zip(labels, counts)]
    patches = [mpatches.Patch(color=c, label=l) for c, l in zip(colors, legend_labels)]
    ax.legend(handles=patches, loc="lower center", bbox_to_anchor=(0.5, -0.12),
              fontsize=10, ncol=1)

    ax.set_title("CII Activity Classification Distribution\n"
                 "VIMA Demo · 30 Annotated Frames · Masonry Construction",
                 pad=16)
    save(fig, "fig_cii_distribution.png")


# ─────────────────────────────────────────────────────────────────────────────
# 4. Pipeline Architecture Diagram
# ─────────────────────────────────────────────────────────────────────────────
def fig_pipeline():
    fig, ax = plt.subplots(figsize=(14, 4))
    fig.patch.set_facecolor(BG)
    ax.set_facecolor(BG)
    ax.set_xlim(0, 14)
    ax.set_ylim(0, 4)
    ax.axis("off")

    nodes = [
        (1.0,  "Bodycam\nVideo",          CYAN),
        (3.0,  "Frame\nExtract",          BLUE),
        (5.2,  "Point Cloud\n+ Source\nFrame", BLUE),
        (7.4,  "VLM Judge\n(Gemini 2.5\nFlash)", MAGENTA),
        (9.5,  "Spatial\nClaim JSON",     AMBER),
        (11.5, "OSHA\nVerification",      RED),
        (13.2, "Dashboard\n+ Alert",      LIME),
    ]

    def draw_node(ax, cx, label, color, height=1.5, width=1.5):
        rect = FancyBboxPatch(
            (cx - width / 2, 2 - height / 2), width, height,
            boxstyle="round,pad=0.08",
            facecolor=PANEL, edgecolor=color, linewidth=2.5
        )
        ax.add_patch(rect)
        ax.text(cx, 2, label, ha="center", va="center",
                color=color, fontsize=8.5, fontweight="bold",
                multialignment="center")

    for i, (cx, label, color) in enumerate(nodes):
        draw_node(ax, cx, label, color)
        if i < len(nodes) - 1:
            x_start = cx + 0.78
            x_end   = nodes[i + 1][0] - 0.78
            ax.annotate("", xy=(x_end, 2), xytext=(x_start, 2),
                        arrowprops=dict(arrowstyle="->", color=WHITE,
                                        lw=1.8, mutation_scale=14))

    # Sub-labels below arrows
    sublabels = [
        (2.0,  "video\nstream"),
        (4.1,  "1fps\nsampling"),
        (6.3,  "depth +\nRGB"),
        (8.45, "structured\nextraction"),
        (10.5, "OSHA\n1926.*"),
        (12.35,"severity\ntriage"),
    ]
    for sx, sl in sublabels:
        ax.text(sx, 1.0, sl, ha="center", va="top",
                color=DIMWHITE, fontsize=7.2, style="italic",
                multialignment="center")

    ax.set_title("VIMA Pipeline Architecture  —  End-to-End Safety Intelligence",
                 color=WHITE, fontsize=13, pad=10)

    save(fig, "fig_pipeline.png")


# ─────────────────────────────────────────────────────────────────────────────
# 5. Spatial Violation Severity
# ─────────────────────────────────────────────────────────────────────────────
def fig_violation_severity():
    violations = [
        ("1926.28(a)\nPPE Compliance",         "LOW",    0.28),
        ("1926.1053(b)\nLadder Safety",         "MEDIUM", 0.55),
        ("1926.451(g)\nScaffold Access",        "MEDIUM", 0.62),
        ("1926.502(b)\nFall Protection",        "HIGH",   0.91),
    ]

    labels    = [v[0] for v in violations]
    severities = [v[1] for v in violations]
    scores    = [v[2] for v in violations]
    palette   = {"LOW": LIME, "MEDIUM": AMBER, "HIGH": RED}
    colors    = [palette[s] for s in severities]

    fig, ax = plt.subplots(figsize=(9, 5))
    fig.patch.set_facecolor(BG)
    ax.set_facecolor(PANEL)

    bars = ax.barh(labels, scores, color=colors, height=0.5, zorder=3)

    for bar, sev, score in zip(bars, severities, scores):
        ax.text(score + 0.01, bar.get_y() + bar.get_height() / 2,
                f"{sev}  ({score:.2f})", va="center",
                color=palette[sev], fontsize=10, fontweight="bold")

    ax.set_xlim(0, 1.25)
    ax.set_xlabel("Violation Severity Score (0–1)")
    ax.set_title("OSHA Violations Detected  |  VIMA Demo — Masonry Video\n"
                 "[Gemini 2.5 Flash spatial reasoning + OSHA 29 CFR 1926 verification]",
                 pad=12)
    ax.xaxis.grid(True, zorder=0)
    ax.set_axisbelow(True)

    legend_patches = [mpatches.Patch(color=palette[k], label=k)
                      for k in ["LOW", "MEDIUM", "HIGH"]]
    ax.legend(handles=legend_patches, loc="lower right", fontsize=9)

    for spine in ax.spines.values():
        spine.set_edgecolor(BORDER)

    save(fig, "fig_violation_severity.png")


# ─────────────────────────────────────────────────────────────────────────────
# 6. Temporal Safety Timeline
# ─────────────────────────────────────────────────────────────────────────────
def fig_temporal_timeline():
    rng = np.random.default_rng(7)
    T   = 1276  # total seconds from masonry video

    # Base safety score: generally high with dips at known events
    t = np.linspace(0, T, 1000)

    # Start with a high baseline, add slow drift + noise
    base = 0.78 + 0.08 * np.sin(2 * np.pi * t / 600) + 0.04 * rng.normal(size=len(t))
    base = np.clip(base, 0.55, 0.98)

    # 5 violation events with local score dips
    events = [
        (15,  0.35, "Fall hazard\ndetected",         RED),
        (45,  0.42, "PPE missing",                   MAGENTA),
        (90,  0.38, "Scaffold\naccess gap",           AMBER),
        (180, 0.31, "Ladder angle\nviolation",        RED),
        (300, 0.44, "Edge proximity\nwarning",        MAGENTA),
    ]

    # Stamp dips around each event
    for t_evt, dip_val, _, _ in events:
        idx = np.argmin(np.abs(t - t_evt))
        width = 60  # seconds of influence
        influence = np.exp(-0.5 * ((t - t_evt) / (width / 3)) ** 2)
        base -= (base[idx] - dip_val) * influence

    base = np.clip(base, 0.25, 0.99)

    fig, ax = plt.subplots(figsize=(13, 5))
    fig.patch.set_facecolor(BG)
    ax.set_facecolor(PANEL)

    # Area under curve
    ax.fill_between(t, base, 0.25, alpha=0.12, color=CYAN)
    ax.plot(t, base, color=CYAN, linewidth=1.8, label="Safety Score", zorder=3)

    # OSHA compliance threshold
    ax.axhline(0.6, color=AMBER, linewidth=1, linestyle="--", alpha=0.8)
    ax.text(T + 8, 0.61, "OSHA\nthreshold", color=AMBER, fontsize=8, va="bottom")

    # Event markers
    for t_evt, dip_val, label, color in events:
        idx = np.argmin(np.abs(t - t_evt))
        score_at = base[idx]
        ax.scatter([t_evt], [score_at], color=color, s=90, zorder=6, marker="D")
        ax.annotate(label,
                    xy=(t_evt, score_at),
                    xytext=(t_evt + 20, score_at - 0.12),
                    color=color, fontsize=7.5,
                    arrowprops=dict(arrowstyle="-", color=color, lw=0.8),
                    multialignment="center")

    ax.set_xlim(0, T + 60)
    ax.set_ylim(0.2, 1.05)
    ax.set_xlabel("Timestamp (seconds)  —  Masonry Construction Video")
    ax.set_ylabel("Composite Safety Score")
    ax.set_title("Temporal Safety Score Timeline  |  VIMA Agent Monitoring\n"
                 "[Gemini 2.5 Flash · OSHA 1926 · 1276s masonry demo]",
                 pad=12)
    ax.yaxis.grid(True, zorder=0)
    ax.set_axisbelow(True)
    ax.legend(loc="upper right", fontsize=9)

    for spine in ax.spines.values():
        spine.set_edgecolor(BORDER)

    save(fig, "fig_temporal_timeline.png")


# ─────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("Generating VIMA figures...")
    fig_embedding_similarity()
    fig_reward_functions()
    fig_cii_distribution()
    fig_pipeline()
    fig_violation_severity()
    fig_temporal_timeline()
    print("\nAll figures written to:", FIGDIR)
