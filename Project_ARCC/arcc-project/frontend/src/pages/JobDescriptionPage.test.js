import React from "react";
import { MemoryRouter } from "react-router-dom";
import JobDescriptionPage from "./JobDescriptionPage";
import { WorkflowProvider } from "../context/WorkflowContext";
import { runAnalysis } from "../services/api";
import {
  changeValue,
  click,
  renderWithRoot,
} from "../testUtils/renderWithRoot";

jest.mock("../services/api", () => ({
  runAnalysis: jest.fn(),
}));

describe("JobDescriptionPage", () => {
  let view;

  beforeEach(() => {
    localStorage.setItem("resume_id", "1");
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    if (view) {
      view.unmount();
      view = null;
    }
    localStorage.clear();
    jest.restoreAllMocks();
  });

  it("submits the entered job title and description", async () => {
    runAnalysis.mockResolvedValueOnce({ analysis_id: 42 });

    view = renderWithRoot(
      <MemoryRouter initialEntries={["/job"]}>
        <WorkflowProvider>
          <JobDescriptionPage />
        </WorkflowProvider>
      </MemoryRouter>,
    );

    const titleInput = view.container.querySelector('input[placeholder="Job Title"]');
    const descriptionInput = view.container.querySelector(
      'textarea[placeholder="Job Description"]',
    );
    const submitButton = view.container.querySelector('button[type="submit"]');

    await changeValue(titleInput, "Frontend Developer");
    await changeValue(
      descriptionInput,
      "Build accessible React interfaces and collaborate on testing.",
    );
    await click(submitButton);

    expect(runAnalysis).toHaveBeenCalledWith(
      "1",
      "Build accessible React interfaces and collaborate on testing.",
      null,
    );
  });
});
