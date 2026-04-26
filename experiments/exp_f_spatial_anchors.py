"""
Experiment F: Spatial Anchor Detection
========================================
Spatial Intelligence — detecting key structural anchors (scaffolding joints,
material piles, equipment boundaries) from egocentric bodycam frames using
edge detection + contour analysis.

Hypothesis: A construction site can be spatially indexed by persistent
structural anchors visible across frames. Anchor density (count + area)
varies with the worker's position relative to active work zones.

Method:
  1. Canny edge detection → contour extraction per frame
  2. Filter contours by area (noise rejection) and solidity (structural shapes)
  3. Classify anchors by size: large (equipment/walls), medium (material piles),
     small (tools/rebar)
  4. Compute anchor density per frame → plot over time
  5. Spatial distribution heatmap of anchor centroids across all frames

Data: 638 frames from construction bodycam
Output: /Users/qtzx/Desktop/workspace/vinna/paper/figures/exp_f_spatial_anchors.png
"""

import pathlib
import sys
import time

import cv2
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.ticker as mticker
from matplotlib.patches import FancyBboxPatch
import numpy as np
from scipy.ndimage import uniform_filter1d

# ── Paths ─────────────────────────────────────────────────────────────────
FRAME_DIR = pathlib.Path("/Users/qtzx/Desktop/workspace/lifebase/.runtime/agents/ironsite-cii/frames")
OUT_FIG = pathlib.Path("/Users/qtzx/Desktop/workspace/vinna/paper/figures/exp_f_spatial_anchors.png")
OUT_FIG.parent.mkdir(parents=True, exist_ok=True)

# ── Parameters ────────────────────────────────────────────────────────────
CANNY_LOW = 40
CANNY_HIGH = 120
MIN_CONTOUR_AREA = 200       # px^2 — reject noise
MAX_CONTOUR_AREA = 80000     # px^2 — reject frame-spanning artifacts
SOLIDITY_THRESH = 0.25       # minimum solidity for structural shapes

# Size classification thresholds (area in px^2)
LARGE_THRESH = 8000          # equipment, walls, scaffolding sections
MEDIUM_THRESH = 2000         # material piles, stacked blocks
# below MEDIUM_THRESH = small (tools, rebar, fittings)

# ── Style ─────────────────────────────────────────────────────────────────
BG = "#1a1a2e"
PANEL_BG = "#12122a"
YELLOW = "#FFD700"
CYAN = "#00BCD4"
WHITE = "#EEEEEE"
GRID_ALPHA = 0.0  # no gridlines


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
# STEP 1: Extract anchors from all frames
# ══════════════════════════════════════════════════════════════════════════

def extract_anchors():
    frames = sorted(FRAME_DIR.glob("frame_*.jpg"))
    n_frames = len(frames)
    print(f"Found {n_frames} frames in {FRAME_DIR}")

    # Read first frame for dimensions
    sample = cv2.imread(str(frames[0]))
    H, W = sample.shape[:2]
    print(f"Frame size: {W}x{H}")

    all_results = []
    # Accumulator for centroid heatmap
    centroid_map = np.zeros((H, W), dtype=np.float32)

    t0 = time.time()
    for idx, fpath in enumerate(frames):
        img = cv2.imread(str(fpath))
        if img is None:
            continue
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        # Gaussian blur to reduce noise
        blurred = cv2.GaussianBlur(gray, (5, 5), 1.2)
        edges = cv2.Canny(blurred, CANNY_LOW, CANNY_HIGH)

        # Dilate to close small gaps
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
        edges = cv2.dilate(edges, kernel, iterations=1)

        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        n_large = 0
        n_medium = 0
        n_small = 0
        total_anchor_area = 0

        for cnt in contours:
            area = cv2.contourArea(cnt)
            if area < MIN_CONTOUR_AREA or area > MAX_CONTOUR_AREA:
                continue

            hull = cv2.convexHull(cnt)
            hull_area = cv2.contourArea(hull)
            solidity = area / hull_area if hull_area > 0 else 0
            if solidity < SOLIDITY_THRESH:
                continue

            # Classify by size
            if area >= LARGE_THRESH:
                n_large += 1
            elif area >= MEDIUM_THRESH:
                n_medium += 1
            else:
                n_small += 1

            total_anchor_area += area

            # Centroid for heatmap
            M = cv2.moments(cnt)
            if M["m00"] > 0:
                cx = int(M["m10"] / M["m00"])
                cy = int(M["m01"] / M["m00"])
                # Gaussian splat around centroid
                sigma = max(10, int(np.sqrt(area) / 3))
                y_lo = max(0, cy - 3 * sigma)
                y_hi = min(H, cy + 3 * sigma)
                x_lo = max(0, cx - 3 * sigma)
                x_hi = min(W, cx + 3 * sigma)
                for y in range(y_lo, y_hi, 2):
                    for x in range(x_lo, x_hi, 2):
                        d2 = (y - cy) ** 2 + (x - cx) ** 2
                        centroid_map[y, x] += np.exp(-d2 / (2 * sigma ** 2))

        total_anchors = n_large + n_medium + n_small
        all_results.append({
            "frame_idx": idx,
            "total": total_anchors,
            "large": n_large,
            "medium": n_medium,
            "small": n_small,
            "total_area": total_anchor_area,
            "coverage": total_anchor_area / (H * W),
        })

        if (idx + 1) % 100 == 0:
            elapsed = time.time() - t0
            print(f"  {idx+1}/{n_frames} frames ({elapsed:.1f}s)")

    elapsed = time.time() - t0
    print(f"Anchor extraction complete: {n_frames} frames in {elapsed:.1f}s")
    return all_results, centroid_map, H, W


# ══════════════════════════════════════════════════════════════════════════
# STEP 2: Create 4-panel publication figure
# ══════════════════════════════════════════════════════════════════════════

def create_figure(results, centroid_map, H, W):
    setup_style()

    fig = plt.figure(figsize=(18, 13), facecolor=BG)
    gs = fig.add_gridspec(2, 2, hspace=0.33, wspace=0.28,
                          left=0.06, right=0.96, top=0.90, bottom=0.06)

    frame_indices = np.array([r["frame_idx"] for r in results])
    totals = np.array([r["total"] for r in results])
    larges = np.array([r["large"] for r in results])
    mediums = np.array([r["medium"] for r in results])
    smalls = np.array([r["small"] for r in results])
    coverages = np.array([r["coverage"] for r in results])

    # Smooth with 15-frame window
    smooth_total = uniform_filter1d(totals.astype(float), size=15)
    smooth_large = uniform_filter1d(larges.astype(float), size=15)
    smooth_medium = uniform_filter1d(mediums.astype(float), size=15)
    smooth_small = uniform_filter1d(smalls.astype(float), size=15)
    smooth_cov = uniform_filter1d(coverages.astype(float), size=15)

    # ── Panel A: Anchor count time series (stacked by size) ──────────────
    ax_a = fig.add_subplot(gs[0, 0])

    ax_a.fill_between(frame_indices, 0, smooth_large,
                       color=YELLOW, alpha=0.7, label="Large (equipment/walls)")
    ax_a.fill_between(frame_indices, smooth_large, smooth_large + smooth_medium,
                       color=CYAN, alpha=0.6, label="Medium (material piles)")
    ax_a.fill_between(frame_indices, smooth_large + smooth_medium,
                       smooth_large + smooth_medium + smooth_small,
                       color="#7B68EE", alpha=0.5, label="Small (tools/fittings)")

    ax_a.plot(frame_indices, smooth_total, color=WHITE, lw=1.5, alpha=0.9,
              label="Total anchors")

    ax_a.set_xlabel("Frame Index")
    ax_a.set_ylabel("Anchor Count (smoothed)")
    ax_a.set_title("(a)  Spatial Anchor Density Over Time", fontweight="bold", color=YELLOW)
    ax_a.set_xlim(0, frame_indices[-1])
    ax_a.legend(loc="upper right", framealpha=0.85, edgecolor="#3a3a5e",
                facecolor=PANEL_BG)
    ax_a.grid(False)

    # ── Panel B: Centroid heatmap (spatial distribution) ─────────────────
    ax_b = fig.add_subplot(gs[0, 1])

    # Normalize and apply log transform for visibility
    cmap_data = centroid_map.copy()
    cmap_data = np.log1p(cmap_data)
    # Downsample for display
    scale = 2
    cmap_small = cv2.resize(cmap_data, (W // scale, H // scale))

    from matplotlib.colors import LinearSegmentedColormap
    spatial_cmap = LinearSegmentedColormap.from_list("spatial", [
        "#1a1a2e", "#0d2b45", "#00BCD4", "#FFD700", "#FFFFFF"
    ], N=256)

    im = ax_b.imshow(cmap_small, cmap=spatial_cmap, aspect="auto",
                      interpolation="bilinear")
    cb = fig.colorbar(im, ax=ax_b, fraction=0.046, pad=0.04, shrink=0.85)
    cb.set_label("Anchor density (log scale)", fontsize=9)
    cb.ax.yaxis.set_tick_params(color="#8899aa")
    plt.setp(cb.ax.yaxis.get_ticklabels(), color="#8899aa")

    ax_b.set_title("(b)  Spatial Anchor Distribution (All Frames)", fontweight="bold", color=YELLOW)
    ax_b.set_xlabel("Pixel x")
    ax_b.set_ylabel("Pixel y")
    ax_b.grid(False)

    # ── Panel C: Coverage fraction over time ─────────────────────────────
    ax_c = fig.add_subplot(gs[1, 0])

    ax_c.fill_between(frame_indices, 0, smooth_cov * 100,
                       color=CYAN, alpha=0.35)
    ax_c.plot(frame_indices, smooth_cov * 100, color=CYAN, lw=2, alpha=0.9)

    # Mark high-complexity and low-complexity zones
    high_thresh = np.percentile(smooth_cov, 80) * 100
    low_thresh = np.percentile(smooth_cov, 20) * 100
    ax_c.axhline(high_thresh, color=YELLOW, ls="--", lw=1, alpha=0.7,
                  label=f"P80 = {high_thresh:.1f}%")
    ax_c.axhline(low_thresh, color="#e74c3c", ls="--", lw=1, alpha=0.7,
                  label=f"P20 = {low_thresh:.1f}%")

    # Annotate dense scaffolding vs open areas
    high_mask = smooth_cov * 100 > high_thresh
    transitions = np.diff(high_mask.astype(int))
    starts = np.where(transitions == 1)[0]
    ends = np.where(transitions == -1)[0]
    for s in starts[:5]:
        ax_c.axvline(frame_indices[s], color=YELLOW, alpha=0.3, lw=0.8)

    ax_c.set_xlabel("Frame Index")
    ax_c.set_ylabel("Anchor Coverage (%)")
    ax_c.set_title("(c)  Structural Coverage — Dense vs Open Zones", fontweight="bold", color=YELLOW)
    ax_c.set_xlim(0, frame_indices[-1])
    ax_c.legend(loc="upper right", framealpha=0.85, edgecolor="#3a3a5e",
                facecolor=PANEL_BG)
    ax_c.grid(False)

    # ── Panel D: Size-class ratio evolution ──────────────────────────────
    ax_d = fig.add_subplot(gs[1, 1])

    # Compute ratios (avoid division by zero)
    total_smooth = smooth_large + smooth_medium + smooth_small
    total_smooth_safe = np.where(total_smooth > 0.5, total_smooth, 0.5)

    ratio_large = smooth_large / total_smooth_safe
    ratio_medium = smooth_medium / total_smooth_safe
    ratio_small = smooth_small / total_smooth_safe

    ax_d.stackplot(frame_indices, ratio_large, ratio_medium, ratio_small,
                    colors=[YELLOW, CYAN, "#7B68EE"],
                    alpha=0.7,
                    labels=["Large structures", "Medium objects", "Small details"])

    ax_d.set_xlabel("Frame Index")
    ax_d.set_ylabel("Proportion")
    ax_d.set_title("(d)  Anchor Size-Class Composition Over Time", fontweight="bold", color=YELLOW)
    ax_d.set_xlim(0, frame_indices[-1])
    ax_d.set_ylim(0, 1)
    ax_d.legend(loc="center right", framealpha=0.85, edgecolor="#3a3a5e",
                facecolor=PANEL_BG)
    ax_d.grid(False)

    # ── Supertitle ────────────────────────────────────────────────────────
    fig.suptitle(
        "VIMA Experiment F: Spatial Anchor Detection from Egocentric Construction Video\n"
        f"Contour-based anchor extraction  |  {len(results)} frames  |  "
        f"Mean anchors/frame: {totals.mean():.1f}  |  Mean coverage: {coverages.mean()*100:.1f}%",
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
    print("VIMA Experiment F: Spatial Anchor Detection")
    print("=" * 70)

    results, centroid_map, H, W = extract_anchors()
    create_figure(results, centroid_map, H, W)

    # Summary stats
    totals = [r["total"] for r in results]
    covs = [r["coverage"] for r in results]
    print(f"\nSummary:")
    print(f"  Mean anchors/frame: {np.mean(totals):.1f} +/- {np.std(totals):.1f}")
    print(f"  Mean coverage:      {np.mean(covs)*100:.2f}%")
    print(f"  Max anchors:        {np.max(totals)} (frame {np.argmax(totals)})")
    print(f"  Min anchors:        {np.min(totals)} (frame {np.argmin(totals)})")
    print("\nDone.")
