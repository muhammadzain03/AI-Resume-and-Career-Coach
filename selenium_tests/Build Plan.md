# Build Plan

Selenium coverage for the whole RCC site.

**Target: the local stack** (`http://localhost:3000`), started with `start-arcc.bat`. Not production, not a staging deploy. Scripts live in `selenium_tests/tests/`. One file = one test case (matches the assignment PDF). Chrome runs **headed** (not headless) so a screen recording shows the browser.

Running locally is what keeps the test-account escape hatch out of every deployed environment: the flag that enables it lives in `backend/.env`, which is gitignored and never reaches Render. It also removes Render's free-tier cold starts, so the long waits the earlier draft needed are gone.

Do not click Google sign-in, do not click Begin interview, and do not click "Delete my account". Click Analyze Resume only in `test_analyze_run.py`.

## Running the suite

1. Start the stack: `start-arcc.bat`. Postgres comes up in Docker, Flask on `:5000`, React on `:3000`.
2. `backend/.env` must contain `ALLOW_TEST_ACCOUNTS=true`. That file is gitignored (`**/.env`), so the flag is local-only by construction.
3. First run against a fresh database only: `python support\bootstrap.py` to create account 0. See **Account 0** below.
4. Then any script: `python tests\test_home_loads.py`

To reset everything, including the account pool: `docker compose down -v`, then `start-arcc.bat` again.

## Shared pieces

Add these once. Every script imports them.

- `selenium_tests/support/browser.py`
  - `BASE` from `selenium_tests/.env` (`BASE_URL`)
  - `make_driver()`: `webdriver.Chrome()`, window 1400x900
  - `wait(driver, seconds=20)` using `WebDriverWait`
  - `open_fresh(driver, path)`: `delete_all_cookies()`, clear `localStorage`, then `driver.get(BASE + path)` so a previous login cannot leak into a guest test
  - `wait_url_contains(driver, part, timeout=20)` - 20s is plenty locally. The 90s waits in the earlier draft existed only to survive Render cold starts.
- `selenium_tests/support/auth.py`
  - `login(driver)`: always signs in as account 0, `rcc000000@example.test` / `Rcc-test-pass-0`, then waits until the URL contains `/app`. Later signup runs do not change this login.
- `selenium_tests/support/pool.py`
  - `POOL`: the same 100 addresses the backend allowlists, `rcc000000@example.test` through `rcc000099@example.test`. For index `n`: email `rcc{n:06d}@example.test`, code `{n:06d}`, password `Rcc-test-pass-{n}`.
  - `claim_signup(driver)`: shuffles indices **1-99** (never 0), tries each through the signup form, and returns the first one the server accepts. A `409 Email already registered` means an earlier run used it, so it moves on. Raises a clear error if every address is taken or the server answers `429`.
  - **No `.signup-seq` and no state file of any kind.** The server is the record of which addresses are used, so a crashed run, a fresh clone, and CI all behave identically. Shuffling rather than walking 1 to 99 in order keeps the probe count near 1 while the pool is mostly free - see the rate-limit note below.
- `selenium_tests/support/bootstrap.py`
  - `ensure_account0(driver)`: signs up `rcc000000@example.test` with code `000000` and password `Rcc-test-pass-0`, and verifies it. If register answers `409` the account already exists and it exits cleanly, so the script is safe to re-run.
  - Runnable directly (`python support\bootstrap.py`). It is **not** one of the numbered test files - it is setup, and `claim_signup` deliberately never touches index 0.
- Fixtures already in `selenium_tests/` (do not rename):
  - `Muhammad Zain Resume - Autodesk.pdf` for the file input
  - `Job Description - Autodesk.txt` pasted into `#analyze-jd` (plain text, not the `.md`, so markdown markers are not scored)
- `selenium_tests/support/form.py`
  - `set_react_value(driver, element_id, text)` sets a React controlled field with the native value setter and an `input` event. Do not `send_keys` the full job description; it is too slow.
- `selenium_tests/.env` (gitignored, never committed):

```
BASE_URL=http://localhost:3000
```

Email, password, and code are all derived from the pool. Nothing to type by hand.

No database credentials. No new Python packages. `selenium` and `webdriver-manager` stay the only dependencies.

## Account 0

`rcc000000@example.test` is the permanent login account. Every logged-in script signs in as it.

- Created once per database by `support/bootstrap.py`, never by `claim_signup`.
- Never part of the signup rotation, so no run can consume it.
- Never deleted. `test_settings_delete_modal.py` opens the delete dialog and cancels; it never confirms.
- After `docker compose down -v` the database is empty, so bootstrap has to run again before any logged-in script.

## Test-account escape hatch

Lives in `backend/routes/auth_routes.py`. No schema change and no new dependency.

**The allowlist is the rule.** `TEST_ACCOUNTS` is an explicit set of the 100 addresses `rcc000000@example.test` through `rcc000099@example.test`. Any other `.test` signup is rejected. A pattern such as "any `.test` address ending in 6 digits" is *not* the rule - that would accept roughly a million addresses on any `.test` domain from anyone who read this file.

**Gated by `ALLOW_TEST_ACCOUNTS`.** Default off. With the flag off, an allowlisted address behaves like any other signup: random code, real send attempt. The hatch does not exist.

**Startup guard.** If `ALLOW_TEST_ACCOUNTS` is true while a production indicator is present (`RENDER_EXTERNAL_URL`, which Render sets automatically and `config.py` already reads), `create_app()` raises and the process refuses to boot with a clear message. Fail at boot, not inside a request handler. Locally that variable is unset, so the guard never fires.

**Behaviour for an allowlisted address while the flag is on:**

- The code is the 6 digits at the end of the local part. `rcc000042@example.test` stores `000042` in `verification_token` through the normal `_start_verification` path.
- No mail is sent. Not on register, not on resend, not when an unverified user logs in again, and not the welcome email.
- Verification is untouched: same `/verify-code` route, same 15-minute expiry, same attempt limits, same session creation.
- There is no endpoint that returns a code, and no test reads the database.

**Where it runs.** Local only. `ALLOW_TEST_ACCOUNTS` goes in `backend/.env` and nowhere else - not in `render.yaml`, not in the Render dashboard. Production therefore never has the hatch at all, rather than having it switched off.

**Rate limit.** `/register` carries `@limiter.limit("15 per hour")`, keyed per IP. Locally every request comes from `127.0.0.1`, so the whole suite shares one bucket, and every probe that lands on a taken address spends one of the 15. This is why `claim_signup` shuffles instead of walking in order. Two local escape valves if you do hit `429`: the limiter uses in-memory per-process storage, so restarting Flask clears it instantly, and `docker compose down -v` empties the pool so probes stop colliding.

## Selectors already in the app

- Public nav (`frontend/src/components/PublicLayout.js`): brand link text `RCC`; links `Features` (`/#features`), `How it works`, `Pricing`, `FAQ`; theme button `aria-label` `Switch to dark mode` or `Switch to light mode`; guest CTA text `Sign in`
- Home (`frontend/src/pages/HomePage.js`): `h1` text `RCC`; buttons `Get started free` and `Open dashboard`; sections `#features`, `#how-it-works`, `#pricing`, `#faq`
- FAQ (`frontend/src/components/FaqItem.js`): button text `How is RCC different from other AI resume tools?`; `aria-expanded`; answer contains `ATS`
- Footer (`frontend/src/components/Footer.js`): link `Terms`; button `Contact`; dialog `aria-label` `Contact email`; email `arcc.resume@gmail.com`
- Terms: `h1` `Terms of Service`
- Auth (`frontend/src/pages/AuthPage.js`): `#auth-name`, `#auth-email`, `#auth-password`, `#auth-code`; tabs `Sign In` / `Sign Up`; submit `Create Account` or `Sign In`; verify heading `Check your email`; verify button `Verify and continue` (disabled until 6 digits); error `.status-text--error` text `Invalid credentials.`
- Signup password has HTML `minLength={8}` and `required`. A short password never hits the API. Assert `validationMessage` is non-empty and `#auth-code` is absent.
- Dashboard sidebar (`frontend/src/components/DashboardLayout.js`): links `Overview`, `Analyze`, `Interview`, `History`, `Settings`; button `New analysis`; `Log out`; collapse `aria-label` `Collapse sidebar` / `Expand sidebar`
- Overview: `h1` contains `Welcome`; labels `Total Analyses`, `New Analysis`, `Practice Interview`, `View History`
- Analyze: `#analyze-resume`, `#analyze-title`, `#analyze-jd`, button `Analyze Resume` (disabled until a file is chosen). Dropzone shows the filename.
- Interview: heading `RCC Interview Coach`; `#interview-role`, `#interview-jd`, `#interview-context`; button `Begin interview` (disabled until the JD textarea is non-empty)
- History: `h1` `Your activity`; empty copy `Nothing here yet` or cards with `Open`
- Settings: `h1` `Account`; profile email; button `Delete account`; dialog `#delete-account-title` `Delete your account?`; `#delete-confirm-input`; danger button stays disabled until the input is exactly `DELETE`; `Cancel` closes it
- Theme lives on `document.documentElement` attribute `data-theme` (`light` or `dark`)

## 1. Logged-out scripts (18)

No account. Each calls `open_fresh` first.

1. `test_home_loads.py` - `/`. `h1` is `RCC`. Tagline contains `Build smarter resumes.` Buttons `Get started free` and `Open dashboard` are visible.
2. `test_home_nav_sections.py` - from `/`, click `Features`, `How it works`, `Pricing`, `FAQ`. After each click, the matching id (`features`, `how-it-works`, `pricing`, `faq`) is in the viewport (`element.location["y"]` near `execute_script("return window.scrollY")`).
3. `test_faq_expand.py` - click the first FAQ button. `aria-expanded` becomes `true`. Answer text contains `ATS`.
4. `test_theme_public.py` - read `data-theme`, click the theme button (`css selector` `button.theme-toggle`), assert the attribute flipped.
5. `test_nav_sign_in.py` - click `Sign in`. URL ends with `/login`. `#auth-email` is present. `#auth-name` is absent.
6. `test_cta_signup.py` - click the hero `Get started free`. URL ends with `/signup`. `#auth-name` is present. Button text is `Create Account`.
7. `test_open_dashboard_logged_out.py` - click `Open dashboard`. Protected route sends the browser to `/login`.
8. `test_terms_page.py` - open `/terms`. `h1` is `Terms of Service`.
9. `test_footer_terms.py` - from `/`, click footer link `Terms` (`css selector` `footer a[href="/terms"]`). Same `h1`.
10. `test_footer_contact.py` - click footer button `Contact`. Dialog `aria-label` `Contact email` shows `arcc.resume@gmail.com`.
11. `test_signup_form.py` - `/signup`. Fields `#auth-name`, `#auth-email`, `#auth-password`. Visible text `Sign up with Google` and `Get started with RCC for free`. Do not click Google.
12. `test_auth_tab_switch.py` - on `/signup`, click tab `Sign In`. `#auth-name` disappears and the submit button is `Sign In`. Click `Sign Up`. `#auth-name` returns.
13. `test_signup_short_password.py` - fill name, a unique email, password `short`. Click `Create Account`. Stay on the signup card: no heading `Check your email`. `#auth-password` `validationMessage` is not empty (browser `minLength` 8).
14. `test_signup_rejects_unlisted.py` - `/signup`. Name `RCC Selenium`, email `rcc999999@example.test` (a well-formed `.test` address that is **not** on the allowlist), password `Rcc-test-pass-x`. Click `Create Account`. No `Check your email` heading, `#auth-code` is absent, and an error is shown. This is the boundary test: it demonstrates the hatch is an allowlist, not a guessable pattern.
15. `test_login_form.py` - `/login`. Subtitle `Welcome back to RCC`. `#auth-email` and `#auth-password` present. Text `Continue with Google`. No `#auth-name`.
16. `test_login_bad_password.py` - email `nobody-rcc-test@example.com`, password `wrong-password-1`. Click `Sign In`. `.status-text--error` text is `Invalid credentials.` URL still contains `/login`.
17. `test_protected_redirects.py` - for `/app`, `/app/analyze`, `/app/interview`, `/app/history`, `/app/settings`, `open_fresh` and assert the URL contains `/login`.
18. `test_legacy_redirects.py` - `/verify-email` ends on `/login`. `/upload`, `/job`, `/dashboard`, `/interview`, and `/verify-pending` also end on `/login` because they forward into protected `/app` routes.

## 2. One full signup (1)

19. `test_signup_full.py` does not read the database or an inbox.

Steps:

1. `open_fresh(driver, "/signup")`.
2. `claim_signup(driver)` shuffles pool indices 1-99 and submits the signup form for each candidate until the server accepts one. A candidate already registered by an earlier run comes back `409 Email already registered`; the test moves to the next. Name is always `RCC Selenium`.
3. The accepted candidate gives email `rcc{n:06d}@example.test`, code `{n:06d}`, password `Rcc-test-pass-{n}`.
4. Wait for heading `Check your email`. No email is sent.
5. Type that same 6-digit code into `#auth-code`. Click `Verify and continue`.
6. Wait until URL contains `/app`. `h1` contains `Welcome`.
7. Nothing is written to disk. The account now exists on the server, so the next run skips it automatically.

A run that dies between step 4 and step 6 simply leaves that address taken - the next run picks a different one and passes. There is no file to repair and nothing to reset by hand.

This creates a verified `.test` user. Logged-in scripts do not follow it. They always sign in as account 0.

## 3. Logged-in scripts (15)

Each starts with `login(driver)` (except logout, which logs in first). Account 0 must already exist - run `support/bootstrap.py` once per database.

20. `test_login_success.py` - after `login`, URL contains `/app` and `h1` contains `Welcome`.
21. `test_overview_content.py` - visible text `Total Analyses`, `Average Score`, `Best Score`, `New Analysis`, `Practice Interview`, `View History`.
22. `test_sidebar_nav.py` - click `Analyze` (URL `/app/analyze`, `#analyze-jd` present), `Interview` (`#interview-jd`), `History` (`h1` `Your activity`), `Settings` (`h1` `Account`), `Overview` (`Welcome`).
23. `test_new_analysis_button.py` - click `New analysis`. URL `/app/analyze`.
24. `test_analyze_page.py` - `#analyze-resume`, `#analyze-title`, `#analyze-jd` present. Button `Analyze Resume` is disabled (`disabled` attribute) before a file is chosen.
25. `test_analyze_attach_file.py` - `send_keys(absolute path)` of `Muhammad Zain Resume - Autodesk.pdf` on `#analyze-resume`. Dropzone text contains that filename. `Analyze Resume` is enabled. Do not click it.
26. `test_analyze_run.py` - log in, open `/app/analyze`, upload `Muhammad Zain Resume - Autodesk.pdf`, set `#analyze-title` to `MCP/AI Developer`, paste `Job Description - Autodesk.txt` into `#analyze-jd` with `set_react_value`, click `Analyze Resume`. Wait up to 120 seconds - the app is local but the Gemini call is not. Pass when `.score-ring__num` is a number and the page shows `Overall match against this job description`. Do not assert a specific score. This is the only script that spends a real LLM call, so it needs `LLM_API_KEY` in `backend/.env`.
27. `test_interview_page.py` - heading `RCC Interview Coach`. `#interview-role`, `#interview-jd`, `#interview-context` present. `Begin interview` is disabled.
28. `test_interview_jd_enables.py` - type `Software engineer role. Ask about React.` into `#interview-jd`. `Begin interview` becomes enabled. Do not click it.
29. `test_history_page.py` - `h1` is `Your activity`. Then either `Nothing here yet` or at least one `.history-card`. If a card has class `history-card--clickable`, click it and assert the URL matches `/app/history/` plus an id, then a score or results heading is visible. If there is no card, that empty state is the pass. Which branch runs depends on whether `test_analyze_run.py` has already run against account 0, so both are valid expected results.
30. `test_settings_profile.py` - `h1` `Account`. The profile block text contains `rcc000000@example.test`.
31. `test_settings_delete_modal.py` - click `Delete account`. Dialog title `Delete your account?`. Danger button `Delete my account` is disabled. Type `DELETE` into `#delete-confirm-input`. Button becomes enabled. Click `Cancel`. Dialog is gone. Never confirm deletion.
32. `test_dashboard_theme.py` - click `button.theme-toggle` inside `.dash-sidebar`. `data-theme` flips. Click again to restore the original value.
33. `test_sidebar_collapse.py` - click the button `aria-label` `Collapse sidebar`. The same control's label becomes `Expand sidebar`. Click it again.
34. `test_logout.py` - click `Log out`. URL contains `/login`. Open `/app` again. URL returns to `/login`.

## 4. Backend unit test (1, not Selenium)

`backend/tests/test_signup_hatch.py`. Selenium cannot observe any of this from outside the browser, and these are the assertions that most need to be true:

- With `ALLOW_TEST_ACCOUNTS` on, `alex123456@gmail.com` gets a **random** code, not `123456`. The hatch must never touch a real address that happens to end in six digits.
- With the flag on, an unlisted `.test` address (`rcc999999@example.test`) is rejected.
- With the flag **off**, an allowlisted address such as `rcc000001@example.test` gets a random code and is treated as an ordinary signup.
- The startup guard raises when the flag is on alongside a production indicator.

## What this covers

Every real route: `/`, `/terms`, `/login`, `/signup`, `/app`, `/app/analyze`, `/app/interview`, `/app/history`, `/app/history/:id` when a card exists, `/app/settings`, plus the six legacy redirects. Signup is completed with an allowlisted `.test` address and its matching 6-digit code. No inbox, no database read, no state file. One logged-in script runs a real analysis of `Muhammad Zain Resume - Autodesk.pdf` against `Job Description - Autodesk.txt` and waits for the match score. Google sign-in, Begin interview, and account deletion are shown on screen but not executed. One script proves the escape hatch rejects an address outside the allowlist.

**Totals: 34 Selenium scripts** (18 logged-out, 1 signup, 15 logged-in), plus `support/bootstrap.py` as setup and 1 backend unit test file. The earlier count of 33 did not include `test_signup_rejects_unlisted.py`.

## Assignment extras (not code)

The PDF repeats, for each of the 34 Selenium files: description, steps, expected result, and the script. Record any one guest script (homepage is the clearest) showing Chrome open, the site load, and the assertion.

Update `selenium_tests/README.md` with: the `start-arcc.bat` prerequisite, `BASE_URL=http://localhost:3000`, the one-time `python support\bootstrap.py` step, and `python tests\test_....py`. State in one line that `ALLOW_TEST_ACCOUNTS` is local-only and must never be set on Render. Do not commit `.env`.
