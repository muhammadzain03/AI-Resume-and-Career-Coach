# Old routes should end up on /login.
# /verify-email goes there directly. The others go into /app first, which then redirects.

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from support.browser import make_driver, open_fresh, wait_url_contains

PATHS = [
    "/verify-email",
    "/upload",
    "/job",
    "/dashboard",
    "/interview",
    "/verify-pending",
]


def test_legacy_redirects():
    driver = make_driver()

    try:
        for path in PATHS:
            open_fresh(driver, path)
            wait_url_contains(driver, "/login")

    finally:
        driver.quit()


if __name__ == "__main__":
    test_legacy_redirects()
