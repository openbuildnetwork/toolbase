import YAML from "yaml";
import { XMLValidator } from "fast-xml-parser";

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
