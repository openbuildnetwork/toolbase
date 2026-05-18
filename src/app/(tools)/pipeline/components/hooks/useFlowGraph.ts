import { useState, useCallback } from 'react';
import {
  Node,
  Edge,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  NodeChange,
  EdgeChange,
  Connection,
} from '@xyflow/react';
import { TIPToolRegistry } from '@/tip/registry';
import { canTransform } from '@/tip/transformers';
import type { TIPContentType } from '@/tip/protocol';

export function useFlowGraph() {
  const [nodes, setNodes] = useState<Node[]>([
    { id: 'node-file', type: 'fileInput', position: { x: 140, y: 240 }, data: { status: 'idle', file: null } },
    { id: 'node-out', type: 'output', position: { x: 680, y: 240 }, data: { status: 'idle' } }
  ]);
  const [edges, setEdges] = useState<Edge[]>([]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
  }, []);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
  }, []);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => {
        const sourceNode = nodes.find(n => n.id === connection.source);
        const targetNode = nodes.find(n => n.id === connection.target);
        
        if (!sourceNode || !targetNode) return eds;

        let targetAccepts: TIPContentType[] = [];
        if (targetNode.type === 'tool' || targetNode.type === 'humanReview') {
           const tTool = TIPToolRegistry.get(targetNode.data.toolId as string);
           targetAccepts = tTool?.consumes || [];
        }

        let sourceType: TIPContentType | '' = '';
        let isValid = false;

        if (sourceNode.type === 'fileInput') {
           if (!sourceNode.data.file) {
               // Wildcard: unselected file input node is compatible with anything
               isValid = true;
           } else {
               sourceType = (sourceNode.data.file as File)?.type as TIPContentType || 'application/octet-stream';
           }
        } else if (sourceNode.type === 'tool' || sourceNode.type === 'humanReview') {
           const sTool = TIPToolRegistry.get(sourceNode.data.toolId as string);
           sourceType = sTool?.produces[0] || '';
        }

        if (!isValid) {
            isValid = targetNode.type === 'output' || targetAccepts.some(
                accepted => accepted === sourceType || (sourceType !== '' && canTransform(sourceType as TIPContentType, accepted))
            );
        }

        return addEdge({
          ...connection,
          type: 'tip',
          data: {
             isInvalid: !isValid,
             color: !isValid ? '#ef4444' : '#9ca3af',
          },
          animated: false,
        }, eds);
      });
    },
    [nodes]
  );

  const isValidConnection = useCallback((connection: Connection | Edge) => {
    const sourceNode = nodes.find(n => n.id === connection.source);
    const targetNode = nodes.find(n => n.id === connection.target);
    
    if (!sourceNode || !targetNode) return false;

    if (sourceNode.type === 'fileInput' && !sourceNode.data.file) {
        // Wildcard compatibility for unselected file inputs
        return true;
    }

    let sourceType: TIPContentType | '' = '';
    if (sourceNode.type === 'fileInput') {
        sourceType = (sourceNode.data.file as File)?.type as TIPContentType || 'application/octet-stream';
    } else if (sourceNode.type === 'tool' || sourceNode.type === 'humanReview') {
        const sTool = TIPToolRegistry.get(sourceNode.data.toolId as string);
        sourceType = sTool?.produces[0] || '';
    }

    let targetAccepts: TIPContentType[] = [];
    if (targetNode.type === 'tool' || targetNode.type === 'humanReview') {
        const tTool = TIPToolRegistry.get(targetNode.data.toolId as string);
        targetAccepts = tTool?.consumes || [];
    }

    return targetNode.type === 'output' || targetAccepts.some(
        accepted => accepted === sourceType || (sourceType !== '' && canTransform(sourceType as TIPContentType, accepted))
    );
  }, [nodes]);

  return {
    nodes,
    edges,
    setNodes,
    setEdges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    isValidConnection
  };
}
