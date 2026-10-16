from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

try:
    from support.browser import open_fresh, wait, wait_url_contains
    from support.pool import credentials
except ImportError:
    from browser import open_fresh, wait, wait_url_contains
    from pool import credentials


def login(driver):
    account = credentials(0)
    open_fresh(driver, "/login")
    wait(driver).until(EC.presence_of_element_located((By.ID, "auth-email"))).send_keys(
        account["email"]
    )
    driver.find_element(By.ID, "auth-password").send_keys(account["password"])
    wait(driver).until(
        EC.element_to_be_clickable((By.CSS_SELECTOR, "button.auth-submit-btn"))
    ).click()
    wait_url_contains(driver, "/app")
