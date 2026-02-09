"use client";

import React from "react";
import { Editor } from "@monaco-editor/react";
import { Button } from "@/components/ui/Button";
import { Play, Terminal } from "lucide-react";
import { TableSchema } from "@/hooks/useDataLens";

interface PythonViewProps {
    pythonCode: string;
    setPythonCode: (code: string) => void;
    onRunPython: () => void;
    isProcessing: boolean;
    schemas: TableSchema[];
}

export function PythonView({ pythonCode, setPythonCode, onRunPython, isProcessing, schemas }: PythonViewProps) {
    return (
        <div className="h-full flex flex-col p-6 gap-6 bg-gray-50/50">
            <div className="flex-1 min-h-0 flex flex-col bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50/50">
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-gray-700">Python Editor</span>
                        <span className="px-2 py-0.5 bg-yellow-50 border border-yellow-200 rounded-md text-[10px] text-yellow-700 font-medium">Pyodide WASM</span>
                    </div>
                    <Button onClick={onRunPython} disabled={isProcessing} size="sm" className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
                        <Play className="w-4 h-4" /> Run Script
                    </Button>
                </div>
                <div className="flex-1">
                    <Editor
                        height="100%"
                        defaultLanguage="python"
                        value={pythonCode}
                        onChange={(val) => setPythonCode(val || '')}
                        theme="vs"
                        options={{
                            minimap: { enabled: false },
                            fontSize: 14,
                            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                            padding: { top: 16, bottom: 16 },
                            scrollBeyondLastLine: false,
                            lineNumbers: 'on',
                            renderLineHighlight: 'all',
                        }}
                    />
                </div>
            </div>

            {/* Environment Info */}
            <div className="h-36 grid grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
                    <h5 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Available Libraries</h5>
                    <div className="flex flex-wrap gap-2">
                        <span className="px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 font-medium">pandas (pd)</span>
                        <span className="px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-lg text-xs text-orange-700 font-medium">numpy (np)</span>
                        <span className="px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700 font-medium">openpyxl</span>
                    </div>
                </div>
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 overflow-auto">
                    <h5 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Available Variables</h5>
                    <div className="text-xs text-gray-600 space-y-1.5">
                        <div className="flex items-center gap-2">
                            <code className="text-indigo-600 font-semibold">DATA_STORE</code>
                            <span className="text-gray-400">— All loaded DataFrames</span>
                        </div>
                        {schemas.map(s => (
                            <div key={s.table_name} className="flex items-center gap-2">
                                <code className="text-indigo-600 font-semibold">{s.table_name}</code>
                                <span className="text-gray-400">— {s.rows} rows</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
