import YAML from "yaml";
import * as TOML from "@iarna/toml";
import { XMLBuilder, XMLParser } from "fast-xml-parser";

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

export function sortObjectKeysDeep(value: unknown): unknown {
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
      // TOML stringify expects a top-level map/object.
      if (!data || typeof data !== "object" || Array.isArray(data)) {
        throw new Error("TOML output requires a top-level object.");
      }
      return TOML.stringify(data as unknown as TOML.JsonMap);
    default:
      throw new Error(`Unsupported output format: ${format}`);
  }
}
