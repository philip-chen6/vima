#!/usr/bin/env python3
# uv run demo_driver.py
# scripted demo: fires detection events to bounty backend at preset timestamps.
# use this during the 90-sec hackathon demo when you don't want to depend on live CV.
# VINNA backend (port 8766) must be running first.

import time, requests, json, socket
from datetime import datetime

BACKEND = "http://localhost:8766"
DETECTIONS = [
    # (delay_seconds, label)
    (3,  "Loose scaffold on Level 3 — east wing"),
    (18, "Unprotected edge near stairwell B"),
    (35, "PPE violation: no hard hat detected in zone 4"),
]

def get_local_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    s.connect(("8.8.8.8", 80)); ip = s.getsockname()[0]; s.close(); return ip

def banner(msg, width=60):
    print("\n" + "="*width)
    print(f"  {msg}")
    print("="*width)

def run_demo():
    banner("VINNA BOUNTY DEMO DRIVER")
    print(f"Backend: {BACKEND}")
    print(f"Local IP: {get_local_ip()}")
    print(f"Judges: send {len(DETECTIONS)} bounties over ~{DETECTIONS[-1][0]+5}s")
    print("\nPress ENTER to start the demo...")
    input()

    start = time.time()
    fired = []

    for delay, label in DETECTIONS:
        now = time.time() - start
        wait = delay - now
        if wait > 0:
            print(f"\n[{datetime.now().strftime('%H:%M:%S')}] waiting {wait:.1f}s for next detection...")
            time.sleep(wait)

        print(f"\n🚨 DETECTION: {label}")
        r = requests.post(f"{BACKEND}/bounty/create", json={"description": label}, timeout=5)
        d = r.json()
        bid = d["bounty_id"]
        claim_url = d["claim_url"]
        qr_url = d["qr_url"]
        fired.append(bid)

        print(f"   Bounty ID:  {bid}")
        print(f"   Claim URL:  {claim_url}")
        print(f"   QR Code:    {qr_url}")
        print(f"   Reward:     {d['reward_sol']} SOL")
        print(f"\n   ↑ Show this QR on screen — judge scans with phone")

    print(f"\n{'='*60}")
    print("All detection events fired. Monitoring claims...")
    print(f"Dashboard: {BACKEND}/")
    print("CTRL+C to stop.\n")

    # monitor until all bounties have ≥1 claim
    try:
        while True:
            time.sleep(3)
            state = requests.get(f"{BACKEND}/state", timeout=5).json()
            total_claims = len(state["recent_claims"])
            balance = state["balance_sol"]
            print(f"\r[{datetime.now().strftime('%H:%M:%S')}] {total_claims} claims | {balance:.4f} SOL remaining", end="", flush=True)

            # if 2+ claims and not drawn — suggest raffle
            confirmed = [c for c in state["recent_claims"] if c["status"] == "confirmed"]
            if len(confirmed) >= 2 and not any(b["drawn"] for b in state["bounties"]):
                print(f"\n\n🎲 READY TO DRAW RAFFLE — {len(confirmed)} confirmed claims!")
                first_bid = fired[0]
                print(f"Run: curl -X POST {BACKEND}/raffle/draw/{first_bid}")
    except KeyboardInterrupt:
        print("\n\nDemo ended.")

if __name__ == "__main__":
    run_demo()
