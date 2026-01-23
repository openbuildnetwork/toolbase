import os
from typing import List, Tuple, Dict, Any
from .scanners import (
    EmailScanner,
    GenericAPIKeyScanner,
    IPv4Scanner,
    SmartEntropyScanner,
    UserDefinedScanner,
    CustomRegexScanner,
)
from .secret_scanner import SecretScanner
from .schemas import RedactRequest
import json



class Redactor:
    def __init__(self, base_scanners: List["SecretScanner"] | None = None):
        # dependency injection → easier testing & extension
        self.base_scanners = base_scanners or [
            EmailScanner(),
            GenericAPIKeyScanner(),
            IPv4Scanner(),
            SmartEntropyScanner(),
        ]

    def redact(self, request: Dict[str, Any]) -> Tuple[str, Dict[str, Any]]:
        # logger.debug("Redaction request received: %s", json.dumps(request, indent=2))

        content: str = request.get("content") or ""
        scanners = self._build_scanners(request)

        summary = {
            "totalMasked": 0,
            "byType": {},
        }

        redacted_text = content

        for scanner in scanners:
            redacted_text, count = scanner.scan_and_redact(redacted_text)

            if count:
                summary["totalMasked"] += count
                summary["byType"][scanner.name] = (
                    summary["byType"].get(scanner.name, 0) + count
                )

        return redacted_text, summary

    # -------------------------
    # private helpers
    # -------------------------

    def _build_scanners(self, request: Dict[str, Any]) -> List["SecretScanner"]:
        scanners = list(self.base_scanners)

        configs = request.get("customConfigurations") or {}
        hints = configs.get("userHints") or {}

        keys = hints.get("keys", [])
        literal_texts = hints.get("literalTexts", [])
        regex_patterns = hints.get("regexPatterns", [])

        if keys:
            scanners.append(SmartEntropyScanner(keys))

        if literal_texts:
            scanners.append(UserDefinedScanner(literal_texts))

        if regex_patterns:
            scanners.append(CustomRegexScanner(regex_patterns))

        return scanners


    def redact_file(self, input_path: str, output_path: str, request: RedactRequest):
        if not os.path.exists(input_path):
            print(f"Error: File {input_path} not found.")
            return

        with open(input_path, "r", encoding="utf-8") as f:
            content = f.read()

        cleaned_content = self.redact(request)

        with open(output_path, "w", encoding="utf-8") as f:
            f.write(cleaned_content)
        print(f"Success: Redacted file saved to {output_path}")
