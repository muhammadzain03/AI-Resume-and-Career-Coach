# Click each sidebar link and check the page that loads.

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

from support.auth import login
from support.browser import make_driver, wait, wait_url_contains


def click_sidebar(driver, label):
    wait(driver).until(
        EC.element_to_be_clickable(
            (By.XPATH, f"//aside//a[normalize-space()='{label}']")
        )
    ).click()


def test_sidebar_nav():
    driver = make_driver()

    try:
        login(driver)

        click_sidebar(driver, "Analyze")
        wait_url_contains(driver, "/app/analyze")
        wait(driver).until(EC.presence_of_element_located((By.ID, "analyze-jd")))

        click_sidebar(driver, "Interview")
        wait_url_contains(driver, "/app/interview")
        wait(driver).until(EC.presence_of_element_located((By.ID, "interview-jd")))

        click_sidebar(driver, "History")
        wait_url_contains(driver, "/app/history")
        wait(driver).until(
            EC.text_to_be_present_in_element((By.TAG_NAME, "h1"), "Your activity")
        )

        click_sidebar(driver, "Settings")
        wait_url_contains(driver, "/app/settings")
        wait(driver).until(
            EC.text_to_be_present_in_element((By.TAG_NAME, "h1"), "Account")
        )

        click_sidebar(driver, "Overview")
        wait(driver).until(
            EC.text_to_be_present_in_element((By.TAG_NAME, "h1"), "Welcome")
        )

    finally:
        driver.quit()


if __name__ == "__main__":
    test_sidebar_nav()
