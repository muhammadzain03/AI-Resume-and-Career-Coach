# From the home page, click the Terms link in the footer.
# Same heading as opening /terms directly.

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

from support.browser import make_driver, open_fresh, wait


def test_footer_terms():
    driver = make_driver()

    try:
        open_fresh(driver, "/")

        # Smooth scrolling finishes after the click, so jump there instead.
        driver.execute_script(
            """
            document.documentElement.style.scrollBehavior = 'auto';
            document.querySelector("footer a[href='/terms']").scrollIntoView({block: 'center'});
            """
        )
        wait(driver).until(
            lambda d: d.execute_script(
                """
                const r = document.querySelector("footer a[href='/terms']").getBoundingClientRect();
                return r.top >= 0 && r.bottom <= window.innerHeight;
                """
            )
        )
        wait(driver).until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, "footer a[href='/terms']"))
        ).click()

        wait(driver).until(
            EC.text_to_be_present_in_element((By.TAG_NAME, "h1"), "Terms of Service")
        )

    finally:
        driver.quit()


if __name__ == "__main__":
    test_footer_terms()
