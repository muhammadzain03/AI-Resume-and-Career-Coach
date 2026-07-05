import React from "react";
import { MemoryRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { renderWithRoot } from "./testUtils/renderWithRoot";

jest.mock("./services/api", () => ({
  getMe: jest.fn(),
  clearAuthSession: jest.fn(),
  setAuthSession: jest.fn(),
  getStoredUser: jest.fn(() => null),
  loginUser: jest.fn(),
  registerUser: jest.fn(),
  googleAuth: jest.fn(),
  uploadResume: jest.fn(),
  runAnalysis: jest.fn(),
  getAnalysis: jest.fn(),
  getHistory: jest.fn().mockResolvedValue({ history: [] }),
}));

const { getMe, getStoredUser } = require("./services/api");

function renderApp(initialEntry = "/") {
  return renderWithRoot(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("App", () => {
  let view;

  beforeEach(() => {
    getMe.mockReset();
    getStoredUser.mockReturnValue(null);
  });

  afterEach(() => {
    if (view) {
      view.unmount();
      view = null;
    }
    localStorage.clear();
  });

  it("renders the landing page with site nav links", async () => {
    view = renderApp("/");

    expect(document.body.textContent).toContain("Build smarter resumes");

    const navLinks = Array.from(
      document.querySelectorAll(".site-nav__links a"),
    ).map((link) => ({
      text: link.textContent.trim(),
      href: link.getAttribute("href"),
    }));

    expect(navLinks).toEqual([
      { text: "Features", href: "/#features" },
      { text: "How it works", href: "/#how-it-works" },
      { text: "Pricing", href: "/#pricing" },
      { text: "FAQ", href: "/#faq" },
    ]);

    expect(document.querySelector(".site-nav__cta")?.textContent).toContain(
      "Sign in",
    );
  });

  it("redirects unauthenticated users away from the dashboard", async () => {
    getMe.mockRejectedValueOnce(new Error("unauthorized"));

    view = renderApp("/app");

    await new Promise((r) => setTimeout(r, 50));

    expect(document.body.textContent).toContain("Welcome back to RCC");
  });

  it("renders the dashboard when authenticated", async () => {
    getStoredUser.mockReturnValue({
      id: 1,
      email: "user@example.com",
      email_verified: true,
    });
    getMe.mockResolvedValueOnce({
      user: { id: 1, email: "user@example.com", email_verified: true, name: "User" },
    });

    view = renderApp("/app");

    await new Promise((r) => setTimeout(r, 80));

    expect(document.body.textContent).toContain("Overview");
  });
});
