# Testing

## Local Test Run
```bash
node C:/tmp/pw_test/runtime_comprehensive.js
```

## CI
GitHub Actions runs the Playwright suite on every push to main. See `.github/workflows/playwright.yml`.

## Test Coverage
117 tests covering: all 12 tabs, country search, DCF engine, fiscal compare, IOC portfolio, mobile viewport, accessibility (ARIA), export functions, error states.

## Test Report
Output written to `C:/tmp/runtime_test_report.txt` (local) or captured by CI.
