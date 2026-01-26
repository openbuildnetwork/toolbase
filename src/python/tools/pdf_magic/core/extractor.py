import fitz

def detect_pdf_elements(file_bytes, page_index):
    """
    Detect text blocks and images on a specific page.
    Returns a list of elements with coordinates (PDF points) and page dimensions.
    Used for the 'Edit' mode to make static PDF elements interactive.
    """
    try:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        
        # Validate page index
        if page_index >= len(doc):
            return {"error": "Page index out of range"}
            
        page = doc[page_index]
        elements = []
        pW, pH = page.rect.width, page.rect.height

        # 1. Get Text Blocks
        # "blocks" returns: (x0, y0, x1, y1, text, block_no, block_type)
        blocks = page.get_text("blocks")
        for b in blocks:
            # block_type 0 is text
            if b[6] == 0:
                elements.append({
                    "id": f"orig-text-{b[5]}",
                    "type": "text",
                    "content": b[4],
                    "rect": [b[0], b[1], b[2], b[3]], # x0, y0, x1, y1
                    "existing": True,
                })

        # 2. Get Image Locations
        # get_image_info(xrefs=True) allows us to track specific image objects
        image_list = page.get_image_info(xrefs=True)
        for i, img in enumerate(image_list):
            elements.append({
                "id": f"orig-img-{i}", # Using index as identifier
                "type": "image",
                "rect": img["bbox"],
                "existing": True,
            })

        doc.close()
        return {
            "elements": elements, 
            "width": pW, 
            "height": pH
        }
        
    except Exception as e:
        return {"error": str(e)}