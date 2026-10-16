# The New analysis button in the sidebar goes to /app/analyze.

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

from support.auth import login
from support.browser import make_driver, wait, wait_url_contains


def test_new_analysis_button():
    driver = make_driver()

    try:
        login(driver)

        wait(driver).until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, "button.dash-sidebar__new"))
        ).click()

        wait_url_contains(driver, "/app/analyze")

    finally:
        driver.quit()


if __name__ == "__main__":
    test_new_analysis_button()
