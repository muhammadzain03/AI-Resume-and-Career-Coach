# History shows Your activity. Then either the empty state or at least one card.
# If a card can be opened, open it and check the detail page.
# Which branch runs depends on whether test_analyze_run.py has run already.

import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

from support.auth import login
from support.browser import BASE, make_driver, wait


def test_history_page():
    driver = make_driver()

    try:
        login(driver)
        driver.get(BASE + "/app/history")

        wait(driver).until(
            EC.text_to_be_present_in_element((By.TAG_NAME, "h1"), "Your activity")
        )

        # Wait until the list has finished loading one way or the other.
        wait(driver).until(
            lambda d: d.find_elements(By.XPATH, "//h2[normalize-space()='Nothing here yet']")
            or d.find_elements(By.CSS_SELECTOR, ".history-card")
        )

        cards = driver.find_elements(By.CSS_SELECTOR, ".history-card--clickable")
        if not cards:
            # Empty state is a valid pass.
            return

        cards[0].click()

        wait(driver).until(lambda d: re.search(r"/app/history/\d+", d.current_url))
        wait(driver).until(
            EC.visibility_of_element_located((By.CSS_SELECTOR, ".score-ring__num"))
        )

    finally:
        driver.quit()


if __name__ == "__main__":
    test_history_page()
