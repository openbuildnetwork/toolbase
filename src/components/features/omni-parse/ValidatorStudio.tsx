"use client";

import React from "react";
import { Editor } from "@monaco-editor/react";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { useTheme } from "next-themes";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import type { ValidationResult } from "@/lib/omni-parse";
import type { ValidationIssue } from "./types";

type ValidatorStudioProps = {
  validateFormat: "json" | "xml" | "yaml";
  setValidateFormat: (format: "json" | "xml" | "yaml") => void;
  validateInput: string;
  setValidateInput: (value: string) => void;
  validationResult: ValidationResult | null;
  validationIssues: ValidationIssue[];
  languageMap: Record<"json" | "xml" | "yaml", string>;
};

export function ValidatorStudio({
  validateFormat,
  setValidateFormat,
  validateInput,
  setValidateInput,
  validationResult,
  validationIssues,
  languageMap,
}: ValidatorStudioProps) {
  const { resolvedTheme } = useTheme();

  return (
    <div className="grid lg:grid-cols-12 gap-6">
      <div className="lg:col-span-12 space-y-5">
        <Card className="p-0 overflow-hidden border-(--border-subtle)">
          <div className="border-b border-(--border-subtle) bg-linear-to-r from-sky-500/10 via-cyan-500/5 to-transparent px-5 py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                  <h3 className="text-sm font-semibold text-(--text-primary)">Validator Studio</h3>
                </div>
                <p className="mt-1 text-xs text-(--text-muted)">Validate JSON, XML, and YAML inputs in real time.</p>
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

            <div className="mt-4 h-[360px] border border-(--border-subtle) rounded-xl overflow-hidden bg-(--surface-secondary)/50">
              <Editor
                height="100%"
                defaultLanguage={languageMap[validateFormat]}
                value={validateInput}
                onChange={(val) => setValidateInput(val || "")}
                theme={resolvedTheme === 'dark' ? 'vs-dark' : 'vs'}
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
                      ? "border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400"
                      : severity === "warning"
                        ? "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        : "border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-400";
                  return (
                    <div key={severity} className={`rounded-xl border px-4 py-3 ${style}`}>
                      <div className="flex items-center gap-2 text-sm font-semibold capitalize">
                        {severity === "critical" ? <XCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                        {severity}
                      </div>
                      <ul className="mt-2 space-y-2 text-sm">
                        {rows.map((row, idx) => (
                          <li key={`${severity}-${idx}`} className="rounded-lg border border-(--border-subtle) bg-(--surface-overlay) px-3 py-2">
                            <div className="font-medium text-(--text-primary)">{row.message}</div>
                            <div className="text-xs mt-1 text-(--text-muted)">
                              {(row.line || row.column) && (
                                <span>line {row.line ?? "?"}, col {row.column ?? "?"}</span>
                              )}
                              {row.path && <span className="ml-2">path {row.path}</span>}
                            </div>
                            <div className="text-xs mt-1 text-(--text-muted)">Suggestion: {row.suggestion}</div>
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
  );
}
