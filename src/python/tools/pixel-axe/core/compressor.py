import io
from PIL import Image, ImageOps

def compress_image(data):
    """
    Compresses an image based on the provided parameters.
    
    Args:
        data (dict): Contains 'image_data' (bytes), 'quality' (int), 'format' (str), 'resize_factor' (float).
        
    Returns:
        bytes: The compressed image bytes.
    """
    try:
        image_bytes = bytes(data.get('image_data'))
        quality = int(data.get('quality', 80))
        target_format = data.get('format', 'JPEG').upper()
        resize_factor = float(data.get('resize_factor', 1.0))
        
        # Open image from bytes
        img = Image.open(io.BytesIO(image_bytes))
        
        # Bake EXIF orientation
        img = ImageOps.exif_transpose(img)
        
        # Resize if needed
        if resize_factor != 1.0:
            new_width = int(img.width * resize_factor)
            new_height = int(img.height * resize_factor)
            img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
            
        # Handle transparency for JPEG
        if target_format == 'JPEG' and img.mode in ('RGBA', 'P'):
            img = img.convert('RGB')
            
        # Save to bytes
        output_buffer = io.BytesIO()
        save_args = {'quality': quality}
        
        if target_format == 'WEBP':
            save_args['method'] = 6  # Best compression
            
        img.save(output_buffer, format=target_format, **save_args)
        return output_buffer.getvalue()
        
    except Exception as e:
        return {"error": str(e)}
