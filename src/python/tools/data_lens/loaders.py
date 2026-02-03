import pandas as pd
import io
import json
from .state import DATA_STORE, JSON_STORE
from .utils import sanitize_table_name

def load_file(data):
    try:
        content = data["content"]  # parsed from js Uint8Array
        file_type = data["type"]
        filename = data["filename"]

        # content is a PyProxy of Uint8Array or similar bytes-like object
        # Convert to bytes
        if hasattr(content, "to_py"):
            file_bytes = bytes(content.to_py())
        else:
            file_bytes = bytes(content)

        df = None
        tables_created = []
        base_table_name = sanitize_table_name(filename)

        if file_type == "csv":
            df = pd.read_csv(io.BytesIO(file_bytes))
            DATA_STORE[base_table_name] = df
            tables_created.append(base_table_name)

        elif file_type == "json":
            # Parse JSON to handle nested structures
            json_data = json.loads(file_bytes.decode("utf-8"))

            # Store raw JSON for the JSON viewer
            JSON_STORE[base_table_name] = json_data

            # Handle different JSON structures - always create a single table
            if isinstance(json_data, list):
                # Array of objects - flatten it
                df = pd.json_normalize(json_data, sep="_")
                DATA_STORE[base_table_name] = df
                tables_created.append(base_table_name)
            elif isinstance(json_data, dict):
                # Object with nested arrays - find the main data array
                main_array_key = None
                main_array_data = None

                # Look for the largest array in the root object
                for key, value in json_data.items():
                    if isinstance(value, list) and len(value) > 0:
                        if main_array_data is None or len(value) > len(main_array_data):
                            main_array_key = key
                            main_array_data = value

                if main_array_data and len(main_array_data) > 0:
                    # Flatten the main array with nested objects into a single table
                    df = pd.json_normalize(main_array_data, sep="_")
                    DATA_STORE[base_table_name] = df
                    tables_created.append(base_table_name)
                else:
                    # Single object - convert to single row dataframe
                    df = pd.json_normalize([json_data], sep="_")
                    DATA_STORE[base_table_name] = df
                    tables_created.append(base_table_name)
            else:
                return {"success": False, "error": "Unsupported JSON structure"}

        elif file_type == "xlsx":
            df = pd.read_excel(io.BytesIO(file_bytes))
            DATA_STORE[base_table_name] = df
            tables_created.append(base_table_name)
        else:
            return {"success": False, "error": "Unsupported file type"}

        # Return the first/main table created
        main_table = tables_created[0] if tables_created else base_table_name
        main_df = DATA_STORE.get(main_table)

        return {
            "success": True,
            "table_name": main_table,
            "tables_created": tables_created,
            "rows": len(main_df) if main_df is not None else 0,
            "columns": list(main_df.columns) if main_df is not None else [],
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

def get_schemas():
    schemas = []
    for name, df in DATA_STORE.items():
        cols = [{"name": str(c), "type": str(t)} for c, t in zip(df.columns, df.dtypes)]
        schemas.append({"table_name": name, "rows": len(df), "columns": cols})
    return {"success": True, "schemas": schemas}

def delete_table(data):
    """Delete a table from DATA_STORE."""
    table_name = data.get("table_name")
    if not table_name:
        return {"success": False, "error": "No table name provided"}

    if table_name not in DATA_STORE:
        return {"success": False, "error": f"Table '{table_name}' not found"}

    del DATA_STORE[table_name]
    return {"success": True, "message": f"Table '{table_name}' deleted successfully"}
