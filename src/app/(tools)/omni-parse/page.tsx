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
  parseToObject,
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
  const [activeTab, setActiveTab] = useState<"transpile" | "validate" | "format" | "generate">("transpile");

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

  const [flatInput, setFlatInput] = useState("{\n  \"user\": {\n    \"id\": 7,\n    \"name\": \"Ava\"\n  },\n  \"active\": true\n}");
  const [flatOutput, setFlatOutput] = useState("");

  const tools: ToolSidebarItem[] = useMemo(() => ([
    { id: "transpile", label: "Convert", icon: ArrowRightLeft },
    { id: "validate", label: "Validators", icon: CheckCircle2 },
    { id: "format", label: "Formatters", icon: Wand2 },
    { id: "generate", label: "Generator Hub", icon: Braces },
  ]), []);

  const activeToolLabel = tools.find(t => t.id === activeTab)?.label || "OmniParse";
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const formatStats = useMemo(() => {
    const chars = validateInput.length;
    const lines = validateInput ? validateInput.split("\n").length : 0;
    return { chars, lines };
  }, [validateInput]);

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
    if (docGraph.error) {
      setDocOutput("Invalid input: " + docGraph.error);
      return;
    }
    setDocOutput(generateMarkdownDoc(docGraph.value, docRootName || "Root"));
  };

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

            {activeTab === "format" && (
              <div className="grid lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8 space-y-5">
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
                        </div>
                      </div>

                      <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">JSON String Tools</span>
                          <Button
                            variant="outline"
                            className="h-8 rounded-full px-3 text-xs font-semibold"
                            onClick={handleJsonEscape}
                            title="Escape as JSON string content"
                          >
                            JSON Escape
                          </Button>
                          <Button
                            variant="outline"
                            className="h-8 rounded-full px-3 text-xs font-semibold"
                            onClick={handleJsonUnescape}
                            title="Unescape JSON string content"
                          >
                            JSON Unescape
                          </Button>
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

                <div className="lg:col-span-4">
                  <Card className="p-5 bg-white border border-black/10 shadow-sm">
                    <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">Workflow</div>
                    <div className="mt-3 space-y-2 text-sm text-gray-700">
                      <p>1. Pick input format.</p>
                      <p>2. Beautify or Minify.</p>
                      <p>3. Sort keys for deterministic diffs.</p>
                      <p>4. Use JSON escape/unescape for string payloads.</p>
                    </div>
                    <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                      JSON String Tools work only when format is set to JSON.
                    </div>
                  </Card>
                </div>
              </div>
            )}

			            {activeTab === "generate" && (
			              <div className="grid lg:grid-cols-1 gap-6">
			                <Card className="p-6 bg-white border border-black/10 shadow-sm">
			                  <div className="flex items-center gap-3 mb-4">
			                    <Braces className="w-5 h-5 text-blue-600" />
			                    <div>
			                      <h3 className="text-base font-semibold">Generator Hub</h3>
				                      <p className="text-xs text-gray-500">Use one input (JSON/XML/YAML) to generate both Markdown and Graph outputs.</p>
			                    </div>
			                  </div>
			                  <div className="grid gap-6">
			                    <div className="rounded-2xl border border-black/10 bg-white p-4">
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
		                        </div>
		                      </div>
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

			                    <div className="rounded-2xl border border-black/10 bg-gray-50/70 p-4">
			                      <div className="text-sm font-semibold text-gray-900">Markdown</div>
				                      <div className="text-[11px] text-gray-500 mt-1">Generated from the Input Data above.</div>
			                      <Textarea
			                        value={docOutput}
			                        readOnly
			                        placeholder="Generated Markdown will appear here..."
			                        className="mt-3 min-h-[220px] font-mono text-xs bg-white"
		                      />
		                    </div>

			                    <div className="rounded-2xl border border-black/10 bg-gray-50/70 p-4">
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
		                          </>
		                        )}
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
