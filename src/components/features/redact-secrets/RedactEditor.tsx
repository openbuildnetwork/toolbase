import React, { useRef, useState } from "react";
import { FileText, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Textarea";
import { Tabs } from "@/components/ui/Tabs";
import { ContentType } from "@/types/redact";

interface RedactEditorProps {
    content: string;
    setContent: (val: string) => void;
    contentType: ContentType;
    setContentType: (type: ContentType) => void;
    fileName: string | null;
    onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const RedactEditor: React.FC<RedactEditorProps> = ({
    content,
    setContent,
    contentType,
    setContentType,
    fileName,
    onFileUpload
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading] = useState(false); // In hook this was managed slightly differently, but for UI feedback we might need it. 
    // The hook in previous step didn't expose isUploading state for the file read process specifically, just global isLoading.
    // I'll stick to simple UI for now or add local state if needed.
    // Actually the reader is fast for text files usually.

    return (
        <Card className="overflow-hidden border-none shadow-xl bg-white/70 backdrop-blur-2xl ring-1 ring-black/5">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white/50">
                <Tabs
                    value={contentType}
                    onChange={(id) => setContentType(id as ContentType)}
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
                        { id: "text", icon: <FileText className="w-3.5 h-3.5" />, label: "Text" },
                        { id: "file", icon: <Upload className="w-3.5 h-3.5" />, label: "File" },
                    ]}
                />
                <div className="text-[10px] uppercase tracking-widest font-bold text-gray-400">
                    {contentType === "text" ? "Input Content" : "Upload Document"}
                </div>
            </div>
            <div className="p-0">
                {contentType === "text" ? (
                    <Textarea
                        placeholder="Paste your code, logs, or text containing secrets here..."
                        className="min-h-[400px] border-none focus-visible:ring-0 text-gray-800 placeholder:text-gray-400 font-mono resize-none leading-relaxed p-6 bg-transparent"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                    />
                ) : (
                    <div className="min-h-[400px] flex flex-col items-center justify-center p-12 text-center bg-gray-50/50">
                        <div className="w-20 h-20 rounded-3xl bg-white shadow-sm flex items-center justify-center text-gray-300 mb-6 group-hover:scale-110 transition-transform">
                            <Upload className="w-10 h-10" />
                        </div>
                        <div className="space-y-4 max-w-sm">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">
                                    {fileName ? fileName : "Upload your file"}
                                </h3>
                                <p className="text-sm text-gray-500 mt-1">
                                    Support for .txt, .log, .json, .csv and other text files
                                </p>
                            </div>
                            <div className="flex flex-col gap-2">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    onChange={(e) => {
                                        onFileUpload(e);
                                        if (fileInputRef.current) fileInputRef.current.value = "";
                                    }}
                                    accept=".txt,.log,.json,.csv,.py,.js,.ts,.tsx,.html,.css,.md"
                                />
                                <Button
                                    variant="outline"
                                    className="bg-white border-gray-200 h-12 rounded-xl group"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <Upload className="w-4 h-4 mr-2 group-hover:translate-y-[-2px] transition-transform" />
                                    Select File
                                </Button>
                                {content && (
                                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
                                        File loaded - Ready
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Card>
    );
};
