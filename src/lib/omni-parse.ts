import {
  DataFormat,
  TranspileOptions,
  parseToObject,
  serializeFromObject,
  sortObjectKeysDeep,
} from "./omni-parse/shared";

export type { DataFormat, FormatMode, XmlOptions, TranspileOptions } from "./omni-parse/shared";
export type { ValidationResult } from "./omni-parse/validators";
export { formatData } from "./omni-parse/formatters";
export { validateData } from "./omni-parse/validators";
export { parseToObject } from "./omni-parse/shared";

export function convertFormat(
  inputFormat: DataFormat,
  outputFormat: DataFormat,
  input: string,
  options?: TranspileOptions
): string {
  const parsed = parseToObject(inputFormat, input);
  const transformed = options?.sortKeys ? sortObjectKeysDeep(parsed) : parsed;
  return serializeFromObject(outputFormat, transformed, options, "beautify");
}

export function generateMarkdownDoc(json: unknown, rootName: string) {
  const sections: string[] = [];

  function inferType(value: unknown): string {
    if (value === null) return "null";
    if (value === undefined) return "undefined";
    if (Array.isArray(value)) return value.length ? `array<${inferType(value[0])}>` : "array";
    if (typeof value === "object") return "object";
    return typeof value;
  }

  function describeNode(node: unknown, path: string) {
    const title = path || rootName || "Root";
    sections.push(`## ${title}`);

    if (Array.isArray(node)) {
      if (node.length === 0) {
        sections.push("- (empty array)");
        return;
      }

      sections.push(`- (array with ${node.length} items)`);
      const sample = node.find((item) => item !== null && item !== undefined) ?? node[0];
      sections.push(`- \`item\`: ${inferType(sample)}`);

      if (sample && typeof sample === "object") {
        describeNode(sample, `${title}[]`);
      }
      return;
    }

    if (!node || typeof node !== "object") {
      sections.push("- `value`: " + inferType(node));
      return;
    }

    const record = node as Record<string, unknown>;
    const keys = Object.keys(record);
    if (keys.length === 0) {
      sections.push("- (empty object)");
      return;
    }

    keys.forEach((key) => {
      sections.push("- `" + key + "`: " + inferType(record[key]));
    });

    keys.forEach((key) => {
      const value = record[key];
      if (Array.isArray(value) && value.length > 0) {
        const sample = value.find((item) => item !== null && item !== undefined) ?? value[0];
        if (sample && typeof sample === "object") {
          describeNode(sample, `${title}.${key}[]`);
        }
      } else if (value && typeof value === "object" && !Array.isArray(value)) {
        describeNode(value, `${title}.${key}`);
      }
    });
  }

  sections.push(`# ${rootName || "Root"} Schema`);
  describeNode(json, rootName || "Root");

  return sections.join("\n");
}

// -------------------------
// JSON Flatten / Unflatten
// -------------------------

export type FlattenOptions = {
  separator?: string; // default "."
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function flattenJson(value: unknown, options: FlattenOptions = {}) {
  const separator = options.separator ?? ".";
  const out: Record<string, unknown> = {};

  const visit = (node: unknown, prefix: string) => {
    if (Array.isArray(node)) {
      node.forEach((item, idx) => visit(item, prefix ? `${prefix}${separator}${idx}` : String(idx)));
      return;
    }

    if (isPlainObject(node)) {
      for (const [key, child] of Object.entries(node)) {
        const next = prefix ? `${prefix}${separator}${key}` : key;
        visit(child, next);
      }
      return;
    }

    // primitives (or null)
    out[prefix || "value"] = node;
  };

  visit(value, "");
  return out;
}

export function unflattenJson(flat: Record<string, unknown>, options: FlattenOptions = {}) {
  const separator = options.separator ?? ".";
  const root: Record<string, unknown> = {};

  const isIndex = (s: string) => /^\d+$/.test(s);

  type Container = Record<string, unknown> | unknown[];

  const setPath = (obj: Record<string, unknown>, path: string[], value: unknown) => {
    let current: Container = obj;

    for (let i = 0; i < path.length; i++) {
      const part = path[i];
      const nextPart = path[i + 1];
      const isLast = i === path.length - 1;

      if (isLast) {
        if (Array.isArray(current) && isIndex(part)) {
          (current as unknown[])[Number(part)] = value;
        } else {
          (current as Record<string, unknown>)[part] = value;
        }
        return;
      }

      const shouldBeArray = nextPart !== undefined && isIndex(nextPart);
      const existing: unknown =
        Array.isArray(current) && isIndex(part)
          ? (current as unknown[])[Number(part)]
          : (current as Record<string, unknown>)[part];
      let nextContainer: Container;

      if (shouldBeArray) {
        nextContainer = Array.isArray(existing) ? existing : [];
      } else {
        nextContainer = isPlainObject(existing) ? (existing as Record<string, unknown>) : {};
      }

      if (Array.isArray(current) && isIndex(part)) {
        (current as unknown[])[Number(part)] = nextContainer;
      } else {
        (current as Record<string, unknown>)[part] = nextContainer;
      }

      current = nextContainer;
    }
  };

  for (const [key, value] of Object.entries(flat)) {
    if (!key) continue;
    const parts = key.split(separator).filter(Boolean);
    if (parts.length === 0) continue;
    setPath(root, parts, value);
  }

  return root;
}
