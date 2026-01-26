
import React, { useState, useEffect } from 'react';
import { TableSchema } from '@/hooks/useDataLens';
import { Plus, Trash2, Play } from 'lucide-react';
import { Button } from '@/components/ui/Button'; // Assuming we have this
import { Select } from '@/components/ui/Select'; // Assuming we have this
import { Input } from '@/components/ui/Input'; // Assuming we have this

interface VisualQueryBuilderProps {
    schemas: TableSchema[];
    onRunQuery: (sql: string) => void;
}

interface FilterRule {
    id: string;
    column: string;
    operator: string;
    value: string;
}

export const VisualQueryBuilder: React.FC<VisualQueryBuilderProps> = ({ schemas, onRunQuery }) => {
    const [selectedTable, setSelectedTable] = useState<string>(schemas[0]?.table_name || '');
    const [rules, setRules] = useState<FilterRule[]>([]);
    const [limit, setLimit] = useState<string>('100');

    useEffect(() => {
        if (schemas.length > 0 && !selectedTable) {
            setSelectedTable(schemas[0].table_name);
        }
    }, [schemas, selectedTable]);

    const activeSchema = schemas.find(s => s.table_name === selectedTable);
    const columns = activeSchema?.columns || [];

    const addRule = () => {
        setRules([...rules, { id: Math.random().toString(36).substr(2, 9), column: columns[0]?.name || '', operator: '=', value: '' }]);
    };

    const removeRule = (id: string) => {
        setRules(rules.filter(r => r.id !== id));
    };

    const updateRule = (id: string, field: keyof FilterRule, value: string) => {
        setRules(rules.map(r => r.id === id ? { ...r, [field]: value } : r));
    };

    const generateSql = () => {
        if (!selectedTable) return '';
        let query = `SELECT * FROM ${selectedTable}`;

        if (rules.length > 0) {
            const conditions = rules.map(r => {
                const val = isNaN(Number(r.value)) ? `'${r.value}'` : r.value; // Simple heuristic
                return `${r.column} ${r.operator} ${val}`;
            });
            query += ` WHERE ${conditions.join(' AND ')}`;
        }

        query += ` LIMIT ${limit}`;
        return query;
    };

    const handleRun = () => {
        const sql = generateSql();
        onRunQuery(sql);
    };

    return (
        <div className="p-4 bg-white rounded-lg border border-gray-200 space-y-4">
            <div className="flex items-center gap-4">
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-500">Table</label>
                    <select
                        className="border border-gray-300 rounded px-2 py-1 text-sm bg-white"
                        value={selectedTable}
                        onChange={(e) => setSelectedTable(e.target.value)}
                    >
                        {schemas.map(s => <option key={s.table_name} value={s.table_name}>{s.table_name}</option>)}
                    </select>
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-500">Limit</label>
                    <input
                        type="number"
                        className="border border-gray-300 rounded px-2 py-1 text-sm w-20"
                        value={limit}
                        onChange={(e) => setLimit(e.target.value)}
                    />
                </div>
            </div>

            <div className="space-y-2">
                <div className="text-xs font-medium text-gray-500">Filters (AND)</div>
                {rules.map(rule => (
                    <div key={rule.id} className="flex items-center gap-2">
                        <select
                            className="border border-gray-300 rounded px-2 py-1 text-sm bg-white flex-1"
                            value={rule.column}
                            onChange={(e) => updateRule(rule.id, 'column', e.target.value)}
                        >
                            {columns.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                        </select>
                        <select
                            className="border border-gray-300 rounded px-2 py-1 text-sm bg-white w-24"
                            value={rule.operator}
                            onChange={(e) => updateRule(rule.id, 'operator', e.target.value)}
                        >
                            <option value="=">=</option>
                            <option value=">">&gt;</option>
                            <option value="<">&lt;</option>
                            <option value=">=">&gt;=</option>
                            <option value="<=">&lt;=</option>
                            <option value="LIKE">Contains</option>
                            <option value="!=">!=</option>
                        </select>
                        <input
                            type="text"
                            className="border border-gray-300 rounded px-2 py-1 text-sm flex-1"
                            placeholder="Value"
                            value={rule.value}
                            onChange={(e) => updateRule(rule.id, 'value', e.target.value)}
                        />
                        <button onClick={() => removeRule(rule.id)} className="text-gray-400 hover:text-red-500">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                ))}
                <button onClick={addRule} className="text-sm text-indigo-600 flex items-center gap-1 hover:text-indigo-700">
                    <Plus className="w-3 h-3" /> Add Filter
                </button>
            </div>

            <div className="pt-2 border-t border-gray-100 flex justify-end">
                <button
                    onClick={handleRun}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm font-medium transition-colors"
                >
                    <Play className="w-4 h-4" /> Run Query
                </button>
            </div>

            <div className="text-xs text-gray-400 bg-gray-50 p-2 rounded font-mono">
                Preview: {generateSql()}
            </div>
        </div>
    );
};
