"""
Speech-to-text stub (Phase 5 — STT later).

Pass-through for now. Wire Whisper / Google STT / etc. when ready.
Browser Web Speech API is a good first option — send transcript text straight to /answer.
"""

import logging

logger = logging.getLogger(__name__)


def transcribe(audio_bytes: bytes, mime_type: str = "audio/webm") -> dict:
    """
    audio_bytes: raw upload from the client
    mime_type:   client-reported MIME type

    Returns { text, provider, confidence } for the client to forward to /answer.
    """
    _ = mime_type  # reserved for real STT
    _ = len(audio_bytes or b"")
    logger.warning("STT transcribe called but no provider is configured — empty text")
    return {
        "text": "",
        "provider": "stub",
        "confidence": None,
    }
