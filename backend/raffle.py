"""
Ironsite Productivity Raffle — CII wrench time → Solana payout
Demo: classify workers by P-streak, raffle weight = wrench time %, draw winners, simulate payout

Real SPL transfer: set SOLANA_PAYER_KEYPAIR (base58 private key) and SOLANA_RECIPIENT_ADDRESS
in environment. Falls back to deterministic mock if keys are absent or solana libs unavailable.
"""
import json, random, hashlib, os
from pathlib import Path
from collections import defaultdict

def _do_solana_transfer(winner: str, amount_usdc: float, seed: int) -> dict:
    """Attempt real devnet SPL transfer; fall back to deterministic mock."""
    keypair_b58 = os.environ.get("SOLANA_PAYER_KEYPAIR")
    recipient = os.environ.get("SOLANA_RECIPIENT_ADDRESS")
    if keypair_b58 and recipient:
        try:
            from solana_payout import transfer_usdc_devnet
            tx_sig = transfer_usdc_devnet(keypair_b58, recipient, amount_usdc)
            return {"tx_signature": tx_sig, "tx_link": f"https://explorer.solana.com/tx/{tx_sig}?cluster=devnet", "tx_mode": "real_devnet"}
        except Exception as e:
            print(f"[raffle] real SPL transfer failed ({e}), falling back to mock")
    mock_sig = "MOCK_" + hashlib.sha256(f"{winner}{seed}".encode()).hexdigest()[:36].upper()
    return {"tx_signature": mock_sig, "tx_link": f"https://solscan.io/tx/{mock_sig}", "tx_mode": "mock"}

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
    
    tx = _do_solana_transfer(winner, prize_pool_usdc, seed)

    raffle = {
        "winner": winner,
        "prize_usdc": prize_pool_usdc,
        "tx_signature": tx["tx_signature"],
        "tx_link": tx["tx_link"],
        "tx_mode": tx["tx_mode"],
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
