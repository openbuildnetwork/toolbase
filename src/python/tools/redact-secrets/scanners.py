import re
import math
from typing import Tuple, Optional, List
from .secret_scanner import SecretScanner

# --- 1. Standard Pattern Scanners ---


class EmailScanner(SecretScanner):
    @property
    def name(self):
        return "Email Address"

    def scan_and_redact(self, text: str) -> Tuple[str, int]:
        pattern = r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+"
        return re.subn(pattern, "[EMAIL_REDACTED]", text)


class GenericAPIKeyScanner(SecretScanner):
    @property
    def name(self):
        return "Generic API Key"

    def scan_and_redact(self, text: str) -> Tuple[str, int]:
        pattern = r'(?i)(api_key|secret|password|token|auth|aws_access|aws_secret)\s*[:=]\s*["\']?([a-zA-Z0-9_\-/+=]{12,})["\']?'
        return re.subn(pattern, r'\1="[SECRET_REDACTED]"', text)


class IPv4Scanner(SecretScanner):
    @property
    def name(self):
        return "IPv4 Address"

    def scan_and_redact(self, text: str) -> Tuple[str, int]:
        pattern = r"\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b"
        return re.subn(pattern, "[IP_REDACTED]", text)


# --- 2. Smart & Dynamic Scanners ---


class SmartEntropyScanner(SecretScanner):
    def __init__(self, keys: Optional[List[str]] = None, threshold=3.5):

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
                    redacted_text = redacted_text.replace(token, "[SMART_REDACTED]")
                    count += 1
        return redacted_text, count


class UserDefinedScanner(SecretScanner):
    def __init__(self, items_to_hide: list):
        self.items = [re.escape(str(item)) for item in items_to_hide if item]

    @property
    def name(self):
        return "User Defined"

    def scan_and_redact(self, text: str) -> Tuple[str, int]:
        if not self.items:
            return text, 0
        pattern = r"(" + "|".join(self.items) + r")"
        return re.subn(pattern, "[USER_REDACTED]", text)


class CustomRegexScanner(SecretScanner):
    def __init__(self, patterns: list):
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
                redacted_text, count = re.subn(
                    pattern, "[REGEX_REDACTED]", redacted_text
                )
                total_count += count
            except Exception:
                continue
        return redacted_text, total_count
