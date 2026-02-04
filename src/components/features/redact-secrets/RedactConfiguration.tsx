import React from "react";
import { Settings2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import { Tabs } from "@/components/ui/Tabs";
import { TagInput } from "@/components/ui/TagInput";
import { MaskingStyle } from "@/types/redact";

interface RedactConfigurationProps {
    maskingStyle: MaskingStyle;
    setMaskingStyle: (style: MaskingStyle) => void;
    keys: string[];
    setKeys: (keys: string[]) => void;
    literalTexts: string[];
    setLiteralTexts: (texts: string[]) => void;
    regexPatterns: string[];
    setRegexPatterns: (patterns: string[]) => void;
}

export const RedactConfiguration: React.FC<RedactConfigurationProps> = ({
    maskingStyle,
    setMaskingStyle,
    keys,
    setKeys,
    literalTexts,
    setLiteralTexts,
    regexPatterns,
    setRegexPatterns,
}) => {
    return (
        <Card className="border-none shadow-lg bg-white/70 backdrop-blur-xl ring-1 ring-black/5">
            <div className="px-6 py-4 border-b border-gray-100 bg-white/30">
                <div className="flex items-center gap-2">
                    <Settings2 className="w-4 h-4 text-gray-500" />
                    <span className="font-bold text-sm text-gray-900 uppercase tracking-tight">Configuration</span>
                </div>
            </div>
            <div className="p-6 space-y-8">
                {/* Masking Style */}
                <div className="space-y-3">
                    <div className="flex-col space-y-2">
                        <div>
                            <Label className="text-gray-700 font-bold text-xs uppercase tracking-wider">Redaction Style</Label>
                        </div>
                        <Tabs
                            value={maskingStyle}
                            onChange={(id) => setMaskingStyle(id as MaskingStyle)}
                            radius="rounded-[100px]"
                            orientation="horizontal"
                            size="sm"
                            colors={{
                                container: "bg-gray-100",
                                indicator: "bg-blue-600",
                                activeBackground: "bg-white",
                                label: {
                                    active: "text-blue-600",
                                },
                            }}
                            tabs={[
                                { id: "partial", label: "Partial" },
                                { id: "full", label: "Full" },
                                { id: "hash", label: "Hash" },
                            ]}
                        />
                        <p className="text-[10px] text-gray-400 font-medium px-1">
                            {maskingStyle === 'partial' && "Shows start/end bits (e.g. pr...12)"}
                            {maskingStyle === 'full' && "Completely obscures secrets"}
                            {maskingStyle === 'hash' && "Replaces with cryptographic hash"}
                        </p>
                    </div>
                </div>

                {/* Hints */}
                <div className="space-y-6 pt-4 border-t border-gray-100">
                    <TagInput
                        label="Force Mask Keys"
                        placeholder="e.g. secret_token"
                        values={keys}
                        onChange={setKeys}
                        color="blue"
                    />
                    <TagInput
                        label="Specific Content"
                        placeholder="e.g. MyPassword123"
                        values={literalTexts}
                        onChange={setLiteralTexts}
                        color="purple"
                    />
                    <TagInput
                        label="Custom Patterns"
                        placeholder="e.g. \b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b"
                        values={regexPatterns}
                        onChange={setRegexPatterns}
                        color="emerald"
                    />
                </div>
            </div>
        </Card>
    );
};
