"use client";

import React from "react";
import { Editor } from "@monaco-editor/react";
import { Button } from "@/components/ui/Button";
import { Play, Database, FileSpreadsheet, HelpCircle } from "lucide-react";
import { TableSchema } from "@/hooks/useDataLens";
import { HelpPanel } from "./HelpPanel";

interface SqlViewProps {
    sqlQuery: string;
    setSqlQuery: (query: string) => void;
    onRunSql: () => void;
    isProcessing: boolean;
    schemas: TableSchema[];
}

export function SqlView({ sqlQuery, setSqlQuery, onRunSql, isProcessing, schemas }: SqlViewProps) {
    const [isHelpOpen, setIsHelpOpen] = React.useState(false);

    const sqlExamples = [
        {
            title: "1. Basic Exploration",
            description: "See the first few rows to understand the data structure.",
            code: "SELECT * FROM employees_200 LIMIT 10;"
        },
        {
            title: "2. Precision Filtering",
            description: "Find entries matching specific criteria (use single quotes for text).",
            code: "SELECT * FROM complex_employees \nWHERE personalInfo_contact_address_city = 'Hyderabad' \nAND performance_rating > 4.5;"
        },
        {
            title: "3. Summary & Insights",
            description: "Calculate totals or averages grouped by a category.",
            code: "SELECT Department, \n       COUNT(*) as Headcount, \n       AVG(Salary) as AvgSalary \nFROM employees_200 \nGROUP BY Department \nORDER BY AvgSalary DESC;"
        },
        {
            title: "4. Cross-File Analysis (Join)",
            description: "Combine data from two different uploaded files.",
            code: "SELECT a.FirstName, a.Email, b.projects_name \nFROM employees_200 a \nJOIN complex_employees b ON a.EmployeeID = b.employeeId;"
        }
    ];

    const sqlIntro = (
        <div className="space-y-3">
            <h3 className="text-sm font-bold text-indigo-900">How Naming Works</h3>
            <p className="text-xs text-indigo-700/80 leading-relaxed">
                When you upload a file, the **filename (without extension)** becomes your table name.
            </p>
            <div className="flex items-center gap-3 bg-white/50 p-2 rounded-xl border border-indigo-100 italic text-[10px] text-indigo-600">
                <span>📄 employees_200.csv</span>
                <span className="text-gray-400">➔</span>
                <span className="font-mono font-bold">employees_200</span>
            </div>
            <p className="text-[10px] text-indigo-600/70">
                All nested JSON fields are flattened using underscores (e.g., <code className="bg-indigo-100 px-1 rounded">personalInfo_city</code>).
            </p>
        </div>
    );

    return (
        <div className="h-full flex flex-col p-6 gap-6 bg-gray-50/50 relative overflow-hidden">
            <div className="flex-1 min-h-0 flex flex-col bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50/50">
                    <span className="text-sm font-semibold text-gray-700">SQL Editor</span>
                    <div className="flex gap-2">
                        <Button 
                            onClick={() => setIsHelpOpen(true)}
                            variant="outline" 
                            size="sm" 
                            className="gap-2 border-gray-200 hover:bg-gray-100 text-gray-600"
                        >
                            <HelpCircle className="w-4 h-4" /> How to use
                        </Button>
                        <Button 
                            onClick={onRunSql} 
                            disabled={isProcessing} 
                            size="sm" 
                            className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                        >
                            <Play className="w-4 h-4" /> Run Query
                        </Button>
                    </div>
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

            <HelpPanel 
                isOpen={isHelpOpen} 
                onClose={() => setIsHelpOpen(false)} 
                title="SQL Help" 
                introduction={sqlIntro}
                examples={sqlExamples} 
            />
        </div>
    );
}
