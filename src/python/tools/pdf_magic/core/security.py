import fitz
import io

def protect_pdf(file_bytes, password, owner_password=None, permissions=None):
    """
    Encrypt PDF with a password using AES-256.
    Allows setting granular permissions (print, copy, modify, etc.).
    """
    try:
        doc = fitz.open(stream=file_bytes, filetype="pdf")

        # Encryption Standard
        encryption_method = fitz.PDF_ENCRYPT_AES_256

        # Calculate Permissions Bitmask
        # PyMuPDF constants mapping
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
            
            # Accessibility is often legally required, so we default to True unless explicitly disabled
            # Bit 10 (1 << 9) controls "Content copying for accessibility"
            if permissions.get("accessibility", True):
                perm_mask |= 1 << 9
        else:
            # If no permissions object provided, allow everything (standard default)
            perm_mask = -1

        # Use user password as owner password if owner_pw is missing
        final_owner_pw = owner_password or password

        # Save to memory buffer
        output = io.BytesIO()
        doc.save(
            output,
            encryption=encryption_method,
            user_pw=password,
            owner_pw=final_owner_pw,
            permissions=perm_mask,
        )

        result = output.getvalue()
        doc.close()

        return list(result)
        
    except Exception as e:
        return {"error": str(e)}