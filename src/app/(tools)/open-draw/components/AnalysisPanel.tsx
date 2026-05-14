/**
 * AnalysisPanel - Graph Analysis Controls
 * 
 * Features:
 * - Cycle detection with visual highlighting
 * - Shortest path finder between selected nodes
 * - Real-time analysis results display
 */
import React, { useState } from 'react';
import {
    AlertTriangle,
    Route,
    X,
    Loader2,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    CircleDot
} from 'lucide-react';

interface AnalysisResult {
    type: 'cycles' | 'path';
    data: CycleResult | PathResult;
    timestamp: number;
}

interface CycleResult {
    hasCycles: boolean;
    cycles: string[][];
}

interface PathResult {
    sourceId: string;
    targetId: string;
    path: string[] | null;
    length: number | null;
}

interface AnalysisPanelProps {
    isOpen: boolean;
    onClose: () => void;
    selectedNodes: string[];
    onDetectCycles: () => Promise<CycleResult>;
    onFindPath: (sourceId: string, targetId: string) => Promise<PathResult>;
    onHighlightNodes: (nodeIds: string[], color: 'red' | 'blue' | 'green' | null) => void;
    onHighlightEdges: (edgeIds: string[], color: 'red' | 'blue' | 'green' | null) => void;
    isWorkerReady: boolean;
    nodeCount: number;
}

export function AnalysisPanel({
    isOpen,
    onClose,
    selectedNodes,
    onDetectCycles,
    onFindPath,
    onHighlightNodes,
    onHighlightEdges,
    isWorkerReady,
    nodeCount,
}: AnalysisPanelProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [results, setResults] = useState<AnalysisResult[]>([]);
    const [expandedResult, setExpandedResult] = useState<number | null>(null);
    const [pathSource, setPathSource] = useState<string>('');
    const [pathTarget, setPathTarget] = useState<string>('');

    // Use selected nodes for path finding
    React.useEffect(() => {
        if (selectedNodes.length >= 2) {
            setPathSource(selectedNodes[0]);
            setPathTarget(selectedNodes[1]);
        } else if (selectedNodes.length === 1) {
            setPathSource(selectedNodes[0]);
        }
    }, [selectedNodes]);

    const handleDetectCycles = async () => {
        if (!isWorkerReady || nodeCount === 0) return;

        setIsLoading(true);
        try {
            const result = await onDetectCycles();

            // Add to results
            setResults((prev) => [
                { type: 'cycles', data: result, timestamp: Date.now() },
                ...prev.slice(0, 9), // Keep last 10 results
            ]);

            // Highlight cycle nodes
            if (result.hasCycles && result.cycles.length > 0) {
                const cycleNodeIds = [...new Set(result.cycles.flat())];
                onHighlightNodes(cycleNodeIds, 'red');
            } else {
                onHighlightNodes([], null);
            }
        } catch (error) {
            console.error('[Analysis] Cycle detection failed:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFindPath = async () => {
        if (!isWorkerReady || !pathSource || !pathTarget) return;

        setIsLoading(true);
        try {
            const result = await onFindPath(pathSource, pathTarget);

            // Add to results
            setResults((prev) => [
                {
                    type: 'path',
                    data: { ...result, sourceId: pathSource, targetId: pathTarget },
                    timestamp: Date.now()
                },
                ...prev.slice(0, 9),
            ]);

            // Highlight path nodes
            if (result.path) {
                onHighlightNodes(result.path, 'blue');
            }
        } catch (error) {
            console.error('[Analysis] Path finding failed:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const clearHighlights = () => {
        onHighlightNodes([], null);
        onHighlightEdges([], null);
    };

    if (!isOpen) return null;

    return (
        <div className="absolute right-4 top-4 w-80 bg-white dark:bg-[#1a1a1a] rounded-xl shadow-xl border border-gray-200 dark:border-gray-800 z-50 overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 bg-gray-50 dark:bg-[#0f0f0f] border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                        Graph Analysis
                    </h3>
                    <p className="text-[10px] text-gray-500">
                        {isWorkerReady ? 'Powered by NetworkX' : 'Loading engine...'}
                    </p>
                </div>
                <button
                    onClick={onClose}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-md transition-colors"
                >
                    <X className="w-4 h-4 text-gray-500" />
                </button>
            </div>

            {/* Analysis Actions */}
            <div className="p-4 space-y-4">
                {/* Cycle Detection */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                            Cycle Detection
                        </span>
                        <span className="text-[10px] text-gray-400">
                            {nodeCount} nodes
                        </span>
                    </div>
                    <button
                        onClick={handleDetectCycles}
                        disabled={!isWorkerReady || isLoading || nodeCount === 0}
                        className="w-full px-4 py-2.5 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <AlertTriangle className="w-4 h-4" />
                        )}
                        <span className="text-sm font-medium">Find Cycles</span>
                    </button>
                </div>

                {/* Shortest Path */}
                <div className="space-y-2">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                        Shortest Path
                    </span>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={pathSource}
                            onChange={(e) => setPathSource(e.target.value)}
                            placeholder="From node ID"
                            className="flex-1 px-3 py-2 text-sm bg-gray-50 dark:bg-[#0f0f0f] border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                            type="text"
                            value={pathTarget}
                            onChange={(e) => setPathTarget(e.target.value)}
                            placeholder="To node ID"
                            className="flex-1 px-3 py-2 text-sm bg-gray-50 dark:bg-[#0f0f0f] border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    {selectedNodes.length >= 2 && (
                        <p className="text-[10px] text-blue-500">
                            ↑ Using selected nodes
                        </p>
                    )}
                    <button
                        onClick={handleFindPath}
                        disabled={!isWorkerReady || isLoading || !pathSource || !pathTarget}
                        className="w-full px-4 py-2.5 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Route className="w-4 h-4" />
                        )}
                        <span className="text-sm font-medium">Find Path</span>
                    </button>
                </div>

                {/* Clear Highlights */}
                <button
                    onClick={clearHighlights}
                    className="w-full px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                    Clear Highlights
                </button>
            </div>

            {/* Results */}
            {results.length > 0 && (
                <div className="border-t border-gray-200 dark:border-gray-800">
                    <div className="px-4 py-2 bg-gray-50 dark:bg-[#0f0f0f]">
                        <span className="text-xs font-medium text-gray-500">
                            Recent Results
                        </span>
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                        {results.map((result, index) => (
                            <div
                                key={result.timestamp}
                                className="border-b border-gray-100 dark:border-gray-800 last:border-0"
                            >
                                <button
                                    onClick={() => setExpandedResult(expandedResult === index ? null : index)}
                                    className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-[#0f0f0f] transition-colors"
                                >
                                    <div className="flex items-center gap-2">
                                        {result.type === 'cycles' ? (
                                            <>
                                                {(result.data as CycleResult).hasCycles ? (
                                                    <AlertTriangle className="w-4 h-4 text-red-500" />
                                                ) : (
                                                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                                                )}
                                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                                    {(result.data as CycleResult).hasCycles
                                                        ? `${(result.data as CycleResult).cycles.length} cycle(s) found`
                                                        : 'No cycles detected'}
                                                </span>
                                            </>
                                        ) : (
                                            <>
                                                {(result.data as PathResult).path ? (
                                                    <Route className="w-4 h-4 text-blue-500" />
                                                ) : (
                                                    <CircleDot className="w-4 h-4 text-gray-400" />
                                                )}
                                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                                    {(result.data as PathResult).path
                                                        ? `Path: ${(result.data as PathResult).length} steps`
                                                        : 'No path found'}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                    {expandedResult === index ? (
                                        <ChevronUp className="w-4 h-4 text-gray-400" />
                                    ) : (
                                        <ChevronDown className="w-4 h-4 text-gray-400" />
                                    )}
                                </button>
                                {expandedResult === index && (
                                    <div className="px-4 py-2 bg-gray-50 dark:bg-[#0a0a0a] text-xs">
                                        {result.type === 'cycles' ? (
                                            <div className="space-y-1">
                                                {(result.data as CycleResult).cycles.map((cycle, i) => (
                                                    <div key={i} className="text-red-600 dark:text-red-400">
                                                        Cycle {i + 1}: {cycle.join(' → ')}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-blue-600 dark:text-blue-400">
                                                {(result.data as PathResult).path ? (
                                                    <>Path: {(result.data as PathResult).path?.join(' → ')}</>
                                                ) : (
                                                    <>
                                                        No path from {(result.data as PathResult).sourceId} to{' '}
                                                        {(result.data as PathResult).targetId}
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
