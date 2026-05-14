
import { PythonWorkerBase } from "@/platform/python/worker-base";
// @ts-ignore
import { PYTHON_FILES } from "@/platform/python/bundles/pdf_magic.bundle";

const worker = new PythonWorkerBase({
  name: "Magic PDF",
  packages: ["lxml"],
  pipPackages: ["pypdf", "Pillow", "PyMuPDF"],
  pythonFiles: PYTHON_FILES,
  mainModule: "tools.pdf_magic.main"
});

self.onmessage = (e) => worker.handleMessage(e);

worker.getPyodide().catch(console.error);
