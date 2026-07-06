import {
  NETWORK_ERROR_MESSAGE,
  normalizeApiError,
  toUserMessage,
} from "./errors";

describe("normalizeApiError", () => {
  it("maps database errors to a friendly server message", () => {
    expect(normalizeApiError({ error: "Database error" }, 500)).toBe(
      "Something went wrong on our end. Please try again in a moment.",
    );
  });

  it("uses the server message for machine-readable error codes", () => {
    expect(
      normalizeApiError(
        {
          error: "low_text_extraction",
          message: "We couldn't read enough text from this file.",
        },
        422,
      ),
    ).toBe(
      "We couldn't read enough text from this file. Try a text-based PDF or DOCX instead of a scanned image.",
    );
  });

  it("maps API not-found copy", () => {
    expect(normalizeApiError({ error: "resume not found" }, 404)).toBe(
      "We couldn't find that resume. Try uploading it again.",
    );
  });

  it("falls back from bare HTTP statuses", () => {
    expect(normalizeApiError({}, 500)).toBe(
      "Something went wrong on our end. Please try again in a moment.",
    );
  });
});

describe("toUserMessage", () => {
  it("maps network failures", () => {
    const err = new Error(NETWORK_ERROR_MESSAGE);
    err.status = 0;
    expect(toUserMessage(err)).toBe(NETWORK_ERROR_MESSAGE);
  });

  it("maps legacy backend URL copy", () => {
    expect(
      toUserMessage(
        new Error("Can't reach the server. Make sure the backend is running on http://localhost:5000"),
      ),
    ).toBe(NETWORK_ERROR_MESSAGE);
  });

  it("maps local upload failures", () => {
    expect(toUserMessage(new Error("upload_failed"))).toBe(
      "Something went wrong on our end. Please try again in a moment.",
    );
  });
});
