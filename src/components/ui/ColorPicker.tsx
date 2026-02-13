
import * as React from "react"
import { Popover } from "./Popover"
import { cn } from "@/lib/utils"
import { Palette, Check } from "lucide-react"

interface ColorPickerProps {
    value?: string
    onChange: (value: string) => void
    className?: string
}

const PRESET_COLORS = [
    '#ffffff', '#f8fafc', '#f1f5f9', '#e2e8f0', '#cbd5e1', // Slate
    '#000000', '#1e293b', '#334155', '#475569', '#64748b', // Dark Slate
    '#ef4444', '#f87171', '#fca5a5', '#fecaca', '#fee2e2', // Red
    '#f97316', '#fb923c', '#fdba74', '#fed7aa', '#ffedd5', // Orange
    '#f59e0b', '#fbbf24', '#fcd34d', '#fde68a', '#fef3c7', // Amber
    '#eab308', '#facc15', '#fde047', '#fef08a', '#fef9c3', // Yellow
    '#84cc16', '#a3e635', '#bef264', '#d9f99d', '#ecfccb', // Lime
    '#22c55e', '#4ade80', '#86efac', '#bbf7d0', '#dcfce7', // Green
    '#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#d1fae5', // Emerald
    '#06b6d4', '#22d3ee', '#67e8f9', '#a5f3fc', '#cffafe', // Cyan
    '#0ea5e9', '#38bdf8', '#7dd3fc', '#bae6fd', '#e0f2fe', // Sky
    '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe', // Blue
    '#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe', '#e0e7ff', // Indigo
    '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe', // Violet
    '#a855f7', '#c084fc', '#d8b4fe', '#e9d5ff', '#f3e8ff', // Purple
    '#d946ef', '#e879f9', '#f0abfc', '#f5d0fe', '#fae8ff', // Fuchsia
    '#ec4899', '#f472b6', '#f9a8d4', '#fbcfe8', '#fce7f3', // Pink
    '#f43f5e', '#fb7185', '#fda4af', '#fecdd3', '#ffe4e6', // Rose
];

export function ColorPicker({ value = '#000000', onChange, className }: ColorPickerProps) {
    const [inputValue, setInputValue] = React.useState(value);

    React.useEffect(() => {
        setInputValue(value);
    }, [value]);

    const handleConfirm = () => {
        if (/^#[0-9A-Fa-f]{6}$/.test(inputValue)) {
            onChange(inputValue);
        }
    };

    return (
        <Popover
            trigger={
                <div className={cn("flex items-center gap-2 cursor-pointer group", className)}>
                    <div
                        className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm transition-transform group-hover:scale-105"
                        style={{ backgroundColor: value }}
                    />
                    <div className="flex-1 min-w-0">
                        <div className="text-xs font-mono text-gray-500 uppercase truncate">{value}</div>
                    </div>
                </div>
            }
            content={
                <div className="space-y-3">
                    <div className="flex gap-2">
                        <div className="flex-1 relative">
                            <div className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border border-gray-200" style={{ backgroundColor: inputValue }} />
                            <input
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onBlur={handleConfirm}
                                onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
                                className="w-full pl-8 pr-2 py-1.5 text-xs font-mono border border-gray-200 dark:border-gray-700 rounded-md bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-5 gap-1.5 max-h-48 overflow-y-auto p-1">
                        {PRESET_COLORS.map((color) => (
                            <button
                                key={color}
                                className={cn(
                                    "w-6 h-6 rounded-md border border-transparent hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-blue-500 relative",
                                    value === color && "ring-2 ring-blue-500 border-white"
                                )}
                                style={{ backgroundColor: color }}
                                onClick={() => {
                                    onChange(color);
                                    setInputValue(color);
                                }}
                            >
                                {value === color && <Check className="w-3 h-3 text-white absolute inset-0 m-auto drop-shadow-md" />}
                            </button>
                        ))}
                    </div>

                    <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                        <input
                            type="color"
                            value={value}
                            onChange={(e) => {
                                onChange(e.target.value);
                                setInputValue(e.target.value);
                            }}
                            className="w-full h-8 cursor-pointer rounded-md overflow-hidden"
                        />
                    </div>
                </div>
            }
        />
    )
}
