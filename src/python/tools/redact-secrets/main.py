from .schemas import RedactRequest
from .service import Redactor


def redact(req: RedactRequest):
    redactor = Redactor()
    redacted_text, summary = redactor.redact(req)
    # The frontend expects a response with maskedContent, summary, and entities
    return {
        "maskedContent": redacted_text,
        "summary": summary,
        "entities": [],
    }


# def redact_content(content, contentType, style, userHints, logOptions):
#     req = RedactRequest(
#         content=content,
#         contentType=contentType,
#         style=style,
#         userHints=userHints,
#         logOptions=logOptions,
#     )
#     return redact(req)
