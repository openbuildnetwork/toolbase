import re

def sanitize_table_name(filename):
    # Remove extension and special chars, make alphanumeric
    name = filename.rsplit(".", 1)[0]
    name = re.sub(r"\W+", "_", name)
    return name.lower()
