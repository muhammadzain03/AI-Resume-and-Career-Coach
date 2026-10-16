# rcc999999@example.test looks like a test address but it is not one of the
# 100 allowed accounts. Signup should show an error and stay off the code screen.

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

from support.browser import make_driver, open_fresh, wait


def test_signup_rejects_unlisted():
    driver = make_driver()

    try:
        open_fresh(driver, "/signup")

        wait(driver).until(EC.presence_of_element_located((By.ID, "auth-name"))).send_keys(
            "RCC Selenium"
        )
        driver.find_element(By.ID, "auth-email").send_keys("rcc999999@example.test")
        driver.find_element(By.ID, "auth-password").send_keys("Rcc-test-pass-x")

        wait(driver).until(
            EC.element_to_be_clickable(
                (By.XPATH, "//button[normalize-space()='Create Account']")
            )
        ).click()

        wait(driver).until(
            EC.visibility_of_element_located((By.CSS_SELECTOR, ".status-text--error"))
        )
        assert driver.find_elements(By.CSS_SELECTOR, "h2.auth-verify__title") == []
        assert driver.find_elements(By.ID, "auth-code") == []

    finally:
        driver.quit()


if __name__ == "__main__":
    test_signup_rejects_unlisted()
