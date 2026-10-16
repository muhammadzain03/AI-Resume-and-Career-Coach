# The overview page shows the three stat labels and the three quick actions.

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

from support.auth import login
from support.browser import make_driver, wait

LABELS = [
    "Total Analyses",
    "Average Score",
    "Best Score",
    "New Analysis",
    "Practice Interview",
    "View History",
]


def test_overview_content():
    driver = make_driver()

    try:
        login(driver)

        wait(driver).until(
            EC.text_to_be_present_in_element((By.TAG_NAME, "h1"), "Welcome")
        )

        # The cards fade in one by one, so wait for each label.
        for label in LABELS:
            wait(driver).until(
                EC.visibility_of_element_located(
                    (By.XPATH, f"//*[normalize-space()='{label}']")
                )
            )

    finally:
        driver.quit()


if __name__ == "__main__":
    test_overview_content()
