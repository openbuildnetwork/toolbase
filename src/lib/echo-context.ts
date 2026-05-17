export type EchoRuntimeEventKind =
  | "ai"
  | "console"
  | "network"
  | "system"
  | "tool"
  | "ui"
  | "validation";

export type EchoRuntimeEventLevel = "info" | "warn" | "error";

export interface EchoRuntimeEvent {
  id: string;
  at: string;
  kind: EchoRuntimeEventKind;
  level: EchoRuntimeEventLevel;
  message: string;
  route?: string | null;
  detail?: string;
}

export interface EchoRuntimeSnapshot {
  route?: string | null;
  device: {
    width?: number;
    height?: number;
    online?: boolean;
    visibility?: string;
    cores?: number;
    memoryGb?: number;
    pointer?: string;
  };
  uiContext?: unknown;
  toolState?: unknown;
  recentEvents: EchoRuntimeEvent[];
  lastError?: EchoRuntimeEvent;
}

type CompactOptions = {
  maxChars?: number;
  maxDepth?: number;
};

function isFileLike(value: unknown): value is File {
  return typeof File !== "undefined" && value instanceof File;
}

function isBlobLike(value: unknown): value is Blob {
  return typeof Blob !== "undefined" && value instanceof Blob;
}

function isElementLike(value: unknown): value is Element {
  return typeof Element !== "undefined" && value instanceof Element;
}

function clampText(value: string, maxChars: number) {
  if (value.length <= maxChars) return value;
  return `${value.slice(0, maxChars)}... [truncated]`;
}

export function compactForEcho(value: unknown, options: CompactOptions = {}) {
  const maxChars = options.maxChars ?? 1800;
  const maxDepth = options.maxDepth ?? 4;

  if (typeof value === "string") return clampText(value, maxChars);
  if (value instanceof Error) {
    return clampText(value.stack || value.message, maxChars);
  }

  const seen = new WeakSet<object>();

  const normalize = (input: unknown, depth: number): unknown => {
    if (input === null || input === undefined) return input;
    if (typeof input === "string") return clampText(input, 700);
    if (typeof input === "number" || typeof input === "boolean") return input;
    if (typeof input === "bigint") return input.toString();
    if (typeof input === "function") return "[Function]";
    if (input instanceof Error) {
      return { name: input.name, message: input.message, stack: clampText(input.stack || "", 700) };
    }
    if (isFileLike(input)) {
      return { name: input.name, type: input.type, size: input.size, lastModified: input.lastModified };
    }
    if (isBlobLike(input)) {
      return { type: input.type, size: input.size };
    }
    if (isElementLike(input)) {
      const label =
        input.getAttribute("aria-label") ||
        input.getAttribute("title") ||
        input.textContent?.trim().slice(0, 80) ||
        "";
      return { element: input.tagName.toLowerCase(), id: input.id || undefined, label };
    }
    if (typeof input !== "object") return String(input);

    if (seen.has(input)) return "[Circular]";
    seen.add(input);

    if (depth >= maxDepth) {
      if (Array.isArray(input)) return `[Array(${input.length})]`;
      return "[Object]";
    }

    if (Array.isArray(input)) {
      return input.slice(0, 20).map((item) => normalize(item, depth + 1));
    }

    const output: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(input as Record<string, unknown>).slice(0, 40)) {
      output[key] = normalize(item, depth + 1);
    }
    return output;
  };

  try {
    return clampText(JSON.stringify(normalize(value, 0), null, 2), maxChars);
  } catch {
    return clampText(String(value), maxChars);
  }
}

export function compactConsoleArgs(args: unknown[]) {
  return args.map((arg) => compactForEcho(arg, { maxChars: 650, maxDepth: 2 })).join(" ");
}
