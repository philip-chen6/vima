# solana_payout.py — real SPL devnet transfer implementation
# Dependencies: pip install solana solders spl-token
# uv: uv pip install solana==0.30.2 solders==0.18.1 spl-token==0.4.0

from solders.keypair import Keypair
from solders.pubkey import Pubkey
from solana.rpc.api import Client
from solana.transaction import Transaction
from spl.token.instructions import transfer_checked, TransferCheckedParams
from spl.token.constants import TOKEN_PROGRAM_ID
from spl.token.instructions import get_associated_token_address
import os

# DEVNET config — ALWAYS use devnet RPC here, NOT mainnet
DEVNET_RPC = "https://api.devnet.solana.com"
USDC_MINT_DEVNET = Pubkey.from_string("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU")  # devnet USDC


def transfer_usdc_devnet(sender_keypair_b58: str, recipient_address: str, amount_usdc: float) -> str:
    """
    Send USDC on Solana devnet.

    Args:
        sender_keypair_b58: base58-encoded private key of the payer wallet
        recipient_address: base58-encoded public key of the recipient
        amount_usdc: amount in USDC (e.g. 10.0 = 10 USDC)

    Returns:
        transaction signature string (viewable at https://explorer.solana.com/tx/<sig>?cluster=devnet)

    Prerequisites:
        - Sender wallet must have SOL for gas (use airdrop_devnet_sol first)
        - Sender wallet must have a funded devnet USDC ATA
          (mint from https://spl-token-faucet.com/?token-name=USDC-Dev)
        - Recipient must have an existing USDC ATA or you need to create it first
          (see create_recipient_ata if needed)
    """
    client = Client(DEVNET_RPC)
    sender = Keypair.from_base58_string(sender_keypair_b58)
    recipient = Pubkey.from_string(recipient_address)

    sender_ata = get_associated_token_address(sender.pubkey(), USDC_MINT_DEVNET)
    recipient_ata = get_associated_token_address(recipient, USDC_MINT_DEVNET)

    # USDC has 6 decimals
    amount_raw = int(amount_usdc * 1_000_000)

    ix = transfer_checked(TransferCheckedParams(
        program_id=TOKEN_PROGRAM_ID,
        source=sender_ata,
        mint=USDC_MINT_DEVNET,
        dest=recipient_ata,
        owner=sender.pubkey(),
        amount=amount_raw,
        decimals=6,
        signers=[]
    ))

    recent_blockhash = client.get_latest_blockhash().value.blockhash
    txn = Transaction(fee_payer=sender.pubkey(), recent_blockhash=recent_blockhash)
    txn.add(ix)
    txn.sign(sender)

    result = client.send_transaction(txn)
    return str(result.value)  # transaction signature


def transfer_sol_devnet(sender_keypair_b58: str, recipient_address: str, amount_sol: float) -> str:
    """
    SIMPLER FALLBACK: Send native SOL on devnet (no SPL/faucet needed — just airdrop SOL).

    Useful for demos where you don't want to deal with USDC ATA setup.
    Airdrop devnet SOL first via airdrop_devnet_sol(sender_address).

    Returns:
        transaction signature string
    """
    from solders.system_program import transfer as system_transfer, TransferParams

    client = Client(DEVNET_RPC)
    sender = Keypair.from_base58_string(sender_keypair_b58)
    recipient = Pubkey.from_string(recipient_address)

    lamports = int(amount_sol * 1_000_000_000)

    ix = system_transfer(TransferParams(
        from_pubkey=sender.pubkey(),
        to_pubkey=recipient,
        lamports=lamports
    ))

    recent_blockhash = client.get_latest_blockhash().value.blockhash
    txn = Transaction(fee_payer=sender.pubkey(), recent_blockhash=recent_blockhash)
    txn.add(ix)
    txn.sign(sender)

    result = client.send_transaction(txn)
    return str(result.value)


def airdrop_devnet_sol(address: str, lamports: int = 2_000_000_000) -> str:
    """
    Airdrop SOL on devnet for gas. Call this once before any transfers.
    Default: 2 SOL (2_000_000_000 lamports). Max per request is ~2 SOL on devnet.

    Returns:
        airdrop transaction signature
    """
    client = Client(DEVNET_RPC)
    pubkey = Pubkey.from_string(address)
    result = client.request_airdrop(pubkey, lamports)
    return str(result.value)


def get_wallet_balances(address: str) -> dict:
    """
    Check SOL + USDC balance for a devnet wallet. Useful for debugging.
    """
    client = Client(DEVNET_RPC)
    pubkey = Pubkey.from_string(address)

    sol_resp = client.get_balance(pubkey)
    sol_balance = sol_resp.value / 1_000_000_000

    usdc_ata = get_associated_token_address(pubkey, USDC_MINT_DEVNET)
    try:
        token_resp = client.get_token_account_balance(usdc_ata)
        usdc_balance = float(token_resp.value.ui_amount or 0)
    except Exception:
        usdc_balance = 0.0

    return {
        "address": address,
        "sol": sol_balance,
        "usdc_devnet": usdc_balance,
        "usdc_ata": str(usdc_ata),
        "rpc": DEVNET_RPC,
    }


# ---------------------------------------------------------------------------
# Integration hook for raffle.py
# ---------------------------------------------------------------------------
# Replace lines 53-54 in raffle.py with:
#
#   from solana_payout import transfer_usdc_devnet, transfer_sol_devnet
#
#   sender_b58 = os.environ.get("RAFFLE_KEYPAIR_B58")
#   winner_address = os.environ.get(f"WORKER_WALLET_{winner}", "")  # map worker -> wallet
#
#   if sender_b58 and winner_address:
#       # Real USDC transfer (requires funded ATA)
#       tx_sig = transfer_usdc_devnet(sender_b58, winner_address, prize_pool_usdc)
#       # OR simpler SOL-only demo (just needs airdrop):
#       # tx_sig = transfer_sol_devnet(sender_b58, winner_address, 0.001)
#   else:
#       tx_sig = "5x" + hashlib.sha256(f"{winner}{seed}".encode()).hexdigest()[:40].upper()
# ---------------------------------------------------------------------------
