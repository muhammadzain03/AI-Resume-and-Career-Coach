import os
from pathlib import Path

from selenium import webdriver
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

_ENV = Path(__file__).resolve().parent.parent / ".env"


def _base_url():
    for line in _ENV.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        if key.strip() == "BASE_URL":
            return value.strip().strip("\"'").rstrip("/")
    raise RuntimeError(f"BASE_URL missing in {_ENV}")


BASE = os.environ.get("BASE_URL", "").rstrip("/") or _base_url()


def make_driver():
    driver = webdriver.Chrome()
    driver.set_window_size(1400, 900)
    return driver


def wait(driver, seconds=20):
    return WebDriverWait(driver, seconds)


def open_fresh(driver, path):
    if not path.startswith("/"):
        path = "/" + path
    # Storage APIs only work once the driver is already on the app origin.
    driver.get(BASE + "/")
    driver.delete_all_cookies()
    driver.execute_script("window.localStorage.clear();")
    driver.get(BASE + path)


def wait_url_contains(driver, part, timeout=20):
    WebDriverWait(driver, timeout).until(EC.url_contains(part))
