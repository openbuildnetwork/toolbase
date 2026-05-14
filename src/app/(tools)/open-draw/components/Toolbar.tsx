import {
    Square, Circle, Diamond, Type, Moon, Sun, LayoutGrid, GitBranch,
    Loader2, Workflow, Search, FileUp, Database, Cloud, User,
    FileText, Triangle, ChevronDown, Shapes, Settings2
} from 'lucide-react';
import React, { useState } from 'react';

type LayoutAlgorithm = 'hierarchical' | 'circular' | 'spring';

interface ToolbarProps {
    isDark?: boolean;
    onToggleTheme?: () => void;
    onApplyLayout?: (algorithm: LayoutAlgorithm) => Promise<void>;
    isLayoutLoading?: boolean;
    workerReady?: boolean;
    onToggleAnalysis?: () => void;
    isAnalysisOpen?: boolean;
    onToggleImportExport?: () => void;
    isImportExportOpen?: boolean;
    onToggleProperties?: () => void;
    isPropertiesOpen?: boolean;
}

// Shape categories for organized display
const SHAPE_CATEGORIES = [
    {
        name: 'Basic',
        shapes: [
            { type: 'rectangle', icon: Square, label: 'Rectangle' },
            { type: 'circle', icon: Circle, label: 'Circle' },
            { type: 'diamond', icon: Diamond, label: 'Diamond' },
            { type: 'text', icon: Type, label: 'Text' },
        ]
    },
    {
        name: 'Flowchart',
        shapes: [
            { type: 'cylinder', icon: Database, label: 'Database' },
            { type: 'document', icon: FileText, label: 'Document' },
            { type: 'triangle', icon: Triangle, label: 'Decision' },
        ]
    },
    {
        name: 'Diagrams',
        shapes: [
            { type: 'cloud', icon: Cloud, label: 'Cloud' },
            { type: 'actor', icon: User, label: 'Actor' },
        ]
    }
];

const layoutOptions = [
    { id: 'hierarchical', label: 'Hierarchical', icon: GitBranch, description: 'Tree structure' },
    { id: 'circular', label: 'Circular', icon: Circle, description: 'Ring layout' },
    { id: 'spring', label: 'Force-Directed', icon: Workflow, description: 'Physics-based' },
] as const;

export function Toolbar({
    isDark,
    onToggleTheme,
    onApplyLayout,
    isLayoutLoading = false,
    workerReady = false,
    onToggleAnalysis,
    isAnalysisOpen = false,
    onToggleImportExport,
    isImportExportOpen = false,
    onToggleProperties,
    isPropertiesOpen = false,
}: ToolbarProps) {
    const [showShapePalette, setShowShapePalette] = useState(false);
    const [showLayoutMenu, setShowLayoutMenu] = useState(false);
    const [expandedCategory, setExpandedCategory] = useState<string | null>('Basic');

    const onDragStart = (event: React.DragEvent, nodeType: string) => {
        event.dataTransfer.setData('application/reactflow', nodeType);
        event.dataTransfer.effectAllowed = 'move';
    };

    const handleLayoutClick = async (algorithm: LayoutAlgorithm) => {
        setShowLayoutMenu(false);
        if (onApplyLayout) {
            await onApplyLayout(algorithm);
        }
    };

    return (
        <aside className="w-14 flex flex-col items-center gap-1 py-3 bg-white/80 dark:bg-[#0A0A0A]/90 backdrop-blur-xl border-r border-gray-200/50 dark:border-white/5 z-10 h-full">

            {/* Shape Palette Button */}
            <div className="relative">
                <button
                    onClick={() => setShowShapePalette(!showShapePalette)}
                    className={`p-2.5 rounded-xl transition-all duration-200 group relative
                        ${showShapePalette
                            ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25'
                            : 'hover:bg-gray-100 dark:hover:bg-white/5 text-gray-600 dark:text-gray-400'
                        }
                    `}
                    title="Shapes"
                >
                    <Shapes className="w-5 h-5" />
                </button>

                {/* Shape Palette Flyout */}
                {showShapePalette && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowShapePalette(false)} />
                        <div className="absolute left-full top-0 ml-3 w-64 bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-2xl border border-gray-200/50 dark:border-white/10 z-50 overflow-hidden animate-in slide-in-from-left-2 duration-200">
                            <div className="px-4 py-3 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 dark:from-blue-500/5 dark:to-indigo-500/5 border-b border-gray-100 dark:border-white/5">
                                <h3 className="text-sm font-semibold text-gray-800 dark:text-white">Shape Library</h3>
                                <p className="text-[11px] text-gray-500 dark:text-gray-400">Drag shapes to canvas</p>
                            </div>
                            <div className="p-2 max-h-80 overflow-y-auto">
                                {SHAPE_CATEGORIES.map((category) => (
                                    <div key={category.name} className="mb-1">
                                        <button
                                            onClick={() => setExpandedCategory(expandedCategory === category.name ? null : category.name)}
                                            className="w-full px-3 py-2 flex items-center justify-between text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                                        >
                                            {category.name}
                                            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${expandedCategory === category.name ? 'rotate-180' : ''}`} />
                                        </button>

                                        {expandedCategory === category.name && (
                                            <div className="grid grid-cols-4 gap-1.5 px-2 pb-2 animate-in fade-in slide-in-from-top-1 duration-150">
                                                {category.shapes.map((shape) => {
                                                    const IconComponent = shape.icon;
                                                    return (
                                                        <div
                                                            key={shape.type}
                                                            className="aspect-square flex items-center justify-center p-2 rounded-xl bg-gray-50 dark:bg-white/5 hover:bg-blue-50 dark:hover:bg-blue-500/10 cursor-grab active:cursor-grabbing transition-all duration-150 hover:scale-105 active:scale-95 group border border-transparent hover:border-blue-200 dark:hover:border-blue-500/30"
                                                            onDragStart={(e) => onDragStart(e, shape.type)}
                                                            draggable
                                                            title={shape.label}
                                                        >
                                                            <IconComponent className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>

            <div className="w-8 h-px bg-gray-200 dark:bg-white/10 my-1" />

            {/* Layout Button */}
            <div className="relative">
                <button
                    onClick={() => setShowLayoutMenu(!showLayoutMenu)}
                    disabled={isLayoutLoading}
                    className={`p-2.5 rounded-xl transition-all duration-200 relative
                        ${showLayoutMenu
                            ? 'bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/25'
                            : 'hover:bg-gray-100 dark:hover:bg-white/5 text-gray-600 dark:text-gray-400'
                        }
                        ${isLayoutLoading ? 'opacity-50 cursor-wait' : ''}
                    `}
                    title="Auto-Layout"
                >
                    {isLayoutLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LayoutGrid className="w-5 h-5" />}
                    <span className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ring-2 ring-white dark:ring-[#0A0A0A] ${workerReady ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                </button>

                {showLayoutMenu && !isLayoutLoading && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowLayoutMenu(false)} />
                        <div className="absolute left-full top-0 ml-3 w-52 bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-2xl border border-gray-200/50 dark:border-white/10 z-50 overflow-hidden animate-in slide-in-from-left-2 duration-200">
                            <div className="px-4 py-3 bg-gradient-to-r from-violet-500/10 to-purple-500/10 dark:from-violet-500/5 dark:to-purple-500/5 border-b border-gray-100 dark:border-white/5">
                                <h3 className="text-sm font-semibold text-gray-800 dark:text-white">Auto-Layout</h3>
                                <p className="text-[11px] text-gray-500 dark:text-gray-400">{workerReady ? 'NetworkX Engine' : 'Loading...'}</p>
                            </div>
                            <div className="p-1.5">
                                {layoutOptions.map((opt) => {
                                    const IconComponent = opt.icon;
                                    return (
                                        <button
                                            key={opt.id}
                                            onClick={() => handleLayoutClick(opt.id as LayoutAlgorithm)}
                                            disabled={!workerReady}
                                            className="w-full px-3 py-2.5 flex items-center gap-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-all duration-150 disabled:opacity-40 group"
                                        >
                                            <div className="p-1.5 rounded-lg bg-violet-100 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 group-hover:scale-110 transition-transform">
                                                <IconComponent className="w-4 h-4" />
                                            </div>
                                            <div className="text-left">
                                                <div className="text-sm font-medium text-gray-700 dark:text-gray-200">{opt.label}</div>
                                                <div className="text-[10px] text-gray-400">{opt.description}</div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Analysis Button */}
            {onToggleAnalysis && (
                <button
                    onClick={onToggleAnalysis}
                    disabled={!workerReady}
                    className={`p-2.5 rounded-xl transition-all duration-200
                        ${isAnalysisOpen
                            ? 'bg-gradient-to-br from-pink-500 to-rose-600 text-white shadow-lg shadow-pink-500/25'
                            : 'hover:bg-gray-100 dark:hover:bg-white/5 text-gray-600 dark:text-gray-400'
                        }
                        ${!workerReady ? 'opacity-40 cursor-not-allowed' : ''}
                    `}
                    title="Graph Analysis"
                >
                    <Search className="w-5 h-5" />
                </button>
            )}

            {/* Import/Export Button */}
            {onToggleImportExport && (
                <button
                    onClick={onToggleImportExport}
                    className={`p-2.5 rounded-xl transition-all duration-200
                        ${isImportExportOpen
                            ? 'bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-lg shadow-teal-500/25'
                            : 'hover:bg-gray-100 dark:hover:bg-white/5 text-gray-600 dark:text-gray-400'
                        }
                    `}
                    title="Import / Export"
                >
                    <FileUp className="w-5 h-5" />
                </button>
            )}

            {/* Properties Button */}
            {onToggleProperties && (
                <button
                    onClick={onToggleProperties}
                    className={`p-2.5 rounded-xl transition-all duration-200
                        ${isPropertiesOpen
                            ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/25'
                            : 'hover:bg-gray-100 dark:hover:bg-white/5 text-gray-600 dark:text-gray-400'
                        }
                    `}
                    title="Properties"
                >
                    <Settings2 className="w-5 h-5" />
                </button>
            )}

            <div className="flex-1" />

            {/* Theme Toggle */}
            {onToggleTheme && (
                <button
                    onClick={onToggleTheme}
                    className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 text-gray-600 dark:text-gray-400 transition-all duration-200"
                    title={isDark ? "Light Mode" : "Dark Mode"}
                >
                    {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>
            )}
        </aside>
    );
}
