# Attach the resume PDF. The dropzone shows the filename and
# Analyze Resume becomes enabled. Do not click it.

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

from support.auth import login
from support.browser import BASE, make_driver, wait

RESUME = Path(__file__).resolve().parents[1] / "Muhammad Zain Resume - Autodesk.pdf"


def test_analyze_attach_file():
    driver = make_driver()

    try:
        login(driver)
        driver.get(BASE + "/app/analyze")

        # The file input is invisible but send_keys still works on it.
        wait(driver).until(
            EC.presence_of_element_located((By.ID, "analyze-resume"))
        ).send_keys(str(RESUME))

        wait(driver).until(
            EC.text_to_be_present_in_element(
                (By.CSS_SELECTOR, ".dropzone__file"), RESUME.name
            )
        )

        wait(driver).until(
            EC.element_to_be_clickable(
                (By.XPATH, "//button[contains(normalize-space(.), 'Analyze Resume')]")
            )
        )

    finally:
        driver.quit()


if __name__ == "__main__":
    test_analyze_attach_file()
