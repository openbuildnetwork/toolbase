import React from 'react';
import { Play, Square, RotateCcw, Save, Download, ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { useReactFlow } from '@xyflow/react';

interface PipelineToolbarProps {
    onRun: () => void;
    onStop: () => void;
    onReset: () => void;
    onSave: () => void;
    onExport: () => void;
    isRunning: boolean;
    canRun: boolean;
}

export function PipelineToolbar({
    onRun,
    onStop,
    onReset,
    onSave,
    onExport,
    isRunning,
    canRun
}: PipelineToolbarProps) {
    const { zoomIn, zoomOut, fitView } = useReactFlow();

    return (
        <div className="h-14 bg-white border-b border-gray-200 flex items-center px-4 justify-between shadow-sm z-10 relative">
            <div className="flex items-center gap-2">
                {isRunning ? (
                    <button
                        onClick={onStop}
                        className="flex items-center gap-2 px-4 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-md text-sm font-semibold transition-colors border border-red-200 shadow-sm"
                    >
                        <Square className="w-4 h-4 fill-current" />
                        Stop
                    </button>
                ) : (
                    <button
                        onClick={onRun}
                        disabled={!canRun}
                        className="flex items-center gap-2 px-5 py-1.5 bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-md text-sm font-bold transition-all shadow-sm"
                    >
                        <Play className="w-4 h-4 fill-current" />
                        Run Pipeline
                    </button>
                )}

                <div className="w-px h-6 bg-gray-200 mx-2" />

                <button
                    onClick={onReset}
                    className="flex items-center gap-2 px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-md text-sm font-medium transition-colors border border-transparent hover:border-gray-200"
                    title="Reset execution states"
                >
                    <RotateCcw className="w-4 h-4" />
                    Reset
                </button>

                <button
                    onClick={onSave}
                    className="flex items-center gap-2 px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-md text-sm font-medium transition-colors border border-transparent hover:border-gray-200"
                >
                    <Save className="w-4 h-4" />
                    Save
                </button>

                <button
                    onClick={onExport}
                    className="flex items-center gap-2 px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-md text-sm font-medium transition-colors border border-transparent hover:border-gray-200"
                >
                    <Download className="w-4 h-4" />
                    Export
                </button>
            </div>

            <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-lg border border-gray-200">
                <button
                    onClick={() => zoomOut()}
                    className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-white rounded transition-colors shadow-sm cursor-pointer"
                    title="Zoom Out"
                >
                    <ZoomOut className="w-4 h-4" />
                </button>
                <div className="w-px h-4 bg-gray-200 mx-1" />
                <button
                    onClick={() => zoomIn()}
                    className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-white rounded transition-colors shadow-sm cursor-pointer"
                    title="Zoom In"
                >
                    <ZoomIn className="w-4 h-4" />
                </button>
                <div className="w-px h-4 bg-gray-200 mx-1" />
                <button
                    onClick={() => fitView({ duration: 800 })}
                    className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-white rounded transition-colors shadow-sm cursor-pointer"
                    title="Fit to Screen"
                >
                    <Maximize className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
