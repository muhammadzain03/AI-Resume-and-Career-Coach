# Click the first FAQ question. aria-expanded becomes true.
# The answer text contains ATS.

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

from support.browser import make_driver, open_fresh, wait

QUESTION = "How is RCC different from other AI resume tools?"


def test_faq_expand():
    driver = make_driver()

    try:
        open_fresh(driver, "/")

        # The FAQ starts hidden until it is scrolled into view.
        driver.execute_script(
            "document.getElementById('faq').scrollIntoView({block: 'center'});"
        )

        # The question button also has a chevron, so match the text instead of the whole label.
        button = wait(driver).until(
            EC.element_to_be_clickable(
                (By.XPATH, f"//button[contains(., '{QUESTION}')]")
            )
        )
        button.click()

        wait(driver).until(
            lambda d: d.find_element(
                By.XPATH, f"//button[contains(., '{QUESTION}')]"
            ).get_attribute("aria-expanded") == "true"
        )

        # The answer is clipped while it opens, so read its text content.
        wait(driver).until(
            lambda d: "ATS" in d.find_element(
                By.CSS_SELECTOR, ".home-faq__item.is-open .home-faq__a"
            ).get_attribute("textContent")
        )

    finally:
        driver.quit()


if __name__ == "__main__":
    test_faq_expand()
