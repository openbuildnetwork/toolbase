import io
from PIL import Image, ImageOps, ImageEnhance, ImageFilter

# Disable decompression bomb error for large upscales
Image.MAX_IMAGE_PIXELS = None


def compress_image(data):
    """
    Compresses an image based on the provided parameters.

    Args:
        data (dict): Contains 'image_data' (bytes), 'quality' (int), 'format' (str), 'resize_factor' (float).

    Returns:
        bytes: The compressed image bytes.
    """
    try:
        image_bytes = bytes(data.get("image_data"))
        quality = int(data.get("quality", 80))
        target_format = data.get("format", "JPEG").upper()
        resize_factor = float(data.get("resize_factor", 1.0))

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
        if target_format == "JPEG" and img.mode in ("RGBA", "P"):
            img = img.convert("RGB")

        # Convert to RGBA if processing is needed to ensure filters work
        if (
            data.get("denoise")
            or data.get("vibrant")
            or (data.get("enhance") and resize_factor > 1.0)
        ) and img.mode not in ("RGB", "RGBA"):
            img = img.convert("RGBA")

        # Denoise
        if data.get("denoise"):
            img = img.filter(ImageFilter.MedianFilter(size=3))

        # Vibrant
        if data.get("vibrant"):
            # Boost color saturation
            color_enhancer = ImageEnhance.Color(img)
            img = color_enhancer.enhance(1.2)
            # Slight contrast boost
            contrast_enhancer = ImageEnhance.Contrast(img)
            img = contrast_enhancer.enhance(1.05)

        # Apply enhancement (Sharpening) if requested
        if data.get("enhance") and resize_factor > 1.0:
            if img.mode in ("RGBA", "LA") or (
                img.mode == "P" and "transparency" in img.info
            ):
                # Separate alpha to avoid sharpening it
                if img.mode != "RGBA":
                    try:
                        img = img.convert("RGBA")
                    except Exception:
                        pass

                if img.mode == "RGBA":
                    source_bands = img.split()
                    rgb_img = Image.merge("RGB", source_bands[:3])
                    mask = source_bands[3]

                    enhancer = ImageEnhance.Sharpness(rgb_img)
                    sharpened_rgb = enhancer.enhance(1.5)

                    img = Image.merge("RGBA", (*sharpened_rgb.split(), mask))
            else:
                enhancer = ImageEnhance.Sharpness(img)
                img = enhancer.enhance(1.5)

        # Save to bytes
        output_buffer = io.BytesIO()
        save_args = {"quality": quality}

        if target_format == "WEBP":
            save_args["method"] = 6  # Best compression

        if data.get("print_dpi") and target_format in ("JPEG", "JPG", "PNG"):
            save_args["dpi"] = (300, 300)

        img.save(output_buffer, format=target_format, **save_args)
        return output_buffer.getvalue()

    except Exception as e:
        return f"ERROR: {str(e)}"
