"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Editor } from "@monaco-editor/react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Card } from "@/components/ui/Card";
import { ToolSidebar, ToolSidebarItem } from "@/components/ui/ToolSidebar";
import { cn } from "@/lib/utils";
import { DataGraph } from "@/components/ui/DataGraph";
import {
  convertFormat,
  diffObjects,
  formatData,
  validateData,
  parseToObject,
  generateMarkdownDoc,
  generateSchemaSummary,
  generateOpenApiSnippet,
  flattenJson,
  unflattenJson,
} from "@/lib/omni-parse";
import type { DataFormat } from "@/lib/omni-parse";
import {
  ArrowRightLeft,
  AlertTriangle,
  Download,
  CheckCircle2,
  FileDiff,
  Upload,
  XCircle,
  Braces,
  Wand2,
} from "lucide-react";

const formatOptions: { id: DataFormat; label: string }[] = [
  { id: "json", label: "JSON" },
  { id: "xml", label: "XML" },
  { id: "yaml", label: "YAML" },
  { id: "toml", label: "TOML" },
];

const languageMap: Record<DataFormat, string> = {
  json: "json",
  xml: "xml",
  yaml: "yaml",
  toml: "toml",
};


export default function OmniParsePage() {
  type RecipeStepOp =
    | "beautify"
    | "minify"
    | "sortKeys"
    | "flatten"
    | "unflatten"
    | "jsonEscape"
    | "jsonUnescape"
    | "convert";

  type RecipeStep = {
    id: string;
    op: RecipeStepOp;
    targetFormat?: "json" | "xml" | "yaml";
  };

  type FormatterRecipe = {
    id: string;
    name: string;
    inputFormat: "json" | "xml" | "yaml";
    steps: RecipeStep[];
  };
  type OmniFixture = {
    id: string;
    name: string;
    format: "json" | "xml" | "yaml";
    input: string;
    expectedValid: boolean;
  };
  const [activeTab, setActiveTab] = useState<"transpile" | "validate" | "format" | "diff" | "generate">("transpile");

  const [inputFormat, setInputFormat] = useState<DataFormat>("json");
  const [outputFormat, setOutputFormat] = useState<DataFormat>("yaml");
  const [inputText, setInputText] = useState("{\n  \"status\": \"ok\",\n  \"count\": 2\n}");
  const [outputText, setOutputText] = useState("");
  const [transpileError, setTranspileError] = useState<string | null>(null);

  const [validateFormat, setValidateFormat] = useState<"json" | "xml" | "yaml">("json");
  const [validateInput, setValidateInput] = useState("{\n  \"name\": \"OBN\",\n  \"version\": 1\n}");
  const [validationResult, setValidationResult] = useState<{ valid: boolean; errors: string[]; warnings: string[] } | null>(null);
  const [docInputFormat, setDocInputFormat] = useState<"json" | "xml" | "yaml">("json");
  const [docInput, setDocInput] = useState("{\n  \"user\": {\n    \"id\": 7,\n    \"name\": \"Ava\"\n  },\n  \"active\": true\n}");
  const [docRootName, setDocRootName] = useState("Payload");
  const [docOutput, setDocOutput] = useState("");
  const docGraph = useMemo(() => {
    try {
      return { value: parseToObject(docInputFormat, docInput) as unknown, error: null as string | null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Invalid input";
      return { value: null as unknown, error: message };
    }
  }, [docInputFormat, docInput]);
  const [docGraphMaxDepth, setDocGraphMaxDepth] = useState(7);
  const [docGraphMaxNodes, setDocGraphMaxNodes] = useState(260);
  const [docGraphDefaultExpandDepth, setDocGraphDefaultExpandDepth] = useState(2);
  const [docGraphRestoreExpandDepth, setDocGraphRestoreExpandDepth] = useState(2);
  const [docGraphExpandedPaths, setDocGraphExpandedPaths] = useState<Set<string>>(() => new Set());
  const [isDocGraphModalOpen, setDocGraphModalOpen] = useState(false);
  const [docSearchPath, setDocSearchPath] = useState("");
  const [docSchemaOutput, setDocSchemaOutput] = useState("");
  const [docOpenApiOutput, setDocOpenApiOutput] = useState("");
  const [roundTripReport, setRoundTripReport] = useState("");

  const [diffFormat, setDiffFormat] = useState<"json" | "xml" | "yaml">("json");
  const [diffLeft, setDiffLeft] = useState("{\n  \"id\": 7,\n  \"name\": \"Ava\",\n  \"meta\": { \"active\": true }\n}");
  const [diffRight, setDiffRight] = useState("{\n  \"id\": \"7\",\n  \"name\": \"Ava\",\n  \"meta\": { \"active\": false },\n  \"role\": \"admin\"\n}");
  const [diffError, setDiffError] = useState<string | null>(null);
  const [diffEntries, setDiffEntries] = useState<ReturnType<typeof diffObjects>>([]);
  const [formatterRecipes, setFormatterRecipes] = useState<FormatterRecipe[]>([]);
  const [recipeNameDraft, setRecipeNameDraft] = useState("My Pipeline");
  const [recipeStepOpDraft, setRecipeStepOpDraft] = useState<RecipeStepOp>("beautify");
  const [recipeStepTargetDraft, setRecipeStepTargetDraft] = useState<"json" | "xml" | "yaml">("json");
  const [recipeStepsDraft, setRecipeStepsDraft] = useState<RecipeStep[]>([]);
  const [fixtureCases, setFixtureCases] = useState<OmniFixture[]>([]);
  const [fixtureResults, setFixtureResults] = useState<Array<{ id: string; name: string; passed: boolean; detail: string }>>([]);
  const fixtureImportRef = useRef<HTMLInputElement | null>(null);


  const tools: ToolSidebarItem[] = useMemo(() => ([
    { id: "transpile", label: "Convert", icon: ArrowRightLeft },
    { id: "validate", label: "Validators", icon: CheckCircle2 },
    { id: "format", label: "Formatters", icon: Wand2 },
    { id: "diff", label: "Diff Lab", icon: FileDiff },
    { id: "generate", label: "Generator Hub", icon: Braces },
  ]), []);

  const activeToolLabel = tools.find(t => t.id === activeTab)?.label || "OmniParse";
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const formatStats = useMemo(() => {
    const chars = validateInput.length;
    const lines = validateInput ? validateInput.split("\n").length : 0;
    return { chars, lines };
  }, [validateInput]);

  const validationIssues = useMemo(() => {
    if (!validationResult) return [];
    const errors = validationResult.errors.map((text) => {
      const lineMatch = text.match(/line\s+(\d+)/i);
      const colMatch = text.match(/column\s+(\d+)/i);
      const pathMatch = text.match(/(?:at|path)\s+([$.a-zA-Z0-9_[\]-]+)/i);
      const lowered = text.toLowerCase();
      const severity: "critical" | "warning" | "info" =
        lowered.includes("invalid") || lowered.includes("error") ? "critical" : "warning";
      let suggestion = "Check syntax and matching brackets/quotes for this section.";
      if (lowered.includes("json")) suggestion = "Ensure property names and string values use double quotes.";
      if (lowered.includes("xml")) suggestion = "Validate matching open/close tags and attribute quote usage.";
      if (lowered.includes("yaml")) suggestion = "Check indentation and avoid tabs in YAML blocks.";
      return {
        severity,
        message: text,
        line: lineMatch ? Number(lineMatch[1]) : null,
        column: colMatch ? Number(colMatch[1]) : null,
        path: pathMatch ? pathMatch[1] : null,
        suggestion,
      };
    });
    const warnings = validationResult.warnings.map((text) => ({
      severity: "warning" as const,
      message: text,
      line: null,
      column: null,
      path: null,
      suggestion: "Review this warning before shipping payloads to downstream systems.",
    }));
    return [...errors, ...warnings];
  }, [validationResult]);

  const jsonToolState = useMemo(() => {
    if (validateFormat !== "json") {
      return {
        canEscape: false,
        canUnescape: false,
        canFlatten: false,
        canUnflatten: false,
      };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(validateInput);
    } catch {
      return {
        canEscape: true,
        canUnescape: false,
        canFlatten: false,
        canUnflatten: false,
      };
    }

    const isEscapedString = typeof parsed === "string";

    const isFlattenedObject = (() => {
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return false;
      const keys = Object.keys(parsed as Record<string, unknown>);
      return keys.some((k) => k.includes(".") || /^\d+(\.|$)/.test(k));
    })();

    return {
      canEscape: !isEscapedString,
      canUnescape: isEscapedString,
      // Show Flatten for regular JSON (including flat objects/arrays),
      // hide it only for already flattened dot-path payloads.
      canFlatten: !isEscapedString && !isFlattenedObject,
      canUnflatten: !isEscapedString && isFlattenedObject,
    };
  }, [validateFormat, validateInput]);

  const handleTranspile = () => {
    try {
      const result = convertFormat(inputFormat, outputFormat, inputText);
      setOutputText(result);
      setTranspileError(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Conversion failed";
      setTranspileError(message);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      const result = validateData(validateFormat, validateInput);
      setValidationResult(result);
    }, 400);
    return () => clearTimeout(timer);
  }, [validateFormat, validateInput]);

  // Note: We intentionally avoid auto-detecting between JSON and YAML.
  // YAML is permissive enough that many invalid JSON inputs are still valid YAML,
  // which is confusing for users expecting JSON-style errors.

  const handleFormat = (mode: "beautify" | "minify") => {
    try {
      const formatted = formatData(validateFormat, validateInput, mode);
      setValidateInput(formatted);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Formatting failed";
      setValidationResult({ valid: false, errors: [message], warnings: [] });
    }
  };

  const handleSortKeys = () => {
    try {
      const formatted = formatData(validateFormat, validateInput, "beautify", {
        sortKeys: true,
      });
      setValidateInput(formatted);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Sort keys failed";
      setValidationResult({ valid: false, errors: [message], warnings: [] });
    }
  };

  const handleFormatterPreset = (preset: "clean" | "normalize" | "apiReady") => {
    try {
      if (preset === "clean") {
        const cleaned = validateInput
          .split("\n")
          .map((line) => line.replace(/\s+$/g, ""))
          .join("\n")
          .trim();
        setValidateInput(cleaned);
        return;
      }
      if (preset === "normalize") {
        const normalized = formatData(validateFormat, validateInput, "beautify", { sortKeys: true });
        setValidateInput(normalized);
        return;
      }
      const normalized = formatData(validateFormat, validateInput, "beautify", { sortKeys: true });
      if (validateFormat === "json") {
        const parsed = JSON.parse(normalized);
        setValidateInput(JSON.stringify(parsed, null, 2));
      } else {
        setValidateInput(normalized);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Preset apply failed";
      setValidationResult({ valid: false, errors: [message], warnings: [] });
    }
  };

  const handleJsonEscape = () => {
    try {
      // Keep quotes so the result is valid JSON (auto-detect stays on JSON).
      const escaped = JSON.stringify(validateInput);
      setValidateInput(escaped);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "JSON escape failed";
      setValidationResult({ valid: false, errors: [message], warnings: [] });
    }
  };

  const handleJsonUnescape = () => {
    try {
      // Accept either raw escape sequences or a quoted JSON string.
      const trimmed = validateInput.trim();
      const jsonString = trimmed.startsWith("\"") && trimmed.endsWith("\"")
        ? trimmed
        : `"${trimmed.replace(/\\/g, "\\\\").replace(/"/g, "\\\"")}"`;
      const unescaped = JSON.parse(jsonString) as string;
      setValidateInput(unescaped);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "JSON unescape failed";
      setValidationResult({ valid: false, errors: [message], warnings: [] });
    }
  };

  const handleGenerateDoc = () => {
    if (docGraph.error) {
      setDocOutput("Invalid input: " + docGraph.error);
      return;
    }
    setDocOutput(generateMarkdownDoc(docGraph.value, docRootName || "Root"));
    setDocSchemaOutput(generateSchemaSummary(docGraph.value, docRootName || "Payload"));
    setDocOpenApiOutput(generateOpenApiSnippet(docGraph.value, docRootName || "Payload"));
  };

  const runRecipePipeline = (
    startFormat: "json" | "xml" | "yaml",
    startInput: string,
    steps: RecipeStep[]
  ): { format: "json" | "xml" | "yaml"; output: string } => {
    let currentFormat: "json" | "xml" | "yaml" = startFormat;
    let current = startInput;

    for (const step of steps) {
      switch (step.op) {
        case "beautify":
          current = formatData(currentFormat, current, "beautify");
          break;
        case "minify":
          current = formatData(currentFormat, current, "minify");
          break;
        case "sortKeys":
          current = formatData(currentFormat, current, "beautify", { sortKeys: true });
          break;
        case "flatten": {
          if (currentFormat !== "json") throw new Error("Flatten works only for JSON.");
          const parsed = JSON.parse(current);
          current = JSON.stringify(flattenJson(parsed), null, 2);
          break;
        }
        case "unflatten": {
          if (currentFormat !== "json") throw new Error("Unflatten works only for JSON.");
          const parsed = JSON.parse(current) as Record<string, unknown>;
          current = JSON.stringify(unflattenJson(parsed), null, 2);
          break;
        }
        case "jsonEscape":
          if (currentFormat !== "json") throw new Error("JSON Escape works only for JSON.");
          current = JSON.stringify(current);
          break;
        case "jsonUnescape": {
          if (currentFormat !== "json") throw new Error("JSON Unescape works only for JSON.");
          const trimmed = current.trim();
          const jsonString = trimmed.startsWith("\"") && trimmed.endsWith("\"")
            ? trimmed
            : `"${trimmed.replace(/\\/g, "\\\\").replace(/"/g, "\\\"")}"`;
          current = JSON.parse(jsonString) as string;
          break;
        }
        case "convert": {
          if (!step.targetFormat) throw new Error("Convert step requires a target format.");
          current = convertFormat(currentFormat, step.targetFormat, current);
          currentFormat = step.targetFormat;
          break;
        }
      }
    }

    return { format: currentFormat, output: current };
  };

  const addRecipeStepDraft = () => {
    setRecipeStepsDraft((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        op: recipeStepOpDraft,
        targetFormat: recipeStepOpDraft === "convert" ? recipeStepTargetDraft : undefined,
      },
    ]);
  };

  const moveRecipeStep = (id: string, dir: "up" | "down") => {
    setRecipeStepsDraft((prev) => {
      const index = prev.findIndex((s) => s.id === id);
      if (index < 0) return prev;
      const next = [...prev];
      const swap = dir === "up" ? index - 1 : index + 1;
      if (swap < 0 || swap >= next.length) return prev;
      [next[index], next[swap]] = [next[swap], next[index]];
      return next;
    });
  };

  const removeRecipeStep = (id: string) => {
    setRecipeStepsDraft((prev) => prev.filter((s) => s.id !== id));
  };

  const saveFormatterRecipe = () => {
    const name = recipeNameDraft.trim();
    if (!name) return;
    if (recipeStepsDraft.length === 0) return;
    setFormatterRecipes((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name,
        inputFormat: validateFormat,
        steps: recipeStepsDraft,
      },
    ]);
  };

  const loadFormatterRecipe = (id: string) => {
    const recipe = formatterRecipes.find((r) => r.id === id);
    if (!recipe) return;
    setRecipeNameDraft(recipe.name);
    setRecipeStepsDraft(recipe.steps);
    setValidateFormat(recipe.inputFormat);
  };

  const runSavedRecipe = (id: string) => {
    try {
      const recipe = formatterRecipes.find((r) => r.id === id);
      if (!recipe) return;
      const out = runRecipePipeline(validateFormat, validateInput, recipe.steps);
      setValidateFormat(out.format);
      setValidateInput(out.output);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Recipe run failed";
      setValidationResult({ valid: false, errors: [message], warnings: [] });
    }
  };

  const runDraftRecipe = () => {
    try {
      const out = runRecipePipeline(validateFormat, validateInput, recipeStepsDraft);
      setValidateFormat(out.format);
      setValidateInput(out.output);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Recipe run failed";
      setValidationResult({ valid: false, errors: [message], warnings: [] });
    }
  };

  const addCurrentAsFixture = () => {
    const name = window.prompt("Fixture name");
    if (!name) return;
    setFixtureCases((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: name.trim(),
        format: validateFormat,
        input: validateInput,
        expectedValid: true,
      },
    ]);
  };

  const runFixtureTests = () => {
    const results = fixtureCases.map((fixture) => {
      const res = validateData(fixture.format, fixture.input);
      const passed = res.valid === fixture.expectedValid;
      return {
        id: fixture.id,
        name: fixture.name,
        passed,
        detail: passed
          ? `Expected ${fixture.expectedValid ? "valid" : "invalid"}, got match`
          : `Expected ${fixture.expectedValid ? "valid" : "invalid"}, got ${res.valid ? "valid" : "invalid"}`,
      };
    });
    setFixtureResults(results);
  };

  const exportFixturePack = () => {
    const pack = {
      suite: "omniparse-fixtures",
      version: "1.0.0",
      generatedAt: new Date().toISOString(),
      cases: fixtureCases.map((f) => ({
        name: f.name,
        format: f.format,
        input: f.input,
        expectedValid: f.expectedValid,
      })),
    };
    exportTextFile("omniparse-fixtures.json", JSON.stringify(pack, null, 2), "application/json");
  };

  const handleImportFixturePack = async (file: File) => {
    try {
      const raw = await file.text();
      const parsed = JSON.parse(raw) as { cases?: Array<{ name: string; format: "json" | "xml" | "yaml"; input: string; expectedValid: boolean }> };
      if (!parsed.cases || !Array.isArray(parsed.cases)) {
        throw new Error("Invalid fixture pack: missing cases array.");
      }
      const imported: OmniFixture[] = parsed.cases.map((c, idx) => ({
        id: crypto.randomUUID(),
        name: c.name || `case_${idx + 1}`,
        format: c.format,
        input: c.input,
        expectedValid: !!c.expectedValid,
      }));
      setFixtureCases(imported);
      setFixtureResults([]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Fixture import failed";
      setValidationResult({ valid: false, errors: [message], warnings: [] });
    }
  };

  const handleRunDiff = () => {
    try {
      const left = parseToObject(diffFormat, diffLeft);
      const right = parseToObject(diffFormat, diffRight);
      const changes = diffObjects(left, right);
      setDiffEntries(changes);
      setDiffError(null);
    } catch (err: unknown) {
      setDiffEntries([]);
      setDiffError(err instanceof Error ? err.message : "Unable to generate diff");
    }
  };

  const exportTextFile = (filename: string, body: string, contentType = "text/plain") => {
    const blob = new Blob([body], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportBundle = () => {
    if (docGraph.error) return;
    const root = docRootName || "payload";
    exportTextFile(`${root}-doc.md`, docOutput || generateMarkdownDoc(docGraph.value, root), "text/markdown");
    exportTextFile(`${root}-schema.md`, docSchemaOutput || generateSchemaSummary(docGraph.value, root), "text/markdown");
    exportTextFile(`${root}-openapi.json`, docOpenApiOutput || generateOpenApiSnippet(docGraph.value, root), "application/json");
  };

  const handleRoundTripCheck = () => {
    try {
      const original = parseToObject(docInputFormat, docInput);
      const asJson = JSON.stringify(original, null, 2);
      const targetFormat = docInputFormat === "json" ? "yaml" : "json";
      const converted = convertFormat("json", targetFormat, asJson);
      const back = convertFormat(targetFormat, "json", converted);
      const roundTrip = JSON.parse(back);
      const changes = diffObjects(original, roundTrip);
      if (changes.length === 0) {
        setRoundTripReport(`Round-trip check passed via ${targetFormat.toUpperCase()}. No fidelity loss detected.`);
      } else {
        setRoundTripReport(`Round-trip check found ${changes.length} difference(s) via ${targetFormat.toUpperCase()}.`);
      }
    } catch (err: unknown) {
      setRoundTripReport(err instanceof Error ? err.message : "Round-trip check failed");
    }
  };

  useEffect(() => {
    handleRunDiff();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diffFormat, diffLeft, diffRight]);

  useEffect(() => {
    try {
      const rawRecipes = localStorage.getItem("omniparse:formatter-recipes");
      if (rawRecipes) {
        const parsed = JSON.parse(rawRecipes) as Array<
          Partial<FormatterRecipe> & { format?: "json" | "xml" | "yaml"; content?: string }
        >;
        const migrated = parsed
          .map((item) => {
            if (Array.isArray(item.steps) && item.inputFormat) {
              return {
                id: item.id || crypto.randomUUID(),
                name: item.name || "Unnamed Recipe",
                inputFormat: item.inputFormat,
                steps: item.steps,
              } as FormatterRecipe;
            }
            if (item.format && typeof item.content === "string") {
              return {
                id: item.id || crypto.randomUUID(),
                name: item.name || "Legacy Recipe",
                inputFormat: item.format,
                steps: [{ id: crypto.randomUUID(), op: "beautify" as const }],
              } as FormatterRecipe;
            }
            return null;
          })
          .filter(Boolean) as FormatterRecipe[];
        setFormatterRecipes(migrated);
      }
      const rawFixtures = localStorage.getItem("omniparse:fixtures");
      if (rawFixtures) {
        const parsed = JSON.parse(rawFixtures) as Array<Partial<OmniFixture>>;
        const normalized = parsed
          .filter((item) => item && typeof item.input === "string")
          .map((item, idx) => ({
            id: item.id || crypto.randomUUID(),
            name: item.name || `fixture_${idx + 1}`,
            format: (item.format || "json") as "json" | "xml" | "yaml",
            input: item.input as string,
            expectedValid: typeof item.expectedValid === "boolean" ? item.expectedValid : true,
          }));
        setFixtureCases(normalized);
      }
    } catch {
      // ignore malformed local data
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("omniparse:formatter-recipes", JSON.stringify(formatterRecipes.slice(-30)));
  }, [formatterRecipes]);

  useEffect(() => {
    localStorage.setItem("omniparse:fixtures", JSON.stringify(fixtureCases.slice(-40)));
  }, [fixtureCases]);

  useEffect(() => {
    if (!isDocGraphModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDocGraphModalOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isDocGraphModalOpen]);

  const handleFlatten = () => {
    try {
      const parsed = JSON.parse(validateInput);
      const flattened = flattenJson(parsed);
      setValidateInput(JSON.stringify(flattened, null, 2));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error";
      setValidationResult({ valid: false, errors: ["Invalid JSON input: " + message], warnings: [] });
    }
  };

  const handleUnflatten = () => {
    try {
      const parsed = JSON.parse(validateInput) as Record<string, unknown>;
      const unflattened = unflattenJson(parsed);
      setValidateInput(JSON.stringify(unflattened, null, 2));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error";
      setValidationResult({ valid: false, errors: ["Invalid JSON input: " + message], warnings: [] });
    }
  };

  return (
    <div className="flex h-[calc(100vh-80px)] overflow-hidden bg-[#f7f6f3] relative font-display text-gray-900">
      <ToolSidebar
        title="OmniParse"
        items={tools}
        activeId={activeTab}
        onSelect={(id) => setActiveTab(id as typeof activeTab)}
        isOpen={isSidebarOpen}
        onToggle={setSidebarOpen}
      />

      <main className="flex-1 overflow-hidden relative bg-gray-50/30 flex flex-col">
        <header className="h-14 border-b border-gray-200/50 bg-white/50 backdrop-blur-md flex items-center justify-between px-6 transition-all duration-300">
          <div className={cn("flex items-center gap-2 transition-all duration-300", !isSidebarOpen && "pl-12")}>
            <div className="flex items-center text-sm text-gray-500">
              <span className="font-semibold text-gray-800 mr-2">OmniParse</span>
              <span className="text-gray-300">/</span>
              <span className="ml-2">{activeToolLabel}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 border border-emerald-100 rounded-full">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
              Running Locally (Browser)
            </span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="h-full w-full space-y-8">
            {activeTab === "transpile" && (
              <div className="grid lg:grid-cols-12 gap-6">
                <div className="lg:col-span-12 space-y-5">
                  <Card className="p-0 bg-white border border-black/10 shadow-sm overflow-hidden">
                    <div className="border-b border-gray-200/80 bg-gradient-to-r from-sky-50 via-cyan-50 to-white px-5 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <ArrowRightLeft className="w-4 h-4 text-sky-700" />
                            <h3 className="text-sm font-semibold text-gray-900">Convert Studio</h3>
                          </div>
                          <p className="mt-1 text-xs text-gray-500">Convert structured data between JSON, XML, YAML, and TOML.</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-5">
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="w-48">
                          <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Input Format</label>
                          <Select value={inputFormat} onChange={(e) => setInputFormat(e.target.value as DataFormat)}>
                            {formatOptions.map((opt) => (
                              <option key={opt.id} value={opt.id}>{opt.label}</option>
                            ))}
                          </Select>
                        </div>
                        <div className="w-48">
                          <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Output Format</label>
                          <Select value={outputFormat} onChange={(e) => setOutputFormat(e.target.value as DataFormat)}>
                            {formatOptions.map((opt) => (
                              <option key={opt.id} value={opt.id}>{opt.label}</option>
                            ))}
                          </Select>
                        </div>
                        <div className="flex items-center gap-3 ml-auto">
                          <Button variant="secondary" onClick={handleTranspile}>
                            Convert
                          </Button>
                        </div>
                      </div>

                      <div className="mt-4 grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Input</label>
                          <div className="h-[360px] border border-gray-200 rounded-xl overflow-hidden">
                            <Editor
                              height="100%"
                              defaultLanguage={languageMap[inputFormat]}
                              value={inputText}
                              onChange={(val) => setInputText(val || "")}
                              theme="vs"
                              options={{
                                minimap: { enabled: false },
                                fontSize: 13,
                                padding: { top: 12, bottom: 12 },
                                scrollBeyondLastLine: false,
                              }}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Output</label>
                          <div className="h-[360px] border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
                            <Editor
                              height="100%"
                              defaultLanguage={languageMap[outputFormat]}
                              value={outputText}
                              options={{
                                minimap: { enabled: false },
                                fontSize: 13,
                                padding: { top: 12, bottom: 12 },
                                scrollBeyondLastLine: false,
                                readOnly: true,
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      {transpileError && (
                        <div className="mt-4 flex items-center gap-2 text-sm text-red-600">
                          <XCircle className="w-4 h-4" />
                          {transpileError}
                        </div>
                      )}
                    </div>
                  </Card>
                </div>

              </div>
            )}

            {activeTab === "validate" && (
              <div className="grid lg:grid-cols-12 gap-6">
                <div className="lg:col-span-12 space-y-5">
                  <Card className="p-0 bg-white border border-black/10 shadow-sm overflow-hidden">
                    <div className="border-b border-gray-200/80 bg-gradient-to-r from-sky-50 via-cyan-50 to-white px-5 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-sky-700" />
                            <h3 className="text-sm font-semibold text-gray-900">Validator Studio</h3>
                          </div>
                          <p className="mt-1 text-xs text-gray-500">Validate JSON, XML, and YAML inputs in real time.</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-5">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2">
                          <Select
                            value={validateFormat}
                            onChange={(e) => setValidateFormat(e.target.value as "json" | "xml" | "yaml")}
                            className="w-28"
                          >
                            <option value="json">JSON</option>
                            <option value="xml">XML</option>
                            <option value="yaml">YAML</option>
                          </Select>
                        </div>
                        <div className="ml-auto flex items-center gap-2">
                          {validationResult?.valid ? (
                            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">
                              <CheckCircle2 className="w-4 h-4" />
                              Valid
                            </div>
                          ) : (
                            <div
                              className="group flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 text-red-700 text-xs font-semibold"
                              title={validationResult?.errors?.join("\n") || "Invalid input"}
                            >
                              <XCircle className="w-4 h-4" />
                              Invalid
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 h-[360px] border border-gray-200 rounded-xl overflow-hidden">
                        <Editor
                          height="100%"
                          defaultLanguage={languageMap[validateFormat]}
                          value={validateInput}
                          onChange={(val) => setValidateInput(val || "")}
                          theme="vs"
                          options={{
                            minimap: { enabled: false },
                            fontSize: 13,
                            padding: { top: 12, bottom: 12 },
                            scrollBeyondLastLine: false,
                          }}
                        />
                      </div>

                      {validationResult && (!validationResult.valid || validationResult.warnings.length > 0) && (
                        <div className="mt-4 space-y-3">
                          {(["critical", "warning", "info"] as const).map((severity) => {
                            const rows = validationIssues.filter((issue) => issue.severity === severity);
                            if (rows.length === 0) return null;
                            const style =
                              severity === "critical"
                                ? "border-red-200 bg-red-50 text-red-700"
                                : severity === "warning"
                                  ? "border-amber-200 bg-amber-50 text-amber-700"
                                  : "border-sky-200 bg-sky-50 text-sky-700";
                            return (
                              <div key={severity} className={`rounded-xl border px-4 py-3 ${style}`}>
                                <div className="flex items-center gap-2 text-sm font-semibold capitalize">
                                  {severity === "critical" ? <XCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                                  {severity}
                                </div>
                                <ul className="mt-2 space-y-2 text-sm">
                                  {rows.map((row, idx) => (
                                    <li key={`${severity}-${idx}`} className="rounded-lg border border-black/10 bg-white/70 px-3 py-2">
                                      <div className="font-medium">{row.message}</div>
                                      <div className="text-xs mt-1">
                                        {(row.line || row.column) && (
                                          <span>line {row.line ?? "?"}, col {row.column ?? "?"}</span>
                                        )}
                                        {row.path && <span className="ml-2">path {row.path}</span>}
                                      </div>
                                      <div className="text-xs mt-1">Suggestion: {row.suggestion}</div>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </Card>
                </div>

              </div>
            )}

            {activeTab === "format" && (
              <div className="grid lg:grid-cols-12 gap-6">
                <div className="lg:col-span-12 space-y-5">
                  <Card className="p-0 bg-white border border-black/10 shadow-sm overflow-hidden">
                    <div className="border-b border-gray-200/80 bg-gradient-to-r from-sky-50 via-cyan-50 to-white px-5 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <Wand2 className="w-4 h-4 text-sky-700" />
                            <h3 className="text-sm font-semibold text-gray-900">Formatter Studio</h3>
                          </div>
                          <p className="mt-1 text-xs text-gray-500">Clean, normalize, and escape payload text quickly.</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-full border border-sky-100 bg-white/80 px-3 py-1 text-[11px] font-semibold text-sky-700">
                            {formatStats.lines} lines
                          </span>
                          <span className="rounded-full border border-sky-100 bg-white/80 px-3 py-1 text-[11px] font-semibold text-sky-700">
                            {formatStats.chars} chars
                          </span>
                        </div>
                      </div>
                    </div>

	                    <div className="p-5 space-y-4">
	                      <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-3">
	                        <div className="flex flex-wrap items-center gap-2">
	                          <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Format</span>
	                          <Select
	                            value={validateFormat}
	                            onChange={(e) => setValidateFormat(e.target.value as "json" | "xml" | "yaml")}
	                            className="w-28"
	                          >
	                            <option value="json">JSON</option>
	                            <option value="xml">XML</option>
	                            <option value="yaml">YAML</option>
	                          </Select>
	                          <Button variant="secondary" className="h-8 rounded-full px-3 text-xs font-semibold" onClick={() => handleFormat("beautify")}>
	                            Beautify
	                          </Button>
	                          <Button variant="outline" className="h-8 rounded-full px-3 text-xs font-semibold" onClick={() => handleFormat("minify")}>
	                            Minify
	                          </Button>
	                          <Button variant="outline" className="h-8 rounded-full px-3 text-xs font-semibold" onClick={handleSortKeys}>
	                            Sort Keys
	                          </Button>
                            <Button variant="outline" className="h-8 rounded-full px-3 text-xs font-semibold" onClick={() => handleFormatterPreset("clean")}>
                              Clean Payload
                            </Button>
                            <Button variant="outline" className="h-8 rounded-full px-3 text-xs font-semibold" onClick={() => handleFormatterPreset("normalize")}>
                              Normalize Keys
                            </Button>
                            <Button variant="outline" className="h-8 rounded-full px-3 text-xs font-semibold" onClick={() => handleFormatterPreset("apiReady")}>
                              API Ready
                            </Button>
                            <Button variant="outline" className="h-8 rounded-full px-3 text-xs font-semibold" onClick={saveFormatterRecipe}>
                              Save Recipe
                            </Button>
                            <Button variant="outline" className="h-8 rounded-full px-3 text-xs font-semibold" onClick={runDraftRecipe}>
                              Run Pipeline
                            </Button>
                            <Button variant="outline" className="h-8 rounded-full px-3 text-xs font-semibold" onClick={addCurrentAsFixture}>
                              Add Fixture
                            </Button>
	                          {validateFormat === "json" ? (
	                            <>
	                              {jsonToolState.canFlatten && (
	                                <Button
	                                  variant="outline"
	                                  className="h-8 rounded-full px-3 text-xs font-semibold"
	                                  onClick={handleFlatten}
	                                  title="Flatten nested JSON into dot-path keys"
	                                >
	                                  Flatten
	                                </Button>
	                              )}
	                              {jsonToolState.canUnflatten && (
	                                <Button
	                                  variant="outline"
	                                  className="h-8 rounded-full px-3 text-xs font-semibold"
	                                  onClick={handleUnflatten}
	                                  title="Unflatten dot-path keys back to nested JSON"
	                                >
	                                  Unflatten
	                                </Button>
	                              )}
	                              {jsonToolState.canEscape && (
	                                <Button
	                                  variant="outline"
	                                  className="h-8 rounded-full px-3 text-xs font-semibold"
	                                  onClick={handleJsonEscape}
	                                  title="Escape as JSON string content"
	                                >
	                                  JSON Escape
	                                </Button>
	                              )}
	                              {jsonToolState.canUnescape && (
	                                <Button
	                                  variant="outline"
	                                  className="h-8 rounded-full px-3 text-xs font-semibold"
	                                  onClick={handleJsonUnescape}
	                                  title="Unescape JSON string content"
	                                >
	                                  JSON Unescape
	                                </Button>
	                              )}
	                            </>
	                          ) : (
	                            <span className="text-xs text-gray-500">JSON-only: Flatten, Unflatten, Escape, Unescape.</span>
	                          )}
	                        </div>
	                      </div>

	                      <div className="h-[360px] border border-gray-200 rounded-xl overflow-hidden bg-white">
	                      <Editor
                        height="100%"
                        defaultLanguage={languageMap[validateFormat]}
                        value={validateInput}
                        onChange={(val) => setValidateInput(val || "")}
                        theme="vs"
                        options={{
                          minimap: { enabled: false },
                          fontSize: 13,
                          padding: { top: 12, bottom: 12 },
                          scrollBeyondLastLine: false,
                        }}
	                      />
	                      </div>
                        <div className="rounded-xl border border-gray-200 bg-white p-3 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Pipeline Builder</span>
                            <Input
                              value={recipeNameDraft}
                              onChange={(e) => setRecipeNameDraft(e.target.value)}
                              className="h-8 w-48"
                              placeholder="Recipe name"
                            />
                            <Select
                              value={recipeStepOpDraft}
                              onChange={(e) => setRecipeStepOpDraft(e.target.value as RecipeStepOp)}
                              className="w-40"
                            >
                              <option value="beautify">Beautify</option>
                              <option value="minify">Minify</option>
                              <option value="sortKeys">Sort Keys</option>
                              <option value="flatten">Flatten</option>
                              <option value="unflatten">Unflatten</option>
                              <option value="jsonEscape">JSON Escape</option>
                              <option value="jsonUnescape">JSON Unescape</option>
                              <option value="convert">Convert</option>
                            </Select>
                            {recipeStepOpDraft === "convert" && (
                              <Select
                                value={recipeStepTargetDraft}
                                onChange={(e) => setRecipeStepTargetDraft(e.target.value as "json" | "xml" | "yaml")}
                                className="w-28"
                              >
                                <option value="json">JSON</option>
                                <option value="xml">XML</option>
                                <option value="yaml">YAML</option>
                              </Select>
                            )}
                            <Button variant="outline" size="sm" onClick={addRecipeStepDraft}>Add Step</Button>
                            <Button variant="outline" size="sm" onClick={() => setRecipeStepsDraft([])}>Clear Steps</Button>
                          </div>
                          <div className="max-h-32 overflow-auto space-y-1">
                            {recipeStepsDraft.length === 0 ? (
                              <div className="text-xs text-gray-500">No steps yet. Add operations and run/save the pipeline.</div>
                            ) : recipeStepsDraft.map((step, idx) => (
                              <div key={step.id} className="flex items-center gap-2 rounded-md border border-gray-100 px-2 py-1 text-xs">
                                <span className="font-semibold text-gray-600">{idx + 1}.</span>
                                <span className="capitalize">{step.op}</span>
                                {step.targetFormat && <span className="text-gray-500">→ {step.targetFormat.toUpperCase()}</span>}
                                <div className="ml-auto flex items-center gap-1">
                                  <Button variant="outline" size="sm" onClick={() => moveRecipeStep(step.id, "up")}>↑</Button>
                                  <Button variant="outline" size="sm" onClick={() => moveRecipeStep(step.id, "down")}>↓</Button>
                                  <Button variant="outline" size="sm" onClick={() => removeRecipeStep(step.id)}>Remove</Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        {(formatterRecipes.length > 0 || fixtureCases.length > 0) && (
                          <div className="grid lg:grid-cols-2 gap-3">
                            <div className="rounded-xl border border-gray-200 bg-white p-3">
                              <div className="flex items-center justify-between">
                                <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">Saved Recipes</div>
                                <span className="text-xs text-gray-500">{formatterRecipes.length}</span>
                              </div>
                              <div className="mt-2 max-h-28 overflow-auto space-y-1">
                                {formatterRecipes.slice(-8).reverse().map((recipe) => (
                                  <div key={recipe.id} className="flex items-center justify-between rounded-md border border-gray-100 px-2 py-1 text-xs">
                                    <span className="truncate">{recipe.name} ({recipe.inputFormat})</span>
                                    <div className="flex items-center gap-1">
                                      <Button variant="outline" size="sm" onClick={() => loadFormatterRecipe(recipe.id)}>Load</Button>
                                      <Button variant="outline" size="sm" onClick={() => runSavedRecipe(recipe.id)}>Run</Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="rounded-xl border border-gray-200 bg-white p-3">
                              <div className="flex items-center justify-between">
                                <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">Fixture Tests</div>
                                <div className="flex items-center gap-1">
                                  <Button variant="outline" size="sm" onClick={runFixtureTests}>Run</Button>
                                  <Button variant="outline" size="sm" onClick={exportFixturePack}>Export</Button>
                                  <Button variant="outline" size="sm" onClick={() => fixtureImportRef.current?.click()}>
                                    <Upload className="w-3 h-3 mr-1" />
                                    Import
                                  </Button>
                                  <input
                                    ref={fixtureImportRef}
                                    type="file"
                                    accept="application/json,.json"
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) handleImportFixturePack(file);
                                      e.currentTarget.value = "";
                                    }}
                                  />
                                </div>
                              </div>
                              <div className="mt-2 max-h-28 overflow-auto space-y-1">
                                {fixtureCases.slice(-8).reverse().map((fx) => (
                                  <div key={fx.id} className="flex items-center justify-between rounded-md border border-gray-100 px-2 py-1 text-xs">
                                    <span className="truncate">{fx.name} ({fx.format}) - expect {fx.expectedValid ? "valid" : "invalid"}</span>
                                    <button
                                      type="button"
                                      className="text-sky-700 hover:underline"
                                      onClick={() => setFixtureCases((prev) => prev.map((item) => item.id === fx.id ? { ...item, expectedValid: !item.expectedValid } : item))}
                                    >
                                      Toggle
                                    </button>
                                    <button
                                      type="button"
                                      className="text-sky-700 hover:underline"
                                      onClick={() => setFixtureCases((prev) => prev.filter((item) => item.id !== fx.id))}
                                    >
                                      Remove
                                    </button>
                                  </div>
                                ))}
                                {fixtureResults.slice(-4).map((res) => (
                                  <div key={res.id} className={`rounded-md px-2 py-1 text-xs ${res.passed ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                                    {res.name}: {res.detail}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
	                    </div>
	                  </Card>

	                </div>

              </div>
            )}

            {activeTab === "diff" && (
              <div className="grid lg:grid-cols-12 gap-6">
                <div className="lg:col-span-12 space-y-5">
                  <Card className="p-0 bg-white border border-black/10 shadow-sm overflow-hidden">
                    <div className="border-b border-gray-200/80 bg-gradient-to-r from-sky-50 via-cyan-50 to-white px-5 py-4">
                      <div className="flex items-center gap-2">
                        <FileDiff className="w-4 h-4 text-sky-700" />
                        <h3 className="text-sm font-semibold text-gray-900">Diff Lab</h3>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">Compare two payloads and inspect structural and value changes.</p>
                    </div>
                    <div className="p-5 space-y-4">
                      <div className="flex items-center gap-3">
                        <Select value={diffFormat} onChange={(e) => setDiffFormat(e.target.value as "json" | "xml" | "yaml")} className="w-28">
                          <option value="json">JSON</option>
                          <option value="xml">XML</option>
                          <option value="yaml">YAML</option>
                        </Select>
                        <Button variant="secondary" onClick={handleRunDiff}>Run Diff</Button>
                        <span className="text-xs text-gray-500 ml-auto">{diffEntries.length} changes</span>
                      </div>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Left</label>
                          <div className="h-[280px] border border-gray-200 rounded-xl overflow-hidden">
                            <Editor
                              height="100%"
                              defaultLanguage={languageMap[diffFormat]}
                              value={diffLeft}
                              onChange={(val) => setDiffLeft(val || "")}
                              theme="vs"
                              options={{ minimap: { enabled: false }, fontSize: 13, scrollBeyondLastLine: false }}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Right</label>
                          <div className="h-[280px] border border-gray-200 rounded-xl overflow-hidden">
                            <Editor
                              height="100%"
                              defaultLanguage={languageMap[diffFormat]}
                              value={diffRight}
                              onChange={(val) => setDiffRight(val || "")}
                              theme="vs"
                              options={{ minimap: { enabled: false }, fontSize: 13, scrollBeyondLastLine: false }}
                            />
                          </div>
                        </div>
                      </div>
                      {diffError && <div className="text-sm text-red-600">{diffError}</div>}
                      {!diffError && (
                        <div className="rounded-xl border border-gray-200 overflow-hidden">
                          <div className="grid grid-cols-12 gap-2 bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                            <div className="col-span-1">Type</div>
                            <div className="col-span-4">Path</div>
                            <div className="col-span-3">Left</div>
                            <div className="col-span-4">Right</div>
                          </div>
                          <div className="max-h-[280px] overflow-auto">
                            {diffEntries.length === 0 ? (
                              <div className="px-3 py-4 text-sm text-gray-500">No differences detected.</div>
                            ) : diffEntries.map((entry, idx) => (
                              <div key={`${entry.path}-${idx}`} className="grid grid-cols-12 gap-2 px-3 py-2 border-t border-gray-100 text-sm">
                                <div className="col-span-1 text-xs font-semibold uppercase text-sky-700">{entry.kind}</div>
                                <div className="col-span-4 font-mono text-xs truncate">{entry.path}</div>
                                <div className="col-span-3 truncate">{entry.left}</div>
                                <div className="col-span-4 truncate">{entry.right}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                </div>
              </div>
            )}

			            {activeTab === "generate" && (
			              <div className="grid lg:grid-cols-1 gap-6">
			                <Card className="p-0 bg-white border border-black/10 shadow-sm overflow-hidden">
                        <div className="border-b border-gray-200/80 bg-gradient-to-r from-sky-50 via-cyan-50 to-white px-5 py-4">
                          <div className="flex items-center gap-2">
                            <Braces className="w-4 h-4 text-sky-700" />
                            <h3 className="text-sm font-semibold text-gray-900">Generator Hub</h3>
                          </div>
                          <p className="mt-1 text-xs text-gray-500">Use one input (JSON/XML/YAML) to generate both Markdown and Graph outputs.</p>
                        </div>
                        <div className="p-5">
			                  <div className="grid gap-6">
			                    <div className="rounded-2xl border border-gray-200 bg-white p-4">
			                      <div className="flex flex-wrap items-center justify-between gap-3">
			                        <div>
				                          <div className="text-sm font-semibold text-gray-900">Input Data</div>
				                          <div className="text-[11px] text-gray-500">This input is used for both Markdown and Graph generation.</div>
				                        </div>
				                        <div className="flex items-center gap-2 w-full sm:w-auto">
				                          <Select
				                            value={docInputFormat}
				                            onChange={(e) => setDocInputFormat(e.target.value as "json" | "xml" | "yaml")}
				                            className="w-28"
				                          >
				                            <option value="json">JSON</option>
				                            <option value="xml">XML</option>
				                            <option value="yaml">YAML</option>
				                          </Select>
				                          <Input
				                            value={docRootName}
			                            onChange={(e) => setDocRootName(e.target.value)}
			                            placeholder="Root name"
		                            className="w-full sm:w-64"
		                          />
		                          <Button onClick={handleGenerateDoc}>Generate</Button>
                              <Button variant="outline" onClick={handleRoundTripCheck}>
                                Round-trip Check
                              </Button>
                              <Button variant="outline" onClick={handleExportBundle} disabled={!!docGraph.error}>
                                <Download className="w-3.5 h-3.5 mr-1" />
                                Export Bundle
                              </Button>
		                        </div>
		                      </div>
                          {roundTripReport && (
                            <div className="mt-3 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-700">
                              {roundTripReport}
                            </div>
                          )}
		                      <div className="mt-3 h-[260px] border border-gray-200 rounded-xl overflow-hidden bg-white">
		                        <Editor
		                          height="100%"
			                          language={languageMap[docInputFormat]}
		                          value={docInput}
		                          onChange={(val) => setDocInput(val || "")}
		                          theme="vs"
		                          options={{
		                            minimap: { enabled: false },
		                            fontSize: 12,
		                            padding: { top: 12, bottom: 12 },
		                            scrollBeyondLastLine: false,
		                          }}
		                        />
		                      </div>
		                    </div>

			                    <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4">
			                      <div className="text-sm font-semibold text-gray-900">Markdown</div>
				                      <div className="text-[11px] text-gray-500 mt-1">Generated from the Input Data above.</div>
			                      <Textarea
			                        value={docOutput}
			                        readOnly
			                        placeholder="Generated Markdown will appear here..."
			                        className="mt-3 min-h-[220px] font-mono text-xs bg-white"
		                      />
		                    </div>

			                    <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4">
			                      <div className="flex flex-wrap items-center justify-between gap-3">
			                        <div>
			                          <div className="text-sm font-semibold text-gray-900">Graph</div>
				                          <div className="text-[11px] text-gray-400">Generated from the same Input Data as connected nodes.</div>
			                        </div>
		                        {!docGraph.error && (
		                          <div className="flex flex-wrap items-center gap-2">
		                            <Button
		                              variant="outline"
		                              className="h-8 rounded-full px-3 text-xs font-semibold"
		                              onClick={() => {
		                                if (docGraphDefaultExpandDepth > 0) {
		                                  setDocGraphRestoreExpandDepth(docGraphDefaultExpandDepth);
		                                  setDocGraphDefaultExpandDepth(0);
		                                  setDocGraphExpandedPaths(new Set());
		                                  return;
		                                }
		                                setDocGraphDefaultExpandDepth(Math.max(1, docGraphRestoreExpandDepth));
		                                setDocGraphExpandedPaths(new Set());
		                              }}
		                            >
		                              {docGraphDefaultExpandDepth > 0 ? "Collapse Nodes" : "Restore Nodes"}
		                            </Button>
		                            <Button
		                              variant="outline"
		                              className="h-8 rounded-full px-3 text-xs font-semibold"
		                              onClick={() => setDocGraphModalOpen(true)}
		                            >
		                              Expand
		                            </Button>
		                          </div>
		                        )}
		                      </div>

		                      <div className="mt-3">
		                        {docGraph.error ? (
		                          <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
			                            Invalid input: {docGraph.error}
		                          </div>
		                        ) : (
		                          <>
                                <div className="mb-3 flex flex-wrap items-center gap-2">
                                  <Input
                                    value={docSearchPath}
                                    onChange={(e) => setDocSearchPath(e.target.value)}
                                    placeholder="Find node path (ex: payload.user)"
                                    className="w-full sm:w-80"
                                  />
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      const query = docSearchPath.trim().replace(/\./g, "/");
                                      if (!query) return;
                                      const path = query.startsWith("$") ? query : `$/` + query.replace(/^\//, "");
                                      setDocGraphExpandedPaths((prev) => new Set(prev).add(path));
                                    }}
                                  >
                                    Focus Path
                                  </Button>
                                </div>
		                            <DataGraph
		                              value={docGraph.value}
		                              rootLabel={docRootName || "root"}
		                              className="h-[420px]"
		                              maxDepth={docGraphMaxDepth}
		                              maxNodes={docGraphMaxNodes}
		                              defaultExpandDepth={docGraphDefaultExpandDepth}
		                              expandedPaths={docGraphExpandedPaths}
		                              onTogglePath={(path) => {
		                                setDocGraphExpandedPaths((prev) => {
		                                  const next = new Set(prev);
		                                  if (next.has(path)) next.delete(path);
		                                  else next.add(path);
		                                  return next;
		                                });
		                              }}
		                            />
		                            <div className="mt-3 flex flex-wrap items-center gap-2 justify-end">
		                            <div className="flex items-center gap-2">
		                              <span className="text-xs font-semibold text-gray-500">Expand</span>
		                              <Input
		                                type="number"
		                                min={0}
		                                max={20}
		                                value={docGraphDefaultExpandDepth}
		                                onChange={(e) => setDocGraphDefaultExpandDepth(Number(e.target.value))}
		                                className="w-20"
		                              />
		                            </div>
		                            <div className="flex items-center gap-2">
		                              <span className="text-xs font-semibold text-gray-500">Depth</span>
		                              <Input
		                                type="number"
		                                min={1}
		                                max={50}
		                                value={docGraphMaxDepth}
		                                onChange={(e) => setDocGraphMaxDepth(Number(e.target.value))}
		                                className="w-20"
		                              />
		                            </div>
		                            <div className="flex items-center gap-2">
		                              <span className="text-xs font-semibold text-gray-500">Nodes</span>
		                              <Input
		                                type="number"
		                                min={50}
		                                max={2000}
		                                value={docGraphMaxNodes}
		                                onChange={(e) => setDocGraphMaxNodes(Number(e.target.value))}
		                                className="w-24"
		                              />
		                            </div>
		                            </div>
                                <div className="mt-4 grid lg:grid-cols-2 gap-4">
                                  <div className="rounded-xl border border-gray-200 bg-white p-3">
                                    <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Schema Summary</div>
                                    <Textarea
                                      value={docSchemaOutput}
                                      onChange={(e) => setDocSchemaOutput(e.target.value)}
                                      className="min-h-[180px] font-mono text-xs"
                                    />
                                  </div>
                                  <div className="rounded-xl border border-gray-200 bg-white p-3">
                                    <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">OpenAPI Snippet</div>
                                    <Textarea
                                      value={docOpenApiOutput}
                                      onChange={(e) => setDocOpenApiOutput(e.target.value)}
                                      className="min-h-[180px] font-mono text-xs"
                                    />
                                  </div>
                                </div>
		                          </>
		                        )}
		                      </div>
		                    </div>
			                  </div>
                        </div>
			                </Card>

		                {isDocGraphModalOpen && (
		                  <div
		                    className="absolute top-14 bottom-0 right-0 left-0 z-50 pointer-events-none"
		                  >
		                    <div className="absolute inset-0 bg-black/20 backdrop-blur-sm pointer-events-auto" onClick={() => setDocGraphModalOpen(false)} />
		                    <div className="absolute inset-0 pointer-events-none flex items-start justify-start p-0">
		                      <div
		                        className="pointer-events-auto w-full h-full bg-white/90 backdrop-blur-2xl border border-black/10 rounded-none shadow-2xl overflow-hidden flex flex-col"
		                        onClick={(e) => e.stopPropagation()}
		                      >
		                        <div className="h-14 border-b border-gray-200/70 bg-white/60 backdrop-blur-md flex items-center justify-between px-5">
		                          <div className="text-sm text-gray-500">
		                            <span className="font-semibold text-gray-800 mr-2">Graph</span>
		                            <span className="text-gray-300">/</span>
		                            <span className="ml-2">Input Data</span>
		                          </div>
		                          <div className="flex items-center gap-2">
		                            <Button
		                              variant="outline"
		                              size="sm"
		                              onClick={() => {
		                                if (docGraphDefaultExpandDepth > 0) {
		                                  setDocGraphRestoreExpandDepth(docGraphDefaultExpandDepth);
		                                  setDocGraphDefaultExpandDepth(0);
		                                  setDocGraphExpandedPaths(new Set());
		                                  return;
		                                }
		                                setDocGraphDefaultExpandDepth(Math.max(1, docGraphRestoreExpandDepth));
		                                setDocGraphExpandedPaths(new Set());
		                              }}
		                            >
		                              {docGraphDefaultExpandDepth > 0 ? "Collapse Nodes" : "Restore Nodes"}
		                            </Button>
		                            <Button variant="outline" size="sm" onClick={() => setDocGraphModalOpen(false)}>
		                              Close
		                            </Button>
		                          </div>
		                        </div>

		                        <div className="p-4 md:p-6 flex flex-col gap-3 min-h-0 flex-1">
		                          {docGraph.error ? (
		                            <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
		                              Invalid input: {docGraph.error}
		                            </div>
		                          ) : (
		                            <>
		                              <DataGraph
		                                value={docGraph.value}
		                                rootLabel={docRootName || "root"}
		                                className="flex-1 min-h-0"
		                                maxDepth={docGraphMaxDepth}
		                                maxNodes={docGraphMaxNodes}
		                                defaultExpandDepth={docGraphDefaultExpandDepth}
		                                expandedPaths={docGraphExpandedPaths}
		                                onTogglePath={(path) => {
		                                  setDocGraphExpandedPaths((prev) => {
		                                    const next = new Set(prev);
		                                    if (next.has(path)) next.delete(path);
		                                    else next.add(path);
		                                    return next;
		                                  });
		                                }}
		                              />
		                              <div className="flex flex-wrap items-center gap-2 justify-end">
		                                <div className="flex items-center gap-2">
		                                  <span className="text-xs font-semibold text-gray-500">Expand</span>
		                                  <Input
		                                    type="number"
		                                    min={0}
		                                    max={20}
		                                    value={docGraphDefaultExpandDepth}
		                                    onChange={(e) => setDocGraphDefaultExpandDepth(Number(e.target.value))}
		                                    className="w-20"
		                                  />
		                                </div>
		                                <div className="flex items-center gap-2">
		                                  <span className="text-xs font-semibold text-gray-500">Depth</span>
		                                  <Input
		                                    type="number"
		                                    min={1}
		                                    max={50}
		                                    value={docGraphMaxDepth}
		                                    onChange={(e) => setDocGraphMaxDepth(Number(e.target.value))}
		                                    className="w-20"
		                                  />
		                                </div>
		                                <div className="flex items-center gap-2">
		                                  <span className="text-xs font-semibold text-gray-500">Nodes</span>
		                                  <Input
		                                    type="number"
		                                    min={50}
		                                    max={2000}
		                                    value={docGraphMaxNodes}
		                                    onChange={(e) => setDocGraphMaxNodes(Number(e.target.value))}
		                                    className="w-24"
		                                  />
		                                </div>
		                              </div>
		                            </>
		                          )}
		                        </div>
		                      </div>
		                    </div>
		                  </div>
		                )}

			              </div>
			            )}
          </div>
        </div>
      </main>
    </div>
  );
}
