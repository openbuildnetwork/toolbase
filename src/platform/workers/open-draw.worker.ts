
import { PythonWorkerBase } from "@/platform/python/worker-base";
// @ts-ignore
import { PYTHON_FILES } from "@/platform/python/bundles/open_draw.bundle";

const worker = new PythonWorkerBase({
  name: "Open Draw",
  packages: [],
  pipPackages: ["networkx"],
  pythonFiles: PYTHON_FILES,
  mainModule: "tools.open_draw.main"
});

self.onmessage = (e) => worker.handleMessage(e);

worker.getPyodide().catch(console.error);
