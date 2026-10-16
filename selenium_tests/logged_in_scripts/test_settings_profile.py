# Settings shows the Account heading and the logged-in email.

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

from support.auth import login
from support.browser import BASE, make_driver, wait
from support.pool import credentials


def test_settings_profile():
    driver = make_driver()

    try:
        login(driver)
        driver.get(BASE + "/app/settings")

        wait(driver).until(
            EC.text_to_be_present_in_element((By.TAG_NAME, "h1"), "Account")
        )
        wait(driver).until(
            EC.text_to_be_present_in_element(
                (By.CSS_SELECTOR, ".settings-profile"),
                credentials(0)["email"],
            )
        )

    finally:
        driver.quit()


if __name__ == "__main__":
    test_settings_profile()
