
import React, { useMemo } from 'react';
import {
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
    ColumnDef,
    flexRender,
    SortingState,
} from '@tanstack/react-table';

interface DataTableProps {
    data: any[];
    columns: string[]; // List of column names
}

export const DataTable: React.FC<DataTableProps> = ({ data, columns }) => {
    const [sorting, setSorting] = React.useState<SortingState>([]);

    // Create column definitions
    const tableColumns = useMemo<ColumnDef<any>[]>(
        () => columns.map(col => ({
            accessorKey: col,
            header: col,
            size: 150, // default size
        })),
        [columns]
    );

    const table = useReactTable({
        data,
        columns: tableColumns,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        onSortingChange: setSorting,
        state: {
            sorting,
        },
    });

    const { rows } = table.getRowModel();

    console.log('DataTable: Rendering with', rows.length, 'rows');

    return (
        <div className="h-full w-full flex flex-col bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            {/* Scrollable Table Container */}
            <div className="flex-1 overflow-auto">
                <table className="w-full border-collapse min-w-max">
                    {/* Header */}
                    <thead className="sticky top-0 z-10">
                        {table.getHeaderGroups().map(headerGroup => (
                            <tr key={headerGroup.id} className="bg-gray-50 border-b border-gray-200">
                                {headerGroup.headers.map(header => (
                                    <th
                                        key={header.id}
                                        className="px-4 py-3 text-left font-semibold text-gray-700 text-sm border-r border-gray-200 last:border-r-0 whitespace-nowrap cursor-pointer hover:bg-gray-100 select-none"
                                        style={{ minWidth: header.getSize() }}
                                        onClick={header.column.getToggleSortingHandler()}
                                    >
                                        <div className="flex items-center gap-1">
                                            {flexRender(header.column.columnDef.header, header.getContext())}
                                            <span className="text-xs text-gray-400">
                                                {{
                                                    asc: ' ▲',
                                                    desc: ' ▼',
                                                }[header.column.getIsSorted() as string] ?? null}
                                            </span>
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        ))}
                    </thead>

                    {/* Body */}
                    <tbody>
                        {rows.map((row, index) => (
                            <tr
                                key={row.id}
                                className={`border-b border-gray-100 hover:bg-indigo-50/50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
                            >
                                {row.getVisibleCells().map(cell => (
                                    <td
                                        key={cell.id}
                                        className="px-4 py-2 text-sm text-gray-600 border-r border-gray-100 last:border-r-0 whitespace-nowrap"
                                        style={{ minWidth: cell.column.getSize() }}
                                    >
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Footer */}
            <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 flex justify-between shrink-0">
                <span>{rows.length.toLocaleString()} rows</span>
                <span>Sorted by: {sorting[0]?.id || 'None'}</span>
            </div>
        </div>
    );
};
