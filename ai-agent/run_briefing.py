"""
The morning briefing, run unattended.

This is the entry point a scheduler calls. Nobody is at the keyboard when it
runs, which is the whole point — an agent that needs you to press a button is
a chat box with extra steps.

    python run_briefing.py                      # uses sample/transcript.csv
    python run_briefing.py --transcript my.csv
    python run_briefing.py --name "Jaykrishna"
    python run_briefing.py --show               # print the last one, do not re-run

Scheduling it on Windows (Task Scheduler):

    Program:   C:\\dev\\sou-ai-helpdesk-pro\\ai-agent\\.venv\\Scripts\\python.exe
    Arguments: run_briefing.py --name "Jaykrishna"
    Start in:  C:\\dev\\sou-ai-helpdesk-pro\\ai-agent
    Trigger:   Daily, 07:30

On Linux or macOS, the same thing as a cron line:

    30 7 * * *  cd /path/to/ai-agent && .venv/bin/python run_briefing.py

Exit codes are meaningful, so a scheduler can tell whether it worked:
    0  a briefing was written
    1  it ran but the model could not be reached (findings still saved)
    2  it could not run at all
"""
from __future__ import annotations

import argparse
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

LOG_PATH = os.path.join(HERE, "data", "briefing.log")


def log(msg: str) -> None:
    """Append to a log, because an unattended job that leaves no trace is one
    you cannot debug three days later when it silently stopped working."""
    from datetime import datetime
    line = f"[{datetime.now().isoformat(timespec='seconds')}] {msg}"
    print(line)
    try:
        os.makedirs(os.path.dirname(LOG_PATH), exist_ok=True)
        with open(LOG_PATH, "a", encoding="utf-8") as f:
            f.write(line + "\n")
    except OSError:
        pass


def main() -> int:
    ap = argparse.ArgumentParser(description="Generate the morning briefing.")
    ap.add_argument("--transcript", default="sample/transcript.csv",
                    help="Transcript to derive the student's strengths from.")
    ap.add_argument("--name", default="there", help="Who to greet.")
    ap.add_argument("--show", action="store_true",
                    help="Print the last briefing without generating a new one.")
    args = ap.parse_args()

    from agent_core.briefing import build_briefing, load_latest

    if args.show:
        latest = load_latest()
        if not latest:
            print("No briefing has been generated yet.")
            return 2
        _print(latest)
        return 0

    path = args.transcript if os.path.isabs(args.transcript) else os.path.join(HERE, args.transcript)
    if not os.path.exists(path):
        log(f"FAILED: transcript not found at {path}")
        return 2

    try:
        from agent_core.ingest import read_transcript
        with open(path, "rb") as f:
            _, subjects = read_transcript(f.read(), os.path.basename(path))
    except Exception as e:
        log(f"FAILED: could not read the transcript — {e}")
        return 2

    if not subjects:
        log("FAILED: no subjects found in the transcript")
        return 2

    log(f"Running. {len(subjects)} subjects from {os.path.basename(path)}.")

    try:
        brief = build_briefing(subjects, student_name=args.name)
    except Exception as e:
        log(f"FAILED: {e}")
        return 2

    _print({
        "greeting": brief.greeting, "body": brief.body,
        "generated_at": brief.generated_at, "new_count": brief.new_count,
        "plan": brief.plan, "listings": brief.listings,
        "model": brief.model, "temperature": brief.temperature,
        "errors": brief.errors,
    })

    degraded = "could not be written up" in brief.body
    log(f"{'DEGRADED' if degraded else 'OK'}: {brief.new_count} new listing(s).")
    return 1 if degraded else 0


def _print(b: dict) -> None:
    line = "─" * 68
    print("\n" + line)
    print(b.get("greeting", ""))
    print(line)
    print()
    print(b.get("body", "").strip())
    print()

    if b.get("listings"):
        print("New since last time:")
        for l in b["listings"]:
            print(f"  · {l['title']} — {l['company']} ({l['location']})")
            print(f"    {l['url']}")
        print()

    if b.get("errors"):
        print("Feed problems: " + "; ".join(b["errors"]))
        print()

    plan = b.get("plan") or {}
    print(f"Searched: {', '.join(plan.get('keywords', []))}")
    print(f"Because:  {plan.get('reason', '—')}")
    print(f"Written by {b.get('model')} at temperature {b.get('temperature')} · {b.get('generated_at')}")
    print(line + "\n")


if __name__ == "__main__":
    sys.exit(main())
