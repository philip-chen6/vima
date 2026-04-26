"""
Experiment H: Depth Gradient Analysis
=======================================
Spatial Intelligence — using edge gradient magnitude as a proxy for depth
complexity in egocentric construction video. Areas with high gradient density
indicate close-range, geometrically complex structures (scaffolding, rebar);
low gradient regions indicate open sky, distant terrain, or flat surfaces.

Hypothesis: Gradient complexity (edge energy) varies systematically as the
worker moves between open areas and dense scaffolding zones. Temporal
patterns in gradient complexity reveal the spatial structure of the worker's
trajectory through the construction site.

Method:
  1. Sobel gradient (X and Y) → magnitude per frame
  2. Compute depth complexity metrics: mean gradient, gradient entropy,
     high-gradient fraction (proxy for near-field structural density)
  3. Divide each frame into horizontal bands (sky / mid / ground) to
     capture vertical depth structure
  4. Plot depth complexity over time with spatial band decomposition

Data: 638 frames from construction bodycam
Output: /Users/qtzx/Desktop/workspace/vinna/paper/figures/exp_h_depth_gradient.png
"""

import pathlib
import time

import cv2
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from scipy.ndimage import uniform_filter1d
from scipy.stats import entropy

# ── Paths ─────────────────────────────────────────────────────────────────
FRAME_DIR = pathlib.Path("/Users/qtzx/Desktop/workspace/lifebase/.runtime/agents/ironsite-cii/frames")
OUT_FIG = pathlib.Path("/Users/qtzx/Desktop/workspace/vinna/paper/figures/exp_h_depth_gradient.png")
OUT_FIG.parent.mkdir(parents=True, exist_ok=True)

# ── Style ─────────────────────────────────────────────────────────────────
BG = "#1a1a2e"
PANEL_BG = "#12122a"
YELLOW = "#FFD700"
CYAN = "#00BCD4"
WHITE = "#EEEEEE"
MAGENTA = "#FF6B9D"
GREEN = "#2ecc71"


def setup_style():
    plt.rcParams.update({
        "font.family": "monospace",
        "font.size": 10,
        "axes.labelsize": 11,
        "axes.titlesize": 12,
        "xtick.labelsize": 9,
        "ytick.labelsize": 9,
        "legend.fontsize": 9,
        "figure.facecolor": BG,
        "axes.facecolor": PANEL_BG,
        "axes.edgecolor": "#3a3a5e",
        "text.color": WHITE,
        "axes.labelcolor": "#ccccdd",
        "xtick.color": "#8899aa",
        "ytick.color": "#8899aa",
    })


# ══════════════════════════════════════════════════════════════════════════
# STEP 1: Compute depth gradient metrics
# ══════════════════════════════════════════════════════════════════════════

def compute_gradient_metrics():
    frames = sorted(FRAME_DIR.glob("frame_*.jpg"))
    n_frames = len(frames)
    print(f"Found {n_frames} frames")

    sample = cv2.imread(str(frames[0]))
    H, W = sample.shape[:2]

    # Horizontal band boundaries (thirds: sky / mid / ground)
    band_bounds = [
        ("Upper (sky/distance)", 0, H // 3),
        ("Middle (structures)", H // 3, 2 * H // 3),
        ("Lower (ground/near)", 2 * H // 3, H),
    ]

    results = []
    band_results = {b[0]: [] for b in band_bounds}

    t0 = time.time()
    for idx, fpath in enumerate(frames):
        img = cv2.imread(str(fpath))
        if img is None:
            continue
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        gray = cv2.GaussianBlur(gray, (3, 3), 0.8)

        # Sobel gradients
        grad_x = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
        grad_y = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
        grad_mag = np.sqrt(grad_x ** 2 + grad_y ** 2)

        # Full-frame metrics
        mean_grad = float(np.mean(grad_mag))
        max_grad = float(np.max(grad_mag))
        high_frac = float(np.mean(grad_mag > 50))  # fraction of high-gradient pixels

        # Gradient entropy (discretize to 64 bins)
        hist, _ = np.histogram(grad_mag.ravel(), bins=64, range=(0, 300))
        hist = hist.astype(float)
        hist_norm = hist / hist.sum() if hist.sum() > 0 else hist
        grad_entropy = float(entropy(hist_norm + 1e-10))

        # Gradient direction histogram (for texture analysis)
        angles = np.arctan2(grad_y, grad_x + 1e-10)
        # Mask: only high-gradient pixels
        active = grad_mag > 30
        if np.any(active):
            dir_hist, _ = np.histogram(angles[active], bins=8, range=(-np.pi, np.pi))
            dir_uniformity = float(np.std(dir_hist / dir_hist.sum())) if dir_hist.sum() > 0 else 0
        else:
            dir_uniformity = 0.0

        results.append({
            "frame_idx": idx,
            "mean_gradient": mean_grad,
            "max_gradient": max_grad,
            "high_gradient_frac": high_frac,
            "gradient_entropy": grad_entropy,
            "direction_uniformity": dir_uniformity,
        })

        # Per-band metrics
        for name, y0, y1 in band_bounds:
            band_grad = grad_mag[y0:y1, :]
            band_results[name].append(float(np.mean(band_grad)))

        if (idx + 1) % 100 == 0:
            elapsed = time.time() - t0
            print(f"  {idx+1}/{n_frames} frames ({elapsed:.1f}s)")

    elapsed = time.time() - t0
    print(f"Gradient analysis complete: {n_frames} frames in {elapsed:.1f}s")
    return results, band_results


# ══════════════════════════════════════════════════════════════════════════
# STEP 2: Create 4-panel publication figure
# ══════════════════════════════════════════════════════════════════════════

def create_figure(results, band_results):
    setup_style()

    fig = plt.figure(figsize=(18, 13), facecolor=BG)
    gs = fig.add_gridspec(2, 2, hspace=0.33, wspace=0.28,
                          left=0.06, right=0.96, top=0.90, bottom=0.06)

    indices = np.array([r["frame_idx"] for r in results])
    mean_grads = np.array([r["mean_gradient"] for r in results])
    high_fracs = np.array([r["high_gradient_frac"] for r in results])
    entropies = np.array([r["gradient_entropy"] for r in results])
    dir_unis = np.array([r["direction_uniformity"] for r in results])

    smooth_grad = uniform_filter1d(mean_grads, size=12)
    smooth_frac = uniform_filter1d(high_fracs, size=12)
    smooth_ent = uniform_filter1d(entropies, size=12)

    # ── Panel A: Depth complexity over time ──────────────────────────────
    ax_a = fig.add_subplot(gs[0, 0])

    ax_a.fill_between(indices, mean_grads, alpha=0.12, color=CYAN)
    ax_a.plot(indices, mean_grads, color=CYAN, alpha=0.3, lw=0.5)
    ax_a.plot(indices, smooth_grad, color=CYAN, lw=2.2, alpha=0.95,
              label="Mean gradient (smoothed)")

    # Annotate high/low complexity regions
    high_thresh = np.percentile(smooth_grad, 80)
    low_thresh = np.percentile(smooth_grad, 20)

    high_mask = smooth_grad > high_thresh
    low_mask = smooth_grad < low_thresh

    # Fill regions
    ax_a.fill_between(indices, smooth_grad, high_thresh,
                       where=high_mask, alpha=0.2, color=YELLOW,
                       label="Dense scaffolding zones")
    ax_a.fill_between(indices, low_thresh, smooth_grad,
                       where=low_mask, alpha=0.15, color=MAGENTA,
                       label="Open area zones")

    ax_a.axhline(high_thresh, color=YELLOW, ls="--", lw=1, alpha=0.5)
    ax_a.axhline(low_thresh, color=MAGENTA, ls="--", lw=1, alpha=0.5)

    ax_a.set_xlabel("Frame Index")
    ax_a.set_ylabel("Mean Gradient Magnitude")
    ax_a.set_title("(a)  Depth Complexity Over Time — Structural Density Proxy",
                    fontweight="bold", color=YELLOW)
    ax_a.set_xlim(0, indices[-1])
    ax_a.legend(loc="upper right", framealpha=0.85, edgecolor="#3a3a5e",
                facecolor=PANEL_BG)
    ax_a.grid(False)

    # ── Panel B: Horizontal band decomposition ──────────────────────────
    ax_b = fig.add_subplot(gs[0, 1])

    band_colors = {
        "Upper (sky/distance)": MAGENTA,
        "Middle (structures)": CYAN,
        "Lower (ground/near)": YELLOW,
    }

    for name, vals in band_results.items():
        vals_arr = np.array(vals)
        smoothed = uniform_filter1d(vals_arr, size=12)
        ax_b.plot(indices, smoothed, color=band_colors[name], lw=2, alpha=0.85,
                  label=f"{name} (mean={vals_arr.mean():.1f})")

    # Highlight band crossovers
    upper = uniform_filter1d(np.array(band_results["Upper (sky/distance)"]), size=12)
    lower = uniform_filter1d(np.array(band_results["Lower (ground/near)"]), size=12)
    # When lower > upper significantly, worker is looking at close-range structure
    looking_down = lower > upper * 1.3
    ax_b.fill_between(indices, ax_b.get_ylim()[0] if ax_b.get_ylim()[0] > 0 else 0,
                       np.max(lower) * 0.1,
                       where=looking_down, alpha=0.08, color=YELLOW,
                       transform=ax_b.get_xaxis_transform())

    ax_b.set_xlabel("Frame Index")
    ax_b.set_ylabel("Mean Gradient per Band")
    ax_b.set_title("(b)  Vertical Depth Structure — Band Decomposition",
                    fontweight="bold", color=YELLOW)
    ax_b.set_xlim(0, indices[-1])
    ax_b.legend(loc="upper right", framealpha=0.85, edgecolor="#3a3a5e",
                facecolor=PANEL_BG)
    ax_b.grid(False)

    # ── Panel C: Gradient entropy (spatial information content) ──────────
    ax_c = fig.add_subplot(gs[1, 0])

    # Dual axis: entropy + high-gradient fraction
    ax_c.plot(indices, smooth_ent, color=GREEN, lw=2, alpha=0.9,
              label="Gradient entropy")
    ax_c.set_xlabel("Frame Index")
    ax_c.set_ylabel("Gradient Entropy", color=GREEN)
    ax_c.tick_params(axis="y", colors=GREEN)

    ax_c2 = ax_c.twinx()
    ax_c2.plot(indices, smooth_frac * 100, color=YELLOW, lw=1.5, alpha=0.8,
               label="High-gradient fraction (%)")
    ax_c2.set_ylabel("High-Gradient Fraction (%)", color=YELLOW)
    ax_c2.tick_params(axis="y", colors=YELLOW)
    ax_c2.spines["right"].set_color(YELLOW)

    # Combined legend
    from matplotlib.lines import Line2D
    lines = [
        Line2D([0], [0], color=GREEN, lw=2, label=f"Entropy (mean={entropies.mean():.2f})"),
        Line2D([0], [0], color=YELLOW, lw=1.5, label=f"High-grad % (mean={high_fracs.mean()*100:.1f}%)"),
    ]
    ax_c.legend(handles=lines, loc="lower left", framealpha=0.85,
                edgecolor="#3a3a5e", facecolor=PANEL_BG)

    ax_c.set_title("(c)  Spatial Information Content — Entropy & Edge Density",
                    fontweight="bold", color=YELLOW)
    ax_c.set_xlim(0, indices[-1])
    ax_c.grid(False)
    ax_c2.grid(False)

    # ── Panel D: Phase space plot (gradient vs entropy) ──────────────────
    ax_d = fig.add_subplot(gs[1, 1])

    # Color by frame index (temporal progression)
    scatter = ax_d.scatter(mean_grads, entropies, c=indices,
                            cmap="viridis", s=12, alpha=0.6, edgecolors="none")
    cb = fig.colorbar(scatter, ax=ax_d, fraction=0.046, pad=0.04, shrink=0.85)
    cb.set_label("Frame Index (time)", fontsize=9)
    cb.ax.yaxis.set_tick_params(color="#8899aa")
    plt.setp(cb.ax.yaxis.get_ticklabels(), color="#8899aa")

    # Overlay smoothed trajectory
    ax_d.plot(smooth_grad, smooth_ent, color=CYAN, lw=1.5, alpha=0.7, zorder=3)

    # Mark start and end
    ax_d.plot(smooth_grad[0], smooth_ent[0], "o", color=GREEN, markersize=12,
              zorder=5, label="Start")
    ax_d.plot(smooth_grad[-1], smooth_ent[-1], "s", color=MAGENTA, markersize=12,
              zorder=5, label="End")

    # Label clusters
    # High gradient + high entropy = complex near-field (scaffolding)
    # Low gradient + low entropy = open area (sky/distance)
    ax_d.text(np.percentile(mean_grads, 85), np.percentile(entropies, 85),
              "Dense\nScaffolding", fontsize=9, color=YELLOW, fontweight="bold",
              ha="center", va="center",
              bbox=dict(boxstyle="round,pad=0.3", facecolor=PANEL_BG,
                        edgecolor=YELLOW, alpha=0.8))
    ax_d.text(np.percentile(mean_grads, 15), np.percentile(entropies, 15),
              "Open\nArea", fontsize=9, color=MAGENTA, fontweight="bold",
              ha="center", va="center",
              bbox=dict(boxstyle="round,pad=0.3", facecolor=PANEL_BG,
                        edgecolor=MAGENTA, alpha=0.8))

    ax_d.set_xlabel("Mean Gradient Magnitude")
    ax_d.set_ylabel("Gradient Entropy")
    ax_d.set_title("(d)  Spatial Complexity Phase Space — Gradient vs Entropy",
                    fontweight="bold", color=YELLOW)
    ax_d.legend(loc="upper left", framealpha=0.85, edgecolor="#3a3a5e",
                facecolor=PANEL_BG)
    ax_d.grid(False)

    # ── Supertitle ────────────────────────────────────────────────────────
    fig.suptitle(
        "VIMA Experiment H: Depth Gradient Analysis from Egocentric Construction Video\n"
        f"Sobel gradient depth proxy  |  {len(results)} frames  |  "
        f"Mean complexity: {mean_grads.mean():.1f}  |  Entropy range: [{entropies.min():.2f}, {entropies.max():.2f}]",
        fontsize=13, fontweight="bold", color=YELLOW, y=0.97
    )

    plt.savefig(OUT_FIG, dpi=300, bbox_inches="tight", facecolor=BG, edgecolor="none")
    print(f"\nFigure saved: {OUT_FIG}")
    plt.close()


# ══════════════════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("=" * 70)
    print("VIMA Experiment H: Depth Gradient Analysis")
    print("=" * 70)

    results, band_results = compute_gradient_metrics()
    create_figure(results, band_results)

    mean_grads = [r["mean_gradient"] for r in results]
    entropies = [r["gradient_entropy"] for r in results]
    high_fracs = [r["high_gradient_frac"] for r in results]

    print(f"\nSummary:")
    print(f"  Mean gradient:       {np.mean(mean_grads):.2f} +/- {np.std(mean_grads):.2f}")
    print(f"  Mean entropy:        {np.mean(entropies):.3f} +/- {np.std(entropies):.3f}")
    print(f"  High-grad fraction:  {np.mean(high_fracs)*100:.1f}% +/- {np.std(high_fracs)*100:.1f}%")

    # Band summary
    print(f"\n  Band decomposition (mean gradient):")
    for name, vals in band_results.items():
        print(f"    {name:>25}: {np.mean(vals):.2f} +/- {np.std(vals):.2f}")

    print("\nDone.")
