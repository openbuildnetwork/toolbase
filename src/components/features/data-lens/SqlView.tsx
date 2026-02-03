"use client";

import React from "react";
import { Editor } from "@monaco-editor/react";
import { Button } from "@/components/ui/Button";
import { Play, Database, FileSpreadsheet } from "lucide-react";
import { TableSchema } from "@/hooks/useDataLens";

interface SqlViewProps {
    sqlQuery: string;
    setSqlQuery: (query: string) => void;
    onRunSql: () => void;
    isProcessing: boolean;
    schemas: TableSchema[];
}

export function SqlView({ sqlQuery, setSqlQuery, onRunSql, isProcessing, schemas }: SqlViewProps) {
    return (
        <div className="h-full flex flex-col p-6 gap-6 bg-gray-50/50">
            <div className="flex-1 min-h-0 flex flex-col bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50/50">
                    <span className="text-sm font-semibold text-gray-700">SQL Editor</span>
                    <Button onClick={onRunSql} disabled={isProcessing} size="sm" className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
                        <Play className="w-4 h-4" /> Run Query
                    </Button>
                </div>
                <div className="flex-1">
                    <Editor
                        height="100%"
                        defaultLanguage="sql"
                        value={sqlQuery}
                        onChange={(val) => setSqlQuery(val || '')}
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

            {/* Schema Explorer */}
            <div className="h-40 bg-white rounded-2xl border border-gray-200 shadow-sm p-5 overflow-auto">
                <div className="flex items-center gap-2 mb-4">
                    <Database className="w-4 h-4 text-indigo-500" />
                    <span className="text-sm font-semibold text-gray-700">Schema Explorer</span>
                </div>
                <div className="flex flex-wrap gap-4">
                    {schemas.map(s => (
                        <div key={s.table_name} className="bg-gray-50 border border-gray-200 rounded-xl p-4 min-w-[200px]">
                            <div className="font-semibold text-indigo-600 mb-2 flex items-center gap-2">
                                <FileSpreadsheet className="w-4 h-4" />
                                {s.table_name}
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {s.columns.slice(0, 5).map(c => (
                                    <span key={c.name} className="px-2 py-0.5 bg-white border border-gray-200 rounded text-[10px] text-gray-600 font-medium">{c.name}</span>
                                ))}
                                {s.columns.length > 5 && <span className="px-2 py-0.5 text-[10px] text-gray-400">+{s.columns.length - 5}</span>}
                            </div>
                        </div>
                    ))}
                    {schemas.length === 0 && (
                        <p className="text-sm text-gray-400">No tables loaded yet. Upload a file to see schema.</p>
                    )}
                </div>
            </div>
        </div>
    );
}
