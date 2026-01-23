from .service import Redactor
from typing import Dict, Any


def redact(req: Dict[str, Any]):
    redactor = Redactor()
    redacted_text, summary = redactor.redact(req)
    # The frontend expects a response with maskedContent, summary, and entities
    return {
        "maskedContent": redacted_text,
        "summary": summary,
        "entities": [],
    }
