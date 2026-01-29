"use client";

import React, { useState, useCallback, useMemo, useEffect } from "react";
import { useDataLens, TableSchema } from "@/hooks/useDataLens";
import { FilterBuilder, FilterCondition } from "./FilterBuilder";
import { JsonTreeViewer } from "./JsonTreeViewer";
import { ChartBuilder } from "./ChartBuilder";
import { Button } from "@/components/ui/Button";
import { Editor } from "@monaco-editor/react";
import {
    Play, Download, Search, Table as TableIcon, Database, Upload,
    ChevronLeft, ChevronRight, Loader2, X, Code2, LayoutGrid, Terminal,
    Columns3, ArrowUpDown, FileSpreadsheet, Zap, BarChart3, Info,
    ChevronDown, Settings2, Maximize2, RefreshCw, Copy, Check,
    FileJson, FileText, PanelLeftClose, PanelLeft, Sparkles, AlertCircle,
    SortAsc, SortDesc, Eye, EyeOff, Sigma, Hash, Type, Calendar, Trash2, Braces, ScanSearch
} from "lucide-react";
import {
    useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel,
    getSortedRowModel, flexRender, SortingState, ColumnOrderState, VisibilityState
} from "@tanstack/react-table";
import Image from "next/image";

// ============================================================================
// PREMIUM DATA TABLE COMPONENT
// ============================================================================

function DataTable({ data, columns }: { data: any[], columns: string[] }) {
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState('');
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
    const [showColumnSettings, setShowColumnSettings] = useState(false);
    const [copiedCell, setCopiedCell] = useState<string | null>(null);
    const [pageSize, setPageSize] = useState(50);

    const tableColumns = useMemo(() => {
        return columns.map(col => ({
            accessorKey: col,
            header: col,
            enableHiding: true,
        }));
    }, [columns]);

    const table = useReactTable({
        data,
        columns: tableColumns,
        enableColumnResizing: true,
        columnResizeMode: 'onChange',
        state: { sorting, globalFilter, columnVisibility },
        onSortingChange: setSorting,
        onGlobalFilterChange: setGlobalFilter,
        onColumnVisibilityChange: setColumnVisibility,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        initialState: { pagination: { pageSize } },
    });

    // Column statistics
    const columnStats = useMemo(() => {
        const stats: Record<string, { unique: number; empty: number; type: string }> = {};
        columns.forEach(col => {
            const values = data.map(row => row[col]);
            const unique = new Set(values.filter(v => v != null && v !== '')).size;
            const empty = values.filter(v => v == null || v === '').length;
            const sample = values.find(v => v != null && v !== '');
            let type = 'text';
            if (typeof sample === 'number') type = 'number';
            else if (typeof sample === 'boolean') type = 'boolean';
            else if (sample instanceof Date || (!isNaN(Date.parse(sample)) && /\d{4}-\d{2}/.test(sample))) type = 'date';
            stats[col] = { unique, empty, type };
        });
        return stats;
    }, [data, columns]);

    const copyToClipboard = useCallback((value: string, cellId: string) => {
        navigator.clipboard.writeText(value);
        setCopiedCell(cellId);
        setTimeout(() => setCopiedCell(null), 1500);
    }, []);

    const pageInfo = table.getState().pagination;
    const totalPages = table.getPageCount();
    const visibleColumns = table.getVisibleLeafColumns().length;

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Table Toolbar */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50/50">
                <div className="flex items-center gap-4">
                    {/* Search */}
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                        <input
                            value={globalFilter ?? ''}
                            onChange={e => setGlobalFilter(e.target.value)}
                            className="w-72 pl-10 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 shadow-sm transition-all"
                            placeholder="Search all columns..."
                        />
                        {globalFilter && (
                            <button
                                onClick={() => setGlobalFilter('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1.5">
                            <TableIcon className="w-3.5 h-3.5" />
                            <span className="font-semibold text-indigo-600">{table.getFilteredRowModel().rows.length}</span> rows
                        </span>
                        <span className="flex items-center gap-1.5">
                            <Columns3 className="w-3.5 h-3.5" />
                            <span className="font-semibold text-indigo-600">{visibleColumns}</span> columns
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Column Visibility */}
                    <div className="relative">
                        <button
                            onClick={() => setShowColumnSettings(!showColumnSettings)}
                            className={`p-2 rounded-lg border transition-all ${showColumnSettings ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-gray-200 text-gray-500 hover:text-gray-700'}`}
                            title="Column settings"
                        >
                            <Settings2 className="w-4 h-4" />
                        </button>

                        {showColumnSettings && (
                            <div className="absolute right-0 top-full mt-2 w-64 max-h-80 overflow-auto bg-white border border-gray-200 rounded-xl shadow-xl z-50 animate-in fade-in slide-in-from-top-2">
                                <div className="p-3 border-b border-gray-100 flex justify-between items-center">
                                    <span className="text-sm font-semibold text-gray-700">Columns</span>
                                    <button
                                        onClick={() => table.toggleAllColumnsVisible(true)}
                                        className="text-xs text-indigo-600 hover:underline"
                                    >
                                        Show all
                                    </button>
                                </div>
                                <div className="p-2">
                                    {table.getAllLeafColumns().map(column => (
                                        <label
                                            key={column.id}
                                            className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={column.getIsVisible()}
                                                onChange={column.getToggleVisibilityHandler()}
                                                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <span className="text-sm text-gray-700 truncate flex-1">{column.id}</span>
                                            <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                                                {columnStats[column.id]?.type}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Rows per page */}
                    <select
                        value={pageSize}
                        onChange={e => {
                            setPageSize(Number(e.target.value));
                            table.setPageSize(Number(e.target.value));
                        }}
                        className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                        {[25, 50, 100, 250].map(size => (
                            <option key={size} value={size}>{size} rows</option>
                        ))}
                    </select>

                    {/* Pagination */}
                    <div className="flex items-center gap-1 ml-2">
                        <button
                            onClick={() => table.previousPage()}
                            disabled={!table.getCanPreviousPage()}
                            className="p-2 rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="px-3 py-1 text-sm text-gray-600">
                            <span className="font-medium">{pageInfo.pageIndex + 1}</span>
                            <span className="text-gray-400"> / </span>
                            <span>{totalPages || 1}</span>
                        </span>
                        <button
                            onClick={() => table.nextPage()}
                            disabled={!table.getCanNextPage()}
                            className="p-2 rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Table Body */}
            <div className="flex-1 overflow-auto">
                <table className="w-full text-sm border-collapse" style={{ minWidth: table.getTotalSize() }}>
                    <thead className="sticky top-0 z-10">
                        <tr className="bg-gray-50 border-b border-gray-200">
                            {table.getHeaderGroups()[0]?.headers.map(header => {
                                const stats = columnStats[header.id];
                                return (
                                    <th
                                        key={header.id}
                                        style={{ width: header.getSize() }}
                                        className="relative text-left group"
                                    >
                                        <div className="px-4 py-3">
                                            <div
                                                className={`flex items-center gap-2 ${header.column.getCanSort() ? 'cursor-pointer select-none hover:text-indigo-600' : ''} transition-colors`}
                                                onClick={header.column.getToggleSortingHandler()}
                                            >
                                                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 group-hover:text-gray-700">
                                                    {flexRender(header.column.columnDef.header, header.getContext())}
                                                </span>
                                                {header.column.getIsSorted() === 'asc' && <SortAsc className="w-3.5 h-3.5 text-indigo-500" />}
                                                {header.column.getIsSorted() === 'desc' && <SortDesc className="w-3.5 h-3.5 text-indigo-500" />}
                                            </div>
                                            {stats && (
                                                <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-400">
                                                    <span>{stats.unique} unique</span>
                                                    {stats.empty > 0 && <span className="text-amber-500">{stats.empty} empty</span>}
                                                </div>
                                            )}
                                        </div>
                                        {header.column.getCanResize() && (
                                            <div
                                                onMouseDown={header.getResizeHandler()}
                                                onTouchStart={header.getResizeHandler()}
                                                className={`absolute right-0 top-0 h-full w-1 cursor-col-resize opacity-0 group-hover:opacity-100 hover:bg-indigo-400 transition-all ${header.column.getIsResizing() ? 'bg-indigo-500 opacity-100' : ''}`}
                                            />
                                        )}
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                        {table.getRowModel().rows.map((row, i) => (
                            <tr key={row.id} className="hover:bg-indigo-50/30 transition-colors">
                                {row.getVisibleCells().map(cell => {
                                    const value = String(cell.getValue() ?? '');
                                    const cellId = `${row.id}-${cell.id}`;
                                    return (
                                        <td
                                            key={cell.id}
                                            className="px-4 py-3 text-gray-700 group relative"
                                            style={{ maxWidth: cell.column.getSize() }}
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className="truncate" title={value}>
                                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                </span>
                                                <button
                                                    onClick={() => copyToClipboard(value, cellId)}
                                                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-indigo-600 transition-all"
                                                    title="Copy"
                                                >
                                                    {copiedCell === cellId ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                                                </button>
                                            </div>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                        {table.getRowModel().rows.length === 0 && (
                            <tr>
                                <td colSpan={columns.length} className="py-20 text-center">
                                    <div className="flex flex-col items-center gap-3 text-gray-400">
                                        <Search className="w-12 h-12 opacity-30" />
                                        <p className="text-lg font-medium text-gray-500">No matching results</p>
                                        <p className="text-sm">Try adjusting your search or filters</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ============================================================================
// MAIN DATALENS VIEW - WHITE THEME
// ============================================================================

export default function DataLensView() {
    const { isReady, isProcessing, error, schemas, queryResult, loadFile, runSql, runPython, deleteTable, clearQueryResult, getRawJson } = useDataLens();
    const [activeTab, setActiveTab] = useState<"data" | "json" | "sql" | "python" | "charts">("data");
    const [sqlQuery, setSqlQuery] = useState("SELECT * FROM table_name LIMIT 100;");
    const [pythonCode, setPythonCode] = useState(`# Available: pd (pandas), np (numpy)
# All loaded tables are available as variables
# Assign your output to 'result'

result = pd.DataFrame({'a': [1, 2, 3], 'b': [4, 5, 6]})`);
    const [activeTable, setActiveTable] = useState<string | null>(null);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [rawJsonData, setRawJsonData] = useState<any>(null);
    const [jsonLoading, setJsonLoading] = useState(false);
    const activeSchema = schemas.find(s => s.table_name === activeTable);

    // Load raw JSON when switching to JSON view and we have an active table
    useEffect(() => {
        if (activeTab === 'json' && activeTable && !rawJsonData) {
            setJsonLoading(true);
            getRawJson(activeTable)
                .then(res => {
                    if (res.success) {
                        setRawJsonData(res.data);
                    }
                })
                .finally(() => setJsonLoading(false));
        }
    }, [activeTab, activeTable, rawJsonData, getRawJson]);

    // Clear JSON data when table changes
    useEffect(() => {
        setRawJsonData(null);
    }, [activeTable]);

    // Transform data for table
    const currentData = queryResult?.data || [];
    const currentColumns = queryResult?.columns || [];
    const tableData = useMemo(() => {
        if (!currentData.length || !currentColumns.length) return [];
        if (!Array.isArray(currentData[0])) return currentData;
        return currentData.map((row: any[]) => {
            const rowObj: Record<string, any> = {};
            currentColumns.forEach((col, idx) => { rowObj[col] = row[idx]; });
            return rowObj;
        });
    }, [currentData, currentColumns]);

    const handleFileUpload = useCallback(async (files: File[]) => {
        if (files.length > 0) {
            try {
                const res = await loadFile(files[0]);
                if (res?.table_name) {
                    setActiveTable(res.table_name);
                    const sql = `SELECT * FROM ${res.table_name} LIMIT 100`;
                    setSqlQuery(sql);
                    await runSql(sql);
                    setActiveTab('data');
                }
            } catch (e) { console.error(e); }
        }
    }, [loadFile, runSql]);

    const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            handleFileUpload(Array.from(files));
        }
        // Reset input so the same file can be selected again
        e.target.value = '';
    }, [handleFileUpload]);

    const handleRunSql = useCallback(async () => {
        await runSql(sqlQuery);
        setActiveTab('data');
    }, [runSql, sqlQuery]);

    const handleRunPython = useCallback(async () => {
        await runPython(pythonCode);
        setActiveTab('data');
    }, [runPython, pythonCode]);

    const handleExport = useCallback((format: 'csv' | 'json') => {
        if (!currentData.length) return;
        let content: string;
        let mimeType: string;
        let extension: string;

        if (format === 'json') {
            content = JSON.stringify(tableData, null, 2);
            mimeType = 'application/json';
            extension = 'json';
        } else {
            content = [
                currentColumns.join(","),
                ...currentData.map(row =>
                    Array.isArray(row)
                        ? row.map(c => JSON.stringify(c)).join(",")
                        : currentColumns.map(col => JSON.stringify(row[col])).join(",")
                )
            ].join("\n");
            mimeType = 'text/csv;charset=utf-8;';
            extension = 'csv';
        }

        const blob = new Blob([content], { type: mimeType });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `${activeTable || 'export'}.${extension}`;
        link.click();
    }, [currentData, currentColumns, tableData, activeTable]);

    const handleApplyFilters = useCallback(async (conditions: FilterCondition[]) => {
        if (!activeTable) return;
        let query = `SELECT * FROM ${activeTable}`;

        if (conditions.length > 0) {
            const clauses: string[] = [];
            conditions.forEach((c, i) => {
                const val = c.value.replace(/'/g, "''");
                let clause = '';

                switch (c.operator) {
                    // String operators
                    case 'contains': clause = `"${c.column}" LIKE '%${val}%'`; break;
                    case 'not_contains': clause = `"${c.column}" NOT LIKE '%${val}%'`; break;
                    case 'equals': clause = `"${c.column}" = '${val}'`; break;
                    case 'not_equals': clause = `"${c.column}" != '${val}'`; break;
                    case 'startswith': clause = `"${c.column}" LIKE '${val}%'`; break;
                    case 'endswith': clause = `"${c.column}" LIKE '%${val}'`; break;
                    case 'is_empty': clause = `("${c.column}" IS NULL OR "${c.column}" = '')`; break;
                    case 'is_not_empty': clause = `("${c.column}" IS NOT NULL AND "${c.column}" != '')`; break;
                    case 'regex': clause = `"${c.column}" REGEXP '${val}'`; break;
                    case 'in_list':
                        const items = val.split(',').map(v => `'${v.trim()}'`).join(', ');
                        clause = `"${c.column}" IN (${items})`; break;
                    // Number operators
                    case 'eq': clause = `"${c.column}" = ${val}`; break;
                    case 'neq': clause = `"${c.column}" != ${val}`; break;
                    case 'gt': clause = `"${c.column}" > ${val}`; break;
                    case 'lt': clause = `"${c.column}" < ${val}`; break;
                    case 'gte': clause = `"${c.column}" >= ${val}`; break;
                    case 'lte': clause = `"${c.column}" <= ${val}`; break;
                    case 'between': clause = `"${c.column}" BETWEEN ${val} AND ${c.value2 || val}`; break;
                    case 'is_null': clause = `"${c.column}" IS NULL`; break;
                    case 'is_not_null': clause = `"${c.column}" IS NOT NULL`; break;
                    // Boolean operators
                    case 'is_true': clause = `"${c.column}" = 1`; break;
                    case 'is_false': clause = `"${c.column}" = 0`; break;
                    // Date operators
                    case 'date_eq': clause = `DATE("${c.column}") = '${val}'`; break;
                    case 'date_before': clause = `DATE("${c.column}") < '${val}'`; break;
                    case 'date_after': clause = `DATE("${c.column}") > '${val}'`; break;
                    case 'date_between': clause = `DATE("${c.column}") BETWEEN '${val}' AND '${c.value2 || val}'`; break;
                    default: clause = `"${c.column}" = '${val}'`;
                }

                if (i === 0) {
                    clauses.push(clause);
                } else {
                    clauses.push(`${c.logic || 'AND'} ${clause}`);
                }
            });
            query += ` WHERE ${clauses.join(' ')}`;
        }
        query += ` LIMIT 1000`;

        setSqlQuery(query);
        await runSql(query);
    }, [activeTable, runSql]);

    const selectTable = useCallback(async (tableName: string) => {
        setActiveTable(tableName);
        const sql = `SELECT * FROM ${tableName} LIMIT 100`;
        setSqlQuery(sql);
        await runSql(sql);
        setActiveTab('data');
    }, [runSql]);

    const handleDeleteTable = useCallback(async (tableName: string, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent selecting the table when clicking delete

        if (!confirm(`Are you sure you want to delete "${tableName}"? This cannot be undone.`)) {
            return;
        }

        try {
            await deleteTable(tableName);
            // If we deleted the active table, clear the view
            if (activeTable === tableName) {
                setActiveTable(null);
                clearQueryResult(); // Clear the table data
                setSqlQuery('SELECT * FROM table_name LIMIT 100;');
            }
        } catch (err) {
            console.error('Failed to delete table:', err);
        }
    }, [deleteTable, activeTable, clearQueryResult]);

    // Loading State
    if (!isReady) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
                <div className="text-center space-y-6">
                    <div className="relative">
                        <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto shadow-xl shadow-indigo-500/30">
                            <Image className="w-full h-full object-contain" src="/assets/thumbnails/data-lens.png" alt="DataLens" width={40} height={40} />
                        </div>
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Initializing DataLens</h2>
                        <p className="text-gray-500">Loading Python runtime & dependencies...</p>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-indigo-600">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm font-medium">This may take a moment</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 text-gray-900">
            <div className="flex h-screen">
                {/* SIDEBAR */}
                <aside className={`flex flex-col border-r border-gray-200 bg-white/80 backdrop-blur-sm transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-72'}`}>
                    {/* Logo */}
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                        {!sidebarCollapsed && (
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-600 to-indigo-800 flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-1 ring-white/20 relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <ScanSearch className="w-5 h-5 text-white relative z-10" />
                                </div>
                                <div>
                                    <h1 className="font-bold text-lg text-gray-900">DataLens</h1>
                                    <p className="text-[10px] text-gray-400 -mt-0.5">In-Browser Analytics</p>
                                </div>
                            </div>
                        )}
                        <button
                            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                            className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                        >
                            {sidebarCollapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
                        </button>
                    </div>

                    {/* Tables */}
                    <div className="flex-1 overflow-auto p-4">
                        {!sidebarCollapsed && (
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Tables</span>
                                <span className="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full font-medium">{schemas.length}</span>
                            </div>
                        )}
                        {schemas.length === 0 ? (
                            !sidebarCollapsed && (
                                <div className="text-center py-8 text-gray-400">
                                    <Database className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                    <p className="text-sm font-medium text-gray-500">No tables yet</p>
                                    <p className="text-xs mt-1">Upload a file to get started</p>
                                </div>
                            )
                        ) : (
                            <div className="space-y-1.5">
                                {schemas.map(s => (
                                    <div
                                        key={s.table_name}
                                        onClick={() => selectTable(s.table_name)}
                                        className={`group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all cursor-pointer ${activeTable === s.table_name
                                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-sm'
                                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                            }`}
                                    >
                                        <FileSpreadsheet className={`w-4 h-4 shrink-0 ${activeTable === s.table_name ? 'text-indigo-500' : 'text-gray-400'}`} />
                                        {!sidebarCollapsed && (
                                            <>
                                                <span className="truncate flex-1 text-left font-medium">{s.table_name}</span>
                                                <span className="text-[10px] text-gray-400 font-mono bg-gray-100 px-1.5 py-0.5 rounded group-hover:hidden">{s.rows}</span>
                                                <button
                                                    onClick={(e) => handleDeleteTable(s.table_name, e)}
                                                    className="hidden group-hover:flex items-center justify-center p-1 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                                    title="Delete table"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Help */}
                    {!sidebarCollapsed && (
                        <div className="p-4 border-t border-gray-100">
                            <div className="p-3 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
                                <div className="flex items-start gap-2">
                                    <Info className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
                                    <div className="text-xs text-gray-600">
                                        <p className="font-medium text-gray-700 mb-1">Pro Tip</p>
                                        <p>All processing happens locally in your browser. Your data never leaves your device.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </aside>

                {/* MAIN CONTENT */}
                <main className="flex-1 flex flex-col overflow-hidden">
                    {/* Top Bar */}
                    <header className="px-6 py-4 border-b border-gray-200 bg-white/80 backdrop-blur-sm flex items-center justify-between">
                        <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl">
                            {[
                                { id: 'data', icon: LayoutGrid, label: 'Table' },
                                { id: 'json', icon: Braces, label: 'JSON' },
                                { id: 'sql', icon: Code2, label: 'SQL Query' },
                                { id: 'python', icon: Terminal, label: 'Python' },
                                { id: 'charts', icon: BarChart3, label: 'Charts' },
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id
                                        ? 'bg-white text-indigo-600 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
                                        }`}
                                >
                                    <tab.icon className="w-4 h-4" />
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        <div className="flex items-center gap-3">
                            {/* Hidden file input */}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".csv,.json,.xlsx"
                                onChange={handleFileInputChange}
                                className="hidden"
                            />

                            {/* Import Button */}
                            <Button
                                onClick={() => fileInputRef.current?.click()}
                                variant="outline"
                                size="sm"
                                className="gap-2 border-indigo-200 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-300"
                            >
                                <Upload className="w-4 h-4" /> Import File
                            </Button>

                            {isProcessing && (
                                <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-600 text-sm font-medium animate-pulse">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Processing...
                                </div>
                            )}
                            {tableData.length > 0 && (
                                <div className="flex items-center gap-2">
                                    <Button onClick={() => handleExport('csv')} variant="outline" size="sm" className="gap-2 border-gray-200 text-gray-600 hover:bg-gray-50">
                                        <FileText className="w-4 h-4" /> CSV
                                    </Button>
                                    <Button onClick={() => handleExport('json')} variant="outline" size="sm" className="gap-2 border-gray-200 text-gray-600 hover:bg-gray-50">
                                        <FileJson className="w-4 h-4" /> JSON
                                    </Button>
                                </div>
                            )}
                        </div>
                    </header>

                    {/* Error Banner */}
                    {error && (
                        <div className="mx-6 mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-3">
                            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                            <div>
                                <strong>Error:</strong> {error}
                            </div>
                            <button className="ml-auto p-1 text-red-400 hover:text-red-600">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 overflow-hidden">
                        {/* DATA TAB */}
                        {activeTab === 'data' && (
                            <div className="h-full flex flex-col bg-white">
                                {tableData.length > 0 ? (
                                    <>
                                        <FilterBuilder schema={activeSchema} onApply={handleApplyFilters} />
                                        <div className="flex-1 overflow-hidden">
                                            <DataTable data={tableData} columns={currentColumns} />
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-indigo-50/30">
                                        <div className="w-32 h-32 rounded-3xl bg-white border border-gray-200 shadow-xl flex items-center justify-center mb-8">
                                            <TableIcon className="w-16 h-16 text-gray-300" />
                                        </div>
                                        <h3 className="text-2xl font-bold text-gray-900 mb-2">Ready to Explore Data</h3>
                                        <p className="text-gray-500 max-w-md text-center mb-8">
                                            Upload a file from the sidebar, or write a query to start analyzing your data.
                                        </p>
                                        <div className="flex gap-4">
                                            <Button onClick={() => setActiveTab('sql')} variant="outline" size="lg" className="gap-2 border-gray-300 text-gray-700 hover:bg-white">
                                                <Code2 className="w-5 h-5" /> Write SQL Query
                                            </Button>
                                            <Button onClick={() => setActiveTab('python')} className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
                                                <Terminal className="w-5 h-5" /> Run Python Code
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* JSON TAB */}
                        {activeTab === 'json' && (
                            <div className="h-full flex flex-col bg-white">
                                {jsonLoading ? (
                                    <div className="flex-1 flex items-center justify-center">
                                        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                                        <span className="ml-3 text-gray-500">Loading JSON data...</span>
                                    </div>
                                ) : rawJsonData ? (
                                    <JsonTreeViewer data={rawJsonData} />
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-purple-50/30">
                                        <div className="w-32 h-32 rounded-3xl bg-white border border-gray-200 shadow-xl flex items-center justify-center mb-8">
                                            <Braces className="w-16 h-16 text-gray-300" />
                                        </div>
                                        <h3 className="text-2xl font-bold text-gray-900 mb-2">JSON Explorer</h3>
                                        <p className="text-gray-500 max-w-md text-center mb-8">
                                            {activeTable
                                                ? "This table doesn't have raw JSON data. Import a JSON file to use this view."
                                                : "Select a JSON table from the sidebar to explore its structure."
                                            }
                                        </p>
                                        <Button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="gap-2 bg-purple-600 hover:bg-purple-700 text-white"
                                        >
                                            <Upload className="w-5 h-5" /> Import JSON File
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* SQL TAB */}
                        {activeTab === 'sql' && (
                            <div className="h-full flex flex-col p-6 gap-6 bg-gray-50/50">
                                <div className="flex-1 min-h-0 flex flex-col bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                                    <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50/50">
                                        <span className="text-sm font-semibold text-gray-700">SQL Editor</span>
                                        <Button onClick={handleRunSql} disabled={isProcessing} size="sm" className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
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
                        )}

                        {/* PYTHON TAB */}
                        {activeTab === 'python' && (
                            <div className="h-full flex flex-col p-6 gap-6 bg-gray-50/50">
                                <div className="flex-1 min-h-0 flex flex-col bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                                    <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50/50">
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm font-semibold text-gray-700">Python Editor</span>
                                            <span className="px-2 py-0.5 bg-yellow-50 border border-yellow-200 rounded-md text-[10px] text-yellow-700 font-medium">Pyodide WASM</span>
                                        </div>
                                        <Button onClick={handleRunPython} disabled={isProcessing} size="sm" className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
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
                        )}

                        {/* CHARTS TAB */}
                        {activeTab === 'charts' && (
                            <div className="h-full">
                                <ChartBuilder data={tableData} columns={currentColumns} />
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}
