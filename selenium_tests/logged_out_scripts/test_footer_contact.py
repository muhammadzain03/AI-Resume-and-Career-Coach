# Click Contact in the footer. The dialog should show the contact email.

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

from support.browser import make_driver, open_fresh, wait


def test_footer_contact():
    driver = make_driver()

    try:
        open_fresh(driver, "/")

        # Smooth scrolling finishes after the click, so jump there instead.
        driver.execute_script(
            """
            document.documentElement.style.scrollBehavior = 'auto';
            document.querySelector('footer button.site-footer__contact-btn').scrollIntoView({block: 'center'});
            """
        )
        wait(driver).until(
            lambda d: d.execute_script(
                """
                const r = document.querySelector('footer button.site-footer__contact-btn').getBoundingClientRect();
                return r.top >= 0 && r.bottom <= window.innerHeight;
                """
            )
        )
        wait(driver).until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, "footer button.site-footer__contact-btn"))
        ).click()

        dialog = wait(driver).until(
            EC.visibility_of_element_located((By.CSS_SELECTOR, "[aria-label='Contact email']"))
        )
        assert "arcc.resume@gmail.com" in dialog.text

    finally:
        driver.quit()


if __name__ == "__main__":
    test_footer_contact()
