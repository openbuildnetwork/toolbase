
import { ShapeDefinition } from '@/app/(tools)/open-draw/types/open-draw.types';
import { ShapeFactory } from '../utils/ShapeFactory';

// SVG Path definitions for various shapes
// Viewbox assumed to be 0 0 100 100 for all shapes unless specified

export const SHAPE_DEFINITIONS: Record<string, ShapeDefinition> = {
    // --- BASIC ---
    rectangle: {
        type: 'rectangle',
        label: 'Rectangle',
        path: 'M0,0 L100,0 L100,100 L0,100 Z',
    },
    circle: {
        type: 'circle',
        label: 'Circle',
        path: 'M50,0 A50,50 0 1,1 50,100 A50,50 0 1,1 50,0',
        width: 100,
        height: 100,
    },
    ellipse: {
        type: 'ellipse',
        label: 'Ellipse',
        path: 'M50,15 A50,35 0 1,1 50,85 A50,35 0 1,1 50,15',
        width: 120,
        height: 80,
    },
    triangle: {
        type: 'triangle',
        label: 'Triangle',
        path: 'M50,0 L100,100 L0,100 Z',
    },
    diamond: {
        type: 'diamond',
        label: 'Diamond',
        path: 'M50,0 L100,50 L50,100 L0,50 Z',
        width: 120,
        height: 120,
    },
    parallelogram: {
        type: 'parallelogram',
        label: 'Parallelogram',
        path: 'M20,0 L100,0 L80,100 L0,100 Z',
        width: 120,
        height: 80,
    },
    hexagon: {
        type: 'hexagon',
        label: 'Hexagon',
        path: ShapeFactory.createRegularPolygon(6),
        width: 100,
        height: 100,
    },
    octagon: {
        type: 'octagon',
        label: 'Octagon',
        path: ShapeFactory.createRegularPolygon(8),
        width: 100,
        height: 100,
    },
    pentagon: {
        type: 'pentagon',
        label: 'Pentagon',
        path: ShapeFactory.createRegularPolygon(5),
        width: 100,
        height: 100,
    },
    star: {
        type: 'star',
        label: 'Star',
        path: 'M50,0 L61,35 L98,35 L68,57 L79,91 L50,70 L21,91 L32,57 L2,35 L39,35 Z',
        width: 100,
        height: 100,
    },

    // --- FLOWCHART ---
    process: {
        type: 'process',
        label: 'Process',
        path: 'M0,0 L100,0 L100,100 L0,100 Z', // Same as rectangle
    },
    decision: {
        type: 'decision',
        label: 'Decision',
        path: 'M50,0 L100,50 L50,100 L0,50 Z', // Same as diamond
    },
    manual_input: {
        type: 'manual_input',
        label: 'Manual Input',
        path: 'M0,20 L100,0 L100,100 L0,100 Z',
        width: 120,
        height: 80,
    },
    document: {
        type: 'document',
        label: 'Document',
        path: 'M0,0 L100,0 L100,80 Q75,100 50,80 Q25,60 0,80 Z',
        width: 100,
        height: 120,
    },
    database: ShapeFactory.createCylinder(15),
    cloud: {
        type: 'cloud',
        label: 'Cloud',
        path: 'M25,60 Q10,60 10,45 Q10,30 25,30 Q30,10 50,10 Q70,10 75,30 Q90,30 90,45 Q90,60 75,60 Q70,80 50,80 Q30,80 25,60 Z',
        width: 140,
        height: 100,
    },

    // --- ARROWS ---
    arrow_right: {
        type: 'arrow_right',
        label: 'Arrow Right',
        path: 'M0,35 L70,35 L70,15 L100,50 L70,85 L70,65 L0,65 Z',
        width: 100,
        height: 60,
    },
    arrow_left: {
        type: 'arrow_left',
        label: 'Arrow Left',
        path: 'M100,35 L30,35 L30,15 L0,50 L30,85 L30,65 L100,65 Z',
        width: 100,
        height: 60,
    },
    arrow_callout: {
        type: 'arrow_callout',
        label: 'Callout',
        path: ShapeFactory.createCallout(20, 120),
        width: 120,
        height: 80,
    },

    // --- LOGIC GATES --- (Example for expansion)
    or_gate: {
        type: 'or_gate',
        label: 'OR Gate',
        path: 'M0,0 L40,0 Q70,10 80,50 Q70,90 40,100 L0,100 Q30,50 0,0',
        width: 100,
        height: 100,
    }
    // Add hundreds more here...
};

export const SHAPE_CATEGORIES_CONFIG = [
    {
        name: 'Basic',
        shapes: ['rectangle', 'circle', 'ellipse', 'triangle', 'diamond', 'parallelogram', 'hexagon', 'octagon', 'pentagon', 'star']
    },
    {
        name: 'Flowchart',
        shapes: ['process', 'decision', 'manual_input', 'document', 'database', 'cloud']
    },
    {
        name: 'Arrows',
        shapes: ['arrow_right', 'arrow_left', 'arrow_callout']
    },
    {
        name: 'Logic',
        shapes: ['or_gate']
    }
];
