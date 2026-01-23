from typing import List, Optional, Dict, Any, Literal
from dataclasses import dataclass


@dataclass
class UserHint:
    keys: Optional[List[str]] = None
    literalTexts: Optional[List[str]] = None
    regexPatterns: Optional[List[str]] = None


@dataclass
class customConfigurations:
    style: str = "full"
    userHints: Optional[UserHint] = None


@dataclass
class RedactRequest:
    content: str
    contentType: str = "text"
    customConfigurations: Optional[customConfigurations] = None
