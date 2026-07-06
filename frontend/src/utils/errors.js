export const NETWORK_ERROR_MESSAGE =
  "We're having trouble connecting. Please check your internet and try again in a moment.";

const GENERIC_ERROR = "Something went wrong. Please try again.";

const SERVER_ERROR =
  "Something went wrong on our end. Please try again in a moment.";

const PARSE_ERROR_MESSAGE =
  "That file wouldn't parse. Try a text-based PDF or a DOCX - scanned images won't work.";

const LOCAL_ERROR_MESSAGES = {
  upload_failed: SERVER_ERROR,
  analysis_failed: "We couldn't finish the analysis. Please try again.",
};

const ERROR_CODE_MESSAGES = {
  low_text_extraction:
    "We couldn't read enough text from this file. Try a text-based PDF or DOCX instead of a scanned image.",
  rate_limited: "Too many requests. Please wait a moment and try again.",
};

const ERROR_TEXT_MESSAGES = {
  "database error": SERVER_ERROR,
  "resume not found": "We couldn't find that resume. Try uploading it again.",
  "analysis not found": "We couldn't find that analysis.",
  "failed to parse resume": PARSE_ERROR_MESSAGE,
  "google sign-in is not configured on the server":
    "Google sign-in isn't available right now. Try signing in with email and password.",
  "analysis failed": "We couldn't finish the analysis. Please try again.",
  "resume has no extracted text":
    "We couldn't read text from that resume. Try uploading a text-based PDF or DOCX.",
  "user not found": "We couldn't find your account. Please sign in again.",
  "invalid google credential":
    "Google sign-in didn't work. Please try again or use email and password.",
};

function isMachineCode(value) {
  return /^[a-z][a-z0-9_]*$/.test(value);
}

function statusFallback(status) {
  if (status === 401) return "Invalid credentials.";
  if (status === 403) return "You don't have permission to do that.";
  if (status === 404) return "We couldn't find what you were looking for.";
  if (status === 409) return "That email is already registered.";
  if (status === 413) return "That file is too large. Please use a file under 4 MB.";
  if (status === 422) return PARSE_ERROR_MESSAGE;
  if (status === 429) return ERROR_CODE_MESSAGES.rate_limited;
  if (status >= 500) return SERVER_ERROR;
  return GENERIC_ERROR;
}

/** Map a failed API JSON body + HTTP status to user-facing copy. */
export function normalizeApiError(data = {}, status = 0) {
  const code = String(data.error || "").trim();
  const serverMessage = String(data.message || "").trim();

  if (code && ERROR_CODE_MESSAGES[code]) {
    return ERROR_CODE_MESSAGES[code];
  }

  if (code && serverMessage && isMachineCode(code)) {
    return serverMessage;
  }

  const mapped = ERROR_TEXT_MESSAGES[code.toLowerCase()];
  if (mapped) return mapped;

  if (code && !code.startsWith("HTTP ") && !isMachineCode(code)) {
    return code;
  }

  if (code && isMachineCode(code)) {
    return GENERIC_ERROR;
  }

  return statusFallback(status);
}

const LEGACY_NETWORK_SNIPPETS = [
  "make sure the backend is running",
  "can't reach the server",
];

/** Normalize any caught Error (API, network, or local) for display in the UI. */
export function toUserMessage(err) {
  if (!err) return GENERIC_ERROR;

  const msg = String(err.message || "").trim();
  if (!msg) return GENERIC_ERROR;

  if (LOCAL_ERROR_MESSAGES[msg]) {
    return LOCAL_ERROR_MESSAGES[msg];
  }

  const lower = msg.toLowerCase();
  if (
    err.status === 0 ||
    LEGACY_NETWORK_SNIPPETS.some((snippet) => lower.includes(snippet))
  ) {
    return NETWORK_ERROR_MESSAGE;
  }

  if (msg.startsWith("HTTP ")) {
    return statusFallback(err.status || 0);
  }

  if (/no resume id returned/i.test(msg) || /no analysis id returned/i.test(msg)) {
    return SERVER_ERROR;
  }

  if (/upload failed/i.test(msg) && /id returned/i.test(msg)) {
    return SERVER_ERROR;
  }

  return msg;
}
