# Selenium WebDriver environment (Python)

Isolated virtualenv for end-to-end WebDriver scripts, kept separate from the backend
production dependencies.

The full suite of 34 scripts, the shared helpers, the fixtures, and the ENSF 519
Assignment 01 report live on the **`selenium-tests`** branch, which is deliberately not
merged into `main`. That branch also carries a local-only signup shortcut for `.test`
email addresses, which is the reason it stays out of production.

```powershell
git checkout selenium-tests
```

See `selenium_tests/README.md` on that branch for the full setup and run instructions.

## Setup (one-time)

From this folder (`selenium_tests/`):

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

If PowerShell blocks activation:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

Verify the install:

```powershell
python -c "from selenium import webdriver; print('Selenium OK', webdriver.__name__)"
```

## Prerequisites

- Python 3.10+
- Google Chrome (Selenium Manager / webdriver-manager fetches a matching ChromeDriver)
- A reachable app: the local frontend at `http://localhost:3000`, or `https://resumecoach.app`

`.venv/` and `.env` are gitignored. Create them on each machine after cloning.
