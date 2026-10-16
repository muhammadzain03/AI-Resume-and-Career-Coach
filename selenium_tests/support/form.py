from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

try:
    from support.browser import wait
except ImportError:
    from browser import wait


def set_react_value(driver, element_id, text):
    """Set a React controlled input or textarea without send_keys."""
    el = wait(driver).until(EC.presence_of_element_located((By.ID, element_id)))
    driver.execute_script(
        """
        const el = arguments[0];
        const value = arguments[1];
        const proto = el.tagName === "TEXTAREA"
            ? window.HTMLTextAreaElement.prototype
            : window.HTMLInputElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(proto, "value").set;
        setter.call(el, value);
        el.dispatchEvent(new Event("input", { bubbles: true }));
        """,
        el,
        text,
    )
