
import { ShapeDefinition } from '@/types/open-draw.types';

/**
 * Converts an SVG string into a ShapeDefinition object.
 * Parses paths, circles, rects, and g elements.
 * Attempts to normalize coordinates if a viewBox is present.
 */
export function convertSvgToShapeDefinition(svgString: string, label: string = 'Imported Shape'): ShapeDefinition {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, 'image/svg+xml');
    const svg = doc.querySelector('svg');

    if (!svg) {
        throw new Error('Invalid SVG: No <svg> element found');
    }

    // Get viewBox or width/height
    const viewBoxAttr = svg.getAttribute('viewBox');
    let viewBox = viewBoxAttr ? viewBoxAttr.split(/[\s,]+/).map(Number) : null;

    // If no viewBox, try width/height attributes
    if (!viewBox || viewBox.length !== 4) {
        const w = parseFloat(svg.getAttribute('width') || '100');
        const h = parseFloat(svg.getAttribute('height') || '100');
        viewBox = [0, 0, w, h];
    }

    const [minX, minY, width, height] = viewBox;

    // We will extract paths as individual objects.
    // The GenericShapeNode uses the definition's viewBox, so scaling is automatic relative to the node dimensions.

    const paths: { d: string; fill?: string; stroke?: string }[] = [];

    // Helper to process elements recursively
    const processElement = (el: Element) => {
        const tagName = el.tagName.toLowerCase();

        // Inherit or get explicit styling
        // Note: For complex SVGs, styles cascade. Simplification: use attribute or 'currentColor'.
        const fill = el.getAttribute('fill') || 'currentColor';
        const stroke = el.getAttribute('stroke') || 'currentColor';

        if (tagName === 'path') {
            const d = el.getAttribute('d');
            if (d) paths.push({ d, fill, stroke });
        } else if (tagName === 'circle') {
            const cx = parseFloat(el.getAttribute('cx') || '0');
            const cy = parseFloat(el.getAttribute('cy') || '0');
            const r = parseFloat(el.getAttribute('r') || '0');
            // Convert to path: M cx-r, cy A r,r 0 1,0 cx+r,cy A r,r 0 1,0 cx-r,cy
            const d = `M ${cx - r},${cy} A ${r},${r} 0 1,0 ${cx + r},${cy} A ${r},${r} 0 1,0 ${cx - r},${cy}`;
            paths.push({ d, fill, stroke });
        } else if (tagName === 'rect') {
            const x = parseFloat(el.getAttribute('x') || '0');
            const y = parseFloat(el.getAttribute('y') || '0');
            const w = parseFloat(el.getAttribute('width') || '0');
            const h = parseFloat(el.getAttribute('height') || '0');
            // Simplified rect path
            const d = `M ${x},${y} L ${x + w},${y} L ${x + w},${y + h} L ${x},${y + h} Z`;
            paths.push({ d, fill, stroke });
        } else if (tagName === 'g') {
            // Recurse into groups
            Array.from(el.children).forEach(processElement);
        }
    };

    Array.from(svg.children).forEach(processElement);

    return {
        type: `imported-${Date.now()}`,
        label,
        paths,
        viewBox: viewBox.join(' '),
        width: 100, // Default display width
        height: 100 * (height / width) // Preserve aspect ratio default
    };
}
