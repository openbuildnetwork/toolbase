import { loadPyodide, type PyodideInterface } from "pyodide";
import { PYTHON_FILES } from "@/python-runtime/base64_tool.bundle";
import type { Base64Request, Base64Response } from "@/types/base64";

let pyodide: PyodideInterface | null = null;

async function initPyodide() {
    if (pyodide) return pyodide;

    console.log("Worker: Initializing Pyodide for Base64 tool...");
    try {
        pyodide = await loadPyodide({
            indexURL: "https://cdn.jsdelivr.net/pyodide/v0.29.2/full/",
        });
        console.log("Worker: Pyodide loaded, setting up filesystem...");

        // Setup the virtual filesystem
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
            pyodide.FS.writeFile(filePath, content);
        }

        console.log("Worker: Python files written to virtual FS.");

        // Import the main function
        await pyodide.runPythonAsync(`
import sys
import os
# Ensure the current directory is in path
sys.path.append(os.getcwd())

from tools.base64_tool.main import process_data
        `);

        console.log("Worker: Base64 tool ready!");
        self.postMessage({ type: "READY" });
        return pyodide;
    } catch (error) {
        console.error("Worker: Failed to initialize Pyodide:", error);
        self.postMessage({ type: "ERROR", error: String(error) });
        throw error;
    }
}

self.onmessage = async (event: MessageEvent) => {
    const { type, data, id } = event.data;

    if (type === "PROCESS") {
        try {
            const py = await initPyodide();

            // Get the function from Python
            const processDataFn = py.globals.get("process_data");

            // Convert the request data to Python
            const request: Base64Request = data;
            const pythonRequest = py.toPy(request);

            // Call the Python function
            const result = processDataFn(pythonRequest).toJs({
                dict_converter: Object.fromEntries
            }) as Base64Response;

            self.postMessage({ type: "PROCESS_RESULT", data: result, id });
        } catch (error: any) {
            console.error("Worker: Processing error:", error);
            self.postMessage({
                type: "PROCESS_ERROR",
                error: error.message || String(error),
                id
            });
        }
    }
};

// Start initializing immediately
initPyodide().catch(console.error);
