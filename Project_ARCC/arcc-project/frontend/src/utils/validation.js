export const MAX_RESUME_FILE_SIZE_BYTES = 4 * 1024 * 1024;

const ALLOWED_RESUME_FILE_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export function validateResumeFile(file) {
  if (!file) {
    return "Please select a file first.";
  }

  if (!ALLOWED_RESUME_FILE_TYPES.has(file.type)) {
    return "Please upload a PDF or DOCX file.";
  }

  if (file.size === 0) {
    return "Selected file is empty.";
  }

  if (file.size > MAX_RESUME_FILE_SIZE_BYTES) {
    return "File size must be less than 4MB.";
  }

  return null;
}

export function validateRequiredText(value, label, minLength = 1) {
  const trimmed = (value || "").trim();
  if (!trimmed) {
    return `${label} is required.`;
  }
  if (trimmed.length < minLength) {
    return `${label} must be at least ${minLength} characters.`;
  }
  return null;
}
