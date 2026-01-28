
import { loadPyodide, type PyodideInterface } from "pyodide";
// @ts-ignore - The bundle file is auto-generated
import { PYTHON_FILES } from "../python-runtime/data_lens.bundle";

let pyodideInitPromise: Promise<PyodideInterface> | null = null;

async function loadPyodideAndPackages() {
    console.log("Worker: Initializing Pyodide (DataLens)...");
    try {
        const pyodide = await loadPyodide({
            indexURL: "https://cdn.jsdelivr.net/pyodide/v0.29.2/full/",
        });

        // Install dependencies
        console.log("Worker: Installing pandas, sqlite3(builtin), openpyxl...");
        await pyodide.loadPackage(["micropip"]);
        const micropip = pyodide.pyimport("micropip");

        // Pandas is large, this might take time.
        await pyodide.loadPackage(["pandas", "sqlite3"]);
        await micropip.install(["openpyxl"]);

        console.log("Worker: Pyodide packages loaded.");

        // Setup the virtual filesystem
        if (PYTHON_FILES) {
            for (const [filePath, content] of Object.entries(PYTHON_FILES)) {
                const parts = filePath.split('/');
                let currentPath = '';

                // Create directories
                for (let i = 0; i < parts.length - 1; i++) {
                    currentPath += (currentPath ? '/' : '') + parts[i];
                    try {
                        pyodide.FS.mkdir(currentPath);
                    } catch (e) {
                        // Directory might already exist
                    }
                }

                // Write file
                pyodide.FS.writeFile(filePath, content as string);
            }
            console.log("Worker: DataLens Python files written to virtual FS.");
        }

        // Import the main function
        await pyodide.runPythonAsync(`
import sys
import os
sys.path.append(os.getcwd())

import tools.data_lens.main as datalens_main
handle_request = datalens_main.handle_request
print("Python: DataLens handle_request imported successfully")
        `);

        self.postMessage({ type: "READY" });
        return pyodide;
    } catch (error) {
        console.error("Worker: Failed to initialize Pyodide:", error);
        throw error;
    }
}

function getPyodide() {
    if (!pyodideInitPromise) {
        pyodideInitPromise = loadPyodideAndPackages();
    }
    return pyodideInitPromise;
}

self.onmessage = async (event: MessageEvent) => {
    const { type, action, data, id } = event.data;

    if (type === "EXECUTE") {
        console.log(`Worker: Received ${action} request`, data ? '(with data)' : '(no data)');
        try {
            const py = await getPyodide();
            const handleRequest = py.globals.get("handle_request");

            if (!handleRequest) {
                throw new Error("Python function 'handle_request' not found.");
            }

            // Convert data to PyProxy if complex, or let pyodide handle JS objects
            let pyData = data;
            if (data && data.content && data.content instanceof Uint8Array) {
                pyData = py.toPy(data);
            } else {
                pyData = py.toPy(data);
            }

            try {
                console.log(`Worker: Calling handle_request('${action}', ...)`);
                const result = handleRequest(action, pyData);
                console.log("Worker: Raw Python result type:", typeof result, result);

                // Convert result back to JS
                let jsResult;
                if (result && typeof result.toJs === 'function') {
                    // Use recursive conversion with dict_converter
                    jsResult = result.toJs({ dict_converter: Object.fromEntries, create_pyproxies: false });
                    console.log("Worker: Converted result via toJs:", jsResult);
                } else {
                    jsResult = result;
                    console.log("Worker: Result is already JS:", jsResult);
                }

                // Ensure data array exists
                if (jsResult && jsResult.data && typeof jsResult.data.toJs === 'function') {
                    jsResult.data = jsResult.data.toJs({ dict_converter: Object.fromEntries, create_pyproxies: false });
                }

                // Convert columns if needed
                if (jsResult && jsResult.columns && typeof jsResult.columns.toJs === 'function') {
                    jsResult.columns = jsResult.columns.toJs();
                }

                console.log("Worker: Final jsResult:", JSON.stringify(jsResult, null, 2).slice(0, 500));
                self.postMessage({ type: "RESULT", data: jsResult, id });

                if (result && typeof result.destroy === 'function') result.destroy();

            } finally {
                if (pyData && typeof pyData.destroy === 'function') pyData.destroy();
            }

        } catch (error: any) {
            console.error("Worker: Execution error:", error);
            self.postMessage({ type: "ERROR", error: error.message, id });
        }
    }
};

getPyodide().catch(console.error);
