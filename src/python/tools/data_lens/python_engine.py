import pandas as pd
from .state import DATA_STORE


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
