"""
cycle_check.py — call at the start of every Claude response to know if 30min cycle is due.
Usage: python cycle_check.py
Exits 0 if cycle due (>=1800s elapsed), exits 1 if not yet due.
Prints elapsed time and status.
"""
import json, time, sys, os

STATE_FILE = os.path.join(os.path.dirname(__file__), 'CYCLE_STATE.json')

def check():
    try:
        with open(STATE_FILE) as f:
            state = json.load(f)
        elapsed = int(time.time()) - state['cycle_start_unix']
        interval = state.get('cycle_interval_seconds', 1800)
        minutes = elapsed // 60
        seconds = elapsed % 60
        cycle_n = state.get('cycle_number', 1)
        due = elapsed >= interval
        status = "CYCLE DUE" if due else f"Next cycle in {(interval - elapsed)//60}m{(interval-elapsed)%60}s"
        print(f"Cycle #{cycle_n} | Elapsed: {minutes}m{seconds}s | {status}")
        print(f"Last test: {state.get('last_test_pass','?')} PASS / {state.get('last_test_fail','?')} FAIL")
        return 0 if due else 1
    except Exception as e:
        print(f"cycle_check error: {e}")
        return 1

if __name__ == '__main__':
    sys.exit(check())
