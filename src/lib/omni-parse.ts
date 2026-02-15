import YAML from "yaml";
import * as TOML from "@iarna/toml";
import { XMLBuilder, XMLParser, XMLValidator } from "fast-xml-parser";

export type DataFormat = "json" | "xml" | "yaml" | "toml";
export type FormatMode = "beautify" | "minify";

export type XmlOptions = {
  preserveAttributes?: boolean;
};

export type TranspileOptions = {
  xml?: XmlOptions;
  sortKeys?: boolean;
};

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  parseTagValue: true,
  parseAttributeValue: true,
  trimValues: true,
});

function buildXmlBuilder(format: boolean) {
  return new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    format,
    indentBy: "  ",
  });
}

function sortObjectKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortObjectKeysDeep);

  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return Object.keys(record)
      .sort()
      .reduce((sorted: Record<string, unknown>, key) => {
        sorted[key] = sortObjectKeysDeep(record[key]);
        return sorted;
      }, {});
  }

  return value;
}

export function parseToObject(format: DataFormat, input: string): unknown {
  if (!input.trim()) throw new Error("Input is empty.");

  switch (format) {
    case "json":
      return JSON.parse(input);
    case "xml":
      return xmlParser.parse(input);
    case "yaml":
      return YAML.parse(input);
    case "toml":
      return TOML.parse(input);
    default:
      throw new Error(`Unsupported input format: ${format}`);
  }
}

export function serializeFromObject(
  format: DataFormat,
  data: unknown,
  _options?: TranspileOptions,
  mode: FormatMode = "beautify"
): string {
  switch (format) {
    case "json":
      return mode === "minify" ? JSON.stringify(data) : JSON.stringify(data, null, 2);
    case "xml":
      return buildXmlBuilder(mode === "beautify").build(data);
    case "yaml":
      return YAML.stringify(data);
    case "toml":
      return TOML.stringify(data);
    default:
      throw new Error(`Unsupported output format: ${format}`);
  }
}

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

export type ValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

export function validateData(format: "json" | "xml" | "yaml", input: string): ValidationResult {
  const warnings: string[] = [];

  try {
    if (!input.trim()) {
      return { valid: false, errors: ["Input is empty."], warnings };
    }

    if (format === "json") {
      JSON.parse(input);
      return { valid: true, errors: [], warnings };
    }

    if (format === "yaml") {
      YAML.parse(input);
      return { valid: true, errors: [], warnings };
    }

    if (format === "xml") {
      const result = XMLValidator.validate(input);
      if (result !== true) {
        return { valid: false, errors: [result.err.msg], warnings };
      }
      return { valid: true, errors: [], warnings };
    }

    return { valid: false, errors: ["Unsupported format"], warnings };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Validation failed";
    return { valid: false, errors: [message], warnings };
  }
}

export function formatData(format: DataFormat, input: string, mode: FormatMode, options?: TranspileOptions): string {
  const parsed = parseToObject(format, input);
  const transformed = options?.sortKeys ? sortObjectKeysDeep(parsed) : parsed;
  return serializeFromObject(format, transformed, options, mode);
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

  function describeObject(obj: unknown, path: string) {
    const title = path || rootName || "Root";
    sections.push(`## ${title}`);

    if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
      sections.push("- `value`: " + inferType(obj));
      return;
    }

    const record = obj as Record<string, unknown>;
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
      if (value && typeof value === "object" && !Array.isArray(value)) {
        describeObject(value, `${title}.${key}`);
      }
    });
  }

  sections.push(`# ${rootName || "Root"} Schema`);
  describeObject(json, rootName || "Root");

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
      const existing =
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
