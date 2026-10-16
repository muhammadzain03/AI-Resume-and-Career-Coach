# Typing a job description enables Begin interview. Do not click it.

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

from support.auth import login
from support.browser import BASE, make_driver, wait


def test_interview_jd_enables():
    driver = make_driver()

    try:
        login(driver)
        driver.get(BASE + "/app/interview")

        wait(driver).until(
            EC.presence_of_element_located((By.ID, "interview-jd"))
        ).send_keys("Software engineer role. Ask about React.")

        wait(driver).until(
            EC.element_to_be_clickable(
                (By.XPATH, "//button[contains(normalize-space(.), 'Begin interview')]")
            )
        )

    finally:
        driver.quit()


if __name__ == "__main__":
    test_interview_jd_enables()
