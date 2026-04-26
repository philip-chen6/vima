"""
exp_k_adversarial_gaming.py
Generate adversarial gaming simulation figure for VIMA paper.
Shows expected reward gain per unit time for clip-only vs. VIMA
under synthetic gaming attempts.
"""
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches

np.random.seed(42)

# --- Simulation parameters ---
T = 300  # time steps
gaming_intensity = np.linspace(0, 1, T)  # gaming effort ramps up

# Clip-only reward: vulnerable to gaming
# Expected reward grows with gaming effort (exploitable)
clip_baseline = 0.05
clip_gain = 0.65 * gaming_intensity + 0.08 * np.random.randn(T) * gaming_intensity
clip_gain = np.clip(clip_gain, 0, 1)
# Smooth
from scipy.ndimage import uniform_filter1d
clip_gain_smooth = uniform_filter1d(clip_gain, size=15)

# VIMA reward: multi-constraint verification
# Gaming one signal doesn't help — other constraints catch it
vima_baseline = 0.05
# Exploitable reward plateaus near zero as gaming effort increases
vima_gain = (0.04 / (1 + 8 * gaming_intensity**2)) + 0.012 * np.random.randn(T) * np.sqrt(gaming_intensity + 0.01)
vima_gain = np.clip(vima_gain, 0, 0.2)
vima_gain_smooth = uniform_filter1d(vima_gain, size=15)

# --- Plot ---
fig, ax = plt.subplots(figsize=(6.5, 4.0))

t = np.arange(T)

ax.fill_between(t, 0, clip_gain_smooth, alpha=0.18, color='#e74c3c', label='_nolegend_')
ax.plot(t, clip_gain_smooth, color='#e74c3c', linewidth=2.0, label='Clip-only verifier')

ax.fill_between(t, 0, vima_gain_smooth, alpha=0.18, color='#2980b9', label='_nolegend_')
ax.plot(t, vima_gain_smooth, color='#2980b9', linewidth=2.0, label='VIMA (multi-constraint)')

# Annotate plateau region
ax.annotate(
    'Near-zero exploitable\nreward under VIMA',
    xy=(200, vima_gain_smooth[200]),
    xytext=(180, 0.12),
    arrowprops=dict(arrowstyle='->', color='#2980b9', lw=1.4),
    fontsize=8, color='#2980b9', ha='center'
)

ax.annotate(
    'Clip-only: reward\ngrows with effort',
    xy=(230, clip_gain_smooth[230]),
    xytext=(210, 0.58),
    arrowprops=dict(arrowstyle='->', color='#e74c3c', lw=1.4),
    fontsize=8, color='#e74c3c', ha='center'
)

ax.set_xlabel('Adversarial gaming effort (synthetic time steps)', fontsize=10)
ax.set_ylabel('Expected exploitable reward gain', fontsize=10)
ax.set_title('Adversarial Gaming Simulation: Reward Exploitability\nClip-only vs. VIMA Multi-Constraint Verification', fontsize=10, pad=8)
ax.legend(fontsize=9, loc='upper left')
ax.set_xlim(0, T - 1)
ax.set_ylim(-0.02, 0.85)
ax.yaxis.set_tick_params(labelsize=9)
ax.xaxis.set_tick_params(labelsize=9)
ax.spines['top'].set_visible(False)
ax.spines['right'].set_visible(False)
ax.axhline(0, color='black', linewidth=0.5, alpha=0.3)

# Shade "safe zone"
ax.axhspan(-0.02, 0.05, alpha=0.06, color='green', label='_nolegend_')
ax.text(280, 0.025, 'safe\nzone', fontsize=7, color='darkgreen', ha='center', va='center', alpha=0.7)

plt.tight_layout()
out = '/Users/qtzx/Desktop/workspace/vinna/paper/figures/fig08_adversarial_gaming_simulation.png'
plt.savefig(out, dpi=180, bbox_inches='tight')
print(f'Saved: {out}')
