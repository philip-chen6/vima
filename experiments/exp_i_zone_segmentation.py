"""
Experiment I: Spatial Zone Segmentation
========================================
Spatial Intelligence — dividing each frame into a 4x4 grid and computing
per-zone activity intensity over time. Reveals which spatial regions of the
egocentric view concentrate the most visual change and structural complexity.

Hypothesis: Activity in a construction site is spatially non-uniform.
Certain grid zones (typically center and lower regions in egocentric
bodycam) consistently show higher activity intensity, corresponding to
the worker's primary work area. The activity distribution shifts over
time as the worker moves through different site locations.

Method:
  1. Divide each frame into a 4x4 spatial grid (16 zones)
  2. Per zone: compute activity intensity = Canny edge density +
     inter-frame absolute difference (motion proxy)
  3. Aggregate into temporal windows → zone-time heatmap
  4. Identify dominant zones and activity migration patterns

Data: 638 frames from construction bodycam
Output: /Users/qtzx/Desktop/workspace/vinna/paper/figures/exp_i_zone_segmentation.png
"""

import pathlib
import time

import cv2
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from matplotlib.colors import LinearSegmentedColormap
from scipy.ndimage import uniform_filter1d

# ── Paths ─────────────────────────────────────────────────────────────────
FRAME_DIR = pathlib.Path("/Users/qtzx/Desktop/workspace/lifebase/.runtime/agents/ironsite-cii/frames")
OUT_FIG = pathlib.Path("/Users/qtzx/Desktop/workspace/vinna/paper/figures/exp_i_zone_segmentation.png")
OUT_FIG.parent.mkdir(parents=True, exist_ok=True)

# ── Parameters ────────────────────────────────────────────────────────────
GRID_N = 4
CANNY_LOW = 50
CANNY_HIGH = 130

# ── Style ─────────────────────────────────────────────────────────────────
BG = "#1a1a2e"
PANEL_BG = "#12122a"
YELLOW = "#FFD700"
CYAN = "#00BCD4"
WHITE = "#EEEEEE"


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
# STEP 1: Compute per-zone activity intensity
# ══════════════════════════════════════════════════════════════════════════

def compute_zone_activity():
    frames = sorted(FRAME_DIR.glob("frame_*.jpg"))
    n_frames = len(frames)
    print(f"Found {n_frames} frames")

    sample = cv2.imread(str(frames[0]))
    H, W = sample.shape[:2]
    cell_h = H // GRID_N
    cell_w = W // GRID_N

    print(f"Frame: {W}x{H}, Grid: {GRID_N}x{GRID_N}, Cell: {cell_w}x{cell_h}")

    # edge_activity[row, col, frame] = edge density
    # motion_activity[row, col, frame] = inter-frame diff
    edge_activity = np.zeros((GRID_N, GRID_N, n_frames), dtype=np.float32)
    motion_activity = np.zeros((GRID_N, GRID_N, n_frames), dtype=np.float32)

    prev_gray = None
    t0 = time.time()

    for idx, fpath in enumerate(frames):
        img = cv2.imread(str(fpath))
        if img is None:
            continue
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        edges = cv2.Canny(gray, CANNY_LOW, CANNY_HIGH)

        for r in range(GRID_N):
            for c in range(GRID_N):
                y0, y1 = r * cell_h, (r + 1) * cell_h
                x0, x1 = c * cell_w, (c + 1) * cell_w

                # Edge density
                edge_activity[r, c, idx] = edges[y0:y1, x0:x1].mean() / 255.0

                # Motion (absolute difference from previous frame)
                if prev_gray is not None:
                    diff = cv2.absdiff(prev_gray[y0:y1, x0:x1], gray[y0:y1, x0:x1])
                    motion_activity[r, c, idx] = diff.mean() / 255.0

        prev_gray = gray

        if (idx + 1) % 100 == 0:
            elapsed = time.time() - t0
            print(f"  {idx+1}/{n_frames} frames ({elapsed:.1f}s)")

    elapsed = time.time() - t0
    print(f"Zone analysis complete: {n_frames} frames in {elapsed:.1f}s")

    # Combined activity = edge density + motion (normalized)
    edge_norm = edge_activity / (edge_activity.max() + 1e-8)
    motion_norm = motion_activity / (motion_activity.max() + 1e-8)
    combined = 0.5 * edge_norm + 0.5 * motion_norm

    return edge_activity, motion_activity, combined, n_frames


# ══════════════════════════════════════════════════════════════════════════
# STEP 2: Create 4-panel publication figure
# ══════════════════════════════════════════════════════════════════════════

def create_figure(edge_act, motion_act, combined, n_frames):
    setup_style()

    fig = plt.figure(figsize=(18, 13), facecolor=BG)
    gs = fig.add_gridspec(2, 2, hspace=0.33, wspace=0.28,
                          left=0.06, right=0.96, top=0.90, bottom=0.06)

    # Custom colormaps
    spatial_cmap = LinearSegmentedColormap.from_list("spatial", [
        "#1a1a2e", "#0d2b45", "#00BCD4", "#FFD700", "#FFFFFF"
    ], N=256)

    # ── Panel A: Overall zone activity heatmap (4x4 grid, summed) ────────
    ax_a = fig.add_subplot(gs[0, 0])

    mean_combined = combined.mean(axis=2)
    im_a = ax_a.imshow(mean_combined, cmap=spatial_cmap, interpolation="nearest",
                        aspect="equal")

    # Annotate cells with values
    for r in range(GRID_N):
        for c in range(GRID_N):
            val = mean_combined[r, c]
            text_color = "#1a1a2e" if val > mean_combined.max() * 0.65 else WHITE
            ax_a.text(c, r, f"{val:.3f}", ha="center", va="center",
                      fontsize=11, fontweight="bold", color=text_color)

    cb_a = fig.colorbar(im_a, ax=ax_a, fraction=0.046, pad=0.04, shrink=0.85)
    cb_a.set_label("Mean activity intensity", fontsize=9)
    cb_a.ax.yaxis.set_tick_params(color="#8899aa")
    plt.setp(cb_a.ax.yaxis.get_ticklabels(), color="#8899aa")

    # Grid labels
    zone_labels_x = ["Left", "Ctr-L", "Ctr-R", "Right"]
    zone_labels_y = ["Upper", "Mid-U", "Mid-L", "Lower"]
    ax_a.set_xticks(range(GRID_N))
    ax_a.set_yticks(range(GRID_N))
    ax_a.set_xticklabels(zone_labels_x, fontsize=9)
    ax_a.set_yticklabels(zone_labels_y, fontsize=9)

    ax_a.set_title("(a)  Mean Spatial Activity Intensity (4x4 Grid)",
                    fontweight="bold", color=YELLOW)
    ax_a.grid(False)

    # ── Panel B: Zone-Time heatmap (zones flattened to rows, frames as columns) ──
    ax_b = fig.add_subplot(gs[0, 1])

    # Reshape: 16 zones x n_frames
    n_display = min(n_frames, 638)
    zone_time = combined[:, :, :n_display].reshape(GRID_N * GRID_N, n_display)

    # Temporal downsampling for readability (average every 5 frames)
    bin_size = 5
    n_bins = n_display // bin_size
    zone_time_binned = np.zeros((GRID_N * GRID_N, n_bins))
    for b in range(n_bins):
        zone_time_binned[:, b] = zone_time[:, b*bin_size:(b+1)*bin_size].mean(axis=1)

    im_b = ax_b.imshow(zone_time_binned, cmap=spatial_cmap, aspect="auto",
                        interpolation="bilinear")

    # Zone labels on y-axis
    zone_names = []
    for r in range(GRID_N):
        for c in range(GRID_N):
            zone_names.append(f"({r},{c})")
    ax_b.set_yticks(range(GRID_N * GRID_N))
    ax_b.set_yticklabels(zone_names, fontsize=7)

    # Time labels on x-axis
    n_x_ticks = 8
    tick_positions = np.linspace(0, n_bins - 1, n_x_ticks).astype(int)
    tick_labels = [f"{int(p * bin_size)}" for p in tick_positions]
    ax_b.set_xticks(tick_positions)
    ax_b.set_xticklabels(tick_labels, fontsize=8)

    cb_b = fig.colorbar(im_b, ax=ax_b, fraction=0.046, pad=0.04, shrink=0.85)
    cb_b.set_label("Activity intensity", fontsize=9)
    cb_b.ax.yaxis.set_tick_params(color="#8899aa")
    plt.setp(cb_b.ax.yaxis.get_ticklabels(), color="#8899aa")

    ax_b.set_xlabel("Frame Index")
    ax_b.set_ylabel("Zone (row, col)")
    ax_b.set_title("(b)  Zone-Time Activity Map — Spatial Dynamics",
                    fontweight="bold", color=YELLOW)
    ax_b.grid(False)

    # ── Panel C: Top-4 zone temporal profiles ────────────────────────────
    ax_c = fig.add_subplot(gs[1, 0])

    # Rank zones by mean activity
    mean_per_zone = mean_combined.flatten()
    top4_idx = np.argsort(-mean_per_zone)[:4]

    zone_colors_list = [YELLOW, CYAN, "#FF6B9D", "#7B68EE"]
    frame_indices = np.arange(n_frames)

    for rank, zi in enumerate(top4_idx):
        r, c = zi // GRID_N, zi % GRID_N
        ts = combined[r, c, :]
        smoothed = uniform_filter1d(ts, size=15)
        label = f"Zone ({r},{c}) — mean={mean_per_zone[zi]:.3f}"
        ax_c.plot(frame_indices, smoothed, color=zone_colors_list[rank],
                  lw=2, alpha=0.85, label=label)

    # Also show the least active zone
    bottom_idx = np.argsort(mean_per_zone)[0]
    br, bc = bottom_idx // GRID_N, bottom_idx % GRID_N
    bottom_ts = combined[br, bc, :]
    bottom_smooth = uniform_filter1d(bottom_ts, size=15)
    ax_c.plot(frame_indices, bottom_smooth, color="#555577", lw=1, alpha=0.6,
              ls="--", label=f"Least active ({br},{bc}) — mean={mean_per_zone[bottom_idx]:.3f}")

    ax_c.set_xlabel("Frame Index")
    ax_c.set_ylabel("Activity Intensity (smoothed)")
    ax_c.set_title("(c)  Dominant Zone Activity Profiles Over Time",
                    fontweight="bold", color=YELLOW)
    ax_c.set_xlim(0, frame_indices[-1])
    ax_c.legend(loc="upper right", framealpha=0.85, edgecolor="#3a3a5e",
                facecolor=PANEL_BG, fontsize=8)
    ax_c.grid(False)

    # ── Panel D: Activity center-of-mass trajectory ──────────────────────
    ax_d = fig.add_subplot(gs[1, 1])

    # Compute center of mass of activity for each frame
    com_x = np.zeros(n_frames)
    com_y = np.zeros(n_frames)

    for t in range(n_frames):
        frame_activity = combined[:, :, t]
        total = frame_activity.sum()
        if total > 0:
            for r in range(GRID_N):
                for c in range(GRID_N):
                    com_y[t] += r * frame_activity[r, c]
                    com_x[t] += c * frame_activity[r, c]
            com_y[t] /= total
            com_x[t] /= total
        else:
            com_x[t] = GRID_N / 2
            com_y[t] = GRID_N / 2

    # Smooth trajectory
    com_x_smooth = uniform_filter1d(com_x, size=20)
    com_y_smooth = uniform_filter1d(com_y, size=20)

    # Color by time
    scatter = ax_d.scatter(com_x_smooth, com_y_smooth, c=frame_indices,
                            cmap="viridis", s=15, alpha=0.6, edgecolors="none",
                            zorder=2)
    # Connect with line
    ax_d.plot(com_x_smooth, com_y_smooth, color="#ffffff", lw=0.5, alpha=0.3,
              zorder=1)

    # Mark start and end
    ax_d.plot(com_x_smooth[0], com_y_smooth[0], "o", color="#2ecc71",
              markersize=14, zorder=5, label="Start")
    ax_d.plot(com_x_smooth[-1], com_y_smooth[-1], "s", color="#FF6B9D",
              markersize=14, zorder=5, label="End")

    cb_d = fig.colorbar(scatter, ax=ax_d, fraction=0.046, pad=0.04, shrink=0.85)
    cb_d.set_label("Frame Index", fontsize=9)
    cb_d.ax.yaxis.set_tick_params(color="#8899aa")
    plt.setp(cb_d.ax.yaxis.get_ticklabels(), color="#8899aa")

    # Grid zone boundaries
    for i in range(GRID_N + 1):
        ax_d.axhline(i - 0.5, color="#3a3a5e", lw=0.5, alpha=0.5)
        ax_d.axvline(i - 0.5, color="#3a3a5e", lw=0.5, alpha=0.5)

    ax_d.set_xticks(range(GRID_N))
    ax_d.set_yticks(range(GRID_N))
    ax_d.set_xticklabels(zone_labels_x, fontsize=9)
    ax_d.set_yticklabels(zone_labels_y, fontsize=9)
    ax_d.set_xlim(-0.5, GRID_N - 0.5)
    ax_d.set_ylim(GRID_N - 0.5, -0.5)  # Invert y for image-like orientation

    ax_d.set_xlabel("Horizontal Zone")
    ax_d.set_ylabel("Vertical Zone")
    ax_d.set_title("(d)  Activity Center-of-Mass Trajectory",
                    fontweight="bold", color=YELLOW)
    ax_d.legend(loc="lower right", framealpha=0.85, edgecolor="#3a3a5e",
                facecolor=PANEL_BG)
    ax_d.grid(False)

    # ── Supertitle ────────────────────────────────────────────────────────
    # Compute stats for subtitle
    top_zone = top4_idx[0]
    tr, tc = top_zone // GRID_N, top_zone % GRID_N

    fig.suptitle(
        "VINNA Experiment I: Spatial Zone Segmentation from Egocentric Construction Video\n"
        f"4x4 grid activity analysis  |  {n_frames} frames  |  "
        f"Dominant zone: ({tr},{tc})  |  Activity range: [{mean_combined.min():.3f}, {mean_combined.max():.3f}]",
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
    print("VINNA Experiment I: Spatial Zone Segmentation")
    print("=" * 70)

    edge_act, motion_act, combined, n_frames = compute_zone_activity()
    create_figure(edge_act, motion_act, combined, n_frames)

    mean_combined = combined.mean(axis=2)
    print(f"\nZone activity summary (4x4 grid):")
    for r in range(GRID_N):
        row_vals = [f"{mean_combined[r, c]:.3f}" for c in range(GRID_N)]
        print(f"  Row {r}: {' | '.join(row_vals)}")

    top_flat = np.argmax(mean_combined)
    tr, tc = top_flat // GRID_N, top_flat % GRID_N
    print(f"\n  Most active zone: ({tr},{tc}) = {mean_combined.max():.4f}")
    print(f"  Least active zone: ({np.argmin(mean_combined) // GRID_N},{np.argmin(mean_combined) % GRID_N}) = {mean_combined.min():.4f}")
    print(f"  Activity ratio (max/min): {mean_combined.max() / (mean_combined.min() + 1e-8):.1f}x")

    print("\nDone.")
