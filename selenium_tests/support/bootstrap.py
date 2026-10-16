"""Create account 0 once per database. Safe to run again.

    python support\\bootstrap.py
"""

from selenium.common.exceptions import TimeoutException
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

try:
    from support.browser import make_driver, open_fresh, wait, wait_url_contains
    from support.form import set_react_value
    from support.pool import SIGNUP_NAME, credentials
except ImportError:
    from browser import make_driver, open_fresh, wait, wait_url_contains
    from form import set_react_value
    from pool import SIGNUP_NAME, credentials


def _error_text(driver):
    nodes = driver.find_elements(By.CSS_SELECTOR, ".status-text--error")
    return nodes[0].text.strip() if nodes else ""


def _accepted(driver):
    nodes = driver.find_elements(By.CSS_SELECTOR, "h2.auth-verify__title")
    return bool(nodes) and nodes[0].text.strip() == "Check your email"


def ensure_account0(driver):
    account = credentials(0)
    open_fresh(driver, "/signup")
    set_react_value(driver, "auth-name", SIGNUP_NAME)
    set_react_value(driver, "auth-email", account["email"])
    set_react_value(driver, "auth-password", account["password"])
    wait(driver).until(
        EC.element_to_be_clickable((By.CSS_SELECTOR, "button.auth-submit-btn"))
    ).click()

    def settled(d):
        if _accepted(d):
            return "accepted"
        return _error_text(d) or False

    try:
        outcome = wait(driver).until(settled)
    except TimeoutException as exc:
        raise RuntimeError("Account 0 signup did not succeed or show an error.") from exc

    if outcome != "accepted":
        if "already registered" in outcome.lower():
            print("Account 0 already exists.")
            return
        raise RuntimeError(f"Account 0 signup failed: {outcome}")

    set_react_value(driver, "auth-code", account["code"])
    wait(driver).until(
        EC.element_to_be_clickable((By.CSS_SELECTOR, "button.auth-submit-btn"))
    ).click()
    wait_url_contains(driver, "/app")
    print("Account 0 is verified.")


if __name__ == "__main__":
    driver = make_driver()
    try:
        ensure_account0(driver)
    finally:
        driver.quit()
