"use client";

import React, { useState } from "react";
import { X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface HintManagerProps {
    label: string;
    values: string[];
    onChange: (values: string[]) => void;
    placeholder?: string;
    color?: string;
}

export const HintManager: React.FC<HintManagerProps> = ({
    label,
    values,
    onChange,
    placeholder = "Add...",
    color = "blue",
}) => {
    const [inputValue, setInputValue] = useState("");

    const handleAdd = () => {
        if (inputValue.trim() && !values.includes(inputValue.trim())) {
            onChange([...values, inputValue.trim()]);
            setInputValue("");
        }
    };

    const handleRemove = (index: number) => {
        onChange(values.filter((_, i) => i !== index));
    };

    const colorClasses: Record<string, string> = {
        blue: "bg-blue-100 text-blue-700 border-blue-200",
        purple: "bg-purple-100 text-purple-700 border-purple-200",
        emerald: "bg-emerald-100 text-emerald-700 border-emerald-200",
    };

    return (
        <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {label}
            </label>
            <div className="flex flex-wrap gap-2 p-2 bg-white/50 border border-gray-200 rounded-xl min-h-[44px]">
                {values.map((v, i) => (
                    <span
                        key={i}
                        className={cn(
                            "inline-flex items-center gap-1 px-2 py-1 text-xs font-medium border rounded-lg animate-in fade-in zoom-in duration-200",
                            colorClasses[color] || colorClasses.blue
                        )}
                    >
                        {v}
                        <button
                            onClick={() => handleRemove(i)}
                            className="hover:bg-black/5 rounded-full p-0.5"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </span>
                ))}
                <div className="flex-1 min-w-[100px] flex items-center">
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                handleAdd();
                            }
                        }}
                        placeholder={placeholder}
                        className="w-full bg-transparent border-none focus:ring-0 text-sm p-0 ml-1"
                    />
                    {inputValue && (
                        <button
                            onClick={handleAdd}
                            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
