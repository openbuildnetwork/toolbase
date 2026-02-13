/**
 * ImportExportPanel - File Import/Export Controls
 * 
 * Features:
 * - Import from Mermaid syntax (text or .mmd file)
 * - Import from XML (draw.io, Visio-style)
 * - Export to Mermaid, JSON, PNG
 */
import React, { useState, useRef, useCallback } from 'react';
import {
    X,
    Upload,
    Download,
    FileCode,
    FileJson,
    Image,
    Loader2,
    CheckCircle2,
    AlertCircle,
    Copy,
    FileText
} from 'lucide-react';

interface ImportExportPanelProps {
    isOpen: boolean;
    onClose: () => void;
    onImportMermaid: (content: string) => Promise<void>;
    onImportXML: (content: string) => Promise<void>;
    onExportJSON: () => string;
    onExportMermaid: () => string;
    onExportPNG: () => Promise<void>;
    isWorkerReady: boolean;
}

type Tab = 'import' | 'export';
type ImportType = 'mermaid' | 'xml';

export function ImportExportPanel({
    isOpen,
    onClose,
    onImportMermaid,
    onImportXML,
    onExportJSON,
    onExportMermaid,
    onExportPNG,
    isWorkerReady,
}: ImportExportPanelProps) {
    const [activeTab, setActiveTab] = useState<Tab>('import');
    const [importType, setImportType] = useState<ImportType>('mermaid');
    const [mermaidText, setMermaidText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Clear status after 3 seconds
    const showStatus = useCallback((type: 'success' | 'error', message: string) => {
        setStatus({ type, message });
        setTimeout(() => setStatus(null), 3000);
    }, []);

    /**
     * Handle Mermaid text import
     */
    const handleMermaidImport = async () => {
        if (!mermaidText.trim()) {
            showStatus('error', 'Please enter Mermaid syntax');
            return;
        }

        setIsLoading(true);
        try {
            await onImportMermaid(mermaidText);
            showStatus('success', 'Mermaid diagram imported successfully!');
            setMermaidText('');
        } catch (error) {
            showStatus('error', `Import failed: ${(error as Error).message}`);
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Handle file upload
     */
    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsLoading(true);
        try {
            const content = await file.text();

            if (importType === 'mermaid' || file.name.endsWith('.mmd') || file.name.endsWith('.md')) {
                await onImportMermaid(content);
                showStatus('success', `Imported ${file.name}`);
            } else if (importType === 'xml' || file.name.endsWith('.xml') || file.name.endsWith('.drawio')) {
                await onImportXML(content);
                showStatus('success', `Imported ${file.name}`);
            } else {
                showStatus('error', 'Unsupported file format');
            }
        } catch (error) {
            showStatus('error', `Import failed: ${(error as Error).message}`);
        } finally {
            setIsLoading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    /**
     * Handle JSON export
     */
    const handleExportJSON = () => {
        try {
            const json = onExportJSON();
            downloadFile(json, 'diagram.opendraw.json', 'application/json');
            showStatus('success', 'Exported as JSON');
        } catch (error) {
            showStatus('error', `Export failed: ${(error as Error).message}`);
        }
    };

    /**
     * Handle Mermaid export
     */
    const handleExportMermaid = () => {
        try {
            const mermaid = onExportMermaid();
            downloadFile(mermaid, 'diagram.mmd', 'text/plain');
            showStatus('success', 'Exported as Mermaid');
        } catch (error) {
            showStatus('error', `Export failed: ${(error as Error).message}`);
        }
    };

    /**
     * Handle PNG export
     */
    const handleExportPNG = async () => {
        setIsLoading(true);
        try {
            await onExportPNG();
            showStatus('success', 'Exported as PNG');
        } catch (error) {
            showStatus('error', `Export failed: ${(error as Error).message}`);
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Copy Mermaid to clipboard
     */
    const handleCopyMermaid = async () => {
        try {
            const mermaid = onExportMermaid();
            await navigator.clipboard.writeText(mermaid);
            showStatus('success', 'Copied to clipboard');
        } catch (error) {
            showStatus('error', 'Failed to copy');
        }
    };

    /**
     * Download a file
     */
    const downloadFile = (content: string, filename: string, type: string) => {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (!isOpen) return null;

    return (
        <div className="absolute right-4 top-4 w-96 bg-white dark:bg-[#1a1a1a] rounded-xl shadow-xl border border-gray-200 dark:border-gray-800 z-50 overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 bg-gray-50 dark:bg-[#0f0f0f] border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                        Import / Export
                    </h3>
                    <p className="text-[10px] text-gray-500">
                        Mermaid, draw.io, JSON formats
                    </p>
                </div>
                <button
                    onClick={onClose}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-md transition-colors"
                >
                    <X className="w-4 h-4 text-gray-500" />
                </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-800">
                <button
                    onClick={() => setActiveTab('import')}
                    className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${activeTab === 'import'
                            ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                            : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                >
                    <Upload className="w-4 h-4 inline-block mr-2" />
                    Import
                </button>
                <button
                    onClick={() => setActiveTab('export')}
                    className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${activeTab === 'export'
                            ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                            : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                >
                    <Download className="w-4 h-4 inline-block mr-2" />
                    Export
                </button>
            </div>

            {/* Content */}
            <div className="p-4">
                {activeTab === 'import' ? (
                    <div className="space-y-4">
                        {/* Import Type Selector */}
                        <div className="flex gap-2">
                            <button
                                onClick={() => setImportType('mermaid')}
                                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${importType === 'mermaid'
                                        ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                                    }`}
                            >
                                <FileCode className="w-4 h-4" />
                                Mermaid
                            </button>
                            <button
                                onClick={() => setImportType('xml')}
                                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${importType === 'xml'
                                        ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                                    }`}
                            >
                                <FileText className="w-4 h-4" />
                                XML/Draw.io
                            </button>
                        </div>

                        {importType === 'mermaid' ? (
                            <>
                                {/* Mermaid Text Input */}
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                        Paste Mermaid Syntax
                                    </label>
                                    <textarea
                                        value={mermaidText}
                                        onChange={(e) => setMermaidText(e.target.value)}
                                        placeholder={`graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Process]
    B -->|No| D[End]
    C --> D`}
                                        className="w-full h-32 px-3 py-2 text-sm font-mono bg-gray-50 dark:bg-[#0f0f0f] border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                    />
                                </div>
                                <button
                                    onClick={handleMermaidImport}
                                    disabled={!isWorkerReady || isLoading || !mermaidText.trim()}
                                    className="w-full px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <FileCode className="w-4 h-4" />
                                    )}
                                    Import Mermaid
                                </button>
                            </>
                        ) : (
                            <div className="text-center py-4">
                                <p className="text-sm text-gray-500 mb-3">
                                    Upload a draw.io or Visio XML file
                                </p>
                            </div>
                        )}

                        {/* File Upload */}
                        <div className="relative">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept={importType === 'mermaid' ? '.mmd,.md,.txt' : '.xml,.drawio'}
                                onChange={handleFileUpload}
                                className="hidden"
                                id="file-upload"
                            />
                            <label
                                htmlFor="file-upload"
                                className="flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors"
                            >
                                <Upload className="w-5 h-5 text-gray-400" />
                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                    Upload {importType === 'mermaid' ? '.mmd' : '.xml / .drawio'} file
                                </span>
                            </label>
                        </div>
                    </div>
                ) : (
                    /* Export Tab */
                    <div className="space-y-3">
                        {/* JSON Export */}
                        <button
                            onClick={handleExportJSON}
                            className="w-full px-4 py-3 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg flex items-center gap-3 transition-colors"
                        >
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                                <FileJson className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="text-left">
                                <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                    OpenDraw JSON
                                </div>
                                <div className="text-[10px] text-gray-500">
                                    Full diagram with positions and styles
                                </div>
                            </div>
                        </button>

                        {/* Mermaid Export */}
                        <div className="flex gap-2">
                            <button
                                onClick={handleExportMermaid}
                                className="flex-1 px-4 py-3 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-lg flex items-center gap-3 transition-colors"
                            >
                                <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
                                    <FileCode className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                </div>
                                <div className="text-left">
                                    <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                        Mermaid
                                    </div>
                                    <div className="text-[10px] text-gray-500">
                                        .mmd file
                                    </div>
                                </div>
                            </button>
                            <button
                                onClick={handleCopyMermaid}
                                className="px-3 py-3 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-lg transition-colors"
                                title="Copy to clipboard"
                            >
                                <Copy className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                            </button>
                        </div>

                        {/* PNG Export */}
                        <button
                            onClick={handleExportPNG}
                            disabled={isLoading}
                            className="w-full px-4 py-3 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg flex items-center gap-3 transition-colors disabled:opacity-50"
                        >
                            <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg">
                                {isLoading ? (
                                    <Loader2 className="w-5 h-5 text-green-600 dark:text-green-400 animate-spin" />
                                ) : (
                                    <Image className="w-5 h-5 text-green-600 dark:text-green-400" />
                                )}
                            </div>
                            <div className="text-left">
                                <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                    PNG Image
                                </div>
                                <div className="text-[10px] text-gray-500">
                                    High-resolution canvas screenshot
                                </div>
                            </div>
                        </button>
                    </div>
                )}
            </div>

            {/* Status Message */}
            {status && (
                <div className={`px-4 py-2 flex items-center gap-2 border-t ${status.type === 'success'
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                        : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                    }`}>
                    {status.type === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                    ) : (
                        <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                    )}
                    <span className={`text-sm ${status.type === 'success'
                            ? 'text-green-700 dark:text-green-300'
                            : 'text-red-700 dark:text-red-300'
                        }`}>
                        {status.message}
                    </span>
                </div>
            )}
        </div>
    );
}
