"""
autonomous_cycle.py — Petroleum Platform 30-minute improvement cycle
Runs entirely without user interaction. Called by Windows Task Scheduler every 30 min.

Requirements:
  - claude CLI in PATH (authenticated via claude /login)
  - node + playwright in PATH
  - python with smtplib access (uses office/.env for Gmail creds)
  - git in PATH

Usage:
  python autonomous_cycle.py
  python autonomous_cycle.py --once   # force run even if < 30min elapsed
"""

import subprocess, json, time, os, sys, datetime, smtplib, re
from email.mime.text import MIMEText
from pathlib import Path

REPO = Path(__file__).resolve().parent
OFFICE = REPO.parent / "office"
STATE_FILE = REPO / "CYCLE_STATE.json"
GRADER_FILE = REPO / "GRADER.md"
DIRECTIVE_FILE = REPO / "DIRECTIVE.md"   # small, read IN FULL — the actual steering doc
TEST_FILE = OFFICE / "tools" / "petroleum" / "tests" / "runtime_comprehensive.js"
LOG_FILE = REPO / "cycle_log.txt"
INTERVAL = 1800  # 30 minutes

ZACH_EMAIL = "ztuchman@gmail.com"

# ─── Helpers ──────────────────────────────────────────────────────────────────

def log(msg):
    ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{ts}] {msg}"
    print(line)
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(line + "\n")

def run(cmd, cwd=None, timeout=300, env=None):
    try:
        r = subprocess.run(cmd, shell=True, capture_output=True, text=True,
                           cwd=str(cwd or REPO), timeout=timeout, env=env)
        return r.stdout + r.stderr
    except subprocess.TimeoutExpired:
        return f"TIMEOUT after {timeout}s"
    except Exception as e:
        return f"ERROR: {e}"

def load_state():
    try:
        return json.loads(STATE_FILE.read_text())
    except:
        return {"cycle_number": 0, "cycle_start_unix": 0, "last_test_pass": 0,
                "last_test_fail": 0, "last_test_warn": 0, "last_test_js_errors": 0}

def save_state(state):
    STATE_FILE.write_text(json.dumps(state, indent=2))

def load_env():
    env_file = OFFICE / ".env"
    env = {}
    try:
        for line in env_file.read_text().splitlines():
            if "=" in line and not line.startswith("#"):
                k, _, v = line.partition("=")
                env[k.strip()] = v.strip().strip('"')
    except:
        pass
    return env

# ─── Step 1: Check email ──────────────────────────────────────────────────────

def check_email():
    log("Step 1: Checking email for Zach replies...")
    out = run(f"python tools/daily_email.py search petroleum", cwd=OFFICE, timeout=30)
    if "petroleum" in out.lower() or "cycle" in out.lower():
        log(f"  Email found: {out[:200]}")
        return out
    return ""

# ─── Step 2: Run Playwright test ──────────────────────────────────────────────

REPORT_FILE = OFFICE / "data" / "runtime_test_report.txt"

def run_playwright():
    log("Step 2: Running Playwright test...")
    # NODE_PATH lets node find playwright in petroleum-fiscal-db/node_modules
    # regardless of where the JS file lives (office/tools/petroleum/tests/)
    import os as _os
    env = _os.environ.copy()
    env["NODE_PATH"] = str(REPO / "node_modules")
    run(f"node {TEST_FILE}", cwd=REPO, timeout=300, env=env)
    # Read from the report file (test writes here in structured format)
    pass_count = fail_count = warn_count = js_errors = 0
    raw = ""
    try:
        raw = REPORT_FILE.read_text(encoding="utf-8", errors="replace")
        m = re.search(r"PASS:\s*(\d+)", raw)
        if m: pass_count = int(m.group(1))
        m = re.search(r"FAIL:\s*(\d+)", raw)
        if m: fail_count = int(m.group(1))
        m = re.search(r"WARN:\s*(\d+)", raw)
        if m: warn_count = int(m.group(1))
        m = re.search(r"JS errors:\s*(\d+)", raw)
        if m: js_errors = int(m.group(1))
    except Exception as e:
        log(f"  Could not read report file: {e}")
    log(f"  Test: {pass_count} PASS / {fail_count} FAIL / {warn_count} WARN / {js_errors} JS errors")
    return {"pass": pass_count, "fail": fail_count, "warn": warn_count, "js_errors": js_errors, "raw": raw[-2000:]}

# ─── Step 3+4: Claude grader review ──────────────────────────────────────────

def run_claude_cycle(directive, grader_tail, test_results, email_content):
    log("Step 3-6: Running Claude autonomous fix cycle...")
    prompt = f"""You are running the 30-minute autonomous improvement cycle for the ORCA petroleum fiscal platform.

CURRENT TEST RESULTS:
{test_results['pass']} PASS / {test_results['fail']} FAIL / {test_results['warn']} WARN / {test_results['js_errors']} JS errors

EMAIL FROM ZACH (if any):
{email_content or 'No new emails'}

=== ACTIVE DIRECTIVE (authoritative — follow this over anything in GRADER.md) ===
{directive}
=== END DIRECTIVE ===

RECENT CYCLE HISTORY (last few cycles, for context — do NOT repeat this work):
{grader_tail}

YOUR TASKS (execute all in order, no stopping):
1. Pick ONE user task (T1-T6) from the directive. Do not repeat the task used in
   the most recent cycle shown above.
2. Walk that task end to end in {REPO}/index.html from a COLD load — no
   sessionStorage, no localStorage. Read the real DOM and the real JS handlers.
   Do not reason from the changelog or from what GRADER.md claims is done.
3. Identify the single WORST friction moment in that walk — the one point where
   the analyst stops, guesses wrong, or gives up.
4. Fix that one moment by changing behavior or layout in index.html. Then commit.
   Respect every item in the directive's STILL LOCKED list.
5. Copy index.html to {OFFICE}/projects/oil-gas-expertise/fiscal_db_interface.html
6. Run: cd {REPO} && git push origin main
7. Append a cycle log entry to GRADER.md stating, in this order:
   Task (which of T1-T6) / Friction (what and where) / Change (what is different
   on screen) / Result (what the analyst can now do). Grade tables are optional
   and are NOT the point of the cycle.
8. Return that same Task/Friction/Change/Result summary in plain English.

The measure of this cycle is whether a real analyst is less frustrated than they
were an hour ago. Not the grade table. If you did not change what the user sees
or does, the cycle failed — say so honestly rather than shipping a version sweep.

Do NOT ask for confirmation. Execute all steps autonomously."""

    # Run claude in non-interactive mode
    result = subprocess.run(
        ["claude", "-p", prompt, "--allowedTools", "Read,Edit,Write,Bash,Glob,Grep"],
        capture_output=True, text=True, timeout=1800,
        cwd=str(OFFICE)
    )
    output = result.stdout + result.stderr
    log(f"  Claude cycle complete. Output length: {len(output)} chars")
    return output

# ─── Step 7: Re-run test ──────────────────────────────────────────────────────

def rerun_playwright():
    log("Step 7: Re-running Playwright test for validation...")
    return run_playwright()

# ─── Step 8: Update grader ────────────────────────────────────────────────────

def update_cycle_log(state, test_before, test_after, summary):
    log("Step 8: Updating GRADER.md cycle log...")
    cycle_n = state.get("cycle_number", 1)
    ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    entry = f"""
---
## Cycle {cycle_n} Log — {ts}
- Test before: {test_before['pass']} PASS / {test_before['fail']} FAIL
- Test after: {test_after['pass']} PASS / {test_after['fail']} FAIL
- JS errors: {test_after['js_errors']}
- Summary: {summary[:500] if summary else 'See cycle_log.txt'}
"""
    with open(GRADER_FILE, "a", encoding="utf-8") as f:
        f.write(entry)
    run(f'git add GRADER.md && git commit -m "petroleum: cycle {cycle_n} grader update"', cwd=REPO)

# ─── Step 9: Git push ─────────────────────────────────────────────────────────

def git_push():
    log("Step 9: Pushing to GitHub Pages...")
    out = run("git push origin main", cwd=REPO)
    log(f"  Push: {out[:100]}")

# ─── Step 10: Send email ──────────────────────────────────────────────────────

def send_email(cycle_n, test_before, test_after, summary):
    log("Step 10: Sending cycle completion email...")
    env = load_env()
    gmail_user = env.get("GMAIL_USER", "")
    gmail_pass = env.get("GMAIL_APP_PASSWORD", env.get("GMAIL_PASSWORD", ""))

    if not gmail_user or not gmail_pass:
        log("  No Gmail creds in .env — skipping email")
        return

    pass_delta = test_after["pass"] - test_before["pass"]
    fail_delta = test_after["fail"] - test_before["fail"]

    body = f"""Zach,

Cycle {cycle_n} of the petroleum platform improvement run just completed.

Test results: {test_after['pass']} PASS / {test_after['fail']} FAIL (was {test_before['pass']}/{test_before['fail']})
JS errors: {test_after['js_errors']}

What was improved this cycle:
{summary if summary else '(see cycle_log.txt for details)'}

Platform is live at: https://yoburgqs.github.io/petroleum-fiscal-db/

Reply to this email with any priorities for the next cycle.

— ORCA Autonomous Agent
"""
    msg = MIMEText(body)
    msg["Subject"] = f"[Petroleum] Cycle {cycle_n} — {test_after['pass']} PASS / {test_after['fail']} FAIL"
    msg["From"] = gmail_user
    msg["To"] = ZACH_EMAIL

    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as s:
            s.login(gmail_user, gmail_pass)
            s.send_message(msg)
        log("  Email sent.")
    except Exception as e:
        log(f"  Email failed: {e}")
        # Fallback: use office gmail.py tool
        run(f'python tools/gmail.py --to {ZACH_EMAIL} --subject "[Petroleum] Cycle {cycle_n} complete" --body "{body[:500]}"', cwd=OFFICE)

# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    force = "--once" in sys.argv
    state = load_state()

    elapsed = int(time.time()) - state.get("cycle_start_unix", 0)
    if elapsed < INTERVAL and not force:
        log(f"Cycle not due yet ({elapsed//60}m elapsed of {INTERVAL//60}m interval). Exiting.")
        return

    cycle_n = state.get("cycle_number", 0) + 1
    log(f"=== STARTING CYCLE {cycle_n} ===")

    state["cycle_number"] = cycle_n
    state["cycle_start_unix"] = int(time.time())
    state["cycle_start_human"] = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    save_state(state)

    # Step 1
    email_content = check_email()

    # Step 2
    test_before = run_playwright()

    # Steps 3-6: Claude does the heavy lifting
    directive = DIRECTIVE_FILE.read_text(encoding="utf-8", errors="replace") if DIRECTIVE_FILE.exists() else ""
    if not directive:
        log("  WARNING: DIRECTIVE.md missing — loop has no steering document this cycle")
    # GRADER.md is a 1.7MB append-only archive. Its HEAD is stale 2026-08-19
    # prohibitions; the useful part is the most recent cycle logs at the TAIL.
    grader_all = GRADER_FILE.read_text(encoding="utf-8", errors="replace") if GRADER_FILE.exists() else ""
    grader_tail = grader_all[-4000:]
    claude_summary = run_claude_cycle(directive, grader_tail, test_before, email_content)

    # Step 7
    test_after = rerun_playwright()

    # Step 8
    update_cycle_log(state, test_before, test_after, claude_summary)

    # Step 9
    git_push()

    # Step 10
    send_email(cycle_n, test_before, test_after, claude_summary)

    # Update state
    state["last_test_pass"] = test_after["pass"]
    state["last_test_fail"] = test_after["fail"]
    state["last_test_warn"] = test_after["warn"]
    state["last_test_js_errors"] = test_after["js_errors"]
    state["cycle_complete_human"] = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    save_state(state)

    log(f"=== CYCLE {cycle_n} COMPLETE === {test_after['pass']} PASS / {test_after['fail']} FAIL ===")

if __name__ == "__main__":
    main()
