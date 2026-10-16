# /login shows the welcome subtitle, email, and password.
# No name field. Do not click Google.

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

from support.browser import make_driver, open_fresh, wait


def test_login_form():
    driver = make_driver()

    try:
        open_fresh(driver, "/login")

        wait(driver).until(
            EC.text_to_be_present_in_element(
                (By.CSS_SELECTOR, ".auth-card__sub"),
                "Welcome back to RCC",
            )
        )
        wait(driver).until(EC.presence_of_element_located((By.ID, "auth-email")))
        wait(driver).until(EC.presence_of_element_located((By.ID, "auth-password")))
        assert driver.find_elements(By.ID, "auth-name") == []

        # Google's own button is drawn in this wrapper. Leave it alone.
        wait(driver).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, ".auth-google-wrap"))
        )

    finally:
        driver.quit()


if __name__ == "__main__":
    test_login_form()
