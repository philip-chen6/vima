# VINNA Adversarial Review -- R1

**Reviewer:** Opus 4.6 (adversarial academic reviewer, simulating top-tier CVPR/NeurIPS PC member)
**Date:** April 25, 2026
**Paper:** "VINNA: Verifiable Spatial Intelligence for Construction Safety Reward Attribution"
**Versions examined:** main.tex (vinna/paper/), paper_v2.tex, paper_v3.tex, intro_v3.tex, experiments.tex, reward_formalization.tex (research_pack), all prior adversarial reviews (R1-R3), resolution documents, reward_ledger.json, evidence_manifest.json, exp2_summary.json, exp4_reward_results.json
**Scope:** Comprehensive adversarial pass for workshop submission readiness

---

## Overall Recommendation: REJECT (Weak) -- Revise and Resubmit

**Score: 4/10** for current workshop submission. Rises to **7-8/10** with the specific fixes enumerated below.

The system idea is genuinely interesting and the "classifier as witness, not judge" framing is original. But the paper in its current form has a fatal gap between what it claims and what it demonstrates. Every experiment is either trivially small (n=22), prospective (Exp 2), or purely theoretical (Exp 3). The paper reads like a hackathon report that has been dressed up in conference formatting -- the intellectual scaffolding is there, but the empirical foundation is missing.

---

## I. TECHNICAL SOUNDNESS

### 1. The central claim is unsupported by data

The paper claims: "spatial anchoring is not an accuracy improvement over clip-only classification -- it is a prerequisite for any reward system that must resist adversarial gaming."

This is a strong, interesting claim. The problem: **no experiment in the paper tests it.** There is no condition where clip-only rewards are issued and compared against spatially-anchored rewards. The only empirical experiment (Exp 1) runs clip-only classification and reports descriptive statistics. Experiment 2, which would actually test the claim, is described as future work. Experiment 3, the gaming resistance analysis, uses assumed probabilities (p_fake is hypothesized, not measured) and produces a theoretical bound, not an empirical one.

A reviewer at CVPR/NeurIPS will read the abstract, note the strong claim, flip to the experiments section, and see that the claim is never tested. This is a desk-reject trigger.

**Fix:** Either run Experiment 2 (even a minimal pilot: 1 annotator, 19 frames, 2 conditions -- takes 2 hours) or reframe the abstract from "we show" to "we propose and prototype." The former is strongly preferred.

### 2. CII classification numbers are internally inconsistent across the paper ecosystem

The paper reports CII results from multiple sources that contradict each other:

| Source | P | C | NC | n | Classifier |
|--------|---|---|----|----|------------|
| paper_v2.tex Table 2 (clip-only) | 9.1% (2) | 54.5% (12) | 36.4% (8) | 22 | Claude vision |
| main.tex (v1) embedding analysis | 86% Gemini P | -- | -- | 638 | Gemini Embedding 2 |
| exp2_summary.json (full video) | 85.9% (110) | 0% (0) | 14.1% (18) | 128 | feature proxy |
| exp4_reward_results.json | 86.7% (26) | 0% (4) | 13.3% (4) | 30 | CII-fixed agent |
| paper_v3.tex Table 2 | 9.1% (2) | 54.5% (12) | 36.4% (8) | 22 | Claude vision |

**The inconsistency is stark.** On the first 44 seconds, Claude vision classifies 9.1% as Productive. On the full video, feature proxies classify 85.9% as Productive. On a 30-frame sample, the CII agent finds 86.7% Productive. These are not reconcilable. The paper uses whichever number suits the current argument:

- The 9.1% P rate is used to argue "the early segment is setup, so P is low" and motivate spatial anchoring.
- The 86% P rate from exp2_summary.json shows the full video is overwhelmingly Productive but is never reported in the paper.
- The 0% Contributory rate in the full-video analysis (exp2_summary.json) completely contradicts the 54.5% C rate from the 22-frame Claude analysis.

A reviewer who notices this will question every number in the paper. The paper must reconcile these numbers or explain the discrepancy (different classifiers, different temporal segments, different taxonomies).

**Fix:** Add a reconciliation table showing all CII analyses side-by-side with explicit methodology notes. The 22-frame Claude analysis used a 3-class prompt on the first 44 seconds. The 128-frame proxy analysis used feature thresholds on the full video. The 30-frame CII-fixed analysis used a corrected agent on a different sample. State which is the canonical result and why.

### 3. The five-stage verification protocol has never been executed end-to-end

The paper's central architectural contribution is a five-stage gate: (1) source reference integrity, (2) spatial anchor presence, (3) model witness labeling, (4) human ground-truth confirmation, (5) adversarial review.

Current execution state:
- Gate 1: Implemented (frame hashes exist)
- Gate 2: Partially implemented (3/12 windows have COLMAP anchors)
- Gate 3: Partially implemented (1/12 windows has VLM labels)
- Gate 4: **Never executed** (all windows show `human_gt_label: ""`)
- Gate 5: **Never executed** (all show `adversarial_decision: not_reviewed`)

All 12 windows are in `blocked_until_human_gt` state. Zero rewards have been issued. The system has never actually verified anything. The paper presents a design specification as a contribution, which is acceptable at a workshop only if framed as such. The current framing ("we implement...") overpromises.

**Fix:** Either execute the protocol on at least 3-5 windows (have one team member label them, run the adversarial check) or explicitly reframe: "We implement gates 1-3 and specify gates 4-5 for future deployment."

### 4. Reward formalization has contradictory reduction factors

The reward_formalization.tex computes a 2.1x reduction in false rewards. The intro_v3.tex and experiments.tex claim a 200x reduction. The paper_v3.tex Experiment 3 claims the same 200x. These come from different models:

- The 2.1x uses S=0.613, p_H=0.972, p_A=0.80 (realistic but modest)
- The 200x uses p_s=0.05, p_vlm=0.30, p_h=0.10 (optimistic adversarial assumptions)

The 200x number is the headline claim. It depends critically on p_s=0.05 (probability an attacker forges a COLMAP-consistent spatial anchor), which is **assumed, not measured.** If p_s=0.30 (attacker can sometimes stand in front of a textured wall and produce valid SfM), the reduction drops to ~33x. If p_s=0.50 (attacker has good conditions), it drops to ~6.7x.

The paper's headline number is driven by its least-supported assumption.

**Fix:** Present both the conservative (2.1x) and optimistic (200x) bounds. State clearly: "Under conservative assumptions (p_s = 0.613), the reduction is 2.1x; under our adversarial model (p_s = 0.05), it reaches 200x. Measuring p_s empirically requires a deception study, which we leave to future work." The range is more honest and more useful than a single headline number.

---

## II. NOVELTY

### 5. Safe-Construct differentiation is critically weak

Safe-Construct (Chharia et al., CVPRW 2025) reframes construction safety violation detection as a 3D multi-view engagement task. The current paper cites it and says VINNA shares its "geometry-first philosophy." This is a novelty suicide note.

The actual differences are real and significant but unstated:

**(a) Task frame.** Safe-Construct detects safety violations (binary: safe/unsafe per code). VINNA attributes productivity rewards (P/C/NC with financial payout). These have completely different adversarial threat models. Nobody games a safety violation detector -- workers are not paid for being flagged unsafe. Workers absolutely game a reward system.

**(b) Adversarial model.** Safe-Construct assumes benign camera operators and ground-truth labels. VINNA explicitly models a financially-motivated adversary. This is a novel threat model for construction AI.

**(c) Output type.** Safe-Construct outputs a classification. VINNA outputs a cryptographically signed evidence ledger entry that is the input to an on-chain reward contract. The evidence record, not the classification, is the contribution.

**(d) Camera model.** Safe-Construct uses synchronized multi-view camera rigs. VINNA uses a single egocentric headcam -- the realistic wearable constraint. Monocular SfM on a moving sequence is structurally harder than multi-view with known baselines.

**(e) Reward layer.** Safe-Construct has no financial incentive integration. VINNA closes the loop from evidence to raffle/payout.

The paper must state these differences explicitly in a differentiation paragraph. Without it, a reviewer who knows Safe-Construct will reject on novelty grounds.

**Fix:** Add a 4-5 sentence differentiation paragraph after the Safe-Construct citation in Related Work. Example:

> "Unlike Safe-Construct, VINNA targets a fundamentally different task: productivity reward attribution under adversarial gaming incentives. Where Safe-Construct operates on multi-view synchronized rigs with trusted camera operators, VINNA runs on a single egocentric headcam worn by a financially-motivated actor who may attempt to game the reward system. The output is not a violation classification but a cryptographically linked evidence ledger that serves as the direct input to an on-chain reward contract. This evidence-to-payout pipeline, the adversarial threat model it addresses, and the monocular constraint it operates under have no analog in prior construction safety work."

### 6. The verifiable reward framing borrows heavily from DeepSeek-R1 / GRPO without sufficient domain-specific novelty

The paper cites DeepSeek-R1 and GRPO for binary verifiable rewards, then applies the concept to construction. This is fine as domain transfer, but the paper needs to articulate what is new in the construction domain that was not needed in math/code verification:

- In math/code, the verifier is an automated checker (compiler, proof assistant). In construction, the verifier is a multi-gate evidence chain including a human. What does this imply for reward design?
- In math/code, gaming is impossible (the answer is either correct or not). In construction, gaming is the primary threat. What new reward structure does this require?

The paper gestures at these differences but never crystallizes them.

**Fix:** Add a paragraph in the Verifiable Reward Systems subsection that explicitly states what is novel about applying verifiable rewards to physical labor vs. symbolic verification tasks.

---

## III. EXPERIMENTAL RIGOR

### 7. n=22, one annotator, zero statistical tests

The CII classification experiment uses 22 frames, classified by a single model (Claude vision), with no inter-rater reliability, no confidence intervals, no hypothesis tests. The Wilson 95% CI for P=9.1% at n=22 is [1.6%, 27.8%]. Reporting "9.1%" to one decimal implies precision the sample cannot support.

Moreover, the 22 frames are sampled at 2-second intervals from a 44-second segment. They are temporally correlated -- adjacent frames show the same activity. The effective sample size is far smaller than 22, perhaps 3-5 independent activity segments.

**Fix:** (a) Report Wilson confidence intervals. (b) State the effective sample size given temporal autocorrelation. (c) Add a second annotator (even a VLM like Gemini) to compute inter-rater agreement. (d) Sample across the full video, not just the first 44 seconds.

### 8. COLMAP statistics from one video, one scene, one lighting condition

The 61.3% registration rate is reported as though it characterizes construction footage generally. It characterizes one 62-second segment of one masonry video in one lighting condition. The rate could be 90% for a tower camera on a sunny day, or 20% for a headcam in a dark interior.

**Fix:** Scope the claim: "On our prototype scene (outdoor masonry, 640x480, headcam), COLMAP achieved 61.3% registration." Do not generalize.

### 9. Missing baselines

The paper compares VINNA against nothing. Essential missing baselines:

**(a) Clip-only VLM classification without spatial anchoring** -- this is the obvious ablation. Run the same classification on the same frames without COLMAP anchoring and compare reviewer agreement (if human study is run) or at minimum report the classification distribution.

**(b) Existing construction activity recognition** -- Akhavian & Behzadan (2016) did smartphone-based CII activity recognition. How does VINNA's CII accuracy compare? Even a qualitative positioning table would help.

**(c) Commercial systems** -- Procore, OpenSpace, Buildots do construction monitoring. A qualitative comparison table (VINNA vs. Procore vs. OpenSpace on criteria: on-device?, evidence-anchored?, adversarial model?) would position the contribution.

**Fix:** Add at minimum baseline (a) as an ablation and baseline (c) as a positioning table.

### 10. Missing ablations

No ablation study isolates the contribution of each component:
- What is the marginal value of the COLMAP spatial anchor? (Run without it.)
- What is the marginal value of VLM semantic annotations? (Run without them.)
- What is the marginal value of hashing? (This is trivial -- hashing prevents tampering but does not improve accuracy.)
- What happens with different frame sampling rates (every 1s, 5s, 10s)?

**Fix:** At minimum, report Experiment 1 results with and without spatial context to justify the spatial anchoring requirement.

---

## IV. WRITING QUALITY

### 11. The paper is well-written for a hackathon paper but needs tightening for workshop

Positives:
- The abstract in paper_v3.tex is much improved over v1.
- The "classifier as witness, not judge" framing is clear and memorable.
- The limitations section is honest.
- The evidence ledger JSON listing is effective exposition.

Negatives:
- The paper has two identities. main.tex (original v1) is about OSHA binary compliance rewards, Gemini embeddings, LiDAR fusion, and cosine similarity analysis. paper_v2/v3 is about evidence-anchored productivity reward attribution, COLMAP, Qwen VLM, and Solana raffle. These are different papers. The final submission must be one or the other, not a merge.
- Some prose is overconfident: "We argue that spatial anchoring is... a prerequisite" is a strong claim for a system that has never verified a single window.
- The Solana raffle component is mentioned as a contribution but never evaluated. No contract is deployed, no transaction exists, no gas analysis is performed. It is vaporware.
- Figure paths use relative paths like `../../output/vinna-paper/figures/` which will break on compilation.
- The $171B figure in the abstract has no citation in paper_v2/v3 (it is cited in main.tex v1 as Liberty Mutual 2023).

### 12. The paper_v3.tex (the latest) has not integrated critical components

paper_v3.tex uses the same content as paper_v2.tex -- neither integrates related_work.tex (the good one with Safe-Construct, Ego-Exo4D, etc.), experiments.tex (the improved experiment writeup), intro_v3.tex (the security-framing intro), or reward_formalization.tex. These exist as separate files but are not `\input{}`'d. The actually-submitted paper_v3.tex has a Related Work section that is weaker than the standalone related_work.tex.

**Fix:** Integrate all improved sections into a single compilable paper.

---

## V. IRONSITE DATASET

### 13. The Ironsite dataset is not citable

The paper uses "Ironsite dataset" and references `01_production_masonry.mp4` as though it is a publicly available dataset. But:
- There is no citation for Ironsite in any bibliography.
- There is no URL, DOI, arXiv ID, or institutional link.
- There is no data access statement.

A reviewer who cannot access the dataset cannot verify any result. This is a reproducibility blocker.

**Fix:** Add one of: (a) "Ironsite is a proprietary dataset provided under NDA by [company]." (b) "The Ironsite dataset was provided as part of the HackTech 2026 challenge and is available to registered participants at [URL]." (c) A proper citation with access information.

---

## VI. SPECIFIC ACTIONABLE FIXES (Priority-Ordered)

| # | Fix | Urgency | Effort | Impact |
|---|-----|---------|--------|--------|
| 1 | Run minimal pilot study (1 annotator, 19 frames, 2 conditions) to produce any empirical support for H1 | BLOCKER | 2 hrs | Transforms paper from "system proposal" to "system with preliminary evidence" |
| 2 | Add Safe-Construct differentiation paragraph (4-5 sentences) | BLOCKER | 20 min | Prevents novelty rejection |
| 3 | Add Ironsite dataset access statement | BLOCKER | 5 min | Prevents reproducibility rejection |
| 4 | Reconcile CII numbers across sources (add reconciliation table or pick canonical result) | CRITICAL | 45 min | Prevents internal inconsistency rejection |
| 5 | Integrate all improved sections (related_work.tex, intro_v3.tex, experiments.tex, reward_formalization.tex) into one compilable paper | CRITICAL | 2 hrs | Produces a paper that is the best version of itself |
| 6 | Add clip-only ablation baseline | HIGH | 30 min | Provides minimal comparative evidence |
| 7 | Present both conservative (2.1x) and optimistic (200x) gaming reduction bounds with explicit assumptions | HIGH | 30 min | Honest and more persuasive than a single number |
| 8 | Add construction productivity literature citations (Akhavian & Behzadan, Golparvar-Fard D4AR, Barnes work sampling) | HIGH | 30 min | Required for domain credibility |
| 9 | Add Wilson confidence intervals for CII percentages; note effective sample size | MEDIUM | 15 min | Statistical honesty |
| 10 | Fix figure paths to be compilation-safe | MEDIUM | 10 min | Required for compilation |
| 11 | Remove or demote Solana raffle from contribution list to future work unless a testnet transaction is shown | MEDIUM | 15 min | Removes vaporware claim |
| 12 | Add $171B citation (Liberty Mutual 2023) | LOW | 5 min | Citation hygiene |
| 13 | Add qualitative comparison table vs. Procore/OpenSpace/Buildots | LOW | 30 min | Positioning |
| 14 | Discuss SLAM vs. batch SfM for the on-device deployment claim | LOW | 15 min | Completeness |

---

## VII. STRENGTHS (Acknowledged)

1. **The "classifier as witness, not judge" framing is genuinely novel.** This is a real conceptual contribution to how construction AI systems should be designed. It deserves a paper.
2. **The evidence ledger schema is well-designed.** Per-window cryptographic hashes, spatial anchors, explicit review states, and adversarial flags are sound engineering.
3. **The adversarial threat model is novel for construction.** Modeling a financially-motivated worker gaming a reward system is not addressed by Safe-Construct or any prior construction safety work.
4. **The limitations section is unusually honest.** The paper acknowledges most of its problems, which is better than most workshop papers.
5. **The OSHA reward function table (osha_table.tex) is a useful standalone artifact.** 30 OSHA rules mapped to binary VLM-answerable questions with specific CFR citations -- this has independent value.
6. **The related_work.tex (standalone) is thorough and well-positioned.** The coverage of SpatialVLM, Ego-Exo4D, and blockchain-for-construction is good.

---

## VIII. VERDICT

The paper has a good idea trapped inside an incomplete execution. The system design -- evidence-anchored rewards, multiplicative gate structure, adversarial flags, cryptographic hashing -- is original and addresses a real gap in construction AI. But the paper overclaims relative to its evidence: it says "verifiable" in the title but has never verified a window, claims a "200x gaming reduction" based on assumed probabilities, and presents a 22-frame analysis as its primary empirical result.

For workshop acceptance, the paper needs: (1) any empirical evidence that spatial anchoring changes reviewer behavior, (2) clear differentiation from Safe-Construct, and (3) honest scoping of its claims to match its prototype's actual execution state. All three are achievable in a day of focused work. Do them.

**Confidence: 5/5** -- I have read the paper across all versions, the data artifacts, the prior reviews and resolutions, and the ground-truth experimental outputs.
