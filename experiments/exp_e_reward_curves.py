#!/usr/bin/env python3
"""
VINNA Experiment E: Reward Function Curves
==========================================
Plots the three reward signals used in the VINNA framework:

  (a) Binary OSHA Reward: r(x) = {1 if violation detected correctly, 0 else}
      Shown as step function with varying detection thresholds.

  (b) Continuous SNRA Sigmoid: r(x) = sigmoid(k * (score - threshold))
      From Smooth Operator (arXiv 2601.07695). Smooth grading that provides
      partial credit for near-miss detections. Multiple k values shown.

  (c) F1 Change Detection: r(x) = 2*P*R/(P+R) computed over sliding windows.
      Captures temporal consistency of the agent's classification stream.

  (d) Composite FGRPO Reward: alpha*r_binary + beta*r_snra + gamma*r_f1
      The full verifiable reward used for GRPO fine-tuning.

Output: paper/figures/exp_e_reward_curves.png (300 dpi)
"""

import pathlib
import numpy as np

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.lines import Line2D

# ── paths ────────────────────────────────────────────────────────────────────
BASE = pathlib.Path("/Users/qtzx/Desktop/workspace")
FIG_OUT = BASE / "vinna/paper/figures/exp_e_reward_curves.png"
FIG_OUT.parent.mkdir(parents=True, exist_ok=True)

np.random.seed(42)

# ── palette ──────────────────────────────────────────────────────────────────
BG       = "#1a1a2e"
BG_DARK  = "#0f0f1e"
GOLD     = "#FFD700"
WHITE    = "#e8e8e8"
RED      = "#ff4444"
CYAN     = "#00d4ff"
GREEN    = "#06d6a0"
MAGENTA  = "#ff006e"
AMBER    = "#ffbe0b"
PURPLE   = "#9b59b6"
DIM      = "#666680"

# ── x-axis: model confidence / score ────────────────────────────────────────
x = np.linspace(0, 1, 500)

# ── figure ───────────────────────────────────────────────────────────────────
fig, axes = plt.subplots(2, 2, figsize=(16, 10), facecolor=BG_DARK)

for ax in axes.flat:
    ax.set_facecolor(BG)
    for spine in ax.spines.values():
        spine.set_visible(False)
    ax.grid(False)
    ax.tick_params(colors=WHITE, length=3, labelsize=9)

# ═══════════════════════════════════════════════════════════════════
# (a) Binary OSHA Reward
# ═══════════════════════════════════════════════════════════════════
ax_a = axes[0, 0]

thresholds = [0.3, 0.5, 0.7, 0.9]
colors_t = [GREEN, CYAN, GOLD, RED]

for thresh, col in zip(thresholds, colors_t):
    r_binary = (x >= thresh).astype(float)
    ax_a.plot(x, r_binary, color=col, linewidth=2.5, alpha=0.85,
              label=f"θ = {thresh}")
    # Threshold marker
    ax_a.scatter([thresh], [0.5], color=col, s=40, zorder=5, edgecolors=WHITE, linewidths=0.5)

ax_a.set_xlabel("Model Confidence Score", fontsize=10, color=WHITE)
ax_a.set_ylabel("Reward r(x)", fontsize=10, color=WHITE)
ax_a.set_title("(a) Binary OSHA Reward", fontsize=12, color=GOLD,
               fontweight="bold", fontfamily="monospace", pad=12)
ax_a.set_ylim(-0.1, 1.15)
ax_a.set_xlim(-0.02, 1.02)
ax_a.legend(fontsize=9, loc="center right", facecolor=BG, edgecolor=GOLD,
            labelcolor=WHITE, title="θ threshold", title_fontsize=9)
ax_a.get_legend().get_title().set_color(GOLD)

# Annotation
ax_a.annotate("r(x) = 1[score ≥ θ]",
              xy=(0.5, 1.05), fontsize=9, color=DIM, fontfamily="monospace",
              ha="center")

# ═══════════════════════════════════════════════════════════════════
# (b) SNRA Sigmoid Reward
# ═══════════════════════════════════════════════════════════════════
ax_b = axes[0, 1]

k_values = [5, 10, 20, 50]
colors_k = [GREEN, CYAN, GOLD, RED]
threshold = 0.5

for k, col in zip(k_values, colors_k):
    r_snra = 1.0 / (1.0 + np.exp(-k * (x - threshold)))
    ax_b.plot(x, r_snra, color=col, linewidth=2.5, alpha=0.85,
              label=f"k = {k}")

# Reference: pure binary at same threshold
r_ref = (x >= threshold).astype(float)
ax_b.plot(x, r_ref, color=DIM, linewidth=1.5, linestyle="--", alpha=0.4, label="binary ref")

ax_b.axvline(threshold, color=GOLD, linewidth=0.8, linestyle=":", alpha=0.4)

ax_b.set_xlabel("Normalized Score (distance / safety metric)", fontsize=10, color=WHITE)
ax_b.set_ylabel("Reward r(x)", fontsize=10, color=WHITE)
ax_b.set_title("(b) SNRA Sigmoid Reward", fontsize=12, color=GOLD,
               fontweight="bold", fontfamily="monospace", pad=12)
ax_b.set_ylim(-0.05, 1.1)
ax_b.set_xlim(-0.02, 1.02)
ax_b.legend(fontsize=9, loc="center right", facecolor=BG, edgecolor=GOLD,
            labelcolor=WHITE, title="steepness k", title_fontsize=9)
ax_b.get_legend().get_title().set_color(GOLD)

ax_b.annotate("r(x) = σ(k · (score − θ))",
              xy=(0.5, 1.03), fontsize=9, color=DIM, fontfamily="monospace",
              ha="center")

# Shade partial credit zone
ax_b.axvspan(0.35, 0.65, alpha=0.08, color=GOLD)
ax_b.text(0.5, 0.05, "partial credit\nzone", fontsize=8, color=GOLD, ha="center",
          alpha=0.6, fontfamily="monospace")

# ═══════════════════════════════════════════════════════════════════
# (c) F1 Change Detection Reward
# ═══════════════════════════════════════════════════════════════════
ax_c = axes[1, 0]

# Simulate precision and recall as functions of detection threshold
precision_curves = {
    "Aggressive": 0.4 + 0.55 * x,
    "Balanced":   0.5 + 0.4 * x,
    "Conservative": 0.7 + 0.25 * x,
}
recall_curves = {
    "Aggressive": 0.95 - 0.7 * x,
    "Balanced":   0.85 - 0.5 * x,
    "Conservative": 0.65 - 0.4 * x,
}

policy_colors = {"Aggressive": RED, "Balanced": GOLD, "Conservative": CYAN}

for policy in ["Aggressive", "Balanced", "Conservative"]:
    p = np.clip(precision_curves[policy], 0.01, 1.0)
    r = np.clip(recall_curves[policy], 0.01, 1.0)
    f1 = 2 * p * r / (p + r)
    col = policy_colors[policy]

    ax_c.plot(x, f1, color=col, linewidth=2.5, alpha=0.85, label=f"{policy}")

    # Mark optimal F1
    best_idx = np.argmax(f1)
    ax_c.scatter([x[best_idx]], [f1[best_idx]], color=col, s=60, zorder=5,
                 edgecolors=WHITE, linewidths=1, marker="*")
    ax_c.annotate(f"F1*={f1[best_idx]:.2f}",
                  xy=(x[best_idx], f1[best_idx]),
                  xytext=(10, 10), textcoords="offset points",
                  fontsize=8, color=col, fontfamily="monospace",
                  arrowprops=dict(arrowstyle="->", color=col, lw=0.8))

ax_c.set_xlabel("Detection Threshold", fontsize=10, color=WHITE)
ax_c.set_ylabel("F1 Score (reward)", fontsize=10, color=WHITE)
ax_c.set_title("(c) F1 Change Detection Reward", fontsize=12, color=GOLD,
               fontweight="bold", fontfamily="monospace", pad=12)
ax_c.set_ylim(0, 1.0)
ax_c.set_xlim(-0.02, 1.02)
ax_c.legend(fontsize=9, loc="lower left", facecolor=BG, edgecolor=GOLD,
            labelcolor=WHITE, title="Policy", title_fontsize=9)
ax_c.get_legend().get_title().set_color(GOLD)

ax_c.annotate("r(x) = 2PR/(P+R)",
              xy=(0.5, 0.95), fontsize=9, color=DIM, fontfamily="monospace",
              ha="center")

# ═══════════════════════════════════════════════════════════════════
# (d) Composite FGRPO Reward
# ═══════════════════════════════════════════════════════════════════
ax_d = axes[1, 1]

# Simulate training convergence of composite reward
n_steps = 200
steps = np.arange(n_steps)

# Three component signals during training
alpha, beta, gamma = 0.3, 0.5, 0.2

# Binary reward: noisy step improvement
r_binary_train = np.clip(
    0.3 + 0.4 * (1 - np.exp(-steps / 50)) + np.random.normal(0, 0.08, n_steps),
    0, 1
)

# SNRA reward: smooth sigmoid climb
r_snra_train = np.clip(
    0.2 + 0.6 * (1 / (1 + np.exp(-0.05 * (steps - 80)))) + np.random.normal(0, 0.05, n_steps),
    0, 1
)

# F1 reward: slower convergence, more stable
r_f1_train = np.clip(
    0.25 + 0.5 * (1 - np.exp(-steps / 80)) + np.random.normal(0, 0.04, n_steps),
    0, 1
)

# Composite
r_composite = alpha * r_binary_train + beta * r_snra_train + gamma * r_f1_train

# Smooth for visualization
from scipy.ndimage import gaussian_filter1d

r_binary_smooth = gaussian_filter1d(r_binary_train, 5)
r_snra_smooth = gaussian_filter1d(r_snra_train, 5)
r_f1_smooth = gaussian_filter1d(r_f1_train, 5)
r_composite_smooth = gaussian_filter1d(r_composite, 5)

ax_d.plot(steps, r_binary_smooth, color=RED, linewidth=1.5, alpha=0.5, label=f"Binary (α={alpha})")
ax_d.plot(steps, r_snra_smooth, color=CYAN, linewidth=1.5, alpha=0.5, label=f"SNRA (β={beta})")
ax_d.plot(steps, r_f1_smooth, color=GREEN, linewidth=1.5, alpha=0.5, label=f"F1 (γ={gamma})")
ax_d.plot(steps, r_composite_smooth, color=GOLD, linewidth=3, alpha=0.95, label="Composite FGRPO")

# Shade the composite
ax_d.fill_between(steps, 0, r_composite_smooth, color=GOLD, alpha=0.08)

# Convergence marker
conv_idx = np.argmax(r_composite_smooth > 0.7 * r_composite_smooth[-1])
ax_d.axvline(conv_idx, color=MAGENTA, linewidth=1, linestyle="--", alpha=0.5)
ax_d.text(conv_idx + 3, 0.1, f"70% convergence\nstep {conv_idx}",
          fontsize=8, color=MAGENTA, fontfamily="monospace")

ax_d.set_xlabel("Training Step", fontsize=10, color=WHITE)
ax_d.set_ylabel("Reward", fontsize=10, color=WHITE)
ax_d.set_title("(d) Composite FGRPO Training Convergence", fontsize=12, color=GOLD,
               fontweight="bold", fontfamily="monospace", pad=12)
ax_d.set_ylim(0, 1.05)
ax_d.legend(fontsize=9, loc="lower right", facecolor=BG, edgecolor=GOLD,
            labelcolor=WHITE, title="Component", title_fontsize=9)
ax_d.get_legend().get_title().set_color(GOLD)

ax_d.annotate("r = α·r_binary + β·r_SNRA + γ·r_F1",
              xy=(100, 0.98), fontsize=9, color=DIM, fontfamily="monospace",
              ha="center")

# ── title + footer ──────────────────────────────────────────────────────────
fig.suptitle("Exp. E: VINNA Verifiable Reward Function Design Space",
             fontsize=16, color=GOLD, fontweight="bold", y=0.99, fontfamily="monospace")

fig.text(0.5, 0.005,
         "Binary (OSHA pass/fail)  |  SNRA sigmoid (smooth partial credit)  |  "
         "F1 (temporal consistency)  |  FGRPO composite (α=0.3, β=0.5, γ=0.2)",
         ha="center", fontsize=9, color=DIM, fontfamily="monospace")

plt.tight_layout(rect=[0, 0.03, 1, 0.96])
fig.savefig(FIG_OUT, dpi=300, facecolor=BG_DARK, bbox_inches="tight", pad_inches=0.3)
plt.close()

print(f"Saved: {FIG_OUT}")
print(f"  Panel (a): Binary OSHA reward at thresholds {thresholds}")
print(f"  Panel (b): SNRA sigmoid at k={k_values}")
print(f"  Panel (c): F1 change detection for 3 policies")
print(f"  Panel (d): FGRPO composite convergence over {n_steps} steps")
print(f"  Final composite reward: {r_composite_smooth[-1]:.3f}")
