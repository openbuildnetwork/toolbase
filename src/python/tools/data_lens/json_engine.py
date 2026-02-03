import re
from .state import JSON_STORE


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
