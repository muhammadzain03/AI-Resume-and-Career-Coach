import React from "react";
import ResumeUploader from "./ResumeUploader";
import { uploadResume } from "../services/api";
import { WorkflowProvider } from "../context/WorkflowContext";
import {
  changeFiles,
  click,
  renderWithRoot,
} from "../testUtils/renderWithRoot";

jest.mock("../services/api", () => ({
  uploadResume: jest.fn(),
}));

describe("ResumeUploader", () => {
  let view;

  beforeEach(() => {
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    if (view) {
      view.unmount();
      view = null;
    }
    jest.restoreAllMocks();
  });

  it("rejects unsupported file types and keeps upload disabled", async () => {
    view = renderWithRoot(
      <WorkflowProvider>
        <ResumeUploader />
      </WorkflowProvider>,
    );

    const fileInput = view.container.querySelector('input[type="file"]');
    const uploadButton = view.container.querySelector("button");
    const invalidFile = new File(["plain text"], "resume.txt", {
      type: "text/plain",
    });

    expect(uploadButton.disabled).toBe(true);

    await changeFiles(fileInput, [invalidFile]);

    expect(view.container.textContent).toContain("Please upload a PDF or DOCX file.");
    expect(view.container.textContent).not.toContain("Selected: resume.txt");
    expect(uploadButton.disabled).toBe(true);
  });

  it("uploads a valid resume and shows a success message", async () => {
    uploadResume.mockResolvedValueOnce({ resume_id: 1 });

    view = renderWithRoot(
      <WorkflowProvider>
        <ResumeUploader />
      </WorkflowProvider>,
    );

    const fileInput = view.container.querySelector('input[type="file"]');
    const uploadButton = view.container.querySelector("button");
    const validFile = new File(["resume"], "resume.pdf", {
      type: "application/pdf",
    });

    await changeFiles(fileInput, [validFile]);

    expect(view.container.textContent).toContain("Selected: resume.pdf");
    expect(uploadButton.disabled).toBe(false);

    await click(uploadButton);

    expect(uploadResume).toHaveBeenCalledWith(validFile);
    expect(view.container.textContent).toContain("Resume uploaded successfully!");
    expect(uploadButton.textContent).toBe("Upload");
  });
});
