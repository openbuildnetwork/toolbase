import { useCallback, useMemo } from 'react';
import { Node, Edge } from '@xyflow/react';
import type { PipelineStep, PipelineDefinition } from '@/app/(tools)/pipeline/types/pipeline';
import { TIPToolRegistry } from '@/tip/registry';

function getTypeColor(type?: string): string {
    if (!type) return '#9ca3af';
    if (type === 'application/pdf') return '#ef4444';
    if (type.startsWith('image/')) return '#a855f7';
    if (type.startsWith('text/')) return '#3b82f6';
    if (type === 'application/json') return '#eab308';
    if (type === 'application/zip') return '#f97316';
    return '#9ca3af';
}

export function useGraphSerializer() {
    
    const graphToPipeline = useCallback((nodes: Node[], edges: Edge[]): PipelineStep[] | null => {
        // 1. Find all tool and humanReview nodes
        const toolNodes = nodes.filter(n => n.type === 'tool' || n.type === 'humanReview');
        
        // 2. For each tool node, calculate its maximum distance to the output node
        const nodeDistances = new Map<string, number>();
        const visited = new Set<string>();

        const getDistanceToOutput = (nodeId: string): number => {
            if (nodeDistances.has(nodeId)) {
                return nodeDistances.get(nodeId)!;
            }
            if (visited.has(nodeId)) {
                // Cycle detected, return -1 to avoid infinite recursion
                return -1;
            }
            visited.add(nodeId);

            const outgoingEdges = edges.filter(e => e.source === nodeId);
            let maxDist = -1;

            for (const edge of outgoingEdges) {
                const targetNode = nodes.find(n => n.id === edge.target);
                if (!targetNode) continue;

                if (targetNode.type === 'output') {
                    maxDist = Math.max(maxDist, 1);
                } else if (targetNode.type === 'tool' || targetNode.type === 'humanReview') {
                    const dist = getDistanceToOutput(targetNode.id);
                    if (dist !== -1) {
                        maxDist = Math.max(maxDist, dist + 1);
                    }
                }
            }

            visited.delete(nodeId);
            nodeDistances.set(nodeId, maxDist);
            return maxDist;
        };

        // Populate distances for all tool nodes
        toolNodes.forEach(node => {
            getDistanceToOutput(node.id);
        });

        // Filter out tool nodes that cannot reach the output node
        const activeToolNodes = toolNodes.filter(node => {
            const dist = nodeDistances.get(node.id);
            return dist !== undefined && dist > 0;
        });

        // Sort tool nodes by distance to output descending (furthest/earliest first)
        activeToolNodes.sort((a, b) => {
            const distA = nodeDistances.get(a.id) || 0;
            const distB = nodeDistances.get(b.id) || 0;
            return distB - distA;
        });

        if (activeToolNodes.length === 0) return null;

        // Convert to PipelineStep[]
        return activeToolNodes.map(node => ({
            id: node.id,
            toolId: node.data.toolId as string,
            config: {
                ...(node.data.config as Record<string, unknown> || {}),
                __nodeId: node.id,
            },
        }));
    }, []);

    const pipelineToGraph = useCallback((pipeline: PipelineDefinition): { nodes: Node[], edges: Edge[] } => {
        const nodes: Node[] = [];
        const edges: Edge[] = [];

        // File Node
        let prevId = 'node-file-input';
        nodes.push({
            id: prevId,
            type: 'fileInput',
            position: { x: 50, y: 200 },
            data: { status: 'idle' }
        });

        let currentX = 350;

        pipeline.steps.forEach((step, i) => {
            const tool = TIPToolRegistry.get(step.toolId);
            if (!tool) return;

            const nodeId = `node-tool-${step.id || i}`;
            
            nodes.push({
                id: nodeId,
                type: 'tool',
                position: { x: currentX, y: 200 },
                data: {
                    toolId: step.toolId,
                    config: step.config,
                    status: 'idle'
                }
            });

            edges.push({
                id: `edge-${prevId}-${nodeId}`,
                source: prevId,
                target: nodeId,
                type: 'tip',
                data: { color: getTypeColor(tool.consumes[0]) } 
            });

            prevId = nodeId;
            currentX += 300;
        });

        // Output Node
        const outId = 'node-output';
        nodes.push({
            id: outId,
            type: 'output',
            position: { x: currentX, y: 200 },
            data: { status: 'idle' }
        });

        edges.push({
            id: `edge-${prevId}-${outId}`,
            source: prevId,
            target: outId,
            type: 'tip',
            data: { color: '#9ca3af' }
        });

        return { nodes, edges };
    }, []);

    return useMemo(() => ({ graphToPipeline, pipelineToGraph }), [graphToPipeline, pipelineToGraph]);
}
