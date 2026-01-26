
import React from 'react';
import { Sparkles, Trash, MousePointerClick, Type } from 'lucide-react';

interface QuickActionsProps {
    onRunPython: (code: string) => void;
    table_name: string; // The active table name, usually filename in dfs key
}

export const QuickActions: React.FC<QuickActionsProps> = ({ onRunPython, table_name }) => {

    // Helper to wrap code validation
    const runAction = (actionCode: string) => {
        // We assume table_name is the key in dfs
        // But table_name in schema might differ from filename if sanitized.
        // In main.py: dfs[filename] = df. And table_name is derived. 
        // We need the filename key. 
        // Actually, we can look up by table_name if we stored it? 
        // Or we just iterate dfs. 
        // Let's use a snippet that finds the df by table name if possible, or just uses the first one.

        const wrapper = `
# Quick Action Wrapper
target_df = None
for k, v in dfs.items():
    # Simple matching strategy or just use first one
    if "${table_name}" in k or "${table_name}" == k.split('.')[0]:
        target_df = v
        target_key = k
        break
        
if target_df is None and len(dfs) > 0:
    target_key = list(dfs.keys())[0]
    target_df = dfs[target_key]

if target_df is not None:
    df = target_df
    ${actionCode}
    # Update the global map
    dfs[target_key] = df
    # Sync with SQLite
    try:
        df.to_sql("${table_name}", con, if_exists="replace", index=False)
    except:
        pass
    result = df.head(100)
else:
    result = "No data loaded"
`;
        onRunPython(wrapper);
    };

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <button
                onClick={() => runAction('df = df.drop_duplicates()')}
                className="flex items-center gap-2 p-2 bg-white border border-gray-200 rounded-lg text-xs hover:border-indigo-300 hover:text-indigo-600 transition-all text-left group"
            >
                <div className="p-1.5 bg-gray-50 group-hover:bg-indigo-50 rounded-md">
                    <Trash className="w-3.5 h-3.5" />
                </div>
                <span>Remove Duplicates</span>
            </button>

            <button
                onClick={() => runAction('df = df.dropna()')}
                className="flex items-center gap-2 p-2 bg-white border border-gray-200 rounded-lg text-xs hover:border-indigo-300 hover:text-indigo-600 transition-all text-left group"
            >
                <div className="p-1.5 bg-gray-50 group-hover:bg-indigo-50 rounded-md">
                    <Sparkles className="w-3.5 h-3.5" />
                </div>
                <span>Drop Null Rows</span>
            </button>

            <button
                onClick={() => runAction('df = df.fillna(0)')}
                className="flex items-center gap-2 p-2 bg-white border border-gray-200 rounded-lg text-xs hover:border-indigo-300 hover:text-indigo-600 transition-all text-left group"
            >
                <div className="p-1.5 bg-gray-50 group-hover:bg-indigo-50 rounded-md">
                    <MousePointerClick className="w-3.5 h-3.5" />
                </div>
                <span>Fill Nulls (0)</span>
            </button>

            <button
                onClick={() => runAction('for c in df.select_dtypes(include=["object"]).columns: df[c] = df[c].str.strip()')}
                className="flex items-center gap-2 p-2 bg-white border border-gray-200 rounded-lg text-xs hover:border-indigo-300 hover:text-indigo-600 transition-all text-left group"
            >
                <div className="p-1.5 bg-gray-50 group-hover:bg-indigo-50 rounded-md">
                    <Type className="w-3.5 h-3.5" />
                </div>
                <span>Trim Strings</span>
            </button>
        </div>
    );
};
