import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

const ROOT = process.cwd();
const RUST_DIR = path.join(ROOT, "rust");
const PUBLIC_WASM_DIR = path.join(ROOT, "public", "wasm");

function hasWasmPack() {
  const res = spawnSync("wasm-pack", ["--version"], { stdio: "pipe" });
  return res.status === 0;
}

function getRustToolDirs() {
  if (!fs.existsSync(RUST_DIR)) return [];
  return fs
    .readdirSync(RUST_DIR)
    .map((name) => path.join(RUST_DIR, name))
    .filter((full) => fs.statSync(full).isDirectory())
    .filter((full) => fs.existsSync(path.join(full, "Cargo.toml")))
    .sort();
}

function run() {
  const tools = getRustToolDirs();
  if (tools.length === 0) {
    console.log("[wasm] No Rust tool crates found under ./rust");
    return 0;
  }

  if (!hasWasmPack()) {
    console.warn("[wasm] wasm-pack not found. Skipping Rust WASM build.");
    console.warn("[wasm] Install: cargo install wasm-pack");
    return 0;
  }

  fs.mkdirSync(PUBLIC_WASM_DIR, { recursive: true });

  for (const crateDir of tools) {
    const tool = path.basename(crateDir);
    const outDir = path.join("..", "..", "public", "wasm", tool, "pkg");
    console.log(`[wasm] Building ${tool}...`);
    const res = spawnSync(
      "wasm-pack",
      ["build", crateDir, "--target", "web", "--out-dir", outDir],
      { stdio: "inherit" }
    );
    if (res.status !== 0) {
      console.error(`[wasm] Build failed for ${tool}`);
      return res.status ?? 1;
    }
  }

  console.log(`[wasm] Built ${tools.length} crate(s) successfully.`);
  return 0;
}

process.exit(run());

