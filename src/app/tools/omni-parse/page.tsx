"use client";

import React, { useEffect, useMemo, useState } from "react";
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
  formatData,
  validateData,
  generateMarkdownDoc,
  flattenJson,
  unflattenJson,
} from "@/lib/omni-parse";
import type { DataFormat } from "@/lib/omni-parse";
import {
  ArrowRightLeft,
  CheckCircle2,
  XCircle,
  Braces,
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
  const [activeTab, setActiveTab] = useState<"transpile" | "validate" | "generate">("transpile");

  const [inputFormat, setInputFormat] = useState<DataFormat>("json");
  const [outputFormat, setOutputFormat] = useState<DataFormat>("yaml");
  const [inputText, setInputText] = useState("{\n  \"status\": \"ok\",\n  \"count\": 2\n}");
  const [outputText, setOutputText] = useState("");
  const [transpileError, setTranspileError] = useState<string | null>(null);

  const [validateFormat, setValidateFormat] = useState<"json" | "xml" | "yaml">("json");
  const [validateInput, setValidateInput] = useState("{\n  \"name\": \"OBN\",\n  \"version\": 1\n}");
  const [validationResult, setValidationResult] = useState<{ valid: boolean; errors: string[]; warnings: string[] } | null>(null);
  const [docInput, setDocInput] = useState("{\n  \"user\": {\n    \"id\": 7,\n    \"name\": \"Ava\"\n  },\n  \"active\": true\n}");
  const [docRootName, setDocRootName] = useState("Payload");
  const [docOutput, setDocOutput] = useState("");
  const docGraph = useMemo(() => {
    try {
      return { value: JSON.parse(docInput) as unknown, error: null as string | null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Invalid JSON";
      return { value: null as unknown, error: message };
    }
  }, [docInput]);

  const [flatInput, setFlatInput] = useState("{\n  \"user\": {\n    \"id\": 7,\n    \"name\": \"Ava\"\n  },\n  \"active\": true\n}");
  const [flatOutput, setFlatOutput] = useState("");

  const tools: ToolSidebarItem[] = useMemo(() => ([
    { id: "transpile", label: "Convert", icon: ArrowRightLeft },
    { id: "validate", label: "Validators & Formatters", icon: CheckCircle2 },
    { id: "generate", label: "Generator Hub", icon: Braces },
  ]), []);

  const activeToolLabel = tools.find(t => t.id === activeTab)?.label || "OmniParse";
  const [isSidebarOpen, setSidebarOpen] = useState(true);

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
    try {
      const parsed = JSON.parse(docInput);
      setDocOutput(generateMarkdownDoc(parsed, docRootName || "Root"));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error";
      setDocOutput("Invalid JSON input: " + message);
    }
  };

  const handleFlatten = () => {
    try {
      const parsed = JSON.parse(flatInput);
      const flattened = flattenJson(parsed);
      setFlatOutput(JSON.stringify(flattened, null, 2));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error";
      setFlatOutput("Invalid JSON input: " + message);
    }
  };

  const handleUnflatten = () => {
    try {
      const parsed = JSON.parse(flatInput) as Record<string, unknown>;
      const unflattened = unflattenJson(parsed);
      setFlatOutput(JSON.stringify(unflattened, null, 2));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error";
      setFlatOutput("Invalid JSON input: " + message);
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
          <div className={cn(
            "mx-auto h-full space-y-8",
            activeTab === "generate" ? "max-w-5xl" : "max-w-6xl"
          )}>
            {activeTab === "transpile" && (
              <div className="grid lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 space-y-5">
              <Card className="p-5 bg-white border border-black/10 shadow-sm">
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
              </Card>
            </div>

            <div className="lg:col-span-4" />
          </div>
            )}

            {activeTab === "validate" && (
              <div className="grid lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8 space-y-5">
                  <Card className="p-5 bg-white border border-black/10 shadow-sm">
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
                        <Button
                          variant="outline"
                          className="h-8 rounded-full px-3 text-xs font-semibold"
                          onClick={() => handleFormat("beautify")}
                        >
                          Beautify
                        </Button>
                        <Button
                          variant="outline"
                          className="h-8 rounded-full px-3 text-xs font-semibold"
                          onClick={() => handleFormat("minify")}
                        >
                          Minify
                        </Button>
                        <Button
                          variant="outline"
                          className="h-8 rounded-full px-3 text-xs font-semibold"
                          onClick={handleSortKeys}
                        >
                          Sort Keys
                        </Button>
                        <Button
                          variant="outline"
                          className="h-8 rounded-full px-3 text-xs font-semibold"
                          onClick={handleJsonEscape}
                          disabled={validateFormat !== "json"}
                          title={validateFormat !== "json" ? "Only available for JSON strings" : "Escape as JSON string content"}
                        >
                          JSON Escape
                        </Button>
                        <Button
                          variant="outline"
                          className="h-8 rounded-full px-3 text-xs font-semibold"
                          onClick={handleJsonUnescape}
                          disabled={validateFormat !== "json"}
                          title={validateFormat !== "json" ? "Only available for JSON strings" : "Unescape JSON string content"}
                        >
                          JSON Unescape
                        </Button>
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
              </Card>
            </div>

            <div className="lg:col-span-4" />
              </div>
            )}

            {activeTab === "generate" && (
              <div className="grid lg:grid-cols-1 gap-6">
                <Card className="p-6 bg-white border border-black/10 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <Braces className="w-5 h-5 text-blue-600" />
                    <h3 className="text-base font-semibold">Auto-Documentation</h3>
                  </div>
                  <div className="grid lg:grid-cols-12 gap-4">
                    <div className="lg:col-span-6 space-y-3">
                      <Input value={docRootName} onChange={(e) => setDocRootName(e.target.value)} placeholder="Root name" />
                      <div className="h-[260px] border border-gray-200 rounded-xl overflow-hidden">
                        <Editor
                          height="100%"
                          defaultLanguage="json"
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
                      <Button onClick={handleGenerateDoc}>Generate Markdown</Button>
                    </div>

                    <div className="lg:col-span-6 space-y-3">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">Graph</div>
                        <div className="text-[11px] text-gray-400">Input JSON structure as connected nodes</div>
                      </div>

                      {docGraph.error ? (
                        <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
                          Invalid JSON: {docGraph.error}
                        </div>
                      ) : (
                        <DataGraph
                          value={docGraph.value}
                          rootLabel={docRootName || "root"}
                          className="max-h-[240px]"
                        />
                      )}

                      <Textarea
                        value={docOutput}
                        readOnly
                        placeholder="Generated Markdown will appear here..."
                        className="min-h-[240px] font-mono text-xs"
                      />
                    </div>
                  </div>
                </Card>

                <Card className="p-6 bg-white border border-black/10 shadow-sm">
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <div>
                      <h3 className="text-base font-semibold">Flatten / Unflatten JSON</h3>
                      <p className="text-xs text-gray-500">Convert nested JSON into dot-path keys (and rebuild it back).</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" onClick={handleFlatten}>Flatten</Button>
                      <Button variant="outline" onClick={handleUnflatten}>Unflatten</Button>
                    </div>
                  </div>

                  <div className="grid lg:grid-cols-2 gap-4">
                    <div className="h-[260px] border border-gray-200 rounded-xl overflow-hidden">
                      <Editor
                        height="100%"
                        defaultLanguage="json"
                        value={flatInput}
                        onChange={(val) => setFlatInput(val || "")}
                        theme="vs"
                        options={{
                          minimap: { enabled: false },
                          fontSize: 12,
                          padding: { top: 12, bottom: 12 },
                          scrollBeyondLastLine: false,
                        }}
                      />
                    </div>
                    <div className="h-[260px] border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
                      <Editor
                        height="100%"
                        defaultLanguage="json"
                        value={flatOutput}
                        theme="vs"
                        options={{
                          minimap: { enabled: false },
                          fontSize: 12,
                          padding: { top: 12, bottom: 12 },
                          scrollBeyondLastLine: false,
                          readOnly: true,
                        }}
                      />
                    </div>
                  </div>
                </Card>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
