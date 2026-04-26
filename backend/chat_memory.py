#!/usr/bin/env python3
"""Interactive chat over one VIMA episodic memory artifact."""

from __future__ import annotations

import argparse
import pathlib

from answer_from_memory import answer_query, load_env


DEFAULT_MEMORY = pathlib.Path("demo/episodic_memory.json")


def chat(args: argparse.Namespace) -> None:
    load_env()
    print("VIMA memory chat")
    print(f"memory: {args.memory}")
    print("type a question, or /exit\n")

    while True:
        try:
            query = input("vima> ").strip()
        except (EOFError, KeyboardInterrupt):
            print()
            break
        if not query:
            continue
        if query.lower() in {"/exit", "exit", "quit", "/quit"}:
            break

        result = answer_query(
            pathlib.Path(args.memory),
            query,
            args.provider,
            args.top_k,
            args.model,
            args.timeout_s,
            not args.no_fallback,
            args.gemini_transport,
        )
        print()
        print(result["answer"])
        if result.get("fallback_used"):
            print(f"\n[fallback used: {result.get('error')}]")
        print()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--memory", default=str(DEFAULT_MEMORY))
    parser.add_argument("--provider", choices=["heuristic", "gemini"], default="gemini")
    parser.add_argument("--model", default="gemini-2.5-flash")
    parser.add_argument("--top-k", type=int, default=4)
    parser.add_argument("--timeout-s", type=int, default=20)
    parser.add_argument("--gemini-transport", choices=["rest", "legacy"], default="rest")
    parser.add_argument("--no-fallback", action="store_true")
    args = parser.parse_args()

    chat(args)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
