import io
from PIL import Image

def get_image_info(data):
    """
    Extracts metadata from an image.
    
    Args:
        data (dict): Contains 'image_data' (bytes).
        
    Returns:
        dict: Image metadata (format, width, height, mode).
    """
    try:
        image_bytes = bytes(data.get('image_data'))
        img = Image.open(io.BytesIO(image_bytes))
        
        return {
            "format": img.format,
            "width": img.width,
            "height": img.height,
            "mode": img.mode,
            "size_bytes": len(image_bytes)
        }
    except Exception as e:
        return {"error": str(e)}
