# The interview page shows the coach heading and all three inputs.
# Begin interview is disabled until there is a job description.

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

from support.auth import login
from support.browser import BASE, make_driver, wait


def test_interview_page():
    driver = make_driver()

    try:
        login(driver)
        driver.get(BASE + "/app/interview")

        wait(driver).until(
            EC.text_to_be_present_in_element((By.TAG_NAME, "h2"), "RCC Interview Coach")
        )
        wait(driver).until(EC.presence_of_element_located((By.ID, "interview-role")))
        wait(driver).until(EC.presence_of_element_located((By.ID, "interview-jd")))
        wait(driver).until(EC.presence_of_element_located((By.ID, "interview-context")))

        button = driver.find_element(
            By.XPATH, "//button[contains(normalize-space(.), 'Begin interview')]"
        )
        assert button.get_attribute("disabled") is not None

    finally:
        driver.quit()


if __name__ == "__main__":
    test_interview_page()
