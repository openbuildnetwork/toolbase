"""
Base64 Encode/Decode Tool
Handles text and binary data with support for URL-safe encoding and MIME headers.
"""

import base64
import sys
import json


def process_data(input_data: dict) -> dict:
    """
    Process base64 encoding/decoding operations.

    Args:
        input_data: Dictionary containing:
            - mode: 'text_encode', 'text_decode', 'file_encode', 'file_decode'
            - data: The input data (string or bytes)
            - url_safe: Boolean for URL-safe encoding
            - mime_type: Optional MIME type for data URI prefix

    Returns:
        Dictionary with success status, result, and metadata
    """
    try:
        mode = input_data.get("mode")
        data = input_data.get("data")
        url_safe = input_data.get("url_safe", False)
        mime_type = input_data.get("mime_type", "")

        if not mode or data is None:
            return {
                "success": False,
                "error": "Missing required parameters: mode and data",
            }

        # Text Encoding
        if mode == "text_encode":
            text = data if isinstance(data, str) else str(data)
            encoded_bytes = text.encode("utf-8")

            if url_safe:
                result = base64.urlsafe_b64encode(encoded_bytes).decode("ascii")
            else:
                result = base64.b64encode(encoded_bytes).decode("ascii")

            # Add MIME header if requested
            if mime_type:
                result = f"data:{mime_type};base64,{result}"

            return {
                "success": True,
                "result": result,
                "size": len(result),
                "original_size": len(text),
                "is_large": len(result) > 1048576,  # >1MB
            }

        # Text Decoding
        elif mode == "text_decode":
            encoded_str = data if isinstance(data, str) else str(data)

            # Remove MIME header if present
            if encoded_str.startswith("data:"):
                parts = encoded_str.split(",", 1)
                if len(parts) == 2:
                    encoded_str = parts[1]

            # Remove whitespace
            encoded_str = (
                encoded_str.strip().replace("\n", "").replace("\r", "").replace(" ", "")
            )

            try:
                if url_safe:
                    decoded_bytes = base64.urlsafe_b64decode(encoded_str)
                else:
                    decoded_bytes = base64.b64decode(encoded_str)

                try:
                    result = decoded_bytes.decode("utf-8")
                    is_binary = False
                except UnicodeDecodeError:
                    # If it's not valid UTF-8 (e.g., an image), return binary bytes
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

        # File Encoding
        elif mode == "file_encode":
            # data should be bytes or list of bytes
            if isinstance(data, list):
                file_bytes = bytes(data)
            elif isinstance(data, bytes):
                file_bytes = data
            else:
                return {"success": False, "error": "File data must be bytes"}

            if url_safe:
                result = base64.urlsafe_b64encode(file_bytes).decode("ascii")
            else:
                result = base64.b64encode(file_bytes).decode("ascii")

            # Add MIME header if requested
            if mime_type:
                result = f"data:{mime_type};base64,{result}"

            is_large = len(result) > 1048576
            preview = result[:500] + "..." if is_large else result

            return {
                "success": True,
                "result": result,  # Always return the full result for download
                "preview": preview,
                "size": len(result),
                "original_size": len(file_bytes),
                "is_large": is_large,
            }

        # File Decoding
        elif mode == "file_decode":
            encoded_str = data if isinstance(data, str) else str(data)

            # Remove MIME header if present
            if encoded_str.startswith("data:"):
                parts = encoded_str.split(",", 1)
                if len(parts) == 2:
                    encoded_str = parts[1]

            # Remove whitespace
            encoded_str = (
                encoded_str.strip().replace("\n", "").replace("\r", "").replace(" ", "")
            )

            try:
                if url_safe:
                    decoded_bytes = base64.urlsafe_b64decode(encoded_str)
                else:
                    decoded_bytes = base64.b64decode(encoded_str)

                # Return as list of integers (bytes)
                result = list(decoded_bytes)
                is_large = len(result) > 1048576

                return {
                    "success": True,
                    "result": result,
                    "size": len(result),
                    "original_size": len(encoded_str),
                    "is_large": is_large,
                }
            except Exception as e:
                return {"success": False, "error": f"Invalid Base64 string: {str(e)}"}

        else:
            return {"success": False, "error": f"Unknown mode: {mode}"}

    except Exception as e:
        return {"success": False, "error": f"Processing error: {str(e)}"}


if __name__ == "__main__":
    # For testing
    test_data = {
        "mode": "text_encode",
        "data": "Hello, World!",
        "url_safe": False,
        "mime_type": "",
    }
    result = process_data(test_data)
    print(json.dumps(result, indent=2))
