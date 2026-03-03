"use client";

import React, { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { CopyToClipboard } from "@/components/ui/CopyToClipboard";
import { ToolSidebar, ToolSidebarItem } from "@/components/ui/ToolSidebar";
import { cn } from "@/lib/utils";
import { generate, generateMockRows, mockRowsToOutput } from "@/lib/data-forge";
import type { MockField, MockFieldType } from "@/lib/data-forge";
import { Layers3, Sparkles, Plus, Trash2 } from "lucide-react";

const mockFieldTypes: MockFieldType[] = [
  "name",
  "uuid",
  "email",
  "date",
  "int",
  "float",
  "boolean",
  "string",
];

const popularEmailDomains = [
  "gmail.com",
  "outlook.com",
  "yahoo.com",
  "icloud.com",
  "hotmail.com",
  "proton.me",
  "aol.com",
  "zoho.com",
  "zohomail.com",
  "mail.com",
];

export default function DataForgePage() {
  const sections: ToolSidebarItem[] = useMemo(() => ([
    { id: "fields", label: "Field Builder", icon: Layers3 },
    { id: "blueprint", label: "Blueprint Generator", icon: Sparkles },
  ]), []);

  const [activeSection, setActiveSection] = useState<"fields" | "blueprint">("fields");
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const activeLabel = sections.find(s => s.id === activeSection)?.label || "Mock Data Engine";

  const [fields, setFields] = useState<MockField[]>([
    { id: "field-1", name: "id", type: "uuid" },
    { id: "field-2", name: "name", type: "name" },
    { id: "field-3", name: "email", type: "email" },
  ]);
  const [rowCount, setRowCount] = useState(25);
  const [mockFormat, setMockFormat] = useState<"json" | "xml">("json");
  const [mockOutput, setMockOutput] = useState("");

  const [blueprintInput, setBlueprintInput] = useState(`{\n  \"kind\": \"branch\",\n  \"properties\": {\n    \"id\": { \"kind\": \"leaf\", \"dataType\": \"uuid\" },\n    \"name\": { \"kind\": \"leaf\", \"dataType\": \"string\", \"constraints\": { \"minLength\": 4, \"maxLength\": 12 } },\n    \"age\": { \"kind\": \"leaf\", \"dataType\": \"number\", \"constraints\": { \"min\": 18, \"max\": 67, \"precision\": 0 } },\n    \"email\": { \"kind\": \"leaf\", \"dataType\": \"string\", \"constraints\": { \"pattern\": \"^[a-z]+\\\\.[a-z]+@gmail\\\\.com$\" } },\n    \"children\": {\n      \"kind\": \"array\",\n      \"constraints\": { \"minItems\": 1, \"maxItems\": 3 },\n      \"items\": {\n        \"kind\": \"branch\",\n        \"properties\": {\n          \"parentId\": { \"kind\": \"leaf\", \"dataType\": \"uuid\", \"constraints\": { \"link\": \"id\" } },\n          \"name\": { \"kind\": \"leaf\", \"dataType\": \"string\" }\n        }\n      }\n    }\n  }\n}`);
  const [blueprintCount, setBlueprintCount] = useState(5);
  const [blueprintWithMeta, setBlueprintWithMeta] = useState(false);
  const [blueprintOutput, setBlueprintOutput] = useState("");

  const addField = () => {
    setFields((prev) => [
      ...prev,
      { id: `field-${prev.length + 1}`, name: `field_${prev.length + 1}`, type: "string" },
    ]);
  };

  const updateField = (id: string, patch: Partial<MockField>) => {
    setFields((prev) => prev.map((field) => (field.id === id ? { ...field, ...patch } : field)));
  };

  const removeField = (id: string) => {
    setFields((prev) => prev.filter((field) => field.id !== id));
  };

  const handleGenerateMock = () => {
    const rows = generateMockRows(fields, rowCount);
    setMockOutput(mockRowsToOutput(rows, mockFormat));
  };

  const handleGenerateBlueprint = () => {
    try {
      const blueprint = JSON.parse(blueprintInput);
      const records = generate(blueprint, blueprintCount, { includeMeta: blueprintWithMeta });
      setBlueprintOutput(JSON.stringify(records, null, 2));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error";
      setBlueprintOutput("Invalid blueprint: " + message);
    }
  };

  return (
    <div className="flex h-[calc(100vh-80px)] overflow-hidden bg-[#f7f6f3] relative font-display text-gray-900">
      <ToolSidebar
        title="Mock Data Engine"
        items={sections}
        activeId={activeSection}
        onSelect={(id) => setActiveSection(id as typeof activeSection)}
        isOpen={isSidebarOpen}
        onToggle={setSidebarOpen}
      />

      <main className="flex-1 overflow-hidden relative bg-gray-50/30 flex flex-col">
        <header className="h-14 border-b border-gray-200/50 bg-white/50 backdrop-blur-md flex items-center justify-between px-6 transition-all duration-300">
          <div className={cn("flex items-center gap-2 transition-all duration-300", !isSidebarOpen && "pl-12")}>
            <div className="flex items-center text-sm text-gray-500">
              <span className="font-semibold text-gray-800 mr-2">Mock Data Engine</span>
              <span className="text-gray-300">/</span>
              <span className="ml-2">{activeLabel}</span>
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
            activeSection === "blueprint" ? "max-w-5xl" : "max-w-6xl"
          )}>
            {activeSection === "fields" && (
              <Card className="p-6 bg-white border border-black/10 shadow-sm">
                <div className="grid lg:grid-cols-12 gap-6">
                  <div className="lg:col-span-7 space-y-4">
                    <div className="space-y-3">
                      {fields.map((field) => (
                        <div key={field.id} className="flex flex-wrap items-center gap-3">
                          <Input
                            value={field.name}
                            onChange={(e) => updateField(field.id, { name: e.target.value })}
                            placeholder="field_name"
                            className="flex-1 min-w-[180px]"
                          />
                          <Select
                            value={field.type}
                            onChange={(e) => updateField(field.id, { type: e.target.value as MockFieldType })}
                            className="w-44"
                          >
                            {mockFieldTypes.map((type) => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </Select>
                          <Button variant="ghost" onClick={() => removeField(field.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>

                          {(field.type === "int" || field.type === "float") && (
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <span>Min</span>
                              <Input
                                type="number"
                                value={field.constraints?.min ?? ""}
                                onChange={(e) => updateField(field.id, { constraints: { ...field.constraints, min: e.target.value === "" ? undefined : Number(e.target.value) } })}
                                className="w-24"
                              />
                              <span>Max</span>
                              <Input
                                type="number"
                                value={field.constraints?.max ?? ""}
                                onChange={(e) => updateField(field.id, { constraints: { ...field.constraints, max: e.target.value === "" ? undefined : Number(e.target.value) } })}
                                className="w-24"
                              />
                            </div>
                          )}

                          {field.type === "date" && (
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <span>Start</span>
                              <Input
                                type="date"
                                value={field.constraints?.start ?? ""}
                                onChange={(e) => updateField(field.id, { constraints: { ...field.constraints, start: e.target.value || undefined } })}
                                className="w-40"
                              />
                              <span>End</span>
                              <Input
                                type="date"
                                value={field.constraints?.end ?? ""}
                                onChange={(e) => updateField(field.id, { constraints: { ...field.constraints, end: e.target.value || undefined } })}
                                className="w-40"
                              />
                            </div>
                          )}

                          {field.type === "string" && (
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <span>Min Len</span>
                              <Input
                                type="number"
                                value={field.constraints?.minLength ?? ""}
                                onChange={(e) => updateField(field.id, { constraints: { ...field.constraints, minLength: e.target.value === "" ? undefined : Number(e.target.value) } })}
                                className="w-24"
                              />
                              <span>Max Len</span>
                              <Input
                                type="number"
                                value={field.constraints?.maxLength ?? ""}
                                onChange={(e) => updateField(field.id, { constraints: { ...field.constraints, maxLength: e.target.value === "" ? undefined : Number(e.target.value) } })}
                                className="w-24"
                              />
                            </div>
                          )}

                          {field.type === "email" && (
                            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                              <span className="mr-2">Domains</span>
                              {popularEmailDomains.map((domain) => {
                                const selected = field.constraints?.domains?.includes(domain);
                                return (
                                  <button
                                    key={domain}
                                    type="button"
                                    onClick={() => {
                                      const current = field.constraints?.domains ?? [];
                                      const next = selected
                                        ? current.filter((d) => d !== domain)
                                        : [...current, domain];
                                      updateField(field.id, { constraints: { ...field.constraints, domains: next.length ? next : undefined } });
                                    }}
                                    className={cn(
                                      "px-2.5 py-1 rounded-full border text-[11px] transition-all",
                                      selected
                                        ? "bg-indigo-600 text-white border-indigo-600"
                                        : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                                    )}
                                  >
                                    {domain}
                                  </button>
                                );
                              })}
                              <div className="flex items-center gap-2">
                                <Input
                                  placeholder="Add domain (e.g. custom.com)"
                                  className="min-w-[220px]"
                                  onKeyDown={(e) => {
                                    if (e.key !== "Enter") return;
                                    const value = (e.currentTarget.value || "").trim();
                                    if (!value) return;
                                    const current = field.constraints?.domains ?? [];
                                    if (!current.includes(value)) {
                                      updateField(field.id, { constraints: { ...field.constraints, domains: [...current, value] } });
                                    }
                                    e.currentTarget.value = "";
                                  }}
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    const input = (e.currentTarget.previousSibling as HTMLInputElement | null);
                                    if (!input) return;
                                    const value = (input.value || "").trim();
                                    if (!value) return;
                                    const current = field.constraints?.domains ?? [];
                                    if (!current.includes(value)) {
                                      updateField(field.id, { constraints: { ...field.constraints, domains: [...current, value] } });
                                    }
                                    input.value = "";
                                  }}
                                >
                                  Add
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-3">
                      <Button variant="outline" onClick={addField} className="gap-2">
                        <Plus className="w-4 h-4" /> Add Field
                      </Button>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">Rows</span>
                        <Input
                          type="number"
                          value={rowCount}
                          min={1}
                          max={1000}
                          onChange={(e) => setRowCount(Number(e.target.value))}
                          className="w-24"
                        />
                      </div>
                      <Select value={mockFormat} onChange={(e) => setMockFormat(e.target.value as "json" | "xml")} className="w-32">
                        <option value="json">JSON</option>
                        <option value="xml">XML</option>
                      </Select>
                      <div className="ml-auto flex items-center gap-2">
                        {mockOutput && (
                          <CopyToClipboard text={mockOutput} showText={false} variant="outline" />
                        )}
                        <Button onClick={handleGenerateMock}>Generate</Button>
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-5">
                    <Textarea
                      value={mockOutput}
                      readOnly
                      placeholder="Generated mock data will appear here..."
                      className="min-h-[360px] font-mono text-xs"
                    />
                  </div>
                </div>
              </Card>
            )}

            {activeSection === "blueprint" && (
              <Card className="p-6 bg-white border border-black/10 shadow-sm">
                <div className="flex items-center justify-between gap-4 mb-4">
                  <div>
                    <h3 className="text-base font-semibold">Blueprint Generator</h3>
                    <p className="text-xs text-gray-500">Define nested structures with constraints, null chance, and linked logic.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-xs text-gray-500">
                      <input
                        type="checkbox"
                        checked={blueprintWithMeta}
                        onChange={(e) => setBlueprintWithMeta(e.target.checked)}
                      />
                      Include metadata
                    </label>
                    <Input
                      type="number"
                      min={1}
                      max={1000}
                      value={blueprintCount}
                      onChange={(e) => setBlueprintCount(Number(e.target.value))}
                      className="w-24"
                    />
                    <Button onClick={handleGenerateBlueprint}>Generate</Button>
                  </div>
                </div>

                <div className="grid lg:grid-cols-2 gap-4">
                  <Textarea
                    value={blueprintInput}
                    onChange={(e) => setBlueprintInput(e.target.value)}
                    className="min-h-[320px] font-mono text-xs"
                  />
                  <div className="relative">
                    {blueprintOutput && (
                      <div className="absolute right-3 top-3">
                        <CopyToClipboard text={blueprintOutput} showText={false} variant="outline" />
                      </div>
                    )}
                    <Textarea
                      value={blueprintOutput}
                      readOnly
                      placeholder="Generated records will appear here..."
                      className="min-h-[320px] font-mono text-xs"
                    />
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
