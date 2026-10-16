# Read data-theme on the page, click the theme button, and check it flipped.

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

from support.browser import make_driver, open_fresh, wait


def test_theme_public():
    driver = make_driver()

    try:
        open_fresh(driver, "/")

        before = driver.execute_script(
            "return document.documentElement.getAttribute('data-theme')"
        )

        wait(driver).until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, "button.theme-toggle"))
        ).click()

        wait(driver).until(
            lambda d: d.execute_script(
                "return document.documentElement.getAttribute('data-theme')"
            ) != before
        )

    finally:
        driver.quit()


if __name__ == "__main__":
    test_theme_public()
