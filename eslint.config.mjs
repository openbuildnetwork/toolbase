import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/modules/**"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{
          group: ["@/modules/*/**"],
          message: "Direct cross-module imports are banned. Communicate via @/platform/tip or use @/shared logic."
        }]
      }]
    }
  },
  {
    files: ["src/platform/**", "src/shared/**"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{
          group: ["@/modules/**"],
          message: "Core layers (Platform/Shared) cannot depend on feature Modules."
        }]
      }]
    }
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
