
'use client';

import React, { useState, useEffect } from 'react';
import { useDataLens } from '@/hooks/useDataLens';
import { FileUploader } from '@/components/ui/FileUploader';
import { SchemaSidebar } from './_components/SchemaSidebar';
import { FilterBar } from './_components/FilterBar';
import { CodeEditor } from './_components/CodeEditor';
import { DataTable } from './_components/DataTable';
import { VisualQueryBuilder } from './_components/VisualQueryBuilder';
import { QuickActions } from './_components/QuickActions';
import { PanelLeft, AlertCircle, Loader2, Sparkles, Database, Code, Play } from 'lucide-react';
import { Tabs } from '@/components/ui/Tabs';

export default function DataLensPage() {
    const {
        isReady,
        isProcessing,
        error: workerError,
        schemas,
        queryResult,
        loadFile,
        runSql,
        runPython,
    } = useDataLens();

    const [activeTab, setActiveTab] = useState('visual');
    const [sqlCode, setSqlCode] = useState('');
    const [pythonCode, setPythonCode] = useState('');
    const [sidebarOpen, setSidebarOpen] = useState(true);

    // Debug: Log queryResult changes
    useEffect(() => {
        console.log('Page: queryResult changed:', queryResult);
    }, [queryResult]);

    // Initial code templates
    useEffect(() => {
        if (!sqlCode) setSqlCode('SELECT * FROM data LIMIT 100');
        if (!pythonCode) {
            setPythonCode(
                `# DataLens Script
# Available variables:
# - dfs: dictionary of pandas DataFrames (key=filename)
# - con: sqlite3 connection
# - pd: pandas module

# Example: Return first 100 rows of first file
import pandas as pd
filename = list(dfs.keys())[0]
result = dfs[filename].head(100)`
            );
        }
    }, []);

    const handleRun = async () => {
        if (activeTab === 'sql') {
            await runSql(sqlCode);
        } else if (activeTab === 'python') {
            await runPython(pythonCode);
        }
    };

    const handleVisualQuery = async (sql: string) => {
        setSqlCode(sql); // Sync to SQL editor
        await runSql(sql);
    };

    const handleExport = (format: 'csv' | 'json') => {
        if (!queryResult) return;
        const dataStr = format === 'json'
            ? "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(queryResult.data, null, 2))
            : "data:text/csv;charset=utf-8," + encodeURIComponent(convertToCSV(queryResult.data));

        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `export.${format}`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    const convertToCSV = (objArray: any[]) => {
        const array = typeof objArray !== 'object' ? JSON.parse(objArray) : objArray;
        let str = '';
        if (array.length > 0) {
            const header = Object.keys(array[0]).join(',') + '\r\n';
            str += header;
        }
        for (let i = 0; i < array.length; i++) {
            let line = '';
            for (const index in array[i]) {
                if (line !== '') line += ',';
                line += array[i][index];
            }
            str += line + '\r\n';
        }
        return str;
    };

    const handleReset = () => {
        // Reset logic if needed
    };

    return (
        <div className="flex h-screen bg-gray-100 overflow-hidden font-sans">
            {/* Sidebar */}
            <div className={`transition-all duration-300 ease-in-out ${sidebarOpen ? 'w-72' : 'w-0'} flex-shrink-0 overflow-hidden relative bg-gray-50 border-r border-gray-200`}>
                <div className="w-72 h-full flex flex-col">
                    <SchemaSidebar schemas={schemas} />
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Header */}
                <div className="bg-white border-b border-gray-200 flex items-center justify-between px-4 py-3 shadow-sm z-20">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"
                        >
                            <PanelLeft className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-indigo-100 rounded-lg">
                                <Database className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div>
                                <h1 className="text-lg font-bold text-gray-800 leading-tight">
                                    DataLens
                                </h1>
                                <p className="text-xs text-gray-500">Browser-based ETL & Analysis</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {!isReady ? (
                            <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-100 animate-pulse">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Starting Engine...</span>
                            </div>
                        ) : isProcessing ? (
                            <div className="flex items-center gap-2 text-sm text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Processing...</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1.5 text-sm text-green-600 bg-green-50 px-3 py-1.5 rounded-full border border-green-100">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                </span>
                                <span>Ready</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex-1 flex flex-col min-h-0 p-4 gap-4 overflow-y-auto">
                    {/* Error Display */}
                    {workerError && (
                        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-start gap-3 shadow-xs">
                            <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
                            <div>
                                <h3 className="font-semibold">Processing Error</h3>
                                <pre className="text-xs mt-1 whitespace-pre-wrap font-mono bg-red-100/50 p-2 rounded">{workerError}</pre>
                            </div>
                        </div>
                    )}

                    {schemas.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center p-8">
                            <div className="max-w-2xl w-full space-y-8">
                                <div className="text-center space-y-2">
                                    <h2 className="text-3xl font-bold text-gray-800">Welcome to DataLens</h2>
                                    <p className="text-gray-500 text-lg">Upload your datasets to explore, clean, and analyze them privately in your browser.</p>
                                </div>
                                <FileUploader
                                    onFilesSelected={(files) => files.forEach(loadFile)}
                                    accept=".csv,.json,.xlsx"
                                    multiple={true}
                                />
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                                    <div className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                                        <div className="mx-auto w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center mb-3">
                                            <Sparkles className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <h3 className="font-medium text-gray-900">Visual Builder</h3>
                                        <p className="text-xs text-gray-500 mt-1">Easy query builder for non-technical users</p>
                                    </div>
                                    <div className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                                        <div className="mx-auto w-10 h-10 bg-purple-50 rounded-full flex items-center justify-center mb-3">
                                            <Database className="w-5 h-5 text-purple-600" />
                                        </div>
                                        <h3 className="font-medium text-gray-900">SQL Engine</h3>
                                        <p className="text-xs text-gray-500 mt-1">Run complex SQL queries on your data</p>
                                    </div>
                                    <div className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                                        <div className="mx-auto w-10 h-10 bg-yellow-50 rounded-full flex items-center justify-center mb-3">
                                            <Code className="w-5 h-5 text-yellow-600" />
                                        </div>
                                        <h3 className="font-medium text-gray-900">Python Scripting</h3>
                                        <p className="text-xs text-gray-500 mt-1">Full Pandas power via Pyodide</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col h-full gap-4">
                            {/* Control Panel */}
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-1">
                                <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
                                    <Tabs
                                        value={activeTab}
                                        onChange={setActiveTab}
                                        tabs={[
                                            { id: 'visual', label: 'Visual', icon: <Sparkles className="w-4 h-4" /> },
                                            { id: 'sql', label: 'SQL', icon: <Database className="w-4 h-4" /> },
                                            { id: 'python', label: 'Python', icon: <Code className="w-4 h-4" /> },
                                        ]}
                                        size="sm"
                                        className="bg-gray-100/80 p-1 rounded-lg"
                                    />

                                    <div className="flex items-center gap-2">
                                        {activeTab !== 'visual' && (
                                            <button
                                                onClick={handleRun}
                                                disabled={isProcessing}
                                                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 text-sm font-medium shadow-sm hover:shadow-md active:scale-95"
                                            >
                                                <Play className="w-4 h-4 fill-current" />
                                                Run
                                            </button>
                                        )}
                                        <FilterBar
                                            onExport={handleExport}
                                            onReset={handleReset}
                                        />
                                    </div>
                                </div>

                                <div className="p-4 bg-gray-50/50 min-h-[200px]">
                                    {activeTab === 'visual' && (
                                        <div className="mt-0 space-y-4">
                                            <VisualQueryBuilder schemas={schemas} onRunQuery={handleVisualQuery} />
                                            {schemas.length > 0 && (
                                                <div className="pt-2 border-t border-gray-100">
                                                    <h4 className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Quick Cleaning Actions</h4>
                                                    <QuickActions
                                                        onRunPython={runPython}
                                                        table_name={schemas[0].table_name}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {activeTab === 'sql' && (
                                        <div className="mt-0 h-[250px]">
                                            <CodeEditor
                                                code={sqlCode}
                                                onChange={setSqlCode}
                                                language="sql"
                                                onRun={handleRun}
                                            />
                                        </div>
                                    )}

                                    {activeTab === 'python' && (
                                        <div className="mt-0 h-[250px]">
                                            <CodeEditor
                                                code={pythonCode}
                                                onChange={setPythonCode}
                                                language="python"
                                                onRun={handleRun}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>


                            {/* Results Table */}
                            <div className="flex-1 min-h-0 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                                <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-semibold text-gray-700 text-sm flex items-center gap-2">
                                            Results
                                        </h3>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {queryResult?.rowCount !== undefined && (
                                            <span className="text-xs font-medium text-gray-500 bg-gray-200/50 px-2 py-1 rounded-md">
                                                {queryResult.rowCount.toLocaleString()} rows
                                            </span>
                                        )}
                                        {queryResult?.message && (
                                            <span className="text-xs text-gray-500 italic max-w-md truncate" title={queryResult.message}>
                                                {queryResult.message}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex-1 relative">
                                    {queryResult ? (
                                        <DataTable data={queryResult.data} columns={queryResult.columns} />
                                    ) : (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 gap-2">
                                            <div className="p-4 bg-gray-50 rounded-full">
                                                <Database className="w-8 h-8 opacity-20" />
                                            </div>
                                            <p className="text-sm">Run a query to view results</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
