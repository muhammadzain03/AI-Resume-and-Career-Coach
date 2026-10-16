# A made-up email and a wrong password should stay on /login
# and show Invalid credentials.

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

from support.browser import make_driver, open_fresh, wait, wait_url_contains


def test_login_bad_password():
    driver = make_driver()

    try:
        open_fresh(driver, "/login")

        wait(driver).until(EC.presence_of_element_located((By.ID, "auth-email"))).send_keys(
            "nobody-rcc-test@example.com"
        )
        driver.find_element(By.ID, "auth-password").send_keys("wrong-password-1")

        # The tab is also labelled Sign In, so click the submit button itself.
        wait(driver).until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, "button.auth-submit-btn"))
        ).click()

        error = wait(driver).until(
            EC.visibility_of_element_located((By.CSS_SELECTOR, ".status-text--error"))
        )
        assert error.text.strip() == "Invalid credentials"
        wait_url_contains(driver, "/login")

    finally:
        driver.quit()


if __name__ == "__main__":
    test_login_bad_password()
