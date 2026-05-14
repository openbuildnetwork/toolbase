
import { ShapeDefinition } from '../../types/open-draw.types';

export class ShapeFactory {
    /**
     * Generates a rounded rectangle path.
     * @param w Width (default 100)
     * @param h Height (default 100)
     * @param r Corner radius (default 10)
     */
    static createRoundedRect(w: number = 100, h: number = 100, r: number = 10): string {
        // Ensure radius doesn't exceed half of width or height
        const safeR = Math.min(r, w / 2, h / 2);

        // M r,0
        // h w-2r
        // a r,r 0 0 1 r,r
        // v h-2r
        // a r,r 0 0 1 -r,r
        // h -(w-2r)
        // a r,r 0 0 1 -r,-r
        // v -(h-2r)
        // a r,r 0 0 1 r,-r
        // z

        return `M${safeR},0 ` +
            `h${w - 2 * safeR} ` +
            `a${safeR},${safeR} 0 0 1 ${safeR},${safeR} ` +
            `v${h - 2 * safeR} ` +
            `a${safeR},${safeR} 0 0 1 -${safeR},${safeR} ` +
            `h-${w - 2 * safeR} ` +
            `a${safeR},${safeR} 0 0 1 -${safeR},-${safeR} ` +
            `v-${h - 2 * safeR} ` +
            `a${safeR},${safeR} 0 0 1 ${safeR},-${safeR} ` +
            `z`;
    }

    /**
     * Generates a regular polygon with N sides.
     * @param sides Number of sides (3-20)
     * @param radius Radius of the polygon (default 50)
     */
    static createRegularPolygon(sides: number, radius: number = 50): string {
        if (sides < 3) return '';

        const cx = 50;
        const cy = 50;
        const points: string[] = [];

        for (let i = 0; i < sides; i++) {
            // Angle in radians. Subtract PI/2 to start at top.
            const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
            const x = cx + radius * Math.cos(angle);
            const y = cy + radius * Math.sin(angle);
            points.push(`${x.toFixed(2)},${y.toFixed(2)}`);
        }

        return `M${points.join(' L')} Z`;
    }

    /**
     * Generates a Cylinder path (Database/Storage).
     * @param ellipseHeight Height of the top/bottom ellipse relative to 100x100 box
     */
    static createCylinder(ellipseHeight: number = 15): ShapeDefinition {
        // Top ellipse
        // M0,h Q50,-h 100,h (top curve)
        // M0,h Q50,3h 100,h (bottom curve of top ellipse)
        // Sides: L100,100-h ...

        // Simplified for 100x100 viewbox
        // Top ellipse is centered at y=eh
        const eh = ellipseHeight;

        return {
            type: 'cylinder',
            label: 'Cylinder',
            paths: [
                // Body and bottom ellipse
                {
                    d: `M0,${eh} Q50,${-eh * 0.5} 100,${eh} L100,${100 - eh} Q50,${100 + eh * 0.5} 0,${100 - eh} Z`,
                    fill: '', // Use default
                    stroke: 'currentColor'
                },
                // Top ellipse visual line
                {
                    d: `M0,${eh} Q50,${eh * 2.5} 100,${eh}`,
                    fill: 'none',
                    stroke: 'currentColor'
                }
            ],
            viewBox: '0 0 100 100',
            width: 100,
            height: 120
        };
    }

    /**
    * Generates a Callout (Speech Bubble) with adjustable tail.
    * @param tailX Tail tip X position (0-100)
    * @param tailY Tail tip Y position (can be outside 0-100)
    * @param baseWidth Width of the tail base
    */
    static createCallout(tailX: number = 20, tailY: number = 120, baseWidth: number = 20): string {
        // Simple rounded rectangle with a tail
        const r = 10; // corner radius
        const w = 100;
        const h = 80; // Bubble body height (leaving space for tail if it points down)

        // Let's assume standard speech bubble: Box 0,0 to 100,80. Tail points to tailX, tailY.

        // Start top-left
        let d = `M${r},0 L${w - r},0 Q${w},0 ${w},${r} L${w},${h - r} Q${w},${h} ${w - r},${h}`;

        // Bottom edge with tail
        // We need to find where the tail starts/ends on the bottom edge
        // Tail base center is closest point on rect to tail tip?
        // Let's force tail on bottom for this primitive

        const tailCenter = Math.min(Math.max(tailX, 10), 90);
        const halfBase = baseWidth / 2;

        d += ` L${tailCenter + halfBase},${h}`;
        d += ` L${tailX},100`; // Tail tip is hardcoded to bottom for "Basic" callout
        d += ` L${tailCenter - halfBase},${h}`;

        d += ` L${r},${h} Q0,${h} 0,${h - r} L0,${r} Q0,0 ${r},0 Z`;

        return d;
    }
}
