import io
import sys
from pypdf import PdfReader, PdfWriter
from PIL import Image
import fitz


# Helper function to render page to image
def render_page_to_image(pdf_bytes, page_num, dpi=150):
    """
    Render a PDF page to a PIL Image using PyMuPDF.
    """
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    page = doc[page_num]

    # Render page to pixmap at specified DPI
    mat = fitz.Matrix(dpi / 72, dpi / 72)  # 72 is default DPI
    pix = page.get_pixmap(matrix=mat)

    # Convert pixmap to PIL Image
    img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
    doc.close()

    return img


def compress_pdf_to_images(file_bytes, level="recommended"):
    """
    Compress PDF by rendering pages to images and rebuilding.
    This achieves the same result as the TypeScript implementation.
    """
    try:
        # Configuration based on levels
        if level == "extreme":
            quality = 30
            dpi = 100  # Lower DPI for smaller file
        elif level == "recommended":
            quality = 60
            dpi = 150  # Medium DPI
        else:  # less
            quality = 85
            dpi = 200  # Higher DPI for better quality

        # Load PDF
        input_stream = io.BytesIO(bytes(file_bytes))
        reader = PdfReader(input_stream)
        num_pages = len(reader.pages)

        # Create new PDF writer
        writer = PdfWriter()

        # Process each page
        for page_num in range(num_pages):
            # Render page to image
            img = render_page_to_image(file_bytes, page_num, dpi)

            # Compress image
            img_bytes = io.BytesIO()
            if img.mode in ("RGBA", "P", "LA"):
                img = img.convert("RGB")
            img.save(img_bytes, format="JPEG", quality=quality, optimize=True)
            img_bytes.seek(0)

            # We need to create a page with the image
            # PyPDF doesn't have direct image-to-page, so we'll use a different approach

            # Create a simple PDF page with the image using reportlab-like approach
            # Actually, let's use a simpler method: create a minimal PDF structure

            # For now, let's use the img2pdf approach if available in Pyodide
            # If not, we'll need to construct PDF manually

            # Since img2pdf might not be available, let's use PyMuPDF to create pages
            pass

        # Alternative: Use PyMuPDF for the entire process
        return compress_with_pymupdf(file_bytes, quality, dpi)

    except Exception as e:
        return {"error": str(e)}


def compress_with_pymupdf(file_bytes, quality=60, dpi=150):
    """
    Complete compression using PyMuPDF (fitz).
    This is the most efficient approach in Python.
    """
    try:
        # Open source PDF
        src_doc = fitz.open(stream=file_bytes, filetype="pdf")

        # Create new PDF
        new_doc = fitz.open()

        for page_num in range(len(src_doc)):
            # Render page to pixmap
            page = src_doc[page_num]
            mat = fitz.Matrix(dpi / 72, dpi / 72)
            pix = page.get_pixmap(matrix=mat)

            # Convert to PIL Image for JPEG compression
            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)

            # Compress as JPEG
            img_bytes = io.BytesIO()
            if img.mode in ("RGBA", "P", "LA"):
                img = img.convert("RGB")
            img.save(img_bytes, format="JPEG", quality=quality, optimize=True)
            img_bytes.seek(0)

            # Create new page with compressed image
            img_doc = fitz.open(stream=img_bytes.getvalue(), filetype="jpeg")
            pdf_bytes = img_doc.convert_to_pdf()
            img_pdf = fitz.open(stream=pdf_bytes, filetype="pdf")
            new_doc.insert_pdf(img_pdf)

            img_doc.close()
            img_pdf.close()

        # Save result
        output = io.BytesIO()
        new_doc.save(output)
        result = output.getvalue()

        src_doc.close()
        new_doc.close()

        if len(result) == 0:
            raise Exception("Compression resulted in empty file")

        return list(result)

    except Exception as e:
        return {"error": str(e)}


def compress_pdf_content(file_bytes, level="recommended"):
    """
    Main compression function.
    Uses PyMuPDF for image-based compression.
    """
    try:
        if level == "extreme":
            return compress_with_pymupdf(file_bytes, quality=30, dpi=100)
        elif level == "recommended":
            return compress_with_pymupdf(file_bytes, quality=60, dpi=150)
        else:  # less
            return compress_with_pymupdf(file_bytes, quality=85, dpi=200)
    except Exception as e:
        return {"error": str(e)}


def protect_pdf(file_bytes, password, owner_password=None, permissions=None):
    """
    Encrypt PDF with a password using PyMuPDF.
    """
    try:
        # Open source PDF
        doc = fitz.open(stream=file_bytes, filetype="pdf")

        # Default encryption options
        encryption_method = fitz.PDF_ENCRYPT_AES_256

        # Prepare permissions bitmask
        # By default, we might want to restrict significantly if permissions are provided
        # PDF Permissions Bitmask:
        # bit 3: print
        # bit 4: modify
        # bit 5: copy
        # bit 6: annotate
        # bit 9: fill forms
        # bit 10: accessibility
        # bit 11: document assembly

        perm_mask = 0
        if permissions:
            if permissions.get("printing"):
                perm_mask |= fitz.PDF_PERM_PRINT
            if permissions.get("modifying"):
                perm_mask |= fitz.PDF_PERM_MODIFY
            if permissions.get("copying"):
                perm_mask |= fitz.PDF_PERM_COPY
            if permissions.get("annotating"):
                perm_mask |= fitz.PDF_PERM_ANNOTATE
            if permissions.get("fillingForms"):
                perm_mask |= fitz.PDF_PERM_FORM
            # Always allow accessibility for compliance if not specified
            if permissions.get("accessibility", True):
                perm_mask |= 1 << 9
        else:
            # If no permissions object, allow everything
            perm_mask = -1

        # Save results to memory
        output = io.BytesIO()

        doc.save(
            output,
            encryption=encryption_method,
            user_pw=password,
            owner_pw=owner_password or password,
            permissions=perm_mask,
        )

        result = output.getvalue()
        doc.close()

        return list(result)
    except Exception as e:
        return {"error": str(e)}


def handle_request(action, data):
    if action == "compress":
        file_bytes = data.get("file_bytes")
        level = data.get("level", "recommended")
        return compress_pdf_content(file_bytes, level)
    elif action == "protect":
        file_bytes = data.get("file_bytes")
        password = data.get("password")
        owner_password = data.get("owner_password")
        permissions = data.get("permissions")
        return protect_pdf(file_bytes, password, owner_password, permissions)

    return {"error": f"Unknown action: {action}"}
