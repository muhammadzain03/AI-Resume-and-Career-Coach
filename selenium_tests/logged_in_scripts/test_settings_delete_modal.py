# Open the delete dialog, type DELETE so the button enables, then cancel.
# Never confirm. Account 0 has to stay.

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

from support.auth import login
from support.browser import BASE, make_driver, wait

DANGER_BUTTON = (By.CSS_SELECTOR, "button.modal__btn--danger")


def test_settings_delete_modal():
    driver = make_driver()

    try:
        login(driver)
        driver.get(BASE + "/app/settings")

        # The danger card is lower on the page and fades in on scroll.
        delete_button = wait(driver).until(
            EC.presence_of_element_located(
                (By.XPATH, "//button[normalize-space()='Delete account']")
            )
        )
        driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", delete_button)
        wait(driver).until(EC.element_to_be_clickable(delete_button)).click()

        wait(driver).until(
            EC.text_to_be_present_in_element(
                (By.ID, "delete-account-title"), "Delete your account?"
            )
        )

        danger = driver.find_element(*DANGER_BUTTON)
        assert danger.get_attribute("disabled") is not None

        driver.find_element(By.ID, "delete-confirm-input").send_keys("DELETE")
        wait(driver).until(EC.element_to_be_clickable(DANGER_BUTTON))

        driver.find_element(By.XPATH, "//button[normalize-space()='Cancel']").click()
        wait(driver).until(
            EC.invisibility_of_element_located((By.ID, "delete-account-title"))
        )

    finally:
        driver.quit()


if __name__ == "__main__":
    test_settings_delete_modal()
