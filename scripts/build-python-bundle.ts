import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const DOMAINS_DIR = path.join(ROOT, "src/python");
const OUTPUT_FILE = path.join(ROOT, "src/python-runtime/bundle.ts");

function getAllPythonFiles(dir: string): string[] {
    let results: string[] = [];
    const list = fs.readdirSync(dir);
    list.forEach((file) => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            results = results.concat(getAllPythonFiles(filePath));
        } else if (file.endsWith(".py")) {
            results.push(filePath);
        }
    });
    return results;
}

function buildBundle() {
    const pythonFiles = getAllPythonFiles(DOMAINS_DIR);
    let pythonBundle = "";

    for (const fullPath of pythonFiles) {
        const relativePath = path.relative(DOMAINS_DIR, fullPath);
        const code = fs.readFileSync(fullPath, "utf8");

        pythonBundle += `
# ==================================================
# FILE: ${relativePath}
# ==================================================
${code}
`;
    }

    const tsOutput = `/**
 * ⚠️ AUTO-GENERATED FILE
 * DO NOT EDIT MANUALLY
 */

export const PYTHON_RUNTIME = \`
${pythonBundle.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$/g, "\\$")}
\`;
`;

    fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
    fs.writeFileSync(OUTPUT_FILE, tsOutput, "utf8");

    console.log(`✓ Python runtime bundle generated (${pythonFiles.length} files)`);
}

buildBundle();
