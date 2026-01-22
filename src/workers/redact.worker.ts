import { loadPyodide, type PyodideInterface } from "pyodide";
import { PYTHON_RUNTIME } from "@/python-runtime/bundle";

let pyodide: PyodideInterface | null = null;
let redactFn: any;

async function initPyodide() {
    if (pyodide) return pyodide;

    console.log("Worker: Initializing Pyodide...");
    try {
        pyodide = await loadPyodide({
            indexURL: "https://cdn.jsdelivr.net/pyodide/v0.29.2/full/",
        });
        console.log("Worker: Pyodide loaded, running runtime bundle...");

        await pyodide.runPythonAsync(PYTHON_RUNTIME);
        console.log("Worker: Python runtime bundle executed.");

        redactFn = pyodide.globals.get("redact_content");
        console.log("Worker: redact_content function retrieved.");

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
            const redactFn = py.globals.get("redact_content");
            const result = redactFn(
                data.content,
                data.contentType,
                data.masking.style,
                py.toPy(data.masking.userHints),
                py.toPy(data.masking.logOptions)
            ).toJs({ dict_converter: Object.fromEntries });

            self.postMessage({ type: "REDACT_RESULT", data: result, id });
        } catch (error: any) {
            self.postMessage({ type: "REDACT_ERROR", error: error.message, id });
        }
    }
};

// Start initializing immediately
initPyodide().catch(console.error);
