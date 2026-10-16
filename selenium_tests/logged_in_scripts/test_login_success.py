# Log in as account 0. URL should contain /app and the heading says Welcome.

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

from support.auth import login
from support.browser import make_driver, wait


def test_login_success():
    driver = make_driver()

    try:
        login(driver)

        assert "/app" in driver.current_url
        wait(driver).until(
            EC.text_to_be_present_in_element((By.TAG_NAME, "h1"), "Welcome")
        )

    finally:
        driver.quit()


if __name__ == "__main__":
    test_login_success()
