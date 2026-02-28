import { render } from 'react-dom';
// wait, we can't easily run a React hook outside a component in a simple Node script.
// Let's just write a mock test script for the logic.
import { useGraphSerializer } from '../src/components/features/pipeline/hooks/useGraphSerializer';

function test() {
    const { graphToPipeline } = useGraphSerializer();

    // Mock 3-node graph
    const nodes: any[] = [
        { id: 'node1', type: 'fileInput', data: {} },
        { id: 'node2', type: 'tool', data: { toolId: 'magic-pdf/compress', config: { quality: 80 } } },
        { id: 'node3', type: 'output', data: {} }
    ];

    const edges: any[] = [
        { id: 'e1-2', source: 'node1', target: 'node2' },
        { id: 'e2-3', source: 'node2', target: 'node3' }
    ];

    const steps = graphToPipeline(nodes, edges);
    console.log(JSON.stringify(steps, null, 2));
}

export function TestRunner() {
    test();
    return null;
}
