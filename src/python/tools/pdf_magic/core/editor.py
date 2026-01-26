import fitz
import io
import base64

def _hex_to_rgb(hex_str):
    """
    Helper: Convert hex color string to RGB tuple (0.0 - 1.0).
    """
    if not hex_str:
        return (0, 0, 0)
    hex_str = hex_str.lstrip("#")
    return tuple(int(hex_str[i : i + 2], 16) / 255.0 for i in (0, 2, 4))

def _to_pdf_rect(el, page_width, page_height):
    """
    Helper: Convert percentage-based coordinates to PDF points.
    """
    w = (el["width"] / 100) * page_width
    h = (el["height"] / 100) * page_height
    x = (el["x"] / 100) * page_width - w / 2
    y = (el["y"] / 100) * page_height - h / 2
    return fitz.Rect(x, y, x + w, y + h)

def apply_pdf_edits(file_bytes, edits):
    """
    Apply a list of edits (additions, drawings, redactions) to a PDF.
    Expects percentages for x, y, width, height (0-100) to support responsive UI.
    """
    try:
        doc = fitz.open(stream=file_bytes, filetype="pdf")

        # Group edits by page to minimize page loading operations
        page_edits = {}
        for edit in edits:
            p_idx = edit.get("pageIndex", 0)
            if p_idx not in page_edits:
                page_edits[p_idx] = []
            page_edits[p_idx].append(edit)

        for p_idx, p_list in page_edits.items():
            if p_idx >= len(doc):
                continue
            
            page = doc[p_idx]
            pW, pH = page.rect.width, page.rect.height

            # 1. Handle Existing Content Removal (Redactions)
            # We process these first so we don't accidentally redact new additions
            for edit in p_list:
                is_existing = edit.get("existing", False)
                is_redact = edit.get("redact", False) or edit.get("moved", False)
                
                if is_existing and is_redact:
                    # Use originalRect if available (for precise targeting of moved elements)
                    orig = edit.get("originalRect")
                    if orig:
                        page.add_redact_annot(orig, fill=(1, 1, 1))
                elif edit["type"] == "whiteout":
                    page.add_redact_annot(_to_pdf_rect(edit, pW, pH), fill=(1, 1, 1))

            # Apply all redactions for this page
            page.apply_redactions()

            # 2. Handle New Additions or Repositioned Content
            for edit in p_list:
                # Skip if this edit entry was only for redaction
                if edit.get("redact") and not edit.get("moved"):
                    continue

                # If it's an existing element that hasn't moved, we don't need to redraw it
                if edit.get("existing") and not edit.get("moved"):
                    continue

                rect = _to_pdf_rect(edit, pW, pH)
                color = _hex_to_rgb(edit.get("color", "#000000"))

                if edit["type"] == "text":
                    page.insert_textbox(
                        rect,
                        edit["content"],
                        fontsize=edit.get("fontSize", 12),
                        color=color,
                    )
                
                elif edit["type"] in ["image", "drawing"]:
                    try:
                        # Expecting "data:image/png;base64,..."
                        if "," in edit["content"]:
                            img_data = edit["content"].split(",")[1]
                        else:
                            img_data = edit["content"]
                            
                        img_bytes = base64.b64decode(img_data)
                        page.insert_image(rect, stream=img_bytes)
                    except Exception as img_e:
                        print(f"Error inserting image: {img_e}")
                        pass
                
                elif edit["type"] == "shape":
                    shape_type = edit.get("shapeType")
                    stroke_width = edit.get("strokeWidth", 1)
                    
                    if shape_type == "rectangle":
                        page.draw_rect(rect, color=color, width=stroke_width)
                    elif shape_type == "circle":
                        page.draw_oval(rect, color=color, width=stroke_width)

        output = io.BytesIO()
        doc.save(output)
        result = output.getvalue()
        doc.close()
        
        return list(result)

    except Exception as e:
        return {"error": str(e)}