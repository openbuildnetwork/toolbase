import type {
  ArchiveEntry,
  ArchiveFormat,
  ArchiveInputFile,
  ZipCompressionMode,
} from "@/lib/archive-kit";

type ArchiveKitRustApi = {
  default: (wasmUrl?: string | URL | Request) => Promise<unknown>;
  create_archive_json: (format: string, filesJson: string, optionsJson?: string) => string;
  list_archive_json: (format: string, archiveBytesB64: string) => string;
  extract_archive_json: (format: string, archiveBytesB64: string, optionsJson?: string) => string;
};

let rustApiPromise: Promise<ArchiveKitRustApi | null> | null = null;
const RUST_REQUIRED =
  process.env.NEXT_PUBLIC_ARCHIVE_KIT_REQUIRE_RUST === "1" ||
  process.env.NEXT_PUBLIC_ARCHIVE_KIT_REQUIRE_RUST === "true";

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

export function isArchiveKitRustRequired(): boolean {
  return RUST_REQUIRED;
}

export async function createArchiveRust(
  format: ArchiveFormat,
  files: ArchiveInputFile[],
  options: { zipCompression?: ZipCompressionMode; password?: string } = {}
): Promise<Uint8Array | null> {
  const api = await loadRustApi();
  if (!api) {
    if (RUST_REQUIRED) throw new Error("Rust WASM engine is required but not available.");
    return null;
  }
  if (format === "tgz") return null;

  const payload = files.map((f) => ({ name: f.name, bytes_b64: toBase64(f.bytes) }));
  try {
    const outB64 = api.create_archive_json(
      format,
      JSON.stringify(payload),
      JSON.stringify({
        zip_compression: options.zipCompression ?? "store",
        password: options.password ?? null,
      })
    );
    return fromBase64(outB64);
  } catch {
    return null;
  }
}

export async function listArchiveEntriesRust(
  format: ArchiveFormat,
  bytes: Uint8Array
): Promise<ArchiveEntry[] | null> {
  const api = await loadRustApi();
  if (!api) {
    if (RUST_REQUIRED) throw new Error("Rust WASM engine is required but not available.");
    return null;
  }
  if (format === "tgz") return null;

  let out: string;
  try {
    out = api.list_archive_json(format, toBase64(bytes));
  } catch {
    return null;
  }
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
  bytes: Uint8Array,
  options: { password?: string } = {}
): Promise<ArchiveInputFile[] | null> {
  const api = await loadRustApi();
  if (!api) {
    if (RUST_REQUIRED) throw new Error("Rust WASM engine is required but not available.");
    return null;
  }
  if (format === "tgz") return null;

  let out: string;
  try {
    out = api.extract_archive_json(
      format,
      toBase64(bytes),
      JSON.stringify({
        password: options.password ?? null,
      })
    );
  } catch {
    return null;
  }
  const parsed = JSON.parse(out) as Array<{ name: string; bytes_b64: string }>;

  return parsed.map((file) => ({
    name: file.name,
    bytes: fromBase64(file.bytes_b64),
  }));
}
