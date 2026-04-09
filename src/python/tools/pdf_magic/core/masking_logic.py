import fitz
import re

def search_text_spans(file_bytes, pattern, mode="word"):
    """
    Search for text matches on a page and return bounding boxes.
    modes: 'word' (case-insensitive), 'phrase' (exact), 'regex' (full regex)
    """
    try:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        results = []
        
        # Prepare regex if needed
        regex = None
        if mode == "regex":
            try:
                # Support /pattern/flags format
                if pattern.startswith("/") and pattern.count("/") >= 2:
                    parts = pattern.split("/")
                    p = parts[1]
                    f_str = parts[2]
                    flags = 0
                    if "i" in f_str: flags |= re.IGNORECASE
                    if "m" in f_str: flags |= re.MULTILINE
                    regex = re.compile(p, flags)
                else:
                    regex = re.compile(pattern, re.IGNORECASE)
            except Exception as e:
                return {"error": f"Invalid regex: {str(e)}"}

        for page_index in range(len(doc)):
            page = doc[page_index]
            pW, pH = page.rect.width, page.rect.height
            
            # Using fitz search_for which is very robust
            # But if we need regex or complex phrase matching, 
            # we might need to extract text and then find offsets.
            
            matches = []
            if mode == "word" or mode == "phrase":
                # search_for handles simple strings well
                quads = page.search_for(pattern)
                for q in quads:
                    rect = q.rect if hasattr(q, "rect") else q
                    matches.append({
                        "pageIndex": page_index,
                        "x": (rect.x0 / pW) * 100,
                        "y": (rect.y0 / pH) * 100,
                        "width": ((rect.x1 - rect.x0) / pW) * 100,
                        "height": ((rect.y1 - rect.y0) / pH) * 100,
                        "rect": [rect.x0, rect.y0, rect.x1, rect.y1]
                    })
            elif mode == "regex" and regex:
                # For regex, we extract text with positions
                # fitz "dict" or "words" mode is useful
                words = page.get_text("words") # list of (x0, y0, x1, y1, "word", block_no, line_no, word_no)
                # Combine words to search across the whole text? 
                # Simplest for now: search in "text" and then map back.
                # But mapping back is hard. Let's use get_text("dict") for spans.
                text_dict = page.get_text("dict")
                for block in text_dict.get("blocks", []):
                    if block.get("type") == 0: # text
                        for line in block.get("lines", []):
                            for span in line.get("spans", []):
                                text = span.get("text", "")
                                if regex.search(text):
                                    rect = fitz.Rect(span.get("bbox"))
                                    matches.append({
                                        "pageIndex": page_index,
                                        "x": (rect.x0 / pW) * 100,
                                        "y": (rect.y0 / pH) * 100,
                                        "width": ((rect.x1 - rect.x0) / pW) * 100,
                                        "height": ((rect.y1 - rect.y0) / pH) * 100,
                                        "rect": [rect.x0, rect.y0, rect.x1, rect.y1]
                                    })
            
            results.extend(matches)

        doc.close()
        return {"matches": results, "count": len(results)}

    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"error": str(e)}
