import YAML from "yaml";
import type { FormatAdapter } from "./types";

export const yamlAdapter: FormatAdapter = {
  id: "yaml",
  capabilities: {
    canConvert: true,
    canValidate: true,
    canFormat: true,
    canSortKeys: true,
    canJsonStringTools: false,
  },
  parse(input: string): unknown {
    return YAML.parse(input);
  },
  serialize(data): string {
    return YAML.stringify(data);
  },
  validate(input) {
    if (!input.trim()) return { valid: false, errors: ["Input is empty."], warnings: [] };
    try {
      YAML.parse(input);
      return { valid: true, errors: [], warnings: [] };
    } catch (error: unknown) {
      return {
        valid: false,
        errors: [error instanceof Error ? error.message : "YAML validation failed"],
        warnings: [],
      };
    }
  },
};
