"""
Experiment J: Egocentric Trajectory Estimation
=================================================
Spatial Intelligence — estimating camera movement direction and speed from
optical flow between consecutive frames. Reconstructs a 2D trajectory
showing the worker's approximate path through the construction site.

Hypothesis: Dense optical flow between consecutive egocentric frames encodes
the camera's translational motion. By averaging flow vectors (with central
weighting to reduce rotational bias), we can estimate frame-to-frame
displacement and reconstruct a 2D trajectory that reflects the worker's
movement through the site. Trajectory patterns (loops, stationary periods,
linear traversals) correspond to different work activities.

Method:
  1. Dense Farneback optical flow between consecutive frames
  2. Weighted median flow vector (central pixels weighted more heavily
     to reduce rotational flow contamination from egocentric camera)
  3. Accumulate displacement → 2D trajectory
  4. Compute speed profile, heading changes, stationary detection
  5. Plot trajectory, speed profile, heading distribution

Data: 638 frames from construction bodycam
Output: /Users/qtzx/Desktop/workspace/vinna/paper/figures/exp_j_trajectory.png
"""

import pathlib
import time

import cv2
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import numpy as np
from scipy.ndimage import uniform_filter1d

# ── Paths ─────────────────────────────────────────────────────────────────
FRAME_DIR = pathlib.Path("/Users/qtzx/Desktop/workspace/lifebase/.runtime/agents/ironsite-cii/frames")
OUT_FIG = pathlib.Path("/Users/qtzx/Desktop/workspace/vinna/paper/figures/exp_j_trajectory.png")
OUT_FIG.parent.mkdir(parents=True, exist_ok=True)

# ── Style ─────────────────────────────────────────────────────────────────
BG = "#1a1a2e"
PANEL_BG = "#12122a"
YELLOW = "#FFD700"
CYAN = "#00BCD4"
WHITE = "#EEEEEE"
GREEN = "#2ecc71"
MAGENTA = "#FF6B9D"

# Farneback parameters
FARNEBACK_PARAMS = dict(
    pyr_scale=0.5,
    levels=4,
    winsize=15,
    iterations=3,
    poly_n=5,
    poly_sigma=1.2,
    flags=0,
)

# Stationary threshold (pixels/frame)
STATIONARY_THRESH = 1.5


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
# STEP 1: Compute optical flow and estimate displacement
# ══════════════════════════════════════════════════════════════════════════

def compute_trajectory():
    frames = sorted(FRAME_DIR.glob("frame_*.jpg"))
    n_frames = len(frames)
    print(f"Found {n_frames} frames")

    sample = cv2.imread(str(frames[0]))
    H, W = sample.shape[:2]

    # Central weighting mask (Gaussian, emphasizes center of frame)
    # Center pixels are more reliable for translation estimation
    # (edges dominated by rotational flow)
    cy, cx = H // 2, W // 2
    Y, X = np.ogrid[:H, :W]
    sigma_y, sigma_x = H // 4, W // 4
    weight_mask = np.exp(-((Y - cy) ** 2 / (2 * sigma_y ** 2) +
                           (X - cx) ** 2 / (2 * sigma_x ** 2)))
    weight_mask = weight_mask.astype(np.float32)

    displacements = []  # (dx, dy) per frame pair
    speeds = []
    headings = []

    prev_gray = None
    t0 = time.time()

    for idx, fpath in enumerate(frames):
        img = cv2.imread(str(fpath))
        if img is None:
            continue

        # Downsample for speed (half resolution)
        img_small = cv2.resize(img, (W // 2, H // 2))
        gray = cv2.cvtColor(img_small, cv2.COLOR_BGR2GRAY)

        if prev_gray is not None:
            flow = cv2.calcOpticalFlowFarneback(
                prev_gray, gray, None, **FARNEBACK_PARAMS
            )

            # Weighted mean flow (center-weighted)
            w_small = cv2.resize(weight_mask, (W // 2, H // 2))
            w_sum = w_small.sum()

            # Flow is in (dx, dy) format
            dx = float(np.sum(flow[..., 0] * w_small) / w_sum)
            dy = float(np.sum(flow[..., 1] * w_small) / w_sum)

            # Negate because optical flow is inverse of camera motion
            # (scene moves left → camera moved right)
            dx, dy = -dx, -dy

            speed = np.sqrt(dx ** 2 + dy ** 2)
            heading = np.arctan2(dy, dx)

            displacements.append((dx, dy))
            speeds.append(speed)
            headings.append(heading)
        else:
            displacements.append((0, 0))
            speeds.append(0)
            headings.append(0)

        prev_gray = gray

        if (idx + 1) % 100 == 0:
            elapsed = time.time() - t0
            print(f"  {idx+1}/{n_frames} frames ({elapsed:.1f}s)")

    elapsed = time.time() - t0
    print(f"Optical flow trajectory complete: {n_frames} frames in {elapsed:.1f}s")

    # Accumulate trajectory
    trajectory_x = np.cumsum([d[0] for d in displacements])
    trajectory_y = np.cumsum([d[1] for d in displacements])

    return (np.array(displacements), np.array(speeds), np.array(headings),
            trajectory_x, trajectory_y)


# ══════════════════════════════════════════════════════════════════════════
# STEP 2: Classify motion phases
# ══════════════════════════════════════════════════════════════════════════

def classify_motion(speeds):
    """Classify frames into stationary / walking / rapid movement."""
    smoothed = uniform_filter1d(speeds, size=10)
    phases = np.empty(len(speeds), dtype="U12")
    for i in range(len(speeds)):
        if smoothed[i] < STATIONARY_THRESH:
            phases[i] = "Stationary"
        elif smoothed[i] < STATIONARY_THRESH * 3:
            phases[i] = "Walking"
        else:
            phases[i] = "Rapid"
    return phases


# ══════════════════════════════════════════════════════════════════════════
# STEP 3: Create 4-panel publication figure
# ══════════════════════════════════════════════════════════════════════════

def create_figure(displacements, speeds, headings, traj_x, traj_y, phases):
    setup_style()

    fig = plt.figure(figsize=(18, 13), facecolor=BG)
    gs = fig.add_gridspec(2, 2, hspace=0.33, wspace=0.28,
                          left=0.06, right=0.96, top=0.90, bottom=0.06)

    n_frames = len(speeds)
    frame_indices = np.arange(n_frames)
    smooth_speed = uniform_filter1d(speeds, size=12)

    phase_colors = {
        "Stationary": "#FF4444",
        "Walking": CYAN,
        "Rapid": YELLOW,
    }

    # ── Panel A: 2D Trajectory ───────────────────────────────────────────
    ax_a = fig.add_subplot(gs[0, 0])

    # Color by time (frame index)
    scatter = ax_a.scatter(traj_x, traj_y, c=frame_indices, cmap="viridis",
                            s=8, alpha=0.65, edgecolors="none", zorder=2)

    # Smoothed trajectory line
    traj_x_smooth = uniform_filter1d(traj_x, size=10)
    traj_y_smooth = uniform_filter1d(traj_y, size=10)
    ax_a.plot(traj_x_smooth, traj_y_smooth, color="#ffffff", lw=0.8, alpha=0.35, zorder=1)

    # Mark start and end
    ax_a.plot(traj_x[0], traj_y[0], "o", color=GREEN, markersize=14,
              zorder=5, label="Start (frame 0)")
    ax_a.plot(traj_x[-1], traj_y[-1], "s", color=MAGENTA, markersize=14,
              zorder=5, label="End (frame {})".format(n_frames - 1))

    # Mark stationary clusters
    stat_mask = phases == "Stationary"
    stat_runs = []
    run_start = None
    for i in range(len(stat_mask)):
        if stat_mask[i] and run_start is None:
            run_start = i
        elif not stat_mask[i] and run_start is not None:
            if i - run_start > 15:  # only mark long stationary periods
                stat_runs.append((run_start, i))
            run_start = None
    if run_start is not None and len(phases) - run_start > 15:
        stat_runs.append((run_start, len(phases)))

    for sr, se in stat_runs[:5]:
        mid = (sr + se) // 2
        ax_a.plot(traj_x[mid], traj_y[mid], "D", color=YELLOW, markersize=10,
                  alpha=0.8, zorder=4, markeredgecolor="#1a1a2e", markeredgewidth=1)

    cb_a = fig.colorbar(scatter, ax=ax_a, fraction=0.046, pad=0.04, shrink=0.85)
    cb_a.set_label("Frame Index", fontsize=9)
    cb_a.ax.yaxis.set_tick_params(color="#8899aa")
    plt.setp(cb_a.ax.yaxis.get_ticklabels(), color="#8899aa")

    ax_a.set_xlabel("Cumulative X Displacement (px)")
    ax_a.set_ylabel("Cumulative Y Displacement (px)")
    ax_a.set_title("(a)  Estimated 2D Trajectory Through Construction Site",
                    fontweight="bold", color=YELLOW)
    ax_a.set_aspect("equal")
    ax_a.legend(loc="upper left", framealpha=0.85, edgecolor="#3a3a5e",
                facecolor=PANEL_BG)
    ax_a.grid(False)

    # ── Panel B: Speed profile with phase coloring ───────────────────────
    ax_b = fig.add_subplot(gs[0, 1])

    # Background color bands for motion phases
    for i in range(n_frames - 1):
        color = phase_colors.get(phases[i], "#555555")
        ax_b.axvspan(frame_indices[i], frame_indices[i+1], alpha=0.1,
                      color=color, zorder=0)

    ax_b.plot(frame_indices, speeds, color=CYAN, alpha=0.25, lw=0.5)
    ax_b.plot(frame_indices, smooth_speed, color=CYAN, lw=2.2, alpha=0.95)

    # Threshold lines
    ax_b.axhline(STATIONARY_THRESH, color="#FF4444", ls="--", lw=1, alpha=0.6,
                  label=f"Stationary threshold ({STATIONARY_THRESH} px/frame)")
    ax_b.axhline(STATIONARY_THRESH * 3, color=YELLOW, ls="--", lw=1, alpha=0.6,
                  label=f"Rapid threshold ({STATIONARY_THRESH * 3} px/frame)")

    # Phase legend
    phase_patches = [
        mpatches.Patch(facecolor="#FF4444", alpha=0.4, label="Stationary"),
        mpatches.Patch(facecolor=CYAN, alpha=0.4, label="Walking"),
        mpatches.Patch(facecolor=YELLOW, alpha=0.4, label="Rapid movement"),
    ]
    ax_b.legend(handles=phase_patches, loc="upper right", framealpha=0.85,
                edgecolor="#3a3a5e", facecolor=PANEL_BG)

    # Phase distribution annotation
    n_stat = (phases == "Stationary").sum()
    n_walk = (phases == "Walking").sum()
    n_rapid = (phases == "Rapid").sum()
    ax_b.text(0.02, 0.97,
              f"Stationary: {n_stat} ({n_stat/n_frames*100:.0f}%)\n"
              f"Walking:    {n_walk} ({n_walk/n_frames*100:.0f}%)\n"
              f"Rapid:      {n_rapid} ({n_rapid/n_frames*100:.0f}%)",
              transform=ax_b.transAxes, fontsize=8, va="top", ha="left",
              bbox=dict(boxstyle="round,pad=0.4", facecolor=PANEL_BG,
                        edgecolor=CYAN, alpha=0.9),
              fontfamily="monospace", color=WHITE)

    ax_b.set_xlabel("Frame Index")
    ax_b.set_ylabel("Speed (px/frame)")
    ax_b.set_title("(b)  Movement Speed Profile with Motion Phase Classification",
                    fontweight="bold", color=YELLOW)
    ax_b.set_xlim(0, frame_indices[-1])
    ax_b.grid(False)

    # ── Panel C: Heading rose diagram ────────────────────────────────────
    ax_c = fig.add_subplot(gs[1, 0], projection="polar")
    ax_c.set_facecolor(PANEL_BG)

    # Only use headings where speed > stationary threshold (meaningful motion)
    moving_mask = speeds > STATIONARY_THRESH
    moving_headings = headings[moving_mask]

    n_bins = 16
    theta_bins = np.linspace(-np.pi, np.pi, n_bins + 1)
    counts, _ = np.histogram(moving_headings, bins=theta_bins)

    # Normalize to fractions
    counts_frac = counts / counts.sum() if counts.sum() > 0 else counts
    bar_width = 2 * np.pi / n_bins * 0.85
    theta_centers = (theta_bins[:-1] + theta_bins[1:]) / 2

    bars = ax_c.bar(theta_centers, counts_frac, width=bar_width,
                     color=CYAN, alpha=0.7, edgecolor=CYAN, linewidth=0.5)

    # Highlight dominant direction
    dominant_idx = np.argmax(counts_frac)
    bars[dominant_idx].set_facecolor(YELLOW)
    bars[dominant_idx].set_alpha(0.9)

    ax_c.set_theta_zero_location("N")
    ax_c.set_theta_direction(-1)
    direction_labels = ["N", "", "NE", "", "E", "", "SE", "",
                        "S", "", "SW", "", "W", "", "NW", ""]
    ax_c.set_xticks(theta_centers)
    ax_c.set_xticklabels(direction_labels, fontsize=8)
    ax_c.tick_params(axis="y", labelsize=7, colors="#667788")
    ax_c.grid(True, alpha=0.2, color="#2a2a3a")

    ax_c.set_title("(c)  Movement Heading Distribution\n(moving frames only)",
                    fontweight="bold", color=YELLOW, pad=20)

    # ── Panel D: Displacement components over time ───────────────────────
    ax_d = fig.add_subplot(gs[1, 1])

    dx_arr = np.array([d[0] for d in displacements])
    dy_arr = np.array([d[1] for d in displacements])

    dx_smooth = uniform_filter1d(dx_arr, size=15)
    dy_smooth = uniform_filter1d(dy_arr, size=15)

    ax_d.plot(frame_indices, dx_smooth, color=CYAN, lw=2, alpha=0.85,
              label="X displacement (lateral)")
    ax_d.plot(frame_indices, dy_smooth, color=YELLOW, lw=2, alpha=0.85,
              label="Y displacement (forward/back)")
    ax_d.axhline(0, color="#555577", lw=0.8, alpha=0.5)

    # Highlight rapid movement sections
    rapid_mask = phases == "Rapid"
    ax_d.fill_between(frame_indices, ax_d.get_ylim()[0] if len(ax_d.get_ylim()) > 0 else -5,
                       0, where=rapid_mask, alpha=0.08, color=YELLOW,
                       transform=ax_d.get_xaxis_transform(),
                       label="Rapid movement")

    ax_d.set_xlabel("Frame Index")
    ax_d.set_ylabel("Displacement (px/frame)")
    ax_d.set_title("(d)  Lateral vs Forward Displacement Components",
                    fontweight="bold", color=YELLOW)
    ax_d.set_xlim(0, frame_indices[-1])
    ax_d.legend(loc="lower left", framealpha=0.85, edgecolor="#3a3a5e",
                facecolor=PANEL_BG)
    ax_d.grid(False)

    # ── Supertitle ────────────────────────────────────────────────────────
    total_dist = np.sum(speeds)
    net_disp = np.sqrt(traj_x[-1] ** 2 + traj_y[-1] ** 2)
    linearity = net_disp / (total_dist + 1e-8)

    fig.suptitle(
        "VINNA Experiment J: Egocentric Trajectory Estimation from Construction Bodycam\n"
        f"Optical flow displacement  |  {n_frames} frames  |  "
        f"Total path: {total_dist:.0f} px  |  Net displacement: {net_disp:.0f} px  |  "
        f"Linearity: {linearity:.3f}",
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
    print("VINNA Experiment J: Egocentric Trajectory Estimation")
    print("=" * 70)

    displacements, speeds, headings, traj_x, traj_y = compute_trajectory()
    phases = classify_motion(speeds)

    print(f"\nMotion phase summary:")
    for phase in ["Stationary", "Walking", "Rapid"]:
        n = (phases == phase).sum()
        print(f"  {phase:>12}: {n:>4} frames ({n/len(phases)*100:.1f}%)")

    print(f"\nTrajectory stats:")
    total_dist = np.sum(speeds)
    net_disp = np.sqrt(traj_x[-1] ** 2 + traj_y[-1] ** 2)
    print(f"  Total path length:  {total_dist:.1f} px")
    print(f"  Net displacement:   {net_disp:.1f} px")
    print(f"  Linearity ratio:    {net_disp / (total_dist + 1e-8):.4f}")
    print(f"  Mean speed:         {speeds.mean():.2f} +/- {speeds.std():.2f} px/frame")
    print(f"  Max speed:          {speeds.max():.2f} px/frame")

    create_figure(displacements, speeds, headings, traj_x, traj_y, phases)
    print("\nDone.")
