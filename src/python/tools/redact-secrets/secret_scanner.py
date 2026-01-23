from abc import ABC, abstractmethod
from typing import Tuple


class SecretScanner(ABC):
    """
    Abstract base class for all secret scanners.
    To add a new secret type, simply inherit from this class.
    """

    @property
    @abstractmethod
    def name(self) -> str:
        pass

    @abstractmethod
    def scan_and_redact(self, text: str) -> Tuple[str, int]:
        pass
