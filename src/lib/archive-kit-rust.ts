import type { ArchiveEntry, ArchiveFormat, ArchiveInputFile } from "@/lib/archive-kit";

type ArchiveKitRustApi = {
  default: (wasmUrl?: string | URL | Request) => Promise<unknown>;
  create_archive_json: (format: string, filesJson: string) => string;
  list_archive_json: (format: string, archiveBytesB64: string) => string;
  extract_archive_json: (format: string, archiveBytesB64: string) => string;
};

let rustApiPromise: Promise<ArchiveKitRustApi | null> | null = null;

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    const sub = bytes.subarray(i, i + chunk);
    binary += String.fromCharCode(...sub);
  }
  return btoa(binary);
}

function fromBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function loadRustApi(): Promise<ArchiveKitRustApi | null> {
  if (typeof window === "undefined") return null;
  if (!rustApiPromise) {
    rustApiPromise = (async () => {
      try {
        const jsUrl = "/wasm/archive-kit/pkg/archive_kit.js";
        const wasmUrl = "/wasm/archive-kit/pkg/archive_kit_bg.wasm";
        const mod = (await import(/* webpackIgnore: true */ jsUrl)) as ArchiveKitRustApi;
        await mod.default(wasmUrl);
        return mod;
      } catch {
        return null;
      }
    })();
  }
  return rustApiPromise;
}

export async function isArchiveKitRustAvailable(): Promise<boolean> {
  const api = await loadRustApi();
  return !!api;
}

export async function createArchiveRust(
  format: ArchiveFormat,
  files: ArchiveInputFile[]
): Promise<Uint8Array | null> {
  const api = await loadRustApi();
  if (!api) return null;

  const payload = files.map((f) => ({ name: f.name, bytes_b64: toBase64(f.bytes) }));
  const outB64 = api.create_archive_json(format, JSON.stringify(payload));
  return fromBase64(outB64);
}

export async function listArchiveEntriesRust(
  format: ArchiveFormat,
  bytes: Uint8Array
): Promise<ArchiveEntry[] | null> {
  const api = await loadRustApi();
  if (!api) return null;

  const out = api.list_archive_json(format, toBase64(bytes));
  const parsed = JSON.parse(out) as Array<{
    name: string;
    size: number;
    compressed_size: number;
    is_directory: boolean;
    format: string;
  }>;

  return parsed.map((e) => ({
    name: e.name,
    size: e.size,
    compressedSize: e.compressed_size,
    isDirectory: e.is_directory,
    format: (e.format === "tar" ? "tar" : "zip") as ArchiveFormat,
  }));
}

export async function extractArchiveRust(
  format: ArchiveFormat,
  bytes: Uint8Array
): Promise<ArchiveInputFile[] | null> {
  const api = await loadRustApi();
  if (!api) return null;

  const out = api.extract_archive_json(format, toBase64(bytes));
  const parsed = JSON.parse(out) as Array<{ name: string; bytes_b64: string }>;

  return parsed.map((file) => ({
    name: file.name,
    bytes: fromBase64(file.bytes_b64),
  }));
}

