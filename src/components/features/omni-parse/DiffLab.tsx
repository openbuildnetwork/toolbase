"use client";

import React from "react";
import { Editor } from "@monaco-editor/react";
import { FileDiff } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import type { DiffEntry } from "@/lib/omni-parse";

type DiffLabProps = {
  diffFormat: "json" | "xml" | "yaml";
  setDiffFormat: (format: "json" | "xml" | "yaml") => void;
  diffLeft: string;
  setDiffLeft: (value: string) => void;
  diffRight: string;
  setDiffRight: (value: string) => void;
  diffError: string | null;
  diffEntries: DiffEntry[];
  onRunDiff: () => void;
  languageMap: Record<string, string>;
};

export function DiffLab({
  diffFormat,
  setDiffFormat,
  diffLeft,
  setDiffLeft,
  diffRight,
  setDiffRight,
  diffError,
  diffEntries,
  onRunDiff,
  languageMap,
}: DiffLabProps) {
  return (
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
              <Button variant="secondary" onClick={onRunDiff}>Run Diff</Button>
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
  );
}
