import base64


class Base64Processor:
    """
    Class to handle Base64 encoding and decoding operations.
    Follows OOP principles to encapsulate logic.
    """

    def __init__(self, request: dict):
        self.mode = request.get("mode")
        self.data = request.get("data")
        self.url_safe = request.get("url_safe", False)
        self.mime_type = request.get("mime_type", "")

    def process(self) -> dict:
        """Dispatcher method to handle different modes."""
        if not self.mode or self.data is None:
            return {
                "success": False,
                "error": "Missing required parameters: mode and data",
            }

        if self.mode == "text_encode":
            return self._text_encode()
        elif self.mode == "text_decode":
            return self._text_decode()
        elif self.mode == "file_encode":
            return self._file_encode()
        elif self.mode == "file_decode":
            return self._file_decode()
        else:
            return {"success": False, "error": f"Unknown mode: {self.mode}"}

    def _text_encode(self) -> dict:
        text = self.data if isinstance(self.data, str) else str(self.data)
        encoded_bytes = text.encode("utf-8")

        if self.url_safe:
            result = base64.urlsafe_b64encode(encoded_bytes).decode("ascii")
        else:
            result = base64.b64encode(encoded_bytes).decode("ascii")

        if self.mime_type:
            result = f"data:{self.mime_type};base64,{result}"

        return {
            "success": True,
            "result": result,
            "size": len(result),
            "original_size": len(text),
            "is_large": len(result) > 1048576,
        }

    def _text_decode(self) -> dict:
        encoded_str = self.data if isinstance(self.data, str) else str(self.data)
        encoded_str = self._clean_base64_string(encoded_str)

        try:
            if self.url_safe:
                decoded_bytes = base64.urlsafe_b64decode(encoded_str)
            else:
                decoded_bytes = base64.b64decode(encoded_str)

            try:
                result = decoded_bytes.decode("utf-8")
                is_binary = False
            except UnicodeDecodeError:
                result = list(decoded_bytes)
                is_binary = True

            return {
                "success": True,
                "result": result,
                "is_binary": is_binary,
                "size": len(result),
                "original_size": len(encoded_str),
                "is_large": len(result) > 1048576,
            }
        except Exception as e:
            return {"success": False, "error": f"Invalid Base64 string: {str(e)}"}

    def _file_encode(self) -> dict:
        if isinstance(self.data, list):
            file_bytes = bytes(self.data)
        elif isinstance(self.data, bytes):
            file_bytes = self.data
        else:
            return {"success": False, "error": "File data must be bytes"}

        if self.url_safe:
            result = base64.urlsafe_b64encode(file_bytes).decode("ascii")
        else:
            result = base64.b64encode(file_bytes).decode("ascii")

        if self.mime_type:
            result = f"data:{self.mime_type};base64,{result}"

        is_large = len(result) > 1048576
        preview = result[:500] + "..." if is_large else result

        return {
            "success": True,
            "result": result,
            "preview": preview,
            "size": len(result),
            "original_size": len(file_bytes),
            "is_large": is_large,
        }

    def _file_decode(self) -> dict:
        encoded_str = self.data if isinstance(self.data, str) else str(self.data)
        encoded_str = self._clean_base64_string(encoded_str)

        try:
            if self.url_safe:
                decoded_bytes = base64.urlsafe_b64decode(encoded_str)
            else:
                decoded_bytes = base64.b64decode(encoded_str)

            result = list(decoded_bytes)
            return {
                "success": True,
                "result": result,
                "size": len(result),
                "original_size": len(encoded_str),
                "is_large": len(result) > 1048576,
            }
        except Exception as e:
            return {"success": False, "error": f"Invalid Base64 string: {str(e)}"}

    def _clean_base64_string(self, s: str) -> str:
        """Helper to remove headers and whitespace."""
        if s.startswith("data:"):
            parts = s.split(",", 1)
            if len(parts) == 2:
                s = parts[1]
        return s.strip().replace("\n", "").replace("\r", "").replace(" ", "")


def process_data(input_data: dict) -> dict:
    processor = Base64Processor(input_data)
    return processor.process()
