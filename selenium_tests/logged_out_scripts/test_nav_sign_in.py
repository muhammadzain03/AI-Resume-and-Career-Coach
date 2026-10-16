# Click Sign in in the nav. URL should end on /login.
# The login form has the email field and no name field.

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

from support.browser import make_driver, open_fresh, wait


def test_nav_sign_in():
    driver = make_driver()

    try:
        open_fresh(driver, "/")

        wait(driver).until(
            EC.element_to_be_clickable((By.LINK_TEXT, "Sign in"))
        ).click()

        wait(driver).until(lambda d: d.current_url.rstrip("/").endswith("/login"))
        wait(driver).until(EC.presence_of_element_located((By.ID, "auth-email")))
        assert driver.find_elements(By.ID, "auth-name") == []

    finally:
        driver.quit()


if __name__ == "__main__":
    test_nav_sign_in()
