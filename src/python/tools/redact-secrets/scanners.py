import re
import math
import hashlib
from typing import Tuple, Optional, List
from .secret_scanner import SecretScanner

# --- Helper for Masking ---


def mask_text(text: str, style: str = "full") -> str:
    if style == "full":
        return "[REDACTED]"
    elif style == "partial":
        if len(text) <= 4:
            return "*" * len(text)
        return text[:2] + "..." + text[-2:]
    elif style == "hash":
        return hashlib.sha256(text.encode()).hexdigest()[:12] + "..."
    return "[REDACTED]"


# --- 1. Standard Pattern Scanners ---


class EmailScanner(SecretScanner):
    def __init__(self, style="full"):
        self.style = style

    @property
    def name(self):
        return "Email Address"

    def scan_and_redact(self, text: str) -> Tuple[str, int]:
        pattern = r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+"

        def repl(match):
            return mask_text(match.group(0), self.style)

        return re.subn(pattern, repl, text)


class GenericAPIKeyScanner(SecretScanner):
    def __init__(self, style="full"):
        self.style = style

    @property
    def name(self):
        return "Generic API Key"

    def scan_and_redact(self, text: str) -> Tuple[str, int]:
        pattern = r'(?i)(api_key|secret|password|token|auth|aws_access|aws_secret)\s*[:=]\s*["\']?([a-zA-Z0-9_\-/+=]{12,})["\']?'

        def repl(match):
            # match.group(1) is the key name, group(2) is the value
            # We want to keep the key name but mask the value
            masked = mask_text(match.group(2), self.style)
            return f'{match.group(1)}="{masked}"'

        return re.subn(pattern, repl, text)


class IPv4Scanner(SecretScanner):
    def __init__(self, style="full"):
        self.style = style

    @property
    def name(self):
        return "IPv4 Address"

    def scan_and_redact(self, text: str) -> Tuple[str, int]:
        pattern = r"\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b"

        def repl(match):
            return mask_text(match.group(0), self.style)

        return re.subn(pattern, repl, text)


# --- 2. Smart & Dynamic Scanners ---


class SmartEntropyScanner(SecretScanner):
    def __init__(self, keys: Optional[List[str]] = None, threshold=3.5, style="full"):
        self.style = style
        self.threshold = threshold
        self.context_keywords = [
            "key",
            "secret",
            "token",
            "password",
            "aws",
            "auth",
            "credential",
        ]
        if keys:
            self.context_keywords.extend(keys)

    @property
    def name(self):
        return "Smart Entropy Detector"

    def _calculate_entropy(self, data):
        if not data:
            return 0
        entropy = 0
        for x in range(256):
            p_x = float(data.count(chr(x))) / len(data)
            if p_x > 0:
                entropy += -p_x * math.log(p_x, 2)
        return entropy

    def scan_and_redact(self, text: str) -> Tuple[str, int]:
        tokens = re.findall(r"[\w/+=]{8,}", text)
        redacted_text = text
        count = 0
        for token in set(tokens):
            entropy = self._calculate_entropy(token)
            if entropy > self.threshold:
                idx = text.find(token)
                context_area = text[max(0, idx - 30) : idx].lower()
                is_near_context = any(
                    kw in context_area for kw in self.context_keywords
                )

                if is_near_context or entropy > 4.5:
                    redacted_text = redacted_text.replace(
                        token, mask_text(token, self.style)
                    )
                    count += 1
        return redacted_text, count


class UserDefinedScanner(SecretScanner):
    def __init__(self, items_to_hide: list, style="full"):
        self.style = style
        self.items = [re.escape(str(item)) for item in items_to_hide if item]

    @property
    def name(self):
        return "User Defined"

    def scan_and_redact(self, text: str) -> Tuple[str, int]:
        if not self.items:
            return text, 0
        pattern = r"(" + "|".join(self.items) + r")"

        def repl(match):
            return mask_text(match.group(0), self.style)

        return re.subn(pattern, repl, text)


class CustomRegexScanner(SecretScanner):
    def __init__(self, patterns: list, style="full"):
        self.style = style
        self.valid_patterns = []
        for p in patterns:
            try:
                re.compile(p)
                self.valid_patterns.append(p)
            except re.error:
                continue

    @property
    def name(self):
        return "Custom Regex"

    def scan_and_redact(self, text: str) -> Tuple[str, int]:
        redacted_text = text
        total_count = 0
        for pattern in self.valid_patterns:
            try:

                def repl(match):
                    return mask_text(match.group(0), self.style)

                redacted_text, count = re.subn(pattern, repl, redacted_text)
                total_count += count
            except Exception:
                continue
        return redacted_text, total_count
