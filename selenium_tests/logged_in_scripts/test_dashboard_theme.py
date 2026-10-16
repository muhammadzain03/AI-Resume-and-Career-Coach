# The theme toggle in the sidebar flips data-theme. Click again to put it back.

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

from support.auth import login
from support.browser import make_driver, wait

TOGGLE = (By.CSS_SELECTOR, ".dash-sidebar button.theme-toggle")


def current_theme(driver):
    return driver.execute_script(
        "return document.documentElement.getAttribute('data-theme')"
    )


def test_dashboard_theme():
    driver = make_driver()

    try:
        login(driver)

        before = current_theme(driver)

        wait(driver).until(EC.element_to_be_clickable(TOGGLE)).click()
        wait(driver).until(lambda d: current_theme(d) != before)

        wait(driver).until(EC.element_to_be_clickable(TOGGLE)).click()
        wait(driver).until(lambda d: current_theme(d) == before)

    finally:
        driver.quit()


if __name__ == "__main__":
    test_dashboard_theme()
