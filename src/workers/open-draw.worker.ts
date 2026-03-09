/**
 * OpenDraw Web Worker
 * Handles Python/Pyodide execution for graph processing.
 */
import { loadPyodide, type PyodideInterface } from "pyodide";
import { PYTHON_FILES } from "@/python/bundles/open_draw.bundle";

let pyodide: PyodideInterface | null = null;
let isInitializing = false;
let initPromise: Promise<PyodideInterface> | null = null;

/**
 * Initialize Pyodide and load the OpenDraw Python module.
 */
async function initPyodide(): Promise<PyodideInterface> {
    if (pyodide) return pyodide;

    if (initPromise) return initPromise;

    isInitializing = true;

    initPromise = (async () => {
        console.log("[OpenDraw Worker] Initializing Pyodide...");

        try {
            const py = await loadPyodide({
                indexURL: "https://cdn.jsdelivr.net/pyodide/v0.29.3/full/",
            });

            console.log("[OpenDraw Worker] Pyodide loaded, setting up filesystem...");

            // Setup the virtual filesystem
            for (const [filePath, content] of Object.entries(PYTHON_FILES)) {
                const parts = filePath.split('/');
                let currentPath = '';

                // Create directories
                for (let i = 0; i < parts.length - 1; i++) {
                    currentPath += (currentPath ? '/' : '') + parts[i];
                    try {
                        py.FS.mkdir(currentPath);
                    } catch {
                        // Directory might already exist
                    }
                }

                // Write file
                py.FS.writeFile(filePath, content);
            }

            console.log("[OpenDraw Worker] Python files written to virtual FS.");

            // Import the main function
            await py.runPythonAsync(`
import sys
import os
sys.path.append(os.getcwd())

from tools.open_draw.main import process_command
            `);

            // Try to install networkx (optional but recommended)
            try {
                console.log("[OpenDraw Worker] Installing micropip for networkx...");
                await py.loadPackage('micropip');
                const micropip = py.pyimport('micropip');
                await micropip.install('networkx');
                console.log("[OpenDraw Worker] NetworkX installed successfully.");
            } catch (e) {
                console.warn("[OpenDraw Worker] Could not install networkx, using fallback algorithms:", e);
            }

            pyodide = py;
            isInitializing = false;

            // Notify that worker is ready
            self.postMessage({ type: "READY" });

            console.log("[OpenDraw Worker] Initialization complete.");
            return py;
        } catch (error) {
            isInitializing = false;
            initPromise = null;
            console.error("[OpenDraw Worker] Failed to initialize Pyodide:", error);
            throw error;
        }
    })();

    return initPromise;
}

/**
 * Handle incoming messages from the main thread.
 */
self.onmessage = async (event: MessageEvent) => {
    const message = event.data;
    const { type, id, data } = message;

    // Handle INIT command
    if (type === "INIT") {
        try {
            await initPyodide();
            // READY message is already sent in initPyodide
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            self.postMessage({
                type: "ERROR",
                id,
                error: `Failed to initialize: ${errorMessage}`
            });
        }
        return;
    }

    // For all other commands, ensure Pyodide is initialized
    try {
        const py = await initPyodide();

        // Get the process_command function from Python
        const processCommand = py.globals.get("process_command");

        // Convert the message to a Python dict and process
        const pyMessage = py.toPy(message);
        const result = processCommand(pyMessage);

        // Convert the result back to JavaScript
        const jsResult = result.toJs({ dict_converter: Object.fromEntries });

        // Send the result back
        self.postMessage(jsResult);

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("[OpenDraw Worker] Error processing command:", error);
        self.postMessage({
            type: "ERROR",
            id,
            error: errorMessage
        });
    }
};

// Start initializing immediately for faster cold start
initPyodide().catch(console.error);
