from .core.compressor import compress_image
from .core.metadata import get_image_info


def handle_request(action, data):
    """
    Main entry point for the Image Compressor tool.

    Args:
        action (str): The action to perform ('compress', 'get_info').
        data (dict): The input data containing image bytes and parameters

    Returns:
        dict: The result of the action.
    """
    if action == "compress":
        return compress_image(data)
    elif action == "get_info":
        return get_image_info(data)
    else:
        raise ValueError(f"Unknown action: {action}")
