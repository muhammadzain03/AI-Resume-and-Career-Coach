# The analyze page has the file input, title, and description.
# Analyze Resume stays disabled until a file is chosen.

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

from support.auth import login
from support.browser import BASE, make_driver, wait


def test_analyze_page():
    driver = make_driver()

    try:
        login(driver)
        driver.get(BASE + "/app/analyze")

        wait(driver).until(EC.presence_of_element_located((By.ID, "analyze-resume")))
        wait(driver).until(EC.presence_of_element_located((By.ID, "analyze-title")))
        wait(driver).until(EC.presence_of_element_located((By.ID, "analyze-jd")))

        button = wait(driver).until(
            EC.presence_of_element_located(
                (By.XPATH, "//button[contains(normalize-space(.), 'Analyze Resume')]")
            )
        )
        assert button.get_attribute("disabled") is not None

    finally:
        driver.quit()


if __name__ == "__main__":
    test_analyze_page()
