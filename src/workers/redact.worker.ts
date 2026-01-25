import { loadPyodide, type PyodideInterface } from "pyodide";
import { PYTHON_FILES } from "@/python-runtime/redact_secrets.bundle";


let pyodide: PyodideInterface | null = null;

async function initPyodide() {
    if (pyodide) return pyodide;

    console.log("Worker: Initializing Pyodide...");
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

from tools.redact_secrets.main import redact
        `);


        // All files are written with underscores in their paths now


        self.postMessage({ type: "READY" });
        return pyodide;
    } catch (error) {
        console.error("Worker: Failed to initialize Pyodide:", error);
        throw error;
    }
}

self.onmessage = async (event: MessageEvent) => {
    const { type, data, id } = event.data;

    if (type === "REDACT") {
        try {
            const py = await initPyodide();

            // Get the function from Python
            const redactFn = py.globals.get("redact");

            const result = redactFn(py.toPy(data)).toJs({ dict_converter: Object.fromEntries });

            self.postMessage({ type: "REDACT_RESULT", data: result, id });
        } catch (error: any) {
            console.error("Worker: Redaction error:", error);
            self.postMessage({ type: "REDACT_ERROR", error: error.message, id });
        }
    }
};

// Start initializing immediately
initPyodide().catch(console.error);

