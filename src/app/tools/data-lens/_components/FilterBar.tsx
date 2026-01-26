
import React from 'react';
import { Download, RotateCcw } from 'lucide-react';

interface FilterBarProps {
    onExport: (format: 'csv' | 'json') => void;
    onReset: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
    onExport,
    onReset,
}) => {
    return (
        <div className="flex items-center gap-2">
            <button
                onClick={onReset}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Reset View"
            >
                <RotateCcw className="w-4 h-4" />
            </button>

            <div className="h-6 w-px bg-gray-200 mx-1" />

            <div className="group relative">
                <button className="flex items-center gap-2 px-3 py-2 text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 bg-white transition-colors shadow-sm">
                    <Download className="w-4 h-4" />
                    <span className="text-sm font-medium">Export</span>
                </button>

                <div className="absolute right-0 mt-2 w-32 bg-white rounded-lg shadow-xl border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 transform translate-y-2 group-hover:translate-y-0">
                    <button
                        onClick={() => onExport('csv')}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 first:rounded-t-lg"
                    >
                        CSV
                    </button>
                    <button
                        onClick={() => onExport('json')}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 last:rounded-b-lg"
                    >
                        JSON
                    </button>
                </div>
            </div>
        </div>
    );
};
