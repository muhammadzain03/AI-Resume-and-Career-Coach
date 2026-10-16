# On /signup, switch to Sign In and back to Sign Up.
# The name field should disappear and then come back.

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

from support.browser import make_driver, open_fresh, wait


def test_auth_tab_switch():
    driver = make_driver()

    try:
        open_fresh(driver, "/signup")
        wait(driver).until(EC.presence_of_element_located((By.ID, "auth-name")))

        wait(driver).until(
            EC.element_to_be_clickable((By.XPATH, "//button[normalize-space()='Sign In']"))
        ).click()

        wait(driver).until(lambda d: d.find_elements(By.ID, "auth-name") == [])
        # The card fades in, so wait until the label is actually visible.
        wait(driver).until(
            EC.text_to_be_present_in_element(
                (By.CSS_SELECTOR, "button.auth-submit-btn"),
                "Sign In",
            )
        )

        wait(driver).until(
            EC.element_to_be_clickable((By.XPATH, "//button[normalize-space()='Sign Up']"))
        ).click()

        wait(driver).until(EC.presence_of_element_located((By.ID, "auth-name")))

    finally:
        driver.quit()


if __name__ == "__main__":
    test_auth_tab_switch()
