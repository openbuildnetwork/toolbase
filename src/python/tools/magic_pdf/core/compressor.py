import io
import fitz  # PyMuPDF
from PIL import Image

def compress_images_in_pdf(file_bytes, quality=75, max_dimension=1200):
    """
    Compresses embedded images within the PDF without rasterizing pages.
    """
    try:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        has_images = False
        resample_filter = Image.Resampling.LANCZOS if hasattr(Image, "Resampling") else Image.ANTIALIAS
        
        for page in doc:
            image_list = page.get_images(full=True)
            if image_list:
                has_images = True
            for img_info in image_list:
                xref = img_info[0]
                try:
                    base_image = doc.extract_image(xref)
                    if not base_image:
                        continue
                    image_bytes = base_image["image"]
                    
                    # Load in PIL
                    img = Image.open(io.BytesIO(image_bytes))
                    
                    # Downscale if image is exceptionally large
                    width, height = img.size
                    if max(width, height) > max_dimension:
                        # Keep aspect ratio
                        ratio = max_dimension / max(width, height)
                        new_width = int(width * ratio)
                        new_height = int(height * ratio)
                        img = img.resize((new_width, new_height), resample_filter)
                    
                    if img.mode != "RGB":
                        img = img.convert("RGB")
                    
                    # Save as optimized JPEG
                    img_bytes_io = io.BytesIO()
                    img.save(img_bytes_io, format="JPEG", quality=quality, optimize=True)
                    compressed_bytes = img_bytes_io.getvalue()
                    
                    # Replace image in PDF with multiple API fallback safeguards
                    try:
                        page.replace_image(xref, stream=compressed_bytes)
                    except AttributeError:
                        try:
                            doc.replace_image(xref, stream=compressed_bytes)
                        except AttributeError:
                            doc.update_stream(xref, compressed_bytes)
                except Exception:
                    continue
        
        # Save with full optimization
        output = io.BytesIO()
        doc.save(output, garbage=4, deflate=True)
        compressed_data = output.getvalue()
        doc.close()
        return compressed_data, has_images
    except Exception:
        return None, False

def rasterize_pages_to_pdf(file_bytes, quality=60, dpi=150):
    """
    Compresses PDF by rasterizing each page into a compressed JPEG image.
    """
    try:
        src_doc = fitz.open(stream=file_bytes, filetype="pdf")
        new_doc = fitz.open()

        for page in src_doc:
            # Render page to pixmap
            pix = page.get_pixmap(matrix=fitz.Matrix(dpi / 72, dpi / 72))

            # Convert to PIL for JPEG optimization
            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
            
            img_bytes_io = io.BytesIO()
            img.save(img_bytes_io, format="JPEG", quality=quality, optimize=True)
            
            # Create a new PDF page with the same dimensions
            new_page = new_doc.new_page(width=page.rect.width, height=page.rect.height)
            
            # Insert image
            new_page.insert_image(new_page.rect, stream=img_bytes_io.getvalue())

        # Save with full optimization
        output = io.BytesIO()
        new_doc.save(output, garbage=4, deflate=True)
        result = output.getvalue()
        
        src_doc.close()
        new_doc.close()
        return result
    except Exception:
        return None

def compress_pdf_content(file_bytes, level="recommended"):
    """
    Compresses PDF using an adaptive compression strategy to ensure the size decreases.
    """
    try:
        # Determine compression settings
        if level == "extreme":
            quality_raster, dpi_raster = 30, 90
            quality_img, max_dim = 50, 1000
        elif level == "recommended":
            quality_raster, dpi_raster = 50, 130
            quality_img, max_dim = 70, 1400
        else:  # less
            quality_raster, dpi_raster = 75, 180
            quality_img, max_dim = 85, 1800

        original_size = len(file_bytes)
        
        # A. Try non-destructive image/structure optimization first
        non_destructive_bytes, has_images = compress_images_in_pdf(file_bytes, quality=quality_img, max_dimension=max_dim)
        non_destructive_size = len(non_destructive_bytes) if non_destructive_bytes else float('inf')
        
        # B. Try rasterization if level is recommended or extreme
        rasterized_bytes = None
        rasterized_size = float('inf')
        if level in ["recommended", "extreme"]:
            rasterized_bytes = rasterize_pages_to_pdf(file_bytes, quality=quality_raster, dpi=dpi_raster)
            if rasterized_bytes:
                rasterized_size = len(rasterized_bytes)

        # C. Select the smallest option that is smaller than original size
        best_bytes = file_bytes
        best_size = original_size
        
        if non_destructive_size < best_size:
            best_bytes = non_destructive_bytes
            best_size = non_destructive_size
            
        if rasterized_size < best_size:
            best_bytes = rasterized_bytes
            best_size = rasterized_size
            
        # D. If even our best effort is larger than the original, try basic structural clean-up
        if best_size >= original_size:
            try:
                doc = fitz.open(stream=file_bytes, filetype="pdf")
                output = io.BytesIO()
                doc.save(output, garbage=4, deflate=True)
                fallback_bytes = output.getvalue()
                doc.close()
                if len(fallback_bytes) < original_size:
                    best_bytes = fallback_bytes
            except Exception:
                pass
                
        return list(best_bytes)

    except Exception as e:
        return {"error": str(e)}

