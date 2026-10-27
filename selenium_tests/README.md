# Selenium WebDriver tests (ENSF 519 - Assignment 01)

Python Selenium WebDriver scripts for RCC. Scripts only - **not** Selenium IDE.

The suite is complete: **34 scripts** (18 logged-out, 1 full signup, 15 logged-in), all passing.
`Assignment 01 - Selenium Webdriver.pdf` in this folder is the submitted report, and
`Build Plan.md` is the plan the scripts were written from.

This branch (`selenium-tests`) is the assignment archive. It is **not** merged into `main`,
so none of this reaches production.

## Target

The **local** stack at `http://localhost:3000`, not the live site. Chrome runs headed
(not headless) so a screen recording shows the browser.

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

Create `selenium_tests/.env` (gitignored, never committed):

```
BASE_URL=http://localhost:3000
```

## Running the suite

1. Start the app: run `start-arcc.bat` from `AI-Resume-and-Career-Coach/`. This brings up
   PostgreSQL in Docker, Flask on `:5000`, and React on `:3000`. Docker Desktop must be
   running first, or the backend returns a database error.
2. Activate the virtualenv in this folder.
3. Once per database, create the permanent login account:

```powershell
python support\bootstrap.py
```

4. Run any script:

```powershell
python logged_out_scripts\test_home_loads.py
python full_signup_script\test_signup_full.py
python logged_in_scripts\test_login_success.py
```

A script that returns to the prompt with no traceback has passed.

Run a whole folder at once:

```powershell
Get-ChildItem logged_out_scripts\test_*.py | ForEach-Object {
    Write-Host "`n---- $($_.Name) ----"
    python $_.FullName
    if ($LASTEXITCODE -ne 0) { Write-Host "FAILED $($_.Name)" }
}
```

To reset everything, including the account pool: `docker compose down -v`, then
`start-arcc.bat` again. The database is empty after that, so `support\bootstrap.py`
has to run again before any logged-in script.

## Test accounts

No inbox and no database reads. Accounts come from a fixed pool of 100 `.test` addresses,
`rcc000000@example.test` through `rcc000099@example.test`. For index `n` the email is
`rcc{n:06d}@example.test`, the verification code is `{n:06d}`, and the password is
`Rcc-test-pass-{n}`.

- **Account 0** (`rcc000000@example.test`) is the permanent login. Every logged-in script
  signs in as it. It is created only by `support/bootstrap.py` and is never deleted -
  `test_settings_delete_modal.py` opens the delete dialog and cancels.
- **Indices 1-99** are the signup rotation. `claim_signup` shuffles them and takes the first
  address the server accepts, so a crashed run just leaves that address taken. There is no
  state file of any kind; the server is the record of what is used.

`/register` is rate limited to 15 requests per hour per IP, and locally the whole suite
shares one bucket. If you hit `429`, restart Flask (the limiter is in-memory) or run
`docker compose down -v` so probes stop colliding.

## How the `.test` shortcut works

`backend/routes/auth_routes.py` on this branch treats an address whose domain ends in
`.test` (RFC 6761 - never a real inbox) and whose local part ends in six digits as a test
signup: those six digits become the verification code, and no mail is sent on register,
resend, re-login, or welcome. Everything else is unchanged - same `/verify-code` route,
same 15-minute expiry, same session creation. No endpoint ever returns a code; the script
already knows it from the address.

Production never has this behaviour, because this branch is not merged into `main`. The
local `backend/.env` also carries `ALLOW_TEST_ACCOUNTS=true` from the original build plan;
`.env` is gitignored (`**/.env`) and must never be set on Render.

## Layout

```text
selenium_tests/
  .venv/                    # local virtualenv (gitignored - create after clone)
  .env                      # BASE_URL (gitignored - create after clone)
  requirements.txt          # selenium, webdriver-manager
  support/                  # shared helpers imported by every script
    browser.py              #   BASE, make_driver, wait, open_fresh, wait_url_contains
    auth.py                 #   login() as account 0
    pool.py                 #   the 100 test accounts, claim_signup()
    form.py                 #   set_react_value() for React-controlled fields
    bootstrap.py            #   creates account 0 (run directly, once per database)
  logged_out_scripts/       # 18 guest scripts
  full_signup_script/       # 1 end-to-end signup + verification
  logged_in_scripts/        # 15 signed-in scripts
  Build Plan.md             # plan the suite was written from
  Assignment 01 - Selenium Webdriver.pdf
  Muhammad Zain Resume - Autodesk.pdf   # fixture for the file input
  Job Description - Autodesk.txt        # fixture pasted into #analyze-jd
```

## Notes on specific scripts

- `test_analyze_run.py` is the only script that spends a real LLM call. It needs
  `LLM_API_KEY` in `backend/.env` and waits up to 120 seconds for the match score.
- `test_history_page.py` passes on either outcome: the empty state, or a history card that
  opens a detail page. Which branch runs depends on whether `test_analyze_run.py` has
  already run against account 0.
- Google sign-in, **Begin interview**, and **Delete my account** are shown on screen but
  never clicked.

## Prerequisites

- Python 3.10+
- Google Chrome (Selenium Manager / webdriver-manager fetches a matching ChromeDriver)
- Docker Desktop, for the local PostgreSQL container
