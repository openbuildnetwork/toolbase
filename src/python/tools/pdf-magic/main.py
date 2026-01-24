import io
import sys
from pypdf import PdfReader, PdfWriter
from pypdf.generic import (
    NameObject,
    DecodedStreamObject,
    EncodedStreamObject,
    StreamObject,
    DictionaryObject,
)
from PIL import Image


def compress_image_data(image_data, quality=50, max_width=1200):
    try:
        if not image_data:
            return image_data, False
        img_stream = io.BytesIO(image_data)
        try:
            img = Image.open(img_stream)
        except:
            return image_data, False

        # Resize logic
        if img.width > max_width:
            ratio = max_width / float(img.width)
            new_height = int(float(img.height) * ratio)
            img = img.resize((max_width, new_height), Image.Resampling.LANCZOS)

        if img.mode in ("RGBA", "P", "LA"):
            img = img.convert("RGB")

        out_stream = io.BytesIO()
        img.save(out_stream, format="JPEG", quality=quality, optimize=True)
        return out_stream.getvalue(), True
    except:
        return image_data, False


def compress_pdf_content(file_bytes, level="recommended"):
    try:
        input_stream = io.BytesIO(bytes(file_bytes))
        reader = PdfReader(input_stream)
        writer = PdfWriter()

        # Configuration based on research:
        # 1. Page Compression (Content Streams)
        # 2. Object Deduplication (compress_identical_objects)
        # 3. Image Optimization (Our Custom Logic)

        quality = 60
        max_width = 1500

        if level == "extreme":
            quality = 30
            max_width = 800
        elif level == "less":
            quality = 85
            max_width = 2000

        # 1. Copy pages to writer first to establish structure
        for page in reader.pages:
            writer.add_page(page)

        # 2. Iterate pages in writer for image replacement
        if level != "less":
            for page in writer.pages:
                try:
                    if "/Resources" in page and "/XObject" in page["/Resources"]:
                        xObject = page["/Resources"]["/XObject"].get_object()
                        for obj_name in list(xObject.keys()):
                            obj = xObject[obj_name]
                            if obj["/Subtype"] == "/Image":
                                try:
                                    data = obj.get_data()
                                    if not data:
                                        continue

                                    new_data, is_jpeg = compress_image_data(
                                        data, quality, max_width
                                    )

                                    if len(new_data) < len(data):
                                        obj._data = new_data
                                        obj[NameObject("/Filter")] = NameObject(
                                            "/DCTDecode"
                                        )
                                        if "/DecodeParms" in obj:
                                            del obj["/DecodeParms"]
                                        obj[NameObject("/Length")] = len(new_data)
                                except:
                                    pass
                except:
                    pass

        # 3. Apply Content Stream Compression (Lossless text/graphics)
        for page in writer.pages:
            page.compress_content_streams()  # This works on the page object

        # 4. Remove Duplication (High impact feature)
        # This removes identical objects referenced multiple times
        try:
            writer.compress_identical_objects(
                remove_identicals=True, remove_orphans=True
            )
        except:
            pass  # version compatibility or error safety

        # Metadata
        if level == "extreme":
            writer.add_metadata({})
        elif reader.metadata:
            writer.add_metadata(reader.metadata)

        output_stream = io.BytesIO()
        writer.write(output_stream)
        writer.close()

        result = output_stream.getvalue()
        if len(result) == 0:
            raise Exception("Empty result")
        return list(result)

    except Exception as e:
        # Robust Fallback
        try:
            input_stream.seek(0)
            r = PdfReader(input_stream)
            w = PdfWriter()
            for p in r.pages:
                w.add_page(p)
            w.compress_identical_objects(remove_identicals=True, remove_orphans=True)
            for p in w.pages:
                p.compress_content_streams()

            out = io.BytesIO()
            w.write(out)
            w.close()
            return list(out.getvalue())
        except Exception as re:
            return {"error": str(re)}


def handle_request(action, data):
    if action == "compress":
        file_bytes = data.get("file_bytes")
        level = data.get("level", "recommended")
        return compress_pdf_content(file_bytes, level)
    return {"error": f"Unknown action: {action}"}
