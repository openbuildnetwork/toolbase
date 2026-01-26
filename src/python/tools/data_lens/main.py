import pandas as pd
import sqlite3
import json
import io

# Globals to store state
dfs = {}  # {'filename': df}
con = sqlite3.connect(":memory:")


def handle_request(action, data):
    try:
        # Convert PyProxy to dict if needed (handled by caller usually, but let's be safe)
        if hasattr(data, "to_py"):
            data = data.to_py()

        if action == "load_file":
            return load_file(data)
        elif action == "run_sql":
            return run_sql(data)
        elif action == "run_python":
            return run_python(data)
        elif action == "get_schemas":
            return get_schemas()
        elif action == "export_csv":
            return export_csv(data)
        else:
            return {"error": f"Unknown action: {action}"}
    except Exception as e:
        import traceback

        traceback.print_exc()
        return {"error": str(e)}


def load_file(data):
    # data: { filename: str, content: bytes, type: str, table_name: str }
    filename = data.get("filename")
    content = data.get("content")  # bytes
    file_type = data.get("type")  # 'csv', 'json', 'xlsx'

    # content is memoryview or bytes
    if hasattr(content, "tobytes"):
        content = content.tobytes()

    f = io.BytesIO(content)

    df = None
    try:
        if file_type == "csv":
            df = pd.read_csv(f)
        elif file_type == "json":
            df = pd.read_json(f)
        elif file_type == "xlsx":
            df = pd.read_excel(f)
        else:
            return {"error": f"Unsupported file type: {file_type}"}
    except Exception as e:
        return {"error": f"Pandas parse error: {str(e)}"}

    if df is not None:
        # Sanitize column names for SQL
        # Replace spaces, dots with underscores
        original_columns = df.columns.tolist()
        df.columns = [
            str(c).strip().replace(" ", "_").replace("-", "_").replace(".", "_")
            for c in df.columns
        ]

        dfs[filename] = df

        # Load into SQLite
        # Use filename as default table name if not provided, sanitized
        table_name = data.get("table_name") or filename.split(".")[0]
        table_name = table_name.replace(" ", "_").replace("-", "_")

        df.to_sql(table_name, con, if_exists="replace", index=False)

        return {
            "success": True,
            "filename": filename,
            "table_name": table_name,
            "columns": get_df_columns(df),
            "rows": len(df),
        }
    return {"error": "Failed to load dataframe"}


def run_sql(data):
    query = data.get("query")
    try:
        result_df = pd.read_sql_query(query, con)
        # Handle nan/inf for JSON
        result_df = result_df.fillna("NULL")  # Or None

        return {
            "success": True,
            "data": result_df.to_dict(orient="records"),
            "columns": list(result_df.columns),
            "rowCount": len(result_df),
        }
    except Exception as e:
        return {"error": str(e)}


def run_python(data):
    code = data.get("code")

    # Context: Provide 'dfs' (dict of dfs), 'con' (sqlite connection)
    # Also 'pd', 'sqlite3' are available in globals
    # Design: User script runs. We look for a variable 'result' (df or list of dicts).

    local_vars = {"dfs": dfs, "con": con, "pd": pd, "sqlite3": sqlite3}

    try:
        exec(code, globals(), local_vars)

        if "result" in local_vars:
            res = local_vars["result"]
            if isinstance(res, pd.DataFrame):
                res = res.fillna("NULL")
                return {
                    "success": True,
                    "data": res.to_dict(orient="records"),
                    "columns": list(res.columns),
                    "rowCount": len(res),
                }
            elif isinstance(res, list):
                # Assume list of dicts
                cols = list(res[0].keys()) if res else []
                return {
                    "success": True,
                    "data": res,
                    "columns": cols,
                    "rowCount": len(res),
                }
            else:
                # Scalar or String
                return {
                    "success": True,
                    "data": [],
                    "columns": ["Result"],
                    "message": str(res),
                }
        else:
            return {
                "success": False,
                "error": "No 'result' variable found. Please assign your output DataFrame to 'result'.",
            }
    except Exception as e:
        return {"error": str(e)}


def get_schemas():
    schemas = []
    # Get tables from SQLite
    cursor = con.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()

    for t in tables:
        table_name = t[0]
        # Read a sample to get types? Or PRAGMA table_info
        cursor.execute(f"PRAGMA table_info({table_name})")
        columns = cursor.fetchall()  # (cid, name, type, notnull, dflt_value, pk)

        # Get row count
        cursor.execute(f"SELECT count(*) FROM {table_name}")
        count = cursor.fetchone()[0]

        col_list = [{"name": c[1], "type": c[2]} for c in columns]

        schemas.append({"table_name": table_name, "columns": col_list, "rows": count})
    return schemas


def get_df_columns(df):
    return [{"name": c, "type": str(df[c].dtype)} for c in df.columns]


def export_csv(data):
    # Expects 'data' (list of dicts) or a query to run then export?
    # Usually UI handles export locally if it has the data.
    # But if data is large (100k rows), UI might not have it all if virtualized (UI -> Worker request).
    # But for now, let's assume we return JSON to UI and UI makes CSV.
    # Or we return CSV string.
    pass
