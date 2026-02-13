// Dynamically generate icon paths based on usage
export const appIcons = new Proxy({} as Record<string, string>, {
    get: (_, prop: string) => {
        // Most thumbnails are PNGs, but some tools use SVG for sharper rendering.
        if (prop === "omni-parse") return `/assets/thumbnails/${prop}.svg`;
        if (prop === "data-forge") return `/assets/thumbnails/${prop}.svg`;
        return `/assets/thumbnails/${prop}.png`;
    },
});
