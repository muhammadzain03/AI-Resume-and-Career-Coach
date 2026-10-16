import sys
from pathlib import Path

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from support.browser import make_driver, open_fresh, wait, wait_url_contains
from support.pool import claim_signup


def test_signup_full():
    driver = make_driver()
    
    try:
        # Open a clean signup page
        open_fresh(driver, "/signup")

        # Take the first free account from 1–99
        account = claim_signup(driver)

        # Wait for the code screen
        wait(driver).until(
            EC.text_to_be_present_in_element(
                (By.CSS_SELECTOR, "h2.auth-verify__title"),
                "Check your email",
            )
        )

        # Type that same code and continue
        wait(driver).until(EC.presence_of_element_located((By.ID, "auth-code"))).send_keys(
            account["code"]
        )
        wait(driver).until(
            EC.element_to_be_clickable(
                (By.XPATH, "//button[normalize-space()='Verify and continue']")
            )
        ).click()

        # Land on the Dashboard
        wait_url_contains(driver, "/app")
        wait(driver).until(
            EC.text_to_be_present_in_element((By.TAG_NAME, "h1"), "Welcome")
        )
    
    finally:
        driver.quit()

if __name__ == "__main__":
    test_signup_full()