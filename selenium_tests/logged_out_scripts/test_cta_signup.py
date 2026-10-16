# Click the hero Get started free button.
# Should land on /signup with the name field and a Create Account button.

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

from support.browser import make_driver, open_fresh, wait


def test_cta_signup():
    driver = make_driver()

    try:
        open_fresh(driver, "/")

        # First match is the hero button. The other one is further down the page.
        wait(driver).until(
            EC.element_to_be_clickable(
                (By.XPATH, "//button[contains(normalize-space(.), 'Get started free')]")
            )
        ).click()

        wait(driver).until(lambda d: d.current_url.rstrip("/").endswith("/signup"))
        wait(driver).until(EC.presence_of_element_located((By.ID, "auth-name")))

        submit = driver.find_element(By.CSS_SELECTOR, "button.auth-submit-btn")
        assert submit.text.strip() == "Create Account"

    finally:
        driver.quit()


if __name__ == "__main__":
    test_cta_signup()
