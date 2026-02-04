"use client";

import React from "react";
import { FilterBuilder, FilterCondition } from "./FilterBuilder";
import { DataTable } from "./DataTable";
import { Button } from "@/components/ui/Button";
import { Table as TableIcon, Code2, Terminal } from "lucide-react";
import { TableSchema } from "@/hooks/useDataLens";

interface DataViewProps {
    tableData: any[];
    currentColumns: string[];
    activeSchema?: TableSchema;
    onApplyFilters: (conditions: FilterCondition[]) => void;
    onSwitchToSql: () => void;
    onSwitchToPython: () => void;
}

export function DataView({ tableData, currentColumns, activeSchema, onApplyFilters, onSwitchToSql, onSwitchToPython }: DataViewProps) {
    if (tableData.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-indigo-50/30">
                <div className="w-32 h-32 rounded-3xl bg-white border border-gray-200 shadow-xl flex items-center justify-center mb-8">
                    <TableIcon className="w-16 h-16 text-gray-300" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Ready to Explore Data</h3>
                <p className="text-gray-500 max-w-md text-center mb-8">
                    Upload a file from the sidebar, or write a query to start analyzing your data.
                </p>
                <div className="flex gap-4">
                    <Button onClick={onSwitchToSql} variant="outline" size="lg" className="gap-2 border-gray-300 text-gray-700 hover:bg-white">
                        <Code2 className="w-5 h-5" /> Write SQL Query
                    </Button>
                    <Button onClick={onSwitchToPython} className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
                        <Terminal className="w-5 h-5" /> Run Python Code
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-white">
            <FilterBuilder schema={activeSchema} onApply={onApplyFilters} />
            <div className="flex-1 overflow-hidden">
                <DataTable data={tableData} columns={currentColumns} />
            </div>
        </div>
    );
}
