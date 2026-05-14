
import { PythonWorkerBase } from "@/platform/python/worker-base";
// @ts-ignore
import { PYTHON_FILES } from "@/platform/python/bundles/pixels.bundle";

const worker = new PythonWorkerBase({
  name: "Pixels",
  packages: [],
  pipPackages: ["Pillow", "numpy"],
  pythonFiles: PYTHON_FILES,
  mainModule: "tools.pixels.main"
});

self.onmessage = (e) => worker.handleMessage(e);

worker.getPyodide().catch(console.error);
