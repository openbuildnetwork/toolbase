import pandas as pd
import sqlite3
import io
import json
import re

# Global state to store loaded dataframes
# Structure: { "table_name": dataframe }
DATA_STORE = {}

# Store raw JSON data for JSON viewer
# Structure: { "file_name": json_data }
JSON_STORE = {}


def handle_request(action, data):
    """
    Main entry point for DataLens worker.
    """
    try:
        if action == "load_file":
            return load_file(data)
        elif action == "get_schemas":
            return get_schemas()
        elif action == "run_sql":
            return run_sql(data)
        elif action == "run_python":
            return run_python(data)
        elif action == "delete_table":
            return delete_table(data)
        elif action == "get_raw_json":
            return get_raw_json(data)
        elif action == "query_json":
            return query_json(data)
        else:
            return {"success": False, "error": f"Unknown action: {action}"}
    except Exception as e:
        return {"success": False, "error": str(e)}


def sanitize_table_name(filename):
    # Remove extension and special chars, make alphanumeric
    name = filename.rsplit(".", 1)[0]
    name = re.sub(r"\W+", "_", name)
    return name.lower()


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


def prepare_df_for_sql(df):
    """
    Prepare a DataFrame for SQLite by converting unsupported types to strings.
    SQLite doesn't support list, dict, or complex object types.
    """
    df_copy = df.copy()
    for col in df_copy.columns:
        # Check if any value in the column is a list or dict
        sample_values = df_copy[col].dropna().head(10)
        needs_conversion = False
        for val in sample_values:
            if isinstance(val, (list, dict)):
                needs_conversion = True
                break

        if needs_conversion:
            # Convert the entire column to JSON strings
            df_copy[col] = df_copy[col].apply(
                lambda x: json.dumps(x) if isinstance(x, (list, dict)) else x
            )
    return df_copy


def run_sql(data):
    """
    Execute SQL query on the data.

    Supports SQLite JSON functions for querying JSON columns:
    - json_extract(column, '$.path') - Extract value from JSON
    - json_each(column) - Expand JSON array
    - json_type(column) - Get JSON value type

    Examples:
    - SELECT json_extract(items, '$[0].name') as first_item FROM testdata
    - SELECT * FROM testdata, json_each(items) as item WHERE json_extract(item.value, '$.price') > 100
    """
    query = data.get("query")
    if not query:
        return {"success": False, "error": "No query provided"}

    try:
        conn = sqlite3.connect(":memory:")

        # Track which columns contain JSON data for better error messages
        json_columns = {}

        for name, df in DATA_STORE.items():
            # Prepare dataframe for SQL (convert lists/dicts to JSON strings)
            sql_df = prepare_df_for_sql(df)
            sql_df.to_sql(name, conn, index=False)

            # Track JSON columns
            for col in df.columns:
                sample_values = df[col].dropna().head(5)
                for val in sample_values:
                    if isinstance(val, (list, dict)):
                        if name not in json_columns:
                            json_columns[name] = []
                        json_columns[name].append(col)
                        break

        result_df = pd.read_sql_query(query, conn)
        conn.close()

        # Convert result to dict format for JS
        return {
            "success": True,
            "columns": list(result_df.columns),
            "data": result_df.values.tolist(),
            "rowCount": len(result_df),
            "json_columns": json_columns,  # Include info about JSON columns
        }
    except Exception as e:
        error_msg = str(e)

        # Provide helpful hints for common JSON query issues
        hint = ""
        if "no such function: json_extract" in error_msg.lower():
            hint = "\n\nHint: SQLite JSON functions might not be available. Try accessing flattened columns directly (e.g., customer_name instead of json_extract)."
        elif "json" in query.lower() and json_columns:
            hint = f"\n\nHint: Available JSON columns: {json_columns}"

        return {"success": False, "error": error_msg + hint}


def run_python(data):
    code = data.get("code")
    if not code:
        return {"success": False, "error": "No code provided"}

    try:
        # Create execution environment
        # We allow access to 'pd' and all dataframes in DATA_STORE
        local_env = {"pd": pd, "result": None}
        # Add dataframes as variables
        for name, df in DATA_STORE.items():
            local_env[name] = df

        # We expect the user to assign something to 'result' variable,
        # or we capture the last expression if possible (but exec doesn't return).
        # Requirement: "allow pandas expressions" -> "return results to grid"

        full_code = code + "\n"
        exec(full_code, {}, local_env)

        result = local_env.get("result")

        if result is None:
            return {
                "success": True,
                "message": "Code executed but 'result' variable was None or not set.",
            }

        if isinstance(result, pd.DataFrame):
            return {
                "success": True,
                "columns": list(result.columns),
                "data": result.values.tolist(),
                "rowCount": len(result),
            }
        elif isinstance(result, (list, dict, str, int, float, bool)):
            # Wrap scalar/simple results
            return {
                "success": True,
                "columns": ["Result"],
                "data": [[str(result)]],
                "rowCount": 1,
            }
        else:
            return {"success": True, "columns": ["Result"], "data": [[str(result)]]}

    except Exception as e:
        return {"success": False, "error": str(e)}


def get_raw_json(data):
    """Get raw JSON data for the JSON tree viewer."""
    table_name = data.get("table_name")
    if not table_name:
        return {"success": False, "error": "No table name provided"}

    # Try to find matching JSON data
    # The table name might have suffixes like _orders, _items, so try base name
    json_data = None
    for key in JSON_STORE:
        if table_name.startswith(key) or key.startswith(table_name.split("_")[0]):
            json_data = JSON_STORE[key]
            break

    if json_data is None:
        return {"success": False, "error": f"No raw JSON found for '{table_name}'"}

    return {"success": True, "data": json_data, "is_json": True}


def query_json(data):
    """
    Query JSON data using a Python expression or JSONPath-like syntax.

    Examples:
    - "$.orders[0].customer.name"  -> JSONPath-like
    - "orders[0]['customer']['name']"  -> Python dict access
    """
    table_name = data.get("table_name")
    query = data.get("query", "")

    if not table_name or not query:
        return {"success": False, "error": "Table name and query are required"}

    # Find the JSON data
    json_data = None
    for key in JSON_STORE:
        if table_name.startswith(key) or key.startswith(table_name.split("_")[0]):
            json_data = JSON_STORE[key]
            break

    if json_data is None:
        return {"success": False, "error": f"No raw JSON found for '{table_name}'"}

    try:
        # Convert JSONPath-like syntax to Python
        # $.orders[0].customer.name -> data["orders"][0]["customer"]["name"]
        if query.startswith("$"):
            py_query = query[1:]  # Remove $
            # Replace .key with ["key"] for dict access
            py_query = re.sub(r"\.([a-zA-Z_][a-zA-Z0-9_]*)", r'["\1"]', py_query)
            query = f"data{py_query}"
        else:
            # Assume it's already Python-like, just prefix with data.
            if not query.startswith("data"):
                query = f"data.{query}" if "." in query else f"data['{query}']"

        # Execute the query
        result = eval(query, {"data": json_data})

        # Format result for display
        if isinstance(result, (list, dict)):
            # Return as JSON for the tree viewer
            return {
                "success": True,
                "data": result,
                "is_json": True,
                "result_type": "object" if isinstance(result, dict) else "array",
            }
        else:
            # Scalar value - return as table
            return {
                "success": True,
                "columns": ["Result"],
                "data": [[result]],
                "rowCount": 1,
            }
    except Exception as e:
        return {"success": False, "error": f"Query error: {str(e)}"}
