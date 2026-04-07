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
    Now expects x, y to be top-left.
    """
    w = (el["width"] / 100) * page_width
    h = (el["height"] / 100) * page_height
    x = (el["x"] / 100) * page_width
    y = (el["y"] / 100) * page_height
    
    # Clamp to page boundaries
    x = max(0, min(page_width - 1, x))
    y = max(0, min(page_height - 1, y))
    w = min(page_width - x, w)
    h = min(page_height - y, h)

    # Add a small buffer for redaction/masking to ensure full coverage
    if el.get("type") == "whiteout" or el.get("redact"):
        return fitz.Rect(x - 1, y - 1, x + w + 1, y + h + 1)
        
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
            for edit in p_list:
                is_existing = edit.get("existing", False)
                is_redact = edit.get("redact", False) or edit.get("moved", False)
                
                if is_existing and is_redact:
                    orig = edit.get("originalRect")
                    if orig:
                        # Add slight padding to mask for extra safety
                        r = fitz.Rect(orig)
                        padded_rect = fitz.Rect(r.x0 - 0.5, r.y0 - 0.5, r.x1 + 0.5, r.y1 + 0.5)
                        page.draw_rect(padded_rect, color=(1, 1, 1), fill=(1, 1, 1), overlay=True)
                elif edit["type"] == "whiteout":
                    page.draw_rect(_to_pdf_rect(edit, pW, pH), color=(1, 1, 1), fill=(1, 1, 1), overlay=True)

            # 2. Handle New Additions or Repositioned Content
            for edit in p_list:
                if edit.get("redact") and not edit.get("moved"):
                    continue

                if edit.get("existing") and not edit.get("moved") and not edit.get("content_changed"):
                    # Check if content actually changed if it's "existing"
                    if edit.get("content") == edit.get("originalContent"):
                        continue

                rect = _to_pdf_rect(edit, pW, pH)
                color = _hex_to_rgb(edit.get("color", "#000000"))

                if edit["type"] == "text":
                    text_content = str(edit.get("content", ""))
                    f_size = edit.get("fontSize", 12)
                    
                    if not isinstance(f_size, (int, float)) or f_size <= 0:
                        f_size = 12

                    font_family = edit.get("fontFamily", "")
                    font_to_use = "helv"
                    
                    if any(ord(c) > 255 for c in text_content):
                        font_to_use = "noto"
                    elif font_family:
                        normalized = font_family.lower()
                        if "arial" in normalized or "helvetica" in normalized:
                            font_to_use = "helv"
                        elif "times" in normalized:
                            font_to_use = "tiro"
                        elif "courier" in normalized:
                            font_to_use = "cour"
                        elif "symbol" in normalized:
                            font_to_use = "symb"
                        elif "zapf" in normalized:
                            font_to_use = "zabd"
                        else:
                            font_to_use = font_family

                    # Map alignment: left:0, center:1, right:2
                    align_map = {"left": 0, "center": 1, "right": 2}
                    align_val = align_map.get(edit.get("textAlign", "left"), 0)

                    page.insert_textbox(
                        rect,
                        text_content,
                        fontsize=f_size,
                        color=color,
                        fontname=font_to_use,
                        align=align_val
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