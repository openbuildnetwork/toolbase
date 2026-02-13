
import React, { useCallback } from 'react';
import { useReactFlow, Node, Edge } from '@xyflow/react';
import {
    Trash2,
    Copy,
    Square,
    Layers,
    ArrowUp,
    ArrowDown,
    Lock,
    Unlock,
    Settings,
    Scissors,
    ChevronUp,
    ChevronDown,
    FileCode,
    Camera,
    Box,
    Ungroup
} from 'lucide-react';

interface ContextMenuProps {
    id: string;
    type: 'node' | 'edge';
    top?: number;
    left?: number;
    right?: number;
    bottom?: number;
    selectedNodes?: string[];
    onClick: () => void;
    onNodeChange: (nodes: Node[] | ((nds: Node[]) => Node[])) => void;
    onEdgeChange: (edges: Edge[] | ((eds: Edge[]) => Edge[])) => void;
    onGroup?: () => void;
    onUngroup?: () => void;
}

export function ContextMenu({
    id,
    type,
    top,
    left,
    right,
    bottom,
    selectedNodes = [],
    onClick,
    onNodeChange,
    onEdgeChange,
    onGroup,
    onUngroup,
}: ContextMenuProps) {
    const { getNode, getEdge, getNodes, getEdges, addNodes } = useReactFlow();

    const duplicateNode = useCallback(() => {
        const node = getNode(id);
        if (!node) return;

        const newNode: Node = {
            ...node,
            id: `${node.id}-copy-${Date.now()}`,
            position: {
                x: node.position.x + 20,
                y: node.position.y + 20,
            },
            selected: true,
        };

        // Deselect others and add new node
        onNodeChange((nds) => {
            const deselected = nds.map((n) => ({ ...n, selected: false }));
            return [...deselected, newNode];
        });
    }, [id, getNode, onNodeChange]);

    const deleteElement = useCallback(() => {
        if (type === 'node') {
            onNodeChange((nds) => nds.filter((node) => node.id !== id));
        } else {
            onEdgeChange((eds) => eds.filter((edge) => edge.id !== id));
        }
    }, [id, type, onNodeChange, onEdgeChange]);

    const bringToFront = useCallback(() => {
        if (type !== 'node') return;
        const nodes = getNodes();
        const maxZIndex = Math.max(...nodes.map((n) => n.zIndex || 0), 0);
        onNodeChange((nds) =>
            nds.map((node) =>
                node.id === id ? { ...node, zIndex: maxZIndex + 1 } : node
            )
        );
    }, [id, type, getNodes, onNodeChange]);

    const sendToBack = useCallback(() => {
        if (type !== 'node') return;
        const nodes = getNodes();
        const minZIndex = Math.min(...nodes.map((n) => n.zIndex || 0), 0);
        onNodeChange((nds) =>
            nds.map((node) =>
                node.id === id ? { ...node, zIndex: minZIndex - 1 } : node
            )
        );
    }, [id, type, getNodes, onNodeChange]);

    const bringForward = useCallback(() => {
        if (type !== 'node') return;
        onNodeChange((nds) =>
            nds.map((node) =>
                node.id === id ? { ...node, zIndex: (node.zIndex || 0) + 1 } : node
            )
        );
    }, [id, type, onNodeChange]);

    const sendBackward = useCallback(() => {
        if (type !== 'node') return;
        onNodeChange((nds) =>
            nds.map((node) =>
                node.id === id ? { ...node, zIndex: (node.zIndex || 0) - 1 } : node
            )
        );
    }, [id, type, onNodeChange]);

    const toggleLock = useCallback(() => {
        if (type !== 'node') return;
        onNodeChange((nds) =>
            nds.map((node) =>
                node.id === id ? {
                    ...node,
                    draggable: !node.draggable,
                    selectable: node.draggable ? true : node.selectable // If locking, keep selectable
                } : node
            )
        );
    }, [id, type, onNodeChange]);

    const copyToClipboard = useCallback(() => {
        const node = getNode(id);
        if (!node) return;
        localStorage.setItem('open-draw-clipboard', JSON.stringify({ type: 'node', data: node }));
    }, [id, getNode]);

    const cutToClipboard = useCallback(() => {
        copyToClipboard();
        deleteElement();
    }, [copyToClipboard, deleteElement]);

    return (
        <div
            style={{ top, left, right, bottom }}
            className="absolute z-1000 min-w-[180px] bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-lg shadow-xl py-1 animate-in fade-in zoom-in-95 duration-100"
            onClick={onClick}
        >
            <button
                onClick={deleteElement}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
            >
                <Trash2 className="w-4 h-4" /> Delete
                <span className="ml-auto text-[10px] opacity-50 text-gray-400">Del</span>
            </button>

            <div className="h-px bg-gray-100 dark:bg-gray-800 my-1 mx-2" />

            <button
                onClick={cutToClipboard}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#252525] transition-colors"
            >
                <Scissors className="w-4 h-4" /> Cut
                <span className="ml-auto text-[10px] opacity-50 text-gray-400">Ctrl+X</span>
            </button>
            <button
                onClick={copyToClipboard}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#252525] transition-colors"
            >
                <Copy className="w-4 h-4" /> Copy
                <span className="ml-auto text-[10px] opacity-50 text-gray-400">Ctrl+C</span>
            </button>

            {type === 'node' && (
                <>
                    <button
                        onClick={duplicateNode}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#252525] transition-colors"
                    >
                        <Copy className="w-4 h-4 opacity-50" /> Duplicate
                        <span className="ml-auto text-[10px] opacity-50 text-gray-400">Ctrl+D</span>
                    </button>

                    <div className="h-px bg-gray-100 dark:bg-gray-800 my-1 mx-2" />

                    <button
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 cursor-not-allowed opacity-50"
                        disabled
                    >
                        <Camera className="w-4 h-4" /> Copy as Image
                    </button>
                    <button
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 cursor-not-allowed opacity-50"
                        disabled
                    >
                        <FileCode className="w-4 h-4" /> Copy as SVG
                    </button>

                    <div className="h-px bg-gray-100 dark:bg-gray-800 my-1 mx-2" />

                    <button
                        onClick={toggleLock}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#252525] transition-colors"
                    >
                        {getNode(id)?.draggable === false ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                        {getNode(id)?.draggable === false ? 'Unlock' : 'Lock'}
                    </button>

                    <button
                        onClick={() => {
                            const node = getNode(id);
                            if (node?.data) {
                                const { StyleManager } = require('../utils/style-manager');
                                StyleManager.saveDefaultStyle(node.data);
                            }
                        }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#252525] transition-colors"
                    >
                        <Settings className="w-4 h-4" /> Set as Default Style
                    </button>

                    <div className="h-px bg-gray-100 dark:bg-gray-800 my-1 mx-2" />

                    {selectedNodes.length > 1 && onGroup && (
                        <button
                            onClick={onGroup}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors"
                        >
                            <Box className="w-4 h-4" /> Group Selection
                            <span className="ml-auto text-[10px] opacity-50 text-gray-400">Ctrl+G</span>
                        </button>
                    )}

                    {getNodes().some(n => n.parentId === id) && onUngroup && (
                        <button
                            onClick={onUngroup}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/10 transition-colors"
                        >
                            <Ungroup className="w-4 h-4" /> Ungroup
                            <span className="ml-auto text-[10px] opacity-50 text-gray-400">Ctrl+Shift+G</span>
                        </button>
                    )}

                    <div className="h-px bg-gray-100 dark:bg-gray-800 my-1 mx-2" />

                    <button
                        onClick={bringToFront}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#252525] transition-colors"
                    >
                        <ChevronUp className="w-4 h-4" /> To Front
                        <span className="ml-auto text-[10px] opacity-50 text-gray-400">Ctrl+Shift+F</span>
                    </button>
                    <button
                        onClick={sendToBack}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#252525] transition-colors"
                    >
                        <ChevronDown className="w-4 h-4" /> To Back
                        <span className="ml-auto text-[10px] opacity-50 text-gray-400">Ctrl+Shift+B</span>
                    </button>
                    <button
                        onClick={bringForward}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#252525] transition-colors"
                    >
                        <ArrowUp className="w-4 h-4" /> Bring Forward
                    </button>
                    <button
                        onClick={sendBackward}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#252525] transition-colors"
                    >
                        <ArrowDown className="w-4 h-4" /> Send Backward
                    </button>
                </>
            )}
        </div>
    );
}
