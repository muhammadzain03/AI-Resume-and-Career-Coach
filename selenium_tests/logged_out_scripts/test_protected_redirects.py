# Logged out, every dashboard route should bounce to /login.

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from support.browser import make_driver, open_fresh, wait_url_contains

PATHS = [
    "/app",
    "/app/analyze",
    "/app/interview",
    "/app/history",
    "/app/settings",
]


def test_protected_redirects():
    driver = make_driver()

    try:
        for path in PATHS:
            open_fresh(driver, path)
            wait_url_contains(driver, "/login")

    finally:
        driver.quit()


if __name__ == "__main__":
    test_protected_redirects()
