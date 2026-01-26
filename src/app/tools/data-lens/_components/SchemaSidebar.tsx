
import React from 'react';
import { TableSchema } from '@/hooks/useEtlWorker';
import { Database, FileSpreadsheet, Table as TableIcon, Hash, Type, Calendar } from 'lucide-react';

interface SchemaSidebarProps {
    schemas: TableSchema[];
}

export const SchemaSidebar: React.FC<SchemaSidebarProps> = ({ schemas }) => {
    return (
        <div className="h-full overflow-y-auto bg-gray-50 border-r border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-6">
                <Database className="w-5 h-5 text-indigo-600" />
                <h2 className="font-semibold text-gray-800">Data Explorer</h2>
            </div>

            {schemas.length === 0 && (
                <div className="text-sm text-gray-500 text-center py-8">
                    No tables loaded.
                    <br />
                    Upload a file to get started.
                </div>
            )}

            <div className="space-y-6">
                {schemas.map((schema) => (
                    <div key={schema.table_name} className="space-y-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 group">
                                <TableIcon className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 transition-colors" />
                                <span className="font-medium text-gray-700 text-sm">{schema.table_name}</span>
                            </div>
                            <span className="text-xs text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded-full">
                                {schema.rows.toLocaleString()}
                            </span>
                        </div>

                        <div className="pl-6 space-y-1">
                            {schema.columns.map((col) => (
                                <div key={col.name} className="flex items-center justify-between text-xs group/col">
                                    <span className="text-gray-600 truncate max-w-[120px]" title={col.name}>{col.name}</span>
                                    <span className="text-gray-400 opacity-0 group-hover/col:opacity-100 transition-opacity">
                                        {getIconForType(col.type)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

function getIconForType(type: string): React.ReactNode {
    // Basic type mapping
    if (type.includes('int') || type.includes('float') || type.includes('number')) return <Hash className="w-3 h-3" />;
    if (type.includes('date') || type.includes('time')) return <Calendar className="w-3 h-3" />;
    return <Type className="w-3 h-3" />;
}
