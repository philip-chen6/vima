"""
Ironsite Productivity Raffle — CII wrench time → Solana payout
Demo: classify workers by P-streak, raffle weight = wrench time %, draw winners, simulate payout
"""
import json, random, hashlib
from pathlib import Path
from collections import defaultdict

def run_raffle(classifications_path, prize_pool_usdc=100.0, seed=42):
    """
    Input: CII frame classifications with worker_id (or simulate as single worker demo)
    Output: raffle results with on-chain tx simulation
    """
    with open(classifications_path) as f:
        raw = json.load(f)
    # Support both flat list and {summary, results} format
    frames = raw if isinstance(raw, list) else raw.get("results", raw)
    
    # For demo: simulate 3 workers on the same site
    # In production: worker_id field from sensor metadata
    random.seed(seed)
    workers = ["W001", "W002", "W003"]
    worker_frames = defaultdict(list)
    
    # Assign frames to workers (demo: 3-way split)
    for i, frame in enumerate(frames):
        worker_id = workers[i % 3]
        worker_frames[worker_id].append({**frame, "worker_id": worker_id})
    
    # Compute stats per worker
    results = {}
    for worker_id, wf in worker_frames.items():
        total = len(wf)
        p = sum(1 for f in wf if f["category"] == "P")
        c = sum(1 for f in wf if f["category"] == "C")
        nc = sum(1 for f in wf if f["category"] == "NC")
        wrench_pct = round(100 * p / total, 1) if total else 0
        results[worker_id] = {
            "total_frames": total,
            "P": p, "C": c, "NC": nc,
            "wrench_time_pct": wrench_pct,
            "raffle_tickets": max(1, int(wrench_pct * 10)),  # 1 ticket per 0.1% wrench time
        }
    
    # Raffle draw
    pool = []
    for worker_id, data in results.items():
        pool.extend([worker_id] * data["raffle_tickets"])
    
    random.shuffle(pool)
    winner = pool[0]
    
    # Simulate Solana tx (mock)
    tx_sig = "5x" + hashlib.sha256(f"{winner}{seed}".encode()).hexdigest()[:40].upper()
    
    raffle = {
        "winner": winner,
        "prize_usdc": prize_pool_usdc,
        "tx_signature": tx_sig,
        "tx_link": f"https://solscan.io/tx/{tx_sig}",
        "workers": results,
        "total_tickets": len(pool),
        "winner_tickets": results[winner]["raffle_tickets"],
        "winner_odds": round(100 * results[winner]["raffle_tickets"] / len(pool), 1),
    }
    return raffle

# Run on the classifications file
cii_path = Path("/Users/qtzx/Desktop/workspace/lifebase/.runtime/agents/ironsite-cii/cii-final.json")

if not cii_path.exists():
    print("Waiting for CII pipeline to complete...")
else:
    raffle = run_raffle(cii_path)
    
    print(f"\n=== IRONSITE PRODUCTIVITY RAFFLE ===")
    print(f"Prize pool: ${raffle['prize_usdc']} USDC")
    print(f"\nWorker rankings (wrench time %):") 
    for wid, data in sorted(raffle["workers"].items(), key=lambda x: -x[1]["wrench_time_pct"]):
        print(f"  {wid}: {data['wrench_time_pct']}% productive ({data['raffle_tickets']} tickets)")
    print(f"\n🏆 WINNER: {raffle['winner']}")
    print(f"   Odds: {raffle['winner_odds']}% ({raffle['winner_tickets']}/{raffle['total_tickets']} tickets)")
    print(f"   Payout: ${raffle['prize_usdc']} USDC")
    print(f"   TX: {raffle['tx_signature']}")
    
    out = Path("/Users/qtzx/Desktop/workspace/lifebase/.runtime/agents/ironsite-raffle.json")
    with open(out, "w") as f:
        json.dump(raffle, f, indent=2)
    print(f"\nSaved: {out}")
