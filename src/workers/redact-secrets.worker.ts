import type { RedactRequest, RedactResponse } from "@/app/(tools)/redact-secrets/types/redact";

type RedactSecretsRustApi = {
  default: (options?: { module_or_path?: string | URL | Request } | string | URL | Request) => Promise<unknown>;
  redact_json: (requestJson: string) => string;
};

let rustApiPromise: Promise<RedactSecretsRustApi> | null = null;
let currentEngineLabel: "Rust WASM" | "Unavailable" = "Unavailable";

async function initRustApi(): Promise<RedactSecretsRustApi> {
  if (!rustApiPromise) {
    rustApiPromise = (async () => {
      try {
        self.postMessage({ type: "INIT_PROGRESS", message: "Fetching engine..." });
        const base = self.location?.origin ?? "";
        const jsUrl = `${base}/wasm/redact-secrets/pkg/redact_secrets.js`;
        const wasmUrl = `${base}/wasm/redact-secrets/pkg/redact_secrets_bg.wasm`;
        
        const mod = (await import(/* webpackIgnore: true */ jsUrl)) as RedactSecretsRustApi;
        
        self.postMessage({ type: "INIT_PROGRESS", message: "Compiling WASM..." });
        await mod.default({ module_or_path: wasmUrl });
        
        currentEngineLabel = "Rust WASM";
        self.postMessage({ type: "READY", engine: currentEngineLabel });
        return mod;
      } catch (error: unknown) {
        currentEngineLabel = "Unavailable";
        self.postMessage({
          type: "READY",
          engine: currentEngineLabel,
          warning: error instanceof Error ? error.message : "Rust engine initialization failed",
        });
        throw error;
      }
    })();
  }
  return rustApiPromise;
}

self.onmessage = async (event: MessageEvent) => {
  const { type, action, data, id } = event.data;

  if (type !== "EXECUTE" || action !== "redact") return;

  try {
    const api = await initRustApi();
    const result = JSON.parse(api.redact_json(JSON.stringify(data as RedactRequest))) as RedactResponse;
    self.postMessage({ type: "RESULT", data: { ...result, result: result.maskedContent }, id, engine: currentEngineLabel });
  } catch (error: unknown) {
    self.postMessage({
      type: "ERROR",
      error: error instanceof Error ? error.message : "Rust redaction engine failed",
      id,
      engine: "Unavailable",
    });
  }
};

// Start initialization immediately when worker is spawned.
// The worker is lazily spawned by WorkerClient only when needed (or during pre-warm).
initRustApi().catch((err) => {
  console.error("Worker failed to init:", err);
});

