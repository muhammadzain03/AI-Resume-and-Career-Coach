# Selenium WebDriver tests (ENSF 519 - Assignment 01)

Environment for Python Selenium WebDriver scripts against RCC
([resumecoach.app](https://resumecoach.app) or local `http://localhost:3000`).

Scripts only - **not** Selenium IDE.

The `.venv/` folder is gitignored. Create and activate it on each machine after cloning.

## Setup (one-time)

From this folder (`selenium_tests/`):

```powershell
# Create virtual environment
python -m venv .venv

# Activate it (PowerShell)
.\.venv\Scripts\Activate.ps1

# Install Selenium + ChromeDriver helper
pip install -r requirements.txt
```

If PowerShell blocks activation:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

## Every time you work on tests

```powershell
cd "AI-Resume-and-Career-Coach\selenium_tests"
.\.venv\Scripts\Activate.ps1
```

Your prompt should show `(.venv)`.

## Verify the install

```powershell
python -c "from selenium import webdriver; print('Selenium OK', webdriver.__name__)"
```

## Running tests (once you add scripts)

```powershell
# Example - replace with your script name
python tests\test_example.py
```

Or with pytest later (optional):

```powershell
pip install pytest
pytest tests/
```

## Prerequisites

- **Python 3.10+**
- **Google Chrome** installed (Selenium Manager / webdriver-manager will fetch a matching ChromeDriver)
- App reachable: production URL, or local frontend (`npm start` in `frontend/`)

## Layout

```text
selenium_tests/
  .venv/                 # local virtualenv (gitignored - create after clone)
  requirements.txt       # selenium, webdriver-manager
  tests/                 # put your .py test scripts here
  README.md
```
