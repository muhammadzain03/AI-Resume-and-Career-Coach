import React from "react";
import { MemoryRouter } from "react-router-dom";
import AnalyzePage from "./AnalyzePage";
import {
  uploadResume,
  runAnalysis,
  getAnalysis,
} from "../services/api";
import {
  changeFiles,
  changeValue,
  click,
  renderWithRoot,
} from "../testUtils/renderWithRoot";
import { act } from "react-dom/test-utils";

jest.mock("../services/api", () => ({
  uploadResume: jest.fn(),
  runAnalysis: jest.fn(),
  getAnalysis: jest.fn(),
}));

describe("AnalyzePage", () => {
  let view;

  beforeEach(() => {
    Element.prototype.scrollIntoView = jest.fn();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    if (view) {
      view.unmount();
      view = null;
    }
    jest.restoreAllMocks();
  });

  it("uploads resume, runs analysis, and shows results", async () => {
    uploadResume.mockResolvedValueOnce({ resume_id: 1 });
    runAnalysis.mockResolvedValueOnce({ analysis_id: 42 });
    getAnalysis.mockResolvedValueOnce({
      match_score: 72.5,
      score_breakdown: {
        keyword_match: 65,
        formatting: 80,
        spelling_grammar: 95,
        impact_metrics: 55,
        section_order: 70,
      },
      missing_skills: ["Kubernetes"],
      matched_skills: ["React"],
      suggestions: [
        {
          category: "Missing Keyword",
          section: "Experience",
          text: "Add Kubernetes to your DevOps experience section.",
          priority: "high",
        },
      ],
    });

    view = renderWithRoot(
      <MemoryRouter initialEntries={["/app/analyze"]}>
        <AnalyzePage />
      </MemoryRouter>,
    );

    const fileInput = view.container.querySelector("#analyze-resume");
    const descriptionInput = view.container.querySelector("#analyze-jd");
    const analyzeButton = Array.from(
      view.container.querySelectorAll("button"),
    ).find((b) => b.textContent.includes("Analyze"));

    const validFile = new File(["resume"], "resume.pdf", {
      type: "application/pdf",
    });

    await changeFiles(fileInput, [validFile]);
    await changeValue(
      descriptionInput,
      "We need a frontend engineer with React experience and strong communication skills.",
    );

    await click(analyzeButton);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(uploadResume).toHaveBeenCalledWith(validFile);
    expect(runAnalysis).toHaveBeenCalledWith(
      1,
      "We need a frontend engineer with React experience and strong communication skills.",
    );
    expect(getAnalysis).toHaveBeenCalledWith(42);

    expect(view.container.textContent).toContain("Results");
    // The score ring counts up (animated), so assert on the stable verdict
    // rather than the in-flight number.
    expect(view.container.textContent).toContain("Good match");
    expect(view.container.textContent).toContain("Kubernetes");
    expect(view.container.textContent).toContain("Score Breakdown");
    expect(view.container.textContent).toContain("Missing Keyword");
  });
});
