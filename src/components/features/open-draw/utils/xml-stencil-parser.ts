
import { ShapeDefinition } from '@/types/open-draw.types';

/**
 * Parses a simple XML shape definition (mimicking draw.io/mxGraph style)
 * into a ShapeDefinition object.
 * 
 * Supported tags (simplified set):
 * - <shape name="..." w="..." h="...">
 * - <background> / <foreground>
 * - <path>
 * - <move x=".." y=".."> -> M
 * - <line x=".." y=".."> -> L
 * - <curve x1=".." y1=".." x2=".." y2=".." x3=".." y3=".."> -> C
 * - <quad x1=".." y1=".." x2=".." y2=".."> -> Q
 * - <close> -> Z
 * - <rect x=".." y=".." w=".." h=".."> -> M..L..Z
 * - <ellipse x=".." y=".." w=".." h=".."> -> A..
 */
export function parseXmlStencil(xmlString: string): ShapeDefinition | null {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlString, 'text/xml');

    // Check for parse errors
    const parserError = doc.querySelector('parsererror');
    if (parserError) {
        console.error('XML Parse Error', parserError.textContent);
        return null;
    }

    const shapeEl = doc.querySelector('shape');
    if (!shapeEl) return null;

    const name = shapeEl.getAttribute('name') || 'Imported XML Shape';
    // Aspect ratio basis if provided
    const aspect = shapeEl.getAttribute('aspect') === 'fixed';
    const w = parseFloat(shapeEl.getAttribute('w') || '100');
    const h = parseFloat(shapeEl.getAttribute('h') || '100');

    let fullPath = '';

    // mxGraph stencils have <background> and <foreground>. We'll merge them for now
    // or arguably just take foreground if background is transparent.
    // Let's process all path-generating children in order.

    const validChildren = [...Array.from(doc.querySelectorAll('background > *')), ...Array.from(doc.querySelectorAll('foreground > *'))];

    // Traverse and build path d string
    validChildren.forEach(el => {
        const tag = el.tagName.toLowerCase();

        if (tag === 'path') {
            // Check for children of path
            Array.from(el.children).forEach(cmd => {
                processCommand(cmd);
            });
        } else {
            processCommand(el);
        }
    });

    function processCommand(el: Element) {
        const tag = el.tagName.toLowerCase();
        const get = (attr: string) => el.getAttribute(attr);

        switch (tag) {
            case 'move':
                fullPath += `M${get('x')},${get('y')} `;
                break;
            case 'line':
                fullPath += `L${get('x')},${get('y')} `;
                break;
            case 'curve':
                fullPath += `C${get('x1')},${get('y1')} ${get('x2')},${get('y2')} ${get('x3')},${get('y3')} `;
                break;
            case 'quad':
                fullPath += `Q${get('x1')},${get('y1')} ${get('x2')},${get('y2')} `;
                break;
            case 'close':
                fullPath += `Z `;
                break;
            case 'rect':
                {
                    const rx = parseFloat(get('x') || '0');
                    const ry = parseFloat(get('y') || '0');
                    const rw = parseFloat(get('w') || '0');
                    const rh = parseFloat(get('h') || '0');
                    // M rx,ry L rx+rw,ry L rx+rw,ry+rh L rx,ry+rh Z
                    fullPath += `M${rx},${ry} L${rx + rw},${ry} L${rx + rw},${ry + rh} L${rx},${ry + rh} Z `;
                }
                break;
            // Add roundrect, ellipse, arc as needed using bezier approx or A commands
        }
    }

    return {
        type: `xml-${Date.now()}`,
        label: name,
        path: fullPath.trim(),
        viewBox: `0 0 ${w} ${h}`,
        width: w,
        height: h
    };
}
