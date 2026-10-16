# test_home_nav_sections.py - from /, click Features, How it works, Pricing, FAQ. 
# After each click, the matching id (features, how-it-works, pricing, faq) is 
# in the viewport (element.location["y"] near execute_script("return window.scrollY")).

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

from support.browser import make_driver, open_fresh, wait


def _near_top(driver, section_id):
    """True once smooth scroll has brought the section near the top of the window."""
    section = driver.find_element(By.ID, section_id)
    scroll_y = driver.execute_script("return window.scrollY")
    # The sticky nav leaves the section about 90px below the scroll position.
    return abs(section.location["y"] - scroll_y) < 150


def test_home_nav_sections():
    driver = make_driver()
    
    try:
        # Open the home page
        open_fresh(driver, "/")

        # Click Features then find the section and  
        # check its vertical position with the page scroll
        wait(driver).until(
            EC.element_to_be_clickable((By.LINK_TEXT, "Features"))
        ).click()

        wait(driver).until(lambda d: _near_top(d, "features"))


        # Click "How it works" then find the section and  
        # check its vertical position with the page scroll
        wait(driver).until(
            EC.element_to_be_clickable((By.LINK_TEXT, "How it works"))
        ).click()

        wait(driver).until(lambda d: _near_top(d, "how-it-works"))


        # Click Pricing then find the section and  
        # check its vertical position with the page scroll
        wait(driver).until(
            EC.element_to_be_clickable((By.LINK_TEXT, "Pricing"))
        ).click()

        wait(driver).until(lambda d: _near_top(d, "pricing"))


        # Click FAQ then find the section and  
        # check its vertical position with the page scroll
        wait(driver).until(
            EC.element_to_be_clickable((By.LINK_TEXT, "FAQ"))
        ).click()

        wait(driver).until(lambda d: _near_top(d, "faq"))

    finally:
        driver.quit()

if __name__ == "__main__":
    test_home_nav_sections()
