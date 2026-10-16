# Log in, click Log out, then try /app again. Both times it should be /login.

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

from support.auth import login
from support.browser import BASE, make_driver, wait, wait_url_contains


def test_logout():
    driver = make_driver()

    try:
        login(driver)

        wait(driver).until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, "button.dash-sidebar__logout"))
        ).click()
        wait_url_contains(driver, "/login")

        driver.get(BASE + "/app")
        wait_url_contains(driver, "/login")

    finally:
        driver.quit()


if __name__ == "__main__":
    test_logout()
