'use client';

/**
 * StepConfigPanel — renders auto-generated config UI for any TIPTool.
 * Reads the tool's configSchema and renders the appropriate widget per field.
 */

import React from 'react';
import type { TIPConfigField, TIPConfig } from '@/tip/protocol';

interface StepConfigPanelProps {
    fields: TIPConfigField[];
    config: TIPConfig;
    onChange: (key: string, value: string | number | boolean) => void;
    disabled?: boolean;
}

export function StepConfigPanel({ fields, config, onChange, disabled }: StepConfigPanelProps) {
    if (fields.length === 0) {
        return (
            <p className="text-xs text-gray-400 italic py-2">No configuration required.</p>
        );
    }

    return (
        <div className="space-y-3">
            {fields.map((field) => (
                <div key={field.key}>
                    <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-medium text-gray-600">{field.label}</label>
                        {field.unit && (
                            <span className="text-xs text-gray-400">{field.unit}</span>
                        )}
                    </div>

                    {field.description && (
                        <p className="text-xs text-gray-400 mb-1.5">{field.description}</p>
                    )}

                    {field.type === 'number' && (
                        <div className="space-y-1">
                            <input
                                type="range"
                                min={field.min ?? 0}
                                max={field.max ?? 100}
                                step={field.step ?? 1}
                                value={Number(config[field.key] ?? field.default)}
                                disabled={disabled}
                                onChange={(e) => onChange(field.key, Number(e.target.value))}
                                className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-violet-500 disabled:opacity-50"
                            />
                            <div className="flex justify-between text-xs text-gray-400">
                                <span>{field.min ?? 0}</span>
                                <span className="font-semibold text-gray-700 text-sm">
                                    {config[field.key] ?? field.default}
                                </span>
                                <span>{field.max ?? 100}</span>
                            </div>
                        </div>
                    )}

                    {field.type === 'boolean' && (
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={Boolean(config[field.key] ?? field.default)}
                                disabled={disabled}
                                onChange={(e) => onChange(field.key, e.target.checked)}
                                className="w-4 h-4 accent-violet-500 disabled:opacity-50"
                            />
                            <span className="text-xs text-gray-600">Enabled</span>
                        </label>
                    )}

                    {field.type === 'string' && (
                        <input
                            type="text"
                            value={String(config[field.key] ?? field.default)}
                            disabled={disabled}
                            placeholder={field.description}
                            onChange={(e) => onChange(field.key, e.target.value)}
                            className="w-full text-xs px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400 disabled:opacity-50"
                        />
                    )}

                    {field.type === 'password' && (
                        <input
                            type="password"
                            value={String(config[field.key] ?? field.default)}
                            disabled={disabled}
                            placeholder="Enter password…"
                            onChange={(e) => onChange(field.key, e.target.value)}
                            className="w-full text-xs px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400 disabled:opacity-50"
                        />
                    )}

                    {field.type === 'select' && field.options && (
                        <select
                            value={String(config[field.key] ?? field.default)}
                            disabled={disabled}
                            onChange={(e) => onChange(field.key, e.target.value)}
                            className="w-full text-xs px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400 disabled:opacity-50"
                        >
                            {field.options.map((opt) => (
                                <option key={String(opt.value)} value={String(opt.value)}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    )}
                </div>
            ))}
        </div>
    );
}
