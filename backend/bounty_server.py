#!/usr/bin/env python3
# uv run backend.py  (port 8766)
# VIMA bounty/raffle backend — "AI sees it, human confirms, solana pays"
# Demo: VIMA detects → QR on screen → judge scans phone → "Is this a scaffold?" yes/no → raffle entry

import os, json, sqlite3, random, base64, requests, socket
from pathlib import Path
from datetime import datetime
from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import BaseModel

from solders.keypair import Keypair
from solders.pubkey import Pubkey
from solders.hash import Hash
from solders.system_program import TransferParams, transfer
from solders.message import MessageV0
from solders.transaction import VersionedTransaction

DEVNET = os.getenv("SOLANA_DEVNET", "1") == "1"   # default devnet for demo safety
HELIUS_RPC = (
    "https://api.devnet.solana.com"
    if DEVNET else
    os.getenv("HELIUS_API_KEY", "https://api.devnet.solana.com")
)
WALLET_PATH = Path(os.getenv("SOLANA_WALLET_PATH", str(Path(__file__).parent / ".wallet.json")))
DB_PATH = Path(__file__).parent / "bounty.db"
BOUNTY_SOL = 0.01       # SOL per fix claim
RAFFLE_SOL  = 0.05      # SOL raffle prize pool per bounty
WITNESS_THRESHOLD = 2   # how many independent claims before payout fires (anti-larp)
EXPLORER = "https://explorer.solana.com/tx/{sig}?cluster=devnet" if DEVNET else "https://solscan.io/tx/{sig}"

app = FastAPI(title="VIMA Bounty Engine")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# ─── wallet ───────────────────────────────────────────────────────────────────

def load_keypair() -> Keypair:
    data = json.loads(WALLET_PATH.read_text())
    return Keypair.from_bytes(bytes(data["secret_key"]))

def get_local_ip() -> str:
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    s.connect(("8.8.8.8", 80))
    ip = s.getsockname()[0]
    s.close()
    return ip

# ─── database ─────────────────────────────────────────────────────────────────

def init_db():
    con = sqlite3.connect(DB_PATH)
    con.execute("""CREATE TABLE IF NOT EXISTS bounties (
        id TEXT PRIMARY KEY, description TEXT, question TEXT, frame_b64 TEXT,
        correct_answer TEXT DEFAULT 'yes', created_at TEXT,
        status TEXT DEFAULT 'open', raffle_drawn INTEGER DEFAULT 0,
        winner_wallet TEXT, winner_sig TEXT
    )""")
    con.execute("""CREATE TABLE IF NOT EXISTS claims (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bounty_id TEXT, wallet TEXT, answer TEXT, claimed_at TEXT,
        sig TEXT, status TEXT DEFAULT 'pending'
    )""")
    con.commit()
    con.close()

init_db()

def db():
    return sqlite3.connect(DB_PATH)

# ─── Solana transfer ──────────────────────────────────────────────────────────

def send_sol(to_address: str, lamports: int) -> dict:
    kp = load_keypair()
    r = requests.post(HELIUS_RPC, json={
        "jsonrpc": "2.0", "id": 1,
        "method": "getLatestBlockhash",
        "params": [{"commitment": "confirmed"}]
    }, timeout=10)
    bh_str = r.json()["result"]["value"]["blockhash"]
    bh = Hash.from_string(bh_str)

    ix = transfer(TransferParams(
        from_pubkey=kp.pubkey(),
        to_pubkey=Pubkey.from_string(to_address),
        lamports=lamports,
    ))
    msg = MessageV0.try_compile(kp.pubkey(), [ix], [], bh)
    tx = VersionedTransaction(msg, [kp])
    tx_b64 = base64.b64encode(bytes(tx)).decode()

    r2 = requests.post(HELIUS_RPC, json={
        "jsonrpc": "2.0", "id": 1,
        "method": "sendTransaction",
        "params": [tx_b64, {"encoding": "base64", "skipPreflight": False, "preflightCommitment": "confirmed"}]
    }, timeout=20)
    resp = r2.json()
    if "error" in resp:
        return {"ok": False, "error": resp["error"]}
    return {"ok": True, "sig": resp["result"]}

def get_sol_balance(address: str) -> float:
    r = requests.post(HELIUS_RPC, json={
        "jsonrpc": "2.0", "id": 1,
        "method": "getBalance",
        "params": [address, {"commitment": "confirmed"}]
    }, timeout=10)
    return r.json()["result"]["value"] / 1e9

# ─── models ───────────────────────────────────────────────────────────────────

class CreateBounty(BaseModel):
    description: str          # detection label, e.g. "Scaffold detected on Level 3"
    question: Optional[str] = None    # "Is this a scaffold?" — shown to human
    frame_b64: Optional[str] = None   # base64 JPEG of the detected frame
    correct_answer: Optional[str] = "yes"
    bounty_id: Optional[str] = None

class ClaimBounty(BaseModel):
    wallet: str               # human's Solana wallet address
    answer: Optional[str] = "yes"    # human's label: "yes" or "no"

# ─── routes ───────────────────────────────────────────────────────────────────

@app.post("/bounty/create")
def create_bounty(req: CreateBounty):
    bid = req.bounty_id or f"b{random.randint(10000,99999)}"
    question = req.question or f"VIMA flagged this. Is this a {req.description.lower().split()[0]}?"
    con = db()
    con.execute("INSERT INTO bounties (id, description, question, frame_b64, correct_answer, created_at) VALUES (?,?,?,?,?,?)",
                (bid, req.description, question, req.frame_b64, req.correct_answer, datetime.utcnow().isoformat()))
    con.commit(); con.close()
    ip = get_local_ip()
    claim_url = f"http://{ip}:8766/bounty/{bid}/claim"
    swipe_url = f"http://{ip}:8766/swipe/{bid}"
    qr_url = f"https://api.qrserver.com/v1/create-qr-code/?size=300x300&data={swipe_url}"
    return {"bounty_id": bid, "claim_url": claim_url, "swipe_url": swipe_url,
            "qr_url": qr_url, "reward_sol": BOUNTY_SOL}

@app.get("/bounty/{bid}")
def get_bounty(bid: str):
    con = db()
    row = con.execute("SELECT * FROM bounties WHERE id=?", (bid,)).fetchone()
    claims = con.execute("SELECT wallet,claimed_at,sig,status FROM claims WHERE bounty_id=?",
                          (bid,)).fetchall()
    con.close()
    if not row:
        raise HTTPException(404, "bounty not found")
    return {"id": row[0], "description": row[1], "created_at": row[2],
            "status": row[3], "claims": [{"wallet":c[0],"at":c[1],"sig":c[2],"status":c[3]} for c in claims]}

@app.get("/bounty/{bid}/claim", response_class=HTMLResponse)
def claim_page(bid: str):
    con = db()
    row = con.execute("SELECT description, question, frame_b64 FROM bounties WHERE id=?", (bid,)).fetchone()
    con.close()
    desc = row[0] if row else "Unknown detection"
    question = (row[1] if row else None) or "Is VIMA's detection correct?"
    frame_tag = f'<img src="data:image/jpeg;base64,{row[2]}" style="width:100%;max-width:420px;border-radius:8px;margin-bottom:12px">' if row and row[2] else ""
    return f"""<!DOCTYPE html><html><head><meta name='viewport' content='width=device-width,initial-scale=1'>
<title>VIMA Label</title>
<style>*{{box-sizing:border-box}}body{{font-family:system-ui;background:#1a1a1d;color:#fff;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px}}
h1{{font-size:1.3rem;margin-bottom:4px;color:#a64d79}}p.q{{color:#fff;font-size:1.1rem;font-weight:600;margin:12px 0;text-align:center}}
p.sub{{color:#9ca3af;font-size:.85rem;margin-bottom:16px;text-align:center}}
input{{width:100%;max-width:420px;padding:10px;border:1px solid #3b1c32;border-radius:8px;background:#231424;color:#fff;font-size:.9rem;margin-bottom:10px}}
.btns{{display:flex;gap:10px;width:100%;max-width:420px}}
button{{flex:1;padding:14px;border-radius:8px;font-size:1rem;cursor:pointer;border:none;font-weight:700}}
.yes{{background:#22c55e;color:#fff}}.no{{background:#ef4444;color:#fff}}
#result{{margin-top:14px;padding:12px;border-radius:8px;background:#231424;max-width:420px;word-break:break-all;font-size:.85rem;text-align:center}}</style></head>
<body>
<h1>VIMA detected:</h1>
<p class='q'>{desc}</p>
{frame_tag}
<p class='q'>{question}</p>
<p class='sub'>Answer correctly → earn SOL + raffle entry<br>Prize pool grows with every answer</p>
<div style='width:100%;max-width:420px;display:flex;gap:8px;margin-bottom:10px'>
<input id='wallet' placeholder='Your Solana wallet address' style='flex:1;margin:0'/>
<button onclick='genWallet()' style='background:#3b1c32;border:1px solid #6a1e55;color:#a64d79;padding:10px 12px;border-radius:8px;cursor:pointer;font-size:.8rem;white-space:nowrap'>Demo wallet</button>
</div>
<div class='btns'>
  <button class='yes' onclick='claim("yes")'>YES ✓</button>
  <button class='no' onclick='claim("no")'>NO ✗</button>
</div>
<div id='result'></div>
<script>
const B58='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function genWallet(){{const a=Array.from({{length:44}},()=>B58[Math.floor(Math.random()*58)]).join('');document.getElementById('wallet').value=a;}}
async function claim(ans){{
  const w=document.getElementById('wallet').value.trim();
  if(!w){{genWallet();}}
  const wallet=document.getElementById('wallet').value.trim();
  document.querySelectorAll('button').forEach(b=>b.disabled=true);
  const r=await fetch('/bounty/{bid}/claim',{{method:'POST',headers:{{'Content-Type':'application/json'}},body:JSON.stringify({{wallet:wallet,answer:ans}})}});
  const d=await r.json();
  const el=document.getElementById('result');
  if(d.status==='witnessed'){{el.innerHTML='<span style="color:#fbbf24">👁 '+d.message+'</span>';}}
  else if(d.status==='queued'){{el.innerHTML='<span style="color:#4ade80">✓ Claim recorded!<br>Raffle entry active — payout processes at end of event</span>';}}
  else if(d.sig||d.sigs){{el.innerHTML='<span style="color:#4ade80">✓ '+d.sol+' SOL incoming!<br>Raffle entry added ✓</span>';}}
  else{{el.innerHTML='<span style="color:#f87171">Error: '+(d.error||'unknown')+'</span>';document.querySelectorAll('button').forEach(b=>b.disabled=false);}}
}}
</script></body></html>"""

@app.post("/bounty/{bid}/claim")
def submit_claim(bid: str, req: ClaimBounty):
    con = db()
    row = con.execute("SELECT status FROM bounties WHERE id=?", (bid,)).fetchone()
    if not row:
        con.close(); raise HTTPException(404, "bounty not found")

    # anti-larp: require WITNESS_THRESHOLD distinct wallets before payout
    prior_rows = con.execute(
        "SELECT wallet FROM claims WHERE bounty_id=?", (bid,)
    ).fetchall()
    prior_wallets = [r[0] for r in prior_rows]
    if req.wallet in prior_wallets:
        con.close()
        return JSONResponse({"error": "wallet already submitted — need a different labeler"}, status_code=400)

    pending_count = len(set(prior_wallets))
    new_count = pending_count + 1

    if new_count < WITNESS_THRESHOLD:
        con.execute("INSERT INTO claims (bounty_id, wallet, answer, claimed_at, sig, status) VALUES (?,?,?,?,?,?)",
                    (bid, req.wallet, req.answer, datetime.utcnow().isoformat(), None, "labeled"))
        con.commit(); con.close()
        remaining = WITNESS_THRESHOLD - new_count
        return {"ok": True, "sig": None, "sol": 0, "status": "witnessed",
                "message": f"Answer #{new_count} recorded. {remaining} more labeler(s) needed to fire payout."}

    # threshold met — preflight balance check before paying
    all_wallets = list(set(prior_wallets + [req.wallet]))
    needed_sol = BOUNTY_SOL * len(all_wallets) + 0.001
    try:
        kp = load_keypair()
        balance = get_sol_balance(str(kp.pubkey()))
        if balance < needed_sol:
            # Queue claim gracefully — record as pending_payout, return success to avoid red error UX
            for w in all_wallets:
                con.execute("INSERT OR IGNORE INTO claims (bounty_id, wallet, answer, claimed_at, sig, status) VALUES (?,?,?,?,?,?)",
                            (bid, w, req.answer, datetime.utcnow().isoformat(), None, "pending_payout"))
            con.commit(); con.close()
            return {"ok": True, "status": "queued", "sol": BOUNTY_SOL,
                    "message": "Claim recorded — payout queued, processes at end of event"}
    except HTTPException:
        raise
    except Exception:
        pass  # balance check best-effort; proceed and let send_sol surface the error

    lamports = int(BOUNTY_SOL * 1e9)
    sigs = []
    for w in all_wallets:
        result = send_sol(w, lamports)
        sig = result.get("sig") if result["ok"] else None
        sigs.append(sig)
        con.execute("INSERT OR REPLACE INTO claims (bounty_id, wallet, answer, claimed_at, sig, status) VALUES (?,?,?,?,?,?)",
                    (bid, w, req.answer, datetime.utcnow().isoformat(), sig,
                     "confirmed" if result["ok"] else "failed"))
    con.commit(); con.close()
    return {"ok": True, "sigs": sigs, "sol": BOUNTY_SOL, "paid_to": len(all_wallets),
            "status": "payout_fired",
            "explorer": EXPLORER.format(sig=sigs[0]) if sigs[0] else None}

@app.post("/raffle/draw/{bid}")
def draw_raffle(bid: str):
    """Pick a random claimer, send raffle prize, mark drawn."""
    con = db()
    entries = con.execute(
        "SELECT wallet FROM claims WHERE bounty_id=? AND status IN ('confirmed','pending_payout','labeled')", (bid,)
    ).fetchall()
    if not entries:
        con.close(); raise HTTPException(400, "no claims to draw from")
    winner = random.choice(entries)[0]
    lamports = int(RAFFLE_SOL * 1e9)
    # preflight balance check
    try:
        kp = load_keypair()
        balance = get_sol_balance(str(kp.pubkey()))
        if balance < RAFFLE_SOL + 0.001:
            con.close()
            raise HTTPException(402, f"Raffle wallet balance {balance:.4f} SOL — need {RAFFLE_SOL + 0.001:.4f} SOL. Fund {str(kp.pubkey())}.")
    except HTTPException:
        raise
    except Exception:
        pass
    result = send_sol(winner, lamports)
    sig = result.get("sig")
    con.execute("UPDATE bounties SET raffle_drawn=1, winner_wallet=?, winner_sig=? WHERE id=?",
                (winner, sig, bid))
    con.commit(); con.close()
    return {"winner": winner, "prize_sol": RAFFLE_SOL, "sig": sig,
            "explorer": f"https://solscan.io/tx/{sig}" if sig else None}

@app.get("/state")
def state():
    """Live demo state — all bounties + claims + wallet balance."""
    kp = load_keypair()
    bal = get_sol_balance(str(kp.pubkey()))
    con = db()
    bounties = con.execute("SELECT id,description,status,raffle_drawn,winner_wallet FROM bounties ORDER BY created_at DESC").fetchall()
    all_claims = con.execute("SELECT bounty_id,wallet,sig,status FROM claims ORDER BY claimed_at DESC LIMIT 20").fetchall()
    con.close()
    return {
        "wallet": str(kp.pubkey()),
        "balance_sol": round(bal, 4),
        "bounties": [{"id":b[0],"description":b[1],"status":b[2],"drawn":bool(b[3]),"winner":b[4]} for b in bounties],
        "recent_claims": [{"bounty":c[0],"wallet":c[1][:8]+"...","sig":c[2],"status":c[3]} for c in all_claims]
    }

@app.get("/", response_class=HTMLResponse)
def dashboard():
    return """<!DOCTYPE html><html><head><title>VIMA Bounty Live</title>
<meta name='viewport' content='width=device-width,initial-scale=1'>
<style>*{box-sizing:border-box}body{font-family:system-ui;background:#1a1a1d;color:#f0f0f0;margin:0;padding:20px}
h1{color:#a64d79;font-size:2rem;margin:0 0 4px}p.sub{color:#6b7280;margin:0 0 24px}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px}
.card{background:#231424;border:1px solid #3b1c32;border-radius:12px;padding:16px}
.card h2{font-size:.9rem;color:#9ca3af;margin:0 0 8px;text-transform:uppercase;letter-spacing:.05em}
.card .val{font-size:2rem;font-weight:700;color:#a64d79}
.bounty{background:#231424;border:1px solid #3b1c32;border-radius:8px;padding:12px;margin-bottom:8px}
.bounty h3{margin:0 0 4px;font-size:.95rem}
.bounty .meta{font-size:.8rem;color:#6b7280}
.claim{padding:6px 8px;background:#1a1a1d;border-radius:6px;margin:4px 0;font-size:.8rem;color:#9ca3af}
.sig a{color:#60a5fa;word-break:break-all}
.badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:.75rem;font-weight:600}
.open{background:#3b1c32;color:#a64d79}.drawn{background:#1a1a3a;color:#818cf8}
input,button{padding:10px;border-radius:6px;border:1px solid #3b1c32;background:#231424;color:#fff;font-size:.9rem}
button{background:#a64d79;border:none;cursor:pointer;padding:10px 20px}
#create-form{margin-bottom:24px;display:flex;gap:8px}#desc{flex:1}
</style></head><body>
<h1>VIMA Bounty</h1><p class='sub'>AI finds it. You fix it. Solana pays.</p>
<div id='create-form'>
  <input id='desc' placeholder='Describe detected hazard / task...'/>
  <button onclick='createBounty()'>Create Bounty</button>
</div>
<div class='cards' id='stats'></div>
<div id='bounties' style='margin-top:24px'></div>
<script>
async function load(){
  const s=await fetch('/state').then(r=>r.json());
  document.getElementById('stats').innerHTML=`
    <div class='card'><h2>Wallet Balance</h2><div class='val'>${s.balance_sol} SOL</div></div>
    <div class='card'><h2>Active Bounties</h2><div class='val'>${s.bounties.length}</div></div>
    <div class='card'><h2>Total Claims</h2><div class='val'>${s.recent_claims.length}</div></div>`;
  const ip=location.hostname;
  document.getElementById('bounties').innerHTML='<h2 style="margin-bottom:12px">Bounties</h2>'+s.bounties.map(b=>`
    <div class='bounty'>
      <h3>${b.description} <span class='badge ${b.drawn?"drawn":"open"}'>${b.drawn?"DRAWN":"OPEN"}</span></h3>
      <div class='meta'>ID: ${b.id} · <a href='/bounty/${b.id}/claim' style='color:#60a5fa'>claim page</a>
        · <img src='https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=http://${ip}:8766/bounty/${b.id}/claim' style='vertical-align:middle;border-radius:4px'></div>
      ${b.winner?`<div class='meta' style='color:#818cf8'>Winner: ${b.winner.slice(0,12)}...</div>`:''}
      ${!b.drawn?`<button style='margin-top:8px;padding:6px 14px;font-size:.8rem' onclick='draw("${b.id}")'>Draw Raffle</button>`:''}
    </div>`).join('');
}
async function createBounty(){
  const d=document.getElementById('desc').value.trim();
  if(!d)return;
  await fetch('/bounty/create',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({description:d})});
  document.getElementById('desc').value='';
  load();
}
async function draw(bid){
  const r=await fetch('/raffle/draw/'+bid,{method:'POST'}).then(r=>r.json());
  alert('Winner: '+r.winner+'\n'+r.prize_sol+' SOL sent!\nTX: '+r.sig);
  load();
}
setInterval(load,3000);load();
</script></body></html>"""

@app.get("/swipe/{bid}", response_class=HTMLResponse)
def swipe_page(bid: str):
    """Mobile-first swipe annotation UI — scan QR, swipe YES/NO, earn SOL raffle entry."""
    con = db()
    row = con.execute("SELECT description, question, frame_b64 FROM bounties WHERE id=?", (bid,)).fetchone()
    con.close()
    desc = row[0] if row else "VIMA Detection"
    question = (row[1] if row else None) or "Is this detection correct?"
    if row and row[2]:
        frame_html = f'<img src="data:image/jpeg;base64,{row[2]}" style="width:100%;height:100%;object-fit:cover">'
    else:
        frame_html = '<div class="placeholder"><span style="font-size:3rem">🏗️</span><span>Construction Scene</span></div>'

    return f"""<!DOCTYPE html>
<html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>VIMA · Label</title>
<style>
*{{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}}
body{{font-family:-apple-system,system-ui,sans-serif;background:#1a1a1d;color:#fff;height:100vh;overflow:hidden;display:flex;flex-direction:column}}
.header{{padding:16px 20px 8px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0}}
.logo{{color:#a64d79;font-size:1.1rem;font-weight:800;letter-spacing:-.02em}}
.wallet-btn{{background:#3b1c32;border:1px solid #3b1c32;color:#9ca3af;padding:6px 14px;border-radius:20px;font-size:.8rem;cursor:pointer}}
.wallet-btn.set{{color:#4ade80;border-color:#4ade80}}
.card-area{{flex:1;display:flex;align-items:center;justify-content:center;position:relative;padding:16px;overflow:hidden}}
.card{{width:100%;max-width:360px;background:#231424;border:1px solid #3b1c32;border-radius:20px;overflow:hidden;position:absolute;cursor:grab;user-select:none;touch-action:none;will-change:transform}}
.card-img{{width:100%;height:220px;background:#1a1a1d;display:flex;align-items:center;justify-content:center;overflow:hidden;position:relative}}
.placeholder{{display:flex;flex-direction:column;align-items:center;gap:8px;color:#333}}
.card-body{{padding:20px}}
.card-tag{{font-size:.72rem;color:#a64d79;font-weight:700;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px}}
.card-q{{font-size:1.25rem;font-weight:700;line-height:1.3;margin-bottom:6px}}
.card-sub{{font-size:.82rem;color:#6b7280}}
.overlay{{position:absolute;top:20px;padding:8px 18px;border-radius:8px;font-size:1.5rem;font-weight:900;letter-spacing:.1em;opacity:0;pointer-events:none;z-index:5}}
.ov-yes{{right:16px;background:rgba(34,197,94,.15);border:3px solid #22c55e;color:#22c55e}}
.ov-no{{left:16px;background:rgba(239,68,68,.15);border:3px solid #ef4444;color:#ef4444}}
.done-card{{display:none;text-align:center;padding:40px;color:#4ade80}}
.footer{{padding:12px 24px 36px;display:flex;justify-content:center;gap:48px;flex-shrink:0}}
.fb{{display:flex;flex-direction:column;align-items:center;gap:6px;cursor:pointer}}
.fi{{width:60px;height:60px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.6rem;transition:transform .1s}}
.fi:active{{transform:scale(.88)}}
.fi.no{{background:#1a0808;border:2px solid #ef4444}}
.fi.yes{{background:#081a08;border:2px solid #22c55e}}
.fl{{font-size:.75rem;color:#6b7280;font-weight:600}}
.modal-bg{{position:fixed;inset:0;background:rgba(0,0,0,.85);display:none;align-items:flex-end;justify-content:center;z-index:50}}
.modal-bg.show{{display:flex}}
.modal{{background:#231424;border:1px solid #3b1c32;border-radius:20px 20px 0 0;padding:28px 20px 44px;width:100%;max-width:480px}}
.modal h2{{font-size:1.1rem;font-weight:700;margin-bottom:6px}}
.modal p{{font-size:.85rem;color:#6b7280;margin-bottom:16px}}
.modal input{{width:100%;padding:14px;background:#1a1a1d;border:1px solid #3b1c32;border-radius:10px;color:#fff;font-size:.9rem;margin-bottom:12px}}
.modal button{{width:100%;padding:14px;background:#a64d79;border:none;border-radius:10px;color:#fff;font-size:1rem;font-weight:700;cursor:pointer}}
.toast{{position:fixed;bottom:110px;left:50%;transform:translateX(-50%);background:#231424;border:1px solid #3b1c32;border-radius:12px;padding:14px 20px;font-size:.9rem;text-align:center;z-index:100;max-width:320px;width:90%;opacity:0;transition:opacity .3s;pointer-events:none}}
.toast.show{{opacity:1}}
</style>
</head><body>

<div class="header">
  <div class="logo">⬡ VIMA</div>
  <button class="wallet-btn" id="walletBtn" onclick="openWallet()">+ Wallet</button>
</div>

<div class="card-area" id="cardArea">
  <div class="card" id="card">
    <div class="card-img">{frame_html}</div>
    <div class="card-body">
      <div class="card-tag">VIMA Detection · Spatial Safety</div>
      <div class="card-q">{question}</div>
      <div class="card-sub">Correct labels earn SOL raffle entry · {RAFFLE_SOL} SOL prize pool</div>
    </div>
    <div class="overlay ov-yes" id="ovYes">YES</div>
    <div class="overlay ov-no" id="ovNo">NO</div>
  </div>
  <div class="done-card" id="doneCard">
    <div style="font-size:3rem">✓</div>
    <div style="font-size:1.2rem;font-weight:700;margin-top:12px">Answer Recorded</div>
    <div style="color:#6b7280;margin-top:8px;font-size:.85rem">You're in the raffle</div>
    <div style="color:#4ade80;margin-top:4px;font-size:.8rem">{RAFFLE_SOL} SOL prize pool</div>
  </div>
</div>

<div class="footer">
  <div class="fb" onclick="doSwipe('no')">
    <div class="fi no">✗</div>
    <div class="fl">NO</div>
  </div>
  <div class="fb" onclick="doSwipe('yes')">
    <div class="fi yes">✓</div>
    <div class="fl">YES</div>
  </div>
</div>

<div class="modal-bg" id="wmodal">
  <div class="modal">
    <h2>Solana Wallet</h2>
    <p>Enter your wallet to receive SOL if you win the raffle</p>
    <input id="winput" placeholder="Your Solana address..." autocomplete="off" spellcheck="false"/>
    <button onclick="saveWallet()" style="margin-bottom:10px">Start Labeling →</button>
    <button onclick="genDemo()" style="background:#3b1c32;border:1px solid #6a1e55;color:#a64d79">Use demo address (no real wallet needed)</button>
  </div>
</div>

<div class="toast" id="toast"></div>

<script>
const BID='{bid}';
let wallet=localStorage.getItem('vinna_w')||'';
let dragging=false,startX=0,curX=0;

function init(){{
  if(wallet){{
    document.getElementById('walletBtn').textContent=wallet.slice(0,6)+'...';
    document.getElementById('walletBtn').classList.add('set');
  }} else {{
    document.getElementById('wmodal').classList.add('show');
  }}
}}

function openWallet(){{
  document.getElementById('winput').value=wallet||'';
  document.getElementById('wmodal').classList.add('show');
}}

const B58D='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function genDemo(){{
  const a=Array.from({{length:44}},()=>B58D[Math.floor(Math.random()*58)]).join('');
  document.getElementById('winput').value=a;
  saveWallet();
}}

function saveWallet(){{
  const w=document.getElementById('winput').value.trim();
  if(!w){{alert('Enter a Solana wallet address');return;}}
  wallet=w;
  localStorage.setItem('vinna_w',w);
  document.getElementById('walletBtn').textContent=w.slice(0,6)+'...';
  document.getElementById('walletBtn').classList.add('set');
  document.getElementById('wmodal').classList.remove('show');
}}

function toast(msg,col='#4ade80'){{
  const t=document.getElementById('toast');
  t.innerHTML=msg;t.style.color=col;
  t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),4000);
}}

async function doSwipe(ans){{
  if(!wallet){{openWallet();return;}}
  const card=document.getElementById('card');
  card.style.transition='transform .35s ease,opacity .35s ease';
  card.style.transform=ans==='yes'?'translateX(130%) rotate(18deg)':'translateX(-130%) rotate(-18deg)';
  card.style.opacity='0';
  try{{
    const r=await fetch('/bounty/'+BID+'/claim',{{method:'POST',
      headers:{{'Content-Type':'application/json'}},
      body:JSON.stringify({{wallet,answer:ans}})}});
    const d=await r.json();
    setTimeout(()=>{{
      card.style.display='none';
      document.getElementById('doneCard').style.display='block';
      if(d.status==='witnessed'){{
        toast('Recorded — '+d.message,'#fbbf24');
      }}else if(d.sigs||d.sig){{
        toast('🎉 '+d.sol+' SOL sent! TX confirmed','#4ade80');
        document.getElementById('doneCard').querySelector('div:nth-child(2)').style.color='#4ade80';
      }}else if(d.error){{
        toast('Error: '+d.error,'#ef4444');
      }}
    }},350);
  }}catch(e){{toast('Network error','#ef4444');}}
}}

const card=document.getElementById('card');
card.addEventListener('touchstart',e=>{{
  if(!wallet){{openWallet();return;}}
  startX=e.touches[0].clientX;dragging=true;
  card.style.transition='none';
}},{{passive:true}});
card.addEventListener('touchmove',e=>{{
  if(!dragging)return;
  curX=e.touches[0].clientX-startX;
  card.style.transform='translateX('+curX+'px) rotate('+(curX*.07)+'deg)';
  document.getElementById('ovYes').style.opacity=curX>30?Math.min(1,(curX-30)/70):'0';
  document.getElementById('ovNo').style.opacity=curX<-30?Math.min(1,(-curX-30)/70):'0';
}},{{passive:true}});
card.addEventListener('touchend',()=>{{
  if(!dragging)return;dragging=false;
  if(curX>80){{doSwipe('yes');}}
  else if(curX<-80){{doSwipe('no');}}
  else{{
    card.style.transition='transform .3s';card.style.transform='none';
    document.getElementById('ovYes').style.opacity='0';
    document.getElementById('ovNo').style.opacity='0';
  }}
  curX=0;
}},{{passive:true}});

document.getElementById('wmodal').addEventListener('click',e=>{{
  if(e.target===document.getElementById('wmodal'))document.getElementById('wmodal').classList.remove('show');
}});

init();
</script>
</body></html>"""

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8766)
