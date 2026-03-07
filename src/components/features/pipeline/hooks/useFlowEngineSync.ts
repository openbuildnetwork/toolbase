import { useEffect } from 'react';
import type { Node, Edge } from '@xyflow/react';
import type { PipelineEngineState, PipelineStep } from '@/types/pipeline';
import type { TIPBundle } from '@/tip/protocol';

export function useFlowEngineSync(
    nodes: Node[],
    edges: Edge[],
    setNodes: (update: (nds: Node[]) => Node[]) => void,
    setEdges: (update: (eds: Edge[]) => Edge[]) => void,
    state: PipelineEngineState,
    output: TIPBundle | null,
    updateNodeData: (nodeId: string, partialData: any) => void,
    graphToPipeline: (nodes: Node[], edges: Edge[]) => PipelineStep[] | null
) {
    // Sync file-select, download, and INP callbacks into nodes
    useEffect(() => {
        setNodes(nds => nds.map(n => {
            if (n.type === 'fileInput') {
                return { ...n, data: { ...n.data, onFileSelect: (f: File | null) => updateNodeData(n.id, { file: f }) } };
            }
            if (n.type === 'output') {
                return {
                    ...n,
                    data: {
                        ...n.data,
                        onDownload: async () => {
                            if (!output) return;
                            output.payloads.forEach((payload, i) => {
                                setTimeout(() => {
                                    const url = URL.createObjectURL(payload.data);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = payload.meta.filename;
                                    document.body.appendChild(a);
                                    a.click();
                                    document.body.removeChild(a);
                                    setTimeout(() => URL.revokeObjectURL(url), 100);
                                }, i * 200);
                            });
                        }
                    }
                };
            }
            return n;
        }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [output, setNodes, updateNodeData]);

    // Sync engine state to canvas
    useEffect(() => {
        if (state.status === 'idle') return;
        const orderedSteps = graphToPipeline(nodes, edges);
        if (!orderedSteps) return;

        setNodes(nds => nds.map(n => {
            if (n.type === 'fileInput') {
                const s = state.status === 'running' ? 'running' : state.status === 'complete' ? 'complete' : 'idle';
                return { ...n, data: { ...n.data, status: s } };
            }
            if (n.type === 'tool') {
                const stepIndex = orderedSteps.findIndex(s => s.id === n.id);
                if (stepIndex >= 0 && state.steps[stepIndex]) {
                    const ss = state.steps[stepIndex];
                    let nextStatus = 'idle';
                    if (ss.status === 'running') nextStatus = 'running';
                    if (ss.status === 'complete') nextStatus = 'complete';
                    if (ss.status === 'error') nextStatus = 'error';
                    return { ...n, data: { ...n.data, status: nextStatus, durationMs: ss.durationMs, error: ss.error } };
                }
            }
            if (n.type === 'output' && state.status === 'complete') {
                const totalDurationMs = state.steps.reduce((acc, step) => acc + (step.durationMs || 0), 0);
                return { ...n, data: { ...n.data, status: 'complete', bundle: output, totalDurationMs } };
            }
            return n;
        }));

        setEdges(eds => eds.map(e => {
            if (state.status === 'idle' || state.status === 'complete') {
                return { ...e, data: { ...e.data, isRunning: false } };
            }
            let runningEdgeId = '';
            const runningStepIndex = state.steps.findIndex(s => s.status === 'running');
            if (runningStepIndex === -1 && state.status === 'running') {
                const fileNodeId = nodes.find(n => n.type === 'fileInput')?.id;
                runningEdgeId = eds.find(edge => edge.source === fileNodeId)?.id || '';
            } else if (runningStepIndex >= 0) {
                const runningStepId = orderedSteps[runningStepIndex]?.id;
                runningEdgeId = eds.find(edge => edge.source === runningStepId)?.id || '';
            }
            return { ...e, data: { ...e.data, isRunning: e.id === runningEdgeId } };
        }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state, output, setNodes, setEdges, graphToPipeline]);
}
