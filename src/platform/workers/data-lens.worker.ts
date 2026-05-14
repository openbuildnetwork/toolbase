
import { PythonWorkerBase } from "@/platform/python/worker-base";
// @ts-ignore
import { PYTHON_FILES } from "@/platform/python/bundles/data_lens.bundle";

const worker = new PythonWorkerBase({
  name: "Data Lens",
  packages: ["pandas", "sqlite3"],
  pipPackages: ["openpyxl"],
  pythonFiles: PYTHON_FILES,
  mainModule: "tools.data_lens.main"
});

self.onmessage = (e) => worker.handleMessage(e);

// Start pre-warming immediately since this worker is only spawned when needed
worker.getPyodide().catch(console.error);
