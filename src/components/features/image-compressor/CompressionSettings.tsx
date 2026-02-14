
import React from "react";
import { Slider } from "@/components/ui/Slider";
import { Switch } from "@/components/ui/Switch";
import { Tabs } from "@/components/ui/Tabs";
import { Card, CardContent } from "@/components/ui/Card";
import { Info, Zap, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CompressionSettingsProps {
    quality: number;
    setQuality: (val: number) => void;
    format: string;
    setFormat: (val: string) => void;
    resizeFactor: number;
    setResizeFactor: (val: number) => void;
    isProcessing: boolean;
}

export function CompressionSettings({
    quality,
    setQuality,
    format,
    setFormat,
    resizeFactor,
    setResizeFactor,
    isProcessing
}: CompressionSettingsProps) {
    
    // Tabs configuration
    const formatTabs = [
        { id: "JPEG", label: "JPEG" },
        { id: "PNG", label: "PNG" },
        { id: "WEBP", label: "WEBP" },
    ];

    const getQualityLabel = (q: number) => {
        if (q >= 90) return "Lossless-like";
        if (q >= 70) return "High Quality";
        if (q >= 50) return "Balanced";
        return "Max Compression";
    };

    return (
        <Card className="border-0 shadow-none bg-transparent">
            <CardContent className="space-y-8 p-0">
                
                {/* Format Selection */}
                <div className="space-y-4 p-3">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        File Format
                        <Info className="w-3.5 h-3.5 text-gray-400" />
                    </label>
                    <div className="p-1 bg-gray-100/50 rounded-full w-fit">
                        <Tabs
                            tabs={formatTabs}
                            value={format}
                            onChange={(id) => setFormat(id)}
                            size="md"
                            radius="full"
                               colors={{
                                container: "bg-gray-100",
                                indicator: "bg-blue-600",
                                activeBackground: "bg-white",
                                label: {
                                    active: "text-blue-600",
                                },
                            }}
                        />
                    </div>
                </div>

                {/* Quality Slider */}
                <div className="space-y-4">
                    <div className="flex justify-between items-end">
                        <label className="text-sm font-semibold text-gray-700">Quality Level</label>
                         <div className="flex flex-col items-end">
                            <span className="text-2xl font-bold text-blue-600">{quality}%</span>
                            <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">{getQualityLabel(quality)}</span>
                        </div>
                    </div>
                    <div className="relative pt-2">
                        <Slider
                            min={1}
                            max={100}
                            value={quality}
                            onChange={(e) => setQuality(Number(e.target.value))}
                            className="accent-blue-600 h-2"
                        />
                        <div className="flex justify-between text-[10px] text-gray-300 mt-2 font-mono">
                            <span>Smaller File</span>
                            <span>Better Looking</span>
                        </div>
                    </div>
                </div>

                 {/* Resize Slider */}
                 <div className="space-y-4">
                    <div className="flex justify-between items-end">
                        <label className="text-sm font-semibold text-gray-700">Image Scale</label>
                        <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded text-gray-600">
                            {Math.round(resizeFactor * 100)}%
                        </span>
                    </div>
                    <Slider
                        min={0.1}
                        max={1.0}
                        step={0.1}
                        value={resizeFactor}
                        onChange={(e) => setResizeFactor(Number(e.target.value))}
                         className="accent-emerald-500"
                    />
                </div>

                {/* Advanced Toggles (Visual only for now, can extend logic later) */}
                <div className="pt-4 pb-2 border-t border-gray-100">
                    <div className="flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                             <div className="p-2 bg-gray-50 rounded-lg group-hover:bg-blue-50 transition-colors">
                                <Settings2 className="w-4 h-4 text-gray-500 group-hover:text-blue-500" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-medium text-gray-700">Strip Metadata</span>
                                <span className="text-xs text-gray-400">Remove GPS & Camera data</span>
                            </div>
                        </div>
                        <Switch defaultChecked />
                    </div>
                </div>

            </CardContent>
        </Card>
    );
}
