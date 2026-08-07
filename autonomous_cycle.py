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

REPO = Path("C:/Users/ztuch/petroleum-fiscal-db")
OFFICE = Path("C:/Users/ztuch/office")
STATE_FILE = REPO / "CYCLE_STATE.json"
GRADER_FILE = REPO / "GRADER.md"
TEST_FILE = Path("C:/tmp/pw_test/runtime_comprehensive.js")
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

def run(cmd, cwd=None, timeout=300):
    try:
        r = subprocess.run(cmd, shell=True, capture_output=True, text=True,
                           cwd=str(cwd or REPO), timeout=timeout)
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

REPORT_FILE = Path("C:/tmp/runtime_test_report.txt")

def run_playwright():
    log("Step 2: Running Playwright test...")
    run(f"node {TEST_FILE}", cwd=REPO, timeout=300)
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

def run_claude_cycle(grader_content, test_results, email_content):
    log("Step 3-6: Running Claude autonomous fix cycle...")
    prompt = f"""You are running the 30-minute autonomous improvement cycle for the ORCA petroleum fiscal platform.

CURRENT TEST RESULTS:
{test_results['pass']} PASS / {test_results['fail']} FAIL / {test_results['warn']} WARN / {test_results['js_errors']} JS errors

EMAIL FROM ZACH (if any):
{email_content or 'No new emails'}

CURRENT GRADER:
{grader_content[:3000]}

YOUR TASKS (execute all in order, no stopping):
1. Read C:/Users/ztuch/petroleum-fiscal-db/index.html — identify what is actually broken or poor quality right now
2. Update the grades in C:/Users/ztuch/petroleum-fiscal-db/GRADER.md based on what you actually see in the code
3. Find the 10 lowest-graded categories
4. For each of the 10: make the specific improvement directly to index.html, then commit
5. Copy index.html to C:/Users/ztuch/office/projects/oil-gas-expertise/fiscal_db_interface.html after all fixes
6. Run: cd C:/Users/ztuch/petroleum-fiscal-db && git push origin main
7. Update GRADER.md with new grades and add a cycle log entry
8. Return a plain-English summary of exactly what you fixed (bullet list, no jargon)

Focus on things that matter to a senior oil company analyst seeing this for the first time.
Key question: Is this ready to demo to colleagues at a major IOC? If any answer is no, fix it.

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
    grader_content = GRADER_FILE.read_text(encoding="utf-8", errors="replace") if GRADER_FILE.exists() else ""
    claude_summary = run_claude_cycle(grader_content, test_before, email_content)

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
