# Click Open dashboard while logged out.
# The protected page should send the browser to /login.

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

from support.browser import make_driver, open_fresh, wait, wait_url_contains


def test_open_dashboard_logged_out():
    driver = make_driver()

    try:
        open_fresh(driver, "/")

        wait(driver).until(
            EC.element_to_be_clickable(
                (By.XPATH, "//button[normalize-space()='Open dashboard']")
            )
        ).click()

        wait_url_contains(driver, "/login")

    finally:
        driver.quit()


if __name__ == "__main__":
    test_open_dashboard_logged_out()
