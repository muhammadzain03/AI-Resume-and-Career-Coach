import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

from support.browser import make_driver, open_fresh, wait

def test_home_loads():
    driver = make_driver()
    
    try:
        # Open the home page
        open_fresh(driver, "/")

        # Wait for the homepage to load (if required) - h1 is RCC. Tagline contains Build smarter resumes.
        wait(driver).until(
            EC.text_to_be_present_in_element((By.TAG_NAME, "h1"), "RCC")                
        )
        wait(driver).until(
            EC.text_to_be_present_in_element(
                (By.CSS_SELECTOR, "p.home-hero__tagline"),
                "Build smarter resumes."
            )
        )

        # Buttons Get started free and Open dashboard are visible.
        wait(driver).until(
            EC.element_to_be_clickable(
                (By.XPATH, "//button[contains(normalize-space(.), 'Get started free')]")
            )
        )

        wait(driver).until(
            EC.element_to_be_clickable(
                (By.XPATH, "//button[normalize-space()='Open dashboard']")
            )
        )

    finally:
        driver.quit()

if __name__ == "__main__":
    test_home_loads()
