import React from "react";
import App from "./App";
import { renderWithRoot } from "./testUtils/renderWithRoot";

describe("App", () => {
  let view;

  afterEach(() => {
    if (view) {
      view.unmount();
      view = null;
    }
    window.history.pushState({}, "", "/");
  });

  it("renders the shared layout and the matching route content", () => {
    window.history.pushState({}, "", "/job");

    view = renderWithRoot(<App />);

    expect(document.body.textContent).toContain("ARCC - AI Resume and Career Coach");
    expect(document.body.textContent).toContain("Enter Job Details");
    expect(document.body.textContent).toContain("ARCC Project");

    const links = Array.from(document.querySelectorAll("aside a")).map((link) => ({
      text: link.textContent,
      href: link.getAttribute("href"),
    }));

    expect(links).toEqual([
      { text: "Home", href: "/" },
      { text: "Dashboard", href: "/dashboard" },
      { text: "Upload Resume", href: "/upload" },
      { text: "Job Description", href: "/job" },
      { text: "Results", href: "/history" },
      { text: "Interview", href: "/interview" },
    ]);
  });
});
