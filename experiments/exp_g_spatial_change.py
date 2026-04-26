"""
Experiment G: Frame-to-Frame Spatial Change Detection
======================================================
Spatial Intelligence — identifying moments of significant spatial change
(material moved, new structure appeared, worker repositioned) using
structural similarity (SSIM) between consecutive frames.

Hypothesis: Sharp drops in SSIM between consecutive frames correspond to
moments of spatial reconfiguration — material placement, scaffolding
repositioning, or worker transition between zones. These events can be
automatically detected as spatial change points.

Method:
  1. Compute SSIM between consecutive frames (full-frame + per-channel)
  2. Detect change events: frames where SSIM drops below adaptive threshold
  3. Classify change magnitude: major restructuring vs minor repositioning
  4. Plot SSIM timeline with detected spatial change events

Data: 638 frames from construction bodycam
Output: /Users/qtzx/Desktop/workspace/vinna/paper/figures/exp_g_spatial_change.png
"""

import pathlib
import time

import cv2
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from scipy.ndimage import uniform_filter1d
from skimage.metrics import structural_similarity as ssim

# ── Paths ─────────────────────────────────────────────────────────────────
FRAME_DIR = pathlib.Path("/Users/qtzx/Desktop/workspace/lifebase/.runtime/agents/ironsite-cii/frames")
OUT_FIG = pathlib.Path("/Users/qtzx/Desktop/workspace/vinna/paper/figures/exp_g_spatial_change.png")
OUT_FIG.parent.mkdir(parents=True, exist_ok=True)

# ── Style ─────────────────────────────────────────────────────────────────
BG = "#1a1a2e"
PANEL_BG = "#12122a"
YELLOW = "#FFD700"
CYAN = "#00BCD4"
WHITE = "#EEEEEE"
MAGENTA = "#FF6B9D"
RED = "#FF4444"


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
# STEP 1: Compute SSIM between consecutive frames
# ══════════════════════════════════════════════════════════════════════════

def compute_ssim_timeline():
    frames = sorted(FRAME_DIR.glob("frame_*.jpg"))
    n_frames = len(frames)
    print(f"Found {n_frames} frames")

    ssim_values = []
    # Also compute per-region SSIM (divide into quadrants)
    quadrant_ssim = {"TL": [], "TR": [], "BL": [], "BR": []}

    prev_gray = None
    prev_img = None

    t0 = time.time()
    for idx, fpath in enumerate(frames):
        img = cv2.imread(str(fpath))
        if img is None:
            continue
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        if prev_gray is not None:
            # Full-frame SSIM
            s = ssim(prev_gray, gray, data_range=255)
            ssim_values.append({"frame_idx": idx, "ssim": s})

            # Quadrant SSIM
            H, W = gray.shape
            mid_h, mid_w = H // 2, W // 2
            regions = {
                "TL": (slice(0, mid_h), slice(0, mid_w)),
                "TR": (slice(0, mid_h), slice(mid_w, W)),
                "BL": (slice(mid_h, H), slice(0, mid_w)),
                "BR": (slice(mid_h, H), slice(mid_w, W)),
            }
            for name, (rs, cs) in regions.items():
                qs = ssim(prev_gray[rs, cs], gray[rs, cs], data_range=255)
                quadrant_ssim[name].append(qs)

        prev_gray = gray
        prev_img = img

        if (idx + 1) % 100 == 0:
            elapsed = time.time() - t0
            print(f"  {idx+1}/{n_frames} frames ({elapsed:.1f}s)")

    elapsed = time.time() - t0
    print(f"SSIM computation complete: {len(ssim_values)} pairs in {elapsed:.1f}s")
    return ssim_values, quadrant_ssim


# ══════════════════════════════════════════════════════════════════════════
# STEP 2: Detect spatial change events
# ══════════════════════════════════════════════════════════════════════════

def detect_change_events(ssim_values):
    """Detect frames where SSIM drops significantly (adaptive threshold)."""
    vals = np.array([s["ssim"] for s in ssim_values])
    indices = np.array([s["frame_idx"] for s in ssim_values])

    # Adaptive threshold: rolling median - 2 * rolling std (window=30)
    rolling_med = uniform_filter1d(vals, size=30)
    # Rolling std via rolling variance
    rolling_var = uniform_filter1d(vals ** 2, size=30) - rolling_med ** 2
    rolling_std = np.sqrt(np.maximum(rolling_var, 0))

    major_thresh = rolling_med - 2.0 * rolling_std
    minor_thresh = rolling_med - 1.0 * rolling_std

    events = []
    # Minimum separation between events (15 frames)
    last_event_idx = -20

    for i in range(len(vals)):
        if vals[i] < major_thresh[i] and (i - last_event_idx) > 15:
            events.append({
                "frame_idx": int(indices[i]),
                "ssim": float(vals[i]),
                "threshold": float(major_thresh[i]),
                "severity": "major",
                "delta": float(rolling_med[i] - vals[i]),
            })
            last_event_idx = i
        elif vals[i] < minor_thresh[i] and (i - last_event_idx) > 15:
            events.append({
                "frame_idx": int(indices[i]),
                "ssim": float(vals[i]),
                "threshold": float(minor_thresh[i]),
                "severity": "minor",
                "delta": float(rolling_med[i] - vals[i]),
            })
            last_event_idx = i

    return events, major_thresh, minor_thresh


# ══════════════════════════════════════════════════════════════════════════
# STEP 3: Create 4-panel publication figure
# ══════════════════════════════════════════════════════════════════════════

def create_figure(ssim_values, quadrant_ssim, events, major_thresh, minor_thresh):
    setup_style()

    fig = plt.figure(figsize=(18, 13), facecolor=BG)
    gs = fig.add_gridspec(2, 2, hspace=0.33, wspace=0.28,
                          left=0.06, right=0.96, top=0.90, bottom=0.06)

    vals = np.array([s["ssim"] for s in ssim_values])
    indices = np.array([s["frame_idx"] for s in ssim_values])
    smoothed = uniform_filter1d(vals, size=10)

    major_events = [e for e in events if e["severity"] == "major"]
    minor_events = [e for e in events if e["severity"] == "minor"]

    # ── Panel A: SSIM Timeline with change events ────────────────────────
    ax_a = fig.add_subplot(gs[0, 0])

    ax_a.fill_between(indices, vals, alpha=0.15, color=CYAN)
    ax_a.plot(indices, vals, color=CYAN, alpha=0.4, lw=0.5, label="Raw SSIM")
    ax_a.plot(indices, smoothed, color=CYAN, lw=2, alpha=0.9, label="Smoothed SSIM")

    # Thresholds
    ax_a.plot(indices, major_thresh, color=RED, ls="--", lw=1, alpha=0.6,
              label="Major change threshold")
    ax_a.plot(indices, minor_thresh, color=YELLOW, ls=":", lw=1, alpha=0.5,
              label="Minor change threshold")

    # Events
    for e in major_events:
        ax_a.axvline(e["frame_idx"], color=RED, alpha=0.4, lw=1.5)
        ax_a.plot(e["frame_idx"], e["ssim"], "v", color=RED, markersize=8, zorder=5)
    for e in minor_events:
        ax_a.axvline(e["frame_idx"], color=YELLOW, alpha=0.25, lw=1)
        ax_a.plot(e["frame_idx"], e["ssim"], "v", color=YELLOW, markersize=5, zorder=5)

    ax_a.set_xlabel("Frame Index")
    ax_a.set_ylabel("SSIM")
    ax_a.set_title("(a)  Spatial Similarity Timeline with Detected Change Events",
                    fontweight="bold", color=YELLOW)
    ax_a.set_xlim(0, indices[-1])
    ax_a.legend(loc="lower left", framealpha=0.85, edgecolor="#3a3a5e",
                facecolor=PANEL_BG)
    ax_a.grid(False)

    # Stats box
    ax_a.text(0.98, 0.03,
              f"Major events: {len(major_events)}\n"
              f"Minor events: {len(minor_events)}\n"
              f"Mean SSIM: {vals.mean():.4f}\n"
              f"Std SSIM: {vals.std():.4f}",
              transform=ax_a.transAxes, fontsize=8, va="bottom", ha="right",
              bbox=dict(boxstyle="round,pad=0.4", facecolor=PANEL_BG,
                        edgecolor=YELLOW, alpha=0.9),
              fontfamily="monospace", color=WHITE)

    # ── Panel B: SSIM Distribution histogram ─────────────────────────────
    ax_b = fig.add_subplot(gs[0, 1])

    n_bins = 60
    counts, bin_edges, patches = ax_b.hist(vals, bins=n_bins, color=CYAN, alpha=0.6,
                                            edgecolor="#1a1a2e", lw=0.5)

    # Color bins below threshold differently
    global_major = np.percentile(vals, 5)
    for patch, left_edge in zip(patches, bin_edges[:-1]):
        if left_edge < global_major:
            patch.set_facecolor(RED)
            patch.set_alpha(0.8)

    ax_b.axvline(vals.mean(), color=WHITE, ls="-", lw=1.5, alpha=0.8,
                  label=f"Mean = {vals.mean():.4f}")
    ax_b.axvline(vals.mean() - 2 * vals.std(), color=RED, ls="--", lw=1,
                  alpha=0.7, label=f"Mean - 2 sigma = {vals.mean() - 2*vals.std():.4f}")

    ax_b.set_xlabel("SSIM Value")
    ax_b.set_ylabel("Frequency")
    ax_b.set_title("(b)  SSIM Distribution — Spatial Change Frequency",
                    fontweight="bold", color=YELLOW)
    ax_b.legend(loc="upper left", framealpha=0.85, edgecolor="#3a3a5e",
                facecolor=PANEL_BG)
    ax_b.grid(False)

    # ── Panel C: Quadrant SSIM comparison ────────────────────────────────
    ax_c = fig.add_subplot(gs[1, 0])

    q_colors = {"TL": YELLOW, "TR": CYAN, "BL": MAGENTA, "BR": "#7B68EE"}
    q_labels = {"TL": "Top-Left", "TR": "Top-Right", "BL": "Bottom-Left", "BR": "Bottom-Right"}

    for name in ["TL", "TR", "BL", "BR"]:
        qvals = np.array(quadrant_ssim[name])
        qsmoothed = uniform_filter1d(qvals, size=15)
        ax_c.plot(indices, qsmoothed, color=q_colors[name], lw=1.5, alpha=0.85,
                  label=f"{q_labels[name]} (mean={qvals.mean():.3f})")

    ax_c.set_xlabel("Frame Index")
    ax_c.set_ylabel("SSIM (per quadrant)")
    ax_c.set_title("(c)  Quadrant-Level Spatial Stability Analysis",
                    fontweight="bold", color=YELLOW)
    ax_c.set_xlim(0, indices[-1])
    ax_c.legend(loc="lower left", framealpha=0.85, edgecolor="#3a3a5e",
                facecolor=PANEL_BG, ncol=2)
    ax_c.grid(False)

    # ── Panel D: Change event magnitude (delta) over time ────────────────
    ax_d = fig.add_subplot(gs[1, 1])

    if events:
        e_indices = [e["frame_idx"] for e in events]
        e_deltas = [e["delta"] for e in events]
        e_colors = [RED if e["severity"] == "major" else YELLOW for e in events]
        e_sizes = [120 if e["severity"] == "major" else 50 for e in events]

        ax_d.scatter(e_indices, e_deltas, c=e_colors, s=e_sizes,
                     alpha=0.8, edgecolors="#1a1a2e", lw=0.8, zorder=3)

        # Connect with a stem plot
        for ei, ed, ec in zip(e_indices, e_deltas, e_colors):
            ax_d.plot([ei, ei], [0, ed], color=ec, alpha=0.4, lw=1.5)

        # Rolling change intensity (sum of deltas in 30-frame windows)
        if len(events) > 3:
            from scipy.interpolate import interp1d
            # Create a change intensity signal
            change_signal = np.zeros(len(indices))
            for e in events:
                loc = np.searchsorted(indices, e["frame_idx"])
                if loc < len(change_signal):
                    change_signal[loc] = e["delta"]
            change_smooth = uniform_filter1d(change_signal, size=30) * 30
            ax_d_twin = ax_d.twinx()
            ax_d_twin.fill_between(indices, change_smooth, alpha=0.15, color=CYAN)
            ax_d_twin.plot(indices, change_smooth, color=CYAN, alpha=0.5, lw=1,
                           label="Change intensity (30-frame window)")
            ax_d_twin.set_ylabel("Change Intensity", color=CYAN, fontsize=10)
            ax_d_twin.tick_params(axis="y", colors=CYAN)
            ax_d_twin.grid(False)
            ax_d_twin.spines["right"].set_color(CYAN)

    # Scatter legend
    from matplotlib.lines import Line2D
    legend_elements = [
        Line2D([0], [0], marker="o", color=BG, markerfacecolor=RED,
               markersize=10, label=f"Major event (n={len(major_events)})"),
        Line2D([0], [0], marker="o", color=BG, markerfacecolor=YELLOW,
               markersize=7, label=f"Minor event (n={len(minor_events)})"),
    ]
    ax_d.legend(handles=legend_elements, loc="upper right", framealpha=0.85,
                edgecolor="#3a3a5e", facecolor=PANEL_BG)

    ax_d.set_xlabel("Frame Index")
    ax_d.set_ylabel("Change Magnitude (SSIM delta)")
    ax_d.set_title("(d)  Spatial Change Event Magnitude and Intensity",
                    fontweight="bold", color=YELLOW)
    ax_d.set_xlim(0, indices[-1])
    ax_d.grid(False)

    # ── Supertitle ────────────────────────────────────────────────────────
    fig.suptitle(
        "VIMA Experiment G: Frame-to-Frame Spatial Change Detection\n"
        f"SSIM-based change analysis  |  {len(ssim_values)} consecutive frame pairs  |  "
        f"{len(major_events)} major + {len(minor_events)} minor spatial events detected",
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
    print("VIMA Experiment G: Frame-to-Frame Spatial Change Detection")
    print("=" * 70)

    ssim_values, quadrant_ssim = compute_ssim_timeline()
    events, major_thresh, minor_thresh = detect_change_events(ssim_values)

    print(f"\nDetected {len(events)} change events:")
    major = [e for e in events if e["severity"] == "major"]
    minor = [e for e in events if e["severity"] == "minor"]
    print(f"  Major: {len(major)}")
    print(f"  Minor: {len(minor)}")

    if major:
        print(f"\n  Top 5 largest spatial changes:")
        for e in sorted(major, key=lambda x: x["delta"], reverse=True)[:5]:
            print(f"    Frame {e['frame_idx']:>4}: SSIM={e['ssim']:.4f}, delta={e['delta']:.4f}")

    create_figure(ssim_values, quadrant_ssim, events, major_thresh, minor_thresh)
    print("\nDone.")
