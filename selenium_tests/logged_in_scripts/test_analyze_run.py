# Run a real analysis. Upload the resume, fill the job title, paste the
# Autodesk job description, and click Analyze Resume.
# This is the only script that calls the LLM, so it needs LLM_API_KEY in backend/.env.

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

from support.auth import login
from support.browser import BASE, make_driver, wait
from support.form import set_react_value

ROOT = Path(__file__).resolve().parents[1]
RESUME = ROOT / "Muhammad Zain Resume - Autodesk.pdf"
JOB_DESCRIPTION = ROOT / "Job Description - Autodesk.txt"


def test_analyze_run():
    driver = make_driver()

    try:
        login(driver)
        driver.get(BASE + "/app/analyze")

        wait(driver).until(
            EC.presence_of_element_located((By.ID, "analyze-resume"))
        ).send_keys(str(RESUME))
        wait(driver).until(
            EC.text_to_be_present_in_element(
                (By.CSS_SELECTOR, ".dropzone__file"), RESUME.name
            )
        )

        set_react_value(driver, "analyze-title", "MCP/AI Developer")
        # Typing the whole description is too slow, so set it directly.
        set_react_value(
            driver, "analyze-jd", JOB_DESCRIPTION.read_text(encoding="utf-8")
        )

        wait(driver).until(
            EC.element_to_be_clickable(
                (By.XPATH, "//button[contains(normalize-space(.), 'Analyze Resume')]")
            )
        ).click()

        # The app is local but the Gemini call is not. Give it up to two minutes.
        score = wait(driver, 120).until(
            EC.visibility_of_element_located((By.CSS_SELECTOR, ".score-ring__num"))
        )
        wait(driver, 120).until(lambda d: score.text.strip().isdigit())

        wait(driver).until(
            EC.text_to_be_present_in_element(
                (By.CSS_SELECTOR, ".score-hero__label"),
                "Overall match against this job description",
            )
        )

    finally:
        driver.quit()


if __name__ == "__main__":
    test_analyze_run()
