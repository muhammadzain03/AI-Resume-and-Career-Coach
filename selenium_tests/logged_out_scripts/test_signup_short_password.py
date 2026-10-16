# A password shorter than 8 characters should be stopped by the browser.
# The page stays on the signup card. The code field never appears.

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

from support.browser import make_driver, open_fresh, wait


def test_signup_short_password():
    driver = make_driver()

    try:
        open_fresh(driver, "/signup")

        wait(driver).until(EC.presence_of_element_located((By.ID, "auth-name"))).send_keys(
            "RCC Selenium"
        )
        driver.find_element(By.ID, "auth-email").send_keys("short-password-check@example.com")
        driver.find_element(By.ID, "auth-password").send_keys("short")

        wait(driver).until(
            EC.element_to_be_clickable(
                (By.XPATH, "//button[normalize-space()='Create Account']")
            )
        ).click()

        # Still on the signup card.
        assert driver.find_elements(By.CSS_SELECTOR, "h2.auth-verify__title") == []
        assert driver.find_elements(By.ID, "auth-code") == []

        message = driver.find_element(By.ID, "auth-password").get_attribute("validationMessage")
        assert message

    finally:
        driver.quit()


if __name__ == "__main__":
    test_signup_short_password()
