# Open /terms directly. The heading should be Terms of Service.

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

from support.browser import make_driver, open_fresh, wait


def test_terms_page():
    driver = make_driver()

    try:
        open_fresh(driver, "/terms")

        wait(driver).until(
            EC.text_to_be_present_in_element((By.TAG_NAME, "h1"), "Terms of Service")
        )

    finally:
        driver.quit()


if __name__ == "__main__":
    test_terms_page()
