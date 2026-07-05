import logging
import os
import tempfile

from docx import Document

logger = logging.getLogger(__name__)


def _extract_pdf(path):
    """
    Layout-aware extraction first (pdfplumber), falling back to pypdf.

    pdfplumber preserves reading order on multi-column resumes far better than
    pypdf, which otherwise scrambles the text fed to the scorer.
    """
    text = ""
    try:
        import pdfplumber

        with pdfplumber.open(path) as pdf:
            parts = []
            for page in pdf.pages:
                parts.append(page.extract_text() or "")
            text = "\n".join(parts).strip()
    except Exception:
        logger.warning("pdfplumber extraction failed; falling back to pypdf.", exc_info=True)
        text = ""

    if not text:
        try:
            from pypdf import PdfReader

            reader = PdfReader(path)
            text = "\n".join((p.extract_text() or "") for p in reader.pages).strip()
        except Exception:
            logger.exception("pypdf extraction failed.")
            text = ""

    return text


def _extract_docx(path):
    doc = Document(path)
    return "\n".join(p.text for p in doc.paragraphs).strip()


def looks_extractable(text: str) -> bool:
    """
    Heuristic guard: does this look like real, readable resume text?

    Catches the two silent killers - scanned/image-only PDFs (almost no text)
    and scrambled multi-column extracts (low ratio of alphabetic words) - so we
    never compute a confident-looking score on garbage.
    """
    t = (text or "").strip()
    if len(t) < 200:  # almost no text -> likely scanned/empty
        return False
    words = t.split()
    if len(words) < 50:
        return False
    alpha = sum(1 for w in words if any(c.isalpha() for c in w))
    return (alpha / max(len(words), 1)) > 0.6


def parse_resume_file(path):
    ext = os.path.splitext(path)[1].lower()
    if ext == ".pdf":
        raw_text = _extract_pdf(path)
    elif ext == ".docx":
        raw_text = _extract_docx(path)
    elif ext == ".txt":
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            raw_text = f.read().strip()
    else:
        raise ValueError("Unsupported file type. Use PDF, DOCX, or TXT.")

    return {
        "raw_text": raw_text,
        "extractable": looks_extractable(raw_text),
        "skills": [],
        "experience": [],
        "education": [],
    }


def parse_resume(file_obj):
    """
    Compatibility wrapper used by current resume route.
    Saves uploaded file to a temp file, parses by extension, then deletes temp file.
    """
    filename = getattr(file_obj, "filename", "") or "resume.txt"
    ext = os.path.splitext(filename)[1].lower() or ".txt"

    fd, temp_path = tempfile.mkstemp(suffix=ext)
    os.close(fd)
    try:
        file_obj.save(temp_path)
        return parse_resume_file(temp_path)
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)
