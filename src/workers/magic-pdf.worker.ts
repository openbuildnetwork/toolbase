import { loadPyodide, type PyodideInterface } from "pyodide";
// @ts-ignore - The bundle file is auto-generated
import { PYTHON_FILES } from "@/python-runtime/pdf_magic.bundle";

let pyodide: PyodideInterface | null = null;

async function initPyodide() {
    if (pyodide) return pyodide;

    // Initialize Pyodide and install necessary packages
    console.log("Worker: Initializing Pyodide...");
    try {
        pyodide = await loadPyodide({
            indexURL: "https://cdn.jsdelivr.net/pyodide/v0.29.2/full/",
        });

        // Install dependencies
        console.log("Worker: Installing pypdf, pillow, and PyMuPDF...");
        await pyodide.loadPackage(["micropip", "lxml"]);
        const micropip = pyodide.pyimport("micropip");
        await micropip.install(["pypdf", "Pillow", "PyMuPDF", "python-docx"]);

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
            pyodide.FS.writeFile(filePath, content as string);
        }

        console.log("Worker: Python files written to virtual FS.");

        // Import the main function
        await pyodide.runPythonAsync(`
import sys
import os
print(f"Current CWD: {os.getcwd()}")
try:
    sys.path.append(os.getcwd())
    if os.path.exists("tools"):
        print(f"Tools content: {os.listdir('tools')}")
        if os.path.exists("tools/pdf_magic"):
             print(f"Magic content: {os.listdir('tools/pdf_magic')}")
    
    import tools.pdf_magic.main as pdf_main
    handle_request = pdf_main.handle_request
    print("Python: handle_request imported successfully")
except Exception as e:
    import tools.pdf_magic.main as pdf_main
    handle_request = pdf_main.handle_request
except Exception as e:
    init_error = str(e)
    import traceback
    traceback.print_exc()
        `);

        self.postMessage({ type: "READY" });
        return pyodide;
    } catch (error) {
        console.error("Worker: Failed to initialize Pyodide:", error);
        throw error;
    }
}

self.onmessage = async (event: MessageEvent) => {
    const { type, action, data, id } = event.data;

    if (type === "EXECUTE") {
        try {
            const py = await initPyodide();

            // Check for initialization errors
            const initError = py.globals.get("init_error");
            if (initError) {
                throw new Error(`Python Initialization Failed: ${initError}`);
            }

            const handleRequest = py.globals.get("handle_request");

            if (typeof handleRequest !== 'function') {
                throw new Error("Python function 'handle_request' not found in globals. Check initialization logic.");
            }

            // data should be input bytes or similar
            // Convert JS Uint8Array to Python bytes
            const pyData = py.toPy(data);

            const result = handleRequest(action, pyData);

            // If result is a list (bytes), convert back to JS
            let jsResult;
            if (result && result.toJs) {
                jsResult = result.toJs();
            } else {
                jsResult = result;
            }

            self.postMessage({ type: "RESULT", data: jsResult, id });

            // Cleanup
            pyData.destroy();
            if (result.destroy) result.destroy();

        } catch (error: any) {
            console.error("Worker: Execution error:", error);
            self.postMessage({ type: "ERROR", error: error.message, id });
        }
    }
};

initPyodide().catch(console.error);
