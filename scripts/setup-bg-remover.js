
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { finished } from 'stream/promises';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PACKAGE_VERSION = "1.7.0";
const ROOT_DIR = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public', 'imgly');
const TEMP_TGZ = path.join(ROOT_DIR, 'package.tgz');

// URLs to try
const URLS = [
    `https://static.img.ly/background-removal-data/${PACKAGE_VERSION}/dist.tgz`,
    `https://static.img.ly/background-removal-data/${PACKAGE_VERSION}/package.tgz`,
    `https://staticimgly.com/@imgly/background-removal-data/${PACKAGE_VERSION}/package.tgz`
];

async function downloadFile(url, dest) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.statusText}`);
    const fileStream = fs.createWriteStream(dest);
    await finished(Readable.fromWeb(res.body).pipe(fileStream));
}

async function setup() {
    console.log("Setting up Background Removal Assets (Node.js)...");

    // Check if bgremover is enabled in tools.registry.ts
    const registryPath = path.join(ROOT_DIR, 'src', 'config', 'tools.registry.ts');
    if (fs.existsSync(registryPath)) {
        const registryContent = fs.readFileSync(registryPath, 'utf8');
        const toolsBlock = registryContent.match(/export const TOOLS: ToolMeta\[\] = \[[^\]]*\]/s);
        if (toolsBlock) {
            const isRegistryEnabled = toolsBlock[0]
                .split('\n')
                .some(line => !line.trim().startsWith('//') && line.includes('bgremoverConfig'));
            if (!isRegistryEnabled) {
                console.log("Background remover tool is currently disabled in tools.registry.ts. Skipping asset setup.");
                return;
            }
        }
    }

    const ONNX_DIR = path.join(ROOT_DIR, 'public', 'onnxruntime-web');
    if (!fs.existsSync(ONNX_DIR)) {
        fs.mkdirSync(ONNX_DIR, { recursive: true });
    }

    const isImglyReady = fs.existsSync(PUBLIC_DIR) && fs.existsSync(path.join(PUBLIC_DIR, 'resources.json')) && fs.readdirSync(PUBLIC_DIR).length > 5;
    const isOnnxReady = fs.existsSync(ONNX_DIR) && 
                         fs.existsSync(path.join(ONNX_DIR, 'ort-wasm-simd-threaded.wasm')) && 
                         fs.existsSync(path.join(ONNX_DIR, 'ort-wasm-simd-threaded.mjs')) &&
                         fs.statSync(path.join(ONNX_DIR, 'ort-wasm-simd-threaded.mjs')).size === 26583;

    if (isImglyReady && isOnnxReady) {
        console.log("Assets appear to be already installed in public/imgly and public/onnxruntime-web.");
        return;
    }

    if (!fs.existsSync(PUBLIC_DIR)) {
        fs.mkdirSync(PUBLIC_DIR, { recursive: true });
    }
    if (!fs.existsSync(ONNX_DIR)) {
        fs.mkdirSync(ONNX_DIR, { recursive: true });
    }

    // 1. Download
    let downloaded = false;
    for (const url of URLS) {
        try {
            console.log(`Attempting download from ${url}...`);
            await downloadFile(url, TEMP_TGZ);
            console.log("Download successful.");
            downloaded = true;
            break;
        } catch (e) {
            console.error(`Failed to download from ${url}:`, e.message);
        }
    }

    if (!downloaded) {
        console.error("Could not download assets from any source.");
        process.exit(1);
    }

    // 2. Extract
    console.log("Extracting...");
    try {
        // Use system tar command (available on Windows 10+ and Linux/Mac)
        // Extract to current directory
        execSync(`tar -xf "${TEMP_TGZ}" -C "${ROOT_DIR}"`);
    } catch (e) {
        console.error("Extraction failed:", e.message);
        // Fallback or exit?
        process.exit(1);
    }

    // 3. Move files
    // The tar usually extracts to 'package/dist' or 'dist'
    let sourceDir = path.join(ROOT_DIR, 'package', 'dist');
    if (!fs.existsSync(sourceDir)) {
        sourceDir = path.join(ROOT_DIR, 'dist');
    }

    if (fs.existsSync(sourceDir)) {
        console.log(`Moving files from ${sourceDir} to public...`);
        const files = fs.readdirSync(sourceDir);
        for (const file of files) {
            const src = path.join(sourceDir, file);

            if (file === 'onnxruntime-web') {
                console.log("Moving onnxruntime-web assets to public/onnxruntime-web...");
                const subFiles = fs.readdirSync(src);
                for (const subFile of subFiles) {
                    const subSrc = path.join(src, subFile);
                    const subDest = path.join(ONNX_DIR, subFile);
                    if (fs.existsSync(subDest)) fs.rmSync(subDest);
                    fs.renameSync(subSrc, subDest);
                }
                // Cleanup empty onnxruntime-web dir
                fs.rmdirSync(src);
            } else {
                const dest = path.join(PUBLIC_DIR, file);
                if (fs.existsSync(dest)) fs.rmSync(dest);
                fs.renameSync(src, dest);
            }
        }

        // Cleanup empty dirs
        if (sourceDir.includes('package')) {
            fs.rmSync(path.join(ROOT_DIR, 'package'), { recursive: true, force: true });
        } else if (fs.existsSync(sourceDir)) {
            fs.rmSync(sourceDir, { recursive: true, force: true });
        }
    } else {
        console.error("Could not find extracted directory.");
    }

    // 4. Cleanup Zip
    try {
        if (fs.existsSync(TEMP_TGZ)) fs.rmSync(TEMP_TGZ);
    } catch (e) {
        console.warn("Could not delete temporary tgz file:", e.message);
    }

    // 5. Normalize line endings of text files to ensure correct size on all operating systems
    console.log("Normalizing line endings of JS/MJS assets...");
    const filesToNormalize = [
        path.join(ONNX_DIR, 'ort-wasm-simd-threaded.mjs'),
        path.join(ONNX_DIR, 'ort-wasm-simd-threaded.jsep.mjs'),
        path.join(PUBLIC_DIR, 'aa485cf3fa61ca007b3e1ca7b65068328270f072b61cdda490b732211e1da5d9'),
        path.join(PUBLIC_DIR, '2004e7fc76dd246901aaec08a7268cfb9832dcafa9e5a889b7f23f990ffe16ab')
    ];

    for (const file of filesToNormalize) {
        if (fs.existsSync(file)) {
            const content = fs.readFileSync(file, 'utf8');
            const normalized = content.replace(/\r\n/g, '\n');
            fs.writeFileSync(file, normalized, 'utf8');
            console.log(`Normalized ${path.basename(file)}: ${fs.statSync(file).size} bytes`);
        }
    }

    console.log("Setup complete.");
}

setup().catch(err => {
    console.error("Setup failed:", err);
    process.exit(1);
});
