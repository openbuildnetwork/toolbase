"use client";

import React, { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { ToolSidebar, ToolSidebarItem } from "@/components/ui/ToolSidebar";
import { cn } from "@/lib/utils";
import {
  Archive,
  CheckCircle2,
  Download,
  FolderTree,
  PackageOpen,
  XCircle,
} from "lucide-react";
import {
  ArchiveEntry,
  ArchiveFormat,
  ArchiveInputFile,
  createArchive,
  extractArchive,
  listArchiveEntries,
} from "@/lib/archive-kit";
import {
  createArchiveRust,
  extractArchiveRust,
  isArchiveKitRustAvailable,
  listArchiveEntriesRust,
} from "@/lib/archive-kit-rust";

function bytesToHuman(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

function inferFormatFromName(name: string): ArchiveFormat | null {
  const lower = name.toLowerCase();
  if (lower.endsWith(".zip")) return "zip";
  if (lower.endsWith(".tar")) return "tar";
  return null;
}

function downloadBytes(filename: string, bytes: Uint8Array, mime: string) {
  const blob = new Blob([Uint8Array.from(bytes)], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function ArchiveKitPage() {
  const sections: ToolSidebarItem[] = useMemo(
    () => [
      { id: "create", label: "Create Archive", icon: Archive },
      { id: "inspect", label: "Inspect Archive", icon: FolderTree },
      { id: "extract", label: "Extract Archive", icon: PackageOpen },
    ],
    []
  );

  const [activeSection, setActiveSection] = useState<"create" | "inspect" | "extract">("create");
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const activeLabel = sections.find((s) => s.id === activeSection)?.label || "Archive Kit";

  const [createFiles, setCreateFiles] = useState<File[]>([]);
  const [createFormat, setCreateFormat] = useState<ArchiveFormat>("zip");
  const [outputName, setOutputName] = useState("archive.zip");
  const [createStatus, setCreateStatus] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [engineLabel, setEngineLabel] = useState<"Rust WASM" | "TypeScript">("TypeScript");

  const [inspectFormat, setInspectFormat] = useState<ArchiveFormat>("zip");
  const [inspectFile, setInspectFile] = useState<File | null>(null);
  const [inspectEntries, setInspectEntries] = useState<ArchiveEntry[]>([]);
  const [inspectError, setInspectError] = useState<string | null>(null);

  const [extractFormat, setExtractFormat] = useState<ArchiveFormat>("zip");
  const [extractFile, setExtractFile] = useState<File | null>(null);
  const [extracted, setExtracted] = useState<ArchiveInputFile[]>([]);
  const [extractError, setExtractError] = useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;
    isArchiveKitRustAvailable().then((available) => {
      if (mounted && available) setEngineLabel("Rust WASM");
    });
    return () => {
      mounted = false;
    };
  }, []);

  const handleCreateArchive = async () => {
    setCreateError(null);
    setCreateStatus(null);
    try {
      if (createFiles.length === 0) throw new Error("Add at least one input file.");
      const payload: ArchiveInputFile[] = await Promise.all(
        createFiles.map(async (file) => ({
          name: file.name,
          bytes: new Uint8Array(await file.arrayBuffer()),
        }))
      );
      const rustArchive = await createArchiveRust(createFormat, payload);
      const archive = rustArchive ?? createArchive(createFormat, payload);
      const safeName = outputName.trim() || `archive.${createFormat}`;
      const filename = safeName.endsWith(`.${createFormat}`) ? safeName : `${safeName}.${createFormat}`;
      downloadBytes(
        filename,
        archive,
        createFormat === "zip" ? "application/zip" : "application/x-tar"
      );
      setCreateStatus(`Created ${filename} (${bytesToHuman(archive.length)}).`);
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "Archive creation failed.");
    }
  };

  const handleInspectArchive = async () => {
    setInspectError(null);
    try {
      if (!inspectFile) throw new Error("Select a ZIP or TAR file to inspect.");
      const bytes = new Uint8Array(await inspectFile.arrayBuffer());
      const rustEntries = await listArchiveEntriesRust(inspectFormat, bytes);
      const entries = rustEntries ?? listArchiveEntries(inspectFormat, bytes);
      setInspectEntries(entries);
    } catch (err: unknown) {
      setInspectEntries([]);
      setInspectError(err instanceof Error ? err.message : "Inspection failed.");
    }
  };

  const handleExtractArchive = async () => {
    setExtractError(null);
    try {
      if (!extractFile) throw new Error("Select a ZIP or TAR file to extract.");
      const bytes = new Uint8Array(await extractFile.arrayBuffer());
      const rustFiles = await extractArchiveRust(extractFormat, bytes);
      const files = rustFiles ?? (await extractArchive(extractFormat, bytes));
      setExtracted(files);
    } catch (err: unknown) {
      setExtracted([]);
      setExtractError(err instanceof Error ? err.message : "Extraction failed.");
    }
  };

  return (
    <div className="flex h-[calc(100vh-80px)] overflow-hidden bg-[#f7f6f3] relative font-display text-gray-900">
      <ToolSidebar
        title="Archive Kit"
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
              <span className="font-semibold text-gray-800 mr-2">Archive Kit</span>
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
          <div className="h-full w-full space-y-8">
            <Card className="p-0 bg-white border border-black/10 shadow-sm overflow-hidden">
              <div className="border-b border-gray-200/80 bg-gradient-to-r from-sky-50 via-cyan-50 to-white px-5 py-4">
                <div className="flex items-center gap-2">
                  <Archive className="w-4 h-4 text-sky-700" />
                  <h3 className="text-sm font-semibold text-gray-900">{activeLabel}</h3>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  ZIP/TAR create, list, and extract operations run fully in your browser.
                </p>
                <p className="mt-1 text-[11px] text-sky-700 font-medium">Engine: {engineLabel}</p>
              </div>

              <div className="p-5 space-y-4">
                {activeSection === "create" && (
                  <>
                    <div className="flex flex-wrap items-end gap-3">
                      <div className="w-28">
                        <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Format</label>
                        <Select
                          value={createFormat}
                          onChange={(e) => {
                            const next = e.target.value as ArchiveFormat;
                            setCreateFormat(next);
                            setOutputName((prev) =>
                              prev.replace(/(\.zip|\.tar)$/i, "") + `.${next}`
                            );
                          }}
                        >
                          <option value="zip">ZIP</option>
                          <option value="tar">TAR</option>
                        </Select>
                      </div>
                      <div className="w-72">
                        <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Output Name</label>
                        <Input
                          value={outputName}
                          onChange={(e) => setOutputName(e.target.value)}
                          placeholder={`archive.${createFormat}`}
                        />
                      </div>
                      <div className="ml-auto">
                        <Button onClick={handleCreateArchive} className="gap-2">
                          <Download className="w-4 h-4" />
                          Create & Download
                        </Button>
                      </div>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4">
                      <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Input Files</label>
                      <Input
                        type="file"
                        multiple
                        onChange={(e) => setCreateFiles(Array.from(e.target.files || []))}
                        className="mt-2"
                      />
                      <div className="mt-3 space-y-1">
                        {createFiles.length === 0 ? (
                          <p className="text-sm text-gray-500">No files selected.</p>
                        ) : (
                          createFiles.map((file) => (
                            <div key={file.name + file.size} className="text-sm text-gray-700">
                              {file.name} <span className="text-gray-400">({bytesToHuman(file.size)})</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {createStatus && (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        {createStatus}
                      </div>
                    )}
                    {createError && (
                      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
                        <XCircle className="w-4 h-4" />
                        {createError}
                      </div>
                    )}
                  </>
                )}

                {activeSection === "inspect" && (
                  <>
                    <div className="flex flex-wrap items-end gap-3">
                      <div className="w-28">
                        <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Format</label>
                        <Select value={inspectFormat} onChange={(e) => setInspectFormat(e.target.value as ArchiveFormat)}>
                          <option value="zip">ZIP</option>
                          <option value="tar">TAR</option>
                        </Select>
                      </div>
                      <div className="flex-1 min-w-[280px]">
                        <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Archive File</label>
                        <Input
                          type="file"
                          accept=".zip,.tar"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            setInspectFile(file);
                            setInspectEntries([]);
                            if (file) {
                              const inferred = inferFormatFromName(file.name);
                              if (inferred) setInspectFormat(inferred);
                            }
                          }}
                        />
                      </div>
                      <div className="ml-auto">
                        <Button onClick={handleInspectArchive}>List Entries</Button>
                      </div>
                    </div>

                    {inspectError && (
                      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
                        <XCircle className="w-4 h-4" />
                        {inspectError}
                      </div>
                    )}

                    <div className="rounded-xl border border-gray-200 overflow-hidden">
                      <div className="grid grid-cols-12 gap-2 bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        <div className="col-span-7">Name</div>
                        <div className="col-span-2 text-right">Size</div>
                        <div className="col-span-2 text-right">Packed</div>
                        <div className="col-span-1 text-right">Type</div>
                      </div>
                      <div className="max-h-[420px] overflow-y-auto">
                        {inspectEntries.length === 0 ? (
                          <div className="px-3 py-4 text-sm text-gray-500">No entries loaded.</div>
                        ) : (
                          inspectEntries.map((entry) => (
                            <div
                              key={`${entry.name}-${entry.size}-${entry.compressedSize}`}
                              className="grid grid-cols-12 gap-2 px-3 py-2 text-sm border-t border-gray-100"
                            >
                              <div className="col-span-7 truncate">{entry.name}</div>
                              <div className="col-span-2 text-right text-gray-600">{bytesToHuman(entry.size)}</div>
                              <div className="col-span-2 text-right text-gray-600">{bytesToHuman(entry.compressedSize)}</div>
                              <div className="col-span-1 text-right text-gray-500">{entry.isDirectory ? "Dir" : "File"}</div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}

                {activeSection === "extract" && (
                  <>
                    <div className="flex flex-wrap items-end gap-3">
                      <div className="w-28">
                        <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Format</label>
                        <Select value={extractFormat} onChange={(e) => setExtractFormat(e.target.value as ArchiveFormat)}>
                          <option value="zip">ZIP</option>
                          <option value="tar">TAR</option>
                        </Select>
                      </div>
                      <div className="flex-1 min-w-[280px]">
                        <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Archive File</label>
                        <Input
                          type="file"
                          accept=".zip,.tar"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            setExtractFile(file);
                            setExtracted([]);
                            if (file) {
                              const inferred = inferFormatFromName(file.name);
                              if (inferred) setExtractFormat(inferred);
                            }
                          }}
                        />
                      </div>
                      <div className="ml-auto">
                        <Button onClick={handleExtractArchive}>Extract Files</Button>
                      </div>
                    </div>

                    {extractError && (
                      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
                        <XCircle className="w-4 h-4" />
                        {extractError}
                      </div>
                    )}

                    <div className="rounded-xl border border-gray-200 overflow-hidden">
                      <div className="grid grid-cols-12 gap-2 bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        <div className="col-span-8">File</div>
                        <div className="col-span-2 text-right">Size</div>
                        <div className="col-span-2 text-right">Action</div>
                      </div>
                      <div className="max-h-[420px] overflow-y-auto">
                        {extracted.length === 0 ? (
                          <div className="px-3 py-4 text-sm text-gray-500">No files extracted.</div>
                        ) : (
                          extracted.map((file) => (
                            <div key={`${file.name}-${file.bytes.length}`} className="grid grid-cols-12 gap-2 px-3 py-2 text-sm border-t border-gray-100">
                              <div className="col-span-8 truncate">{file.name}</div>
                              <div className="col-span-2 text-right text-gray-600">{bytesToHuman(file.bytes.length)}</div>
                              <div className="col-span-2 text-right">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => downloadBytes(file.name, file.bytes, "application/octet-stream")}
                                >
                                  Save
                                </Button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
