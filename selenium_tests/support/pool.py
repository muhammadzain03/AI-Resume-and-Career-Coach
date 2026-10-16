import random

from selenium.common.exceptions import TimeoutException
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

try:
    from support.browser import wait
    from support.form import set_react_value
except ImportError:
    from browser import wait
    from form import set_react_value

SIGNUP_NAME = "RCC Selenium"


def credentials(n):
    return {
        "index": n,
        "email": f"rcc{n:06d}@example.test",
        "code": f"{n:06d}",
        "password": f"Rcc-test-pass-{n}",
    }


# Index 0 is the permanent login. claim_signup never uses it.
POOL = [credentials(n) for n in range(100)]


def _error_text(driver):
    nodes = driver.find_elements(By.CSS_SELECTOR, ".status-text--error")
    return nodes[0].text.strip() if nodes else ""


def _accepted(driver):
    nodes = driver.find_elements(By.CSS_SELECTOR, "h2.auth-verify__title")
    return bool(nodes) and nodes[0].text.strip() == "Check your email"


def claim_signup(driver):
    """Submit signup for a shuffled allowlisted address. Caller is already on /signup."""
    order = list(range(1, 100))
    random.shuffle(order)

    for n in order:
        creds = POOL[n]
        set_react_value(driver, "auth-name", SIGNUP_NAME)
        set_react_value(driver, "auth-email", creds["email"])
        set_react_value(driver, "auth-password", creds["password"])
        wait(driver).until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, "button.auth-submit-btn"))
        ).click()

        try:
            wait(driver, 5).until(lambda d: not _error_text(d))
        except TimeoutException:
            pass

        def settled(d):
            if _accepted(d):
                return "accepted"
            return _error_text(d) or False

        try:
            outcome = wait(driver).until(settled)
        except TimeoutException as exc:
            raise RuntimeError(
                f"Signup for {creds['email']} did not succeed or show an error."
            ) from exc

        if outcome == "accepted":
            return creds

        lowered = outcome.lower()
        if "already registered" in lowered:
            continue
        if "too many requests" in lowered:
            raise RuntimeError(
                "Signup rate limited (429). Restart Flask to clear the limiter, "
                "or reset the database so fewer addresses are already taken."
            )
        raise RuntimeError(f"Signup failed for {creds['email']}: {outcome}")

    raise RuntimeError(
        "Every signup address from rcc000001@example.test through "
        "rcc000099@example.test is already registered."
    )
