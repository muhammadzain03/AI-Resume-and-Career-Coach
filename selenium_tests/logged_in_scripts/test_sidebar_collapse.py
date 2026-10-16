# Collapse the sidebar and expand it again using the same button.

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

from support.auth import login
from support.browser import make_driver, wait

COLLAPSE = (By.CSS_SELECTOR, "button.dash-sidebar__collapse-btn")


def test_sidebar_collapse():
    driver = make_driver()

    try:
        login(driver)

        button = wait(driver).until(EC.element_to_be_clickable(COLLAPSE))
        assert button.get_attribute("aria-label") == "Collapse sidebar"
        button.click()

        wait(driver).until(
            lambda d: d.find_element(*COLLAPSE).get_attribute("aria-label")
            == "Expand sidebar"
        )

        driver.find_element(*COLLAPSE).click()
        wait(driver).until(
            lambda d: d.find_element(*COLLAPSE).get_attribute("aria-label")
            == "Collapse sidebar"
        )

    finally:
        driver.quit()


if __name__ == "__main__":
    test_sidebar_collapse()
