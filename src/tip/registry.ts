/**
 * TIPToolRegistry — Tool discovery and pipeline auto-routing
 *
 * The registry is the intelligence hub of TIP.
 * Tools register themselves here once; the registry then powers:
 *  - Step selector UI (what tools can come next?)
 *  - Pipeline validation (does this chain typecheck?)
 *  - Auto-discovery (what's the shortest path from PDF to PNG?)
 *
 * Design: module-level Map, exported as a singleton object.
 * This means registration is global and persistent for the lifetime
 * of the browser tab — exactly what we want.
 */

import type { TIPContentType, TIPTool } from './protocol';

/** Module-private tool store */
const tools = new Map<string, TIPTool>();

export const TIPToolRegistry = {
  // ── Registration ────────────────────────────────────────────────────────────

  /**
   * Register a TIP-compliant tool.
   * Logs a warning (not an error) if overwriting an existing registration
   * so hot-reloading in development doesn't throw.
   */
  register(tool: TIPTool): void {
    if (tools.has(tool.id)) {
      console.warn(`TIP: Tool "${tool.id}" is already registered. Overwriting.`);
    }
    tools.set(tool.id, tool);
  },

  /**
   * Register multiple tools at once.
   * Equivalent to calling register() for each tool in sequence.
   */
  registerAll(toolList: TIPTool[]): void {
    toolList.forEach((t) => this.register(t));
  },

  // ── Retrieval ───────────────────────────────────────────────────────────────

  /** Get a tool by its ID. Returns undefined if not registered. */
  get(id: string): TIPTool | undefined {
    return tools.get(id);
  },

  /** Return all registered tools as an array (insertion order). */
  getAll(): TIPTool[] {
    return Array.from(tools.values());
  },

  /**
   * Return the number of registered tools.
   * Useful for asserting registration is complete in tests.
   */
  size(): number {
    return tools.size;
  },

  /**
   * Unregister all tools. Primarily for use in unit tests to get a clean slate.
   * Should NOT be called in production code.
   */
  clear(): void {
    tools.clear();
  },

  // ── Discovery ───────────────────────────────────────────────────────────────

  /** Find all tools that declare the given content type in their `consumes` list. */
  findConsumers(contentType: TIPContentType): TIPTool[] {
    return this.getAll().filter((t) => t.consumes.includes(contentType));
  },

  /** Find all tools that declare the given content type in their `produces` list. */
  findProducers(contentType: TIPContentType): TIPTool[] {
    return this.getAll().filter((t) => t.produces.includes(contentType));
  },

  /**
   * THE STEP SELECTOR FUNCTION.
   *
   * Given the current output content type, which tools can come next?
   * Checks both:
   *  1. Direct compatibility: tool.consumes.includes(currentContentType)
   *  2. Via transformer: canTransform(currentContentType, accepted) for any accepted type
   *
   * Powers the step selector in the Pipeline Builder UI.
   *
   * @param currentContentType - The contentType the previous step produced
   * @param canTransform       - Function from transformers.ts (injected to avoid circular deps)
   */
  findNextSteps(
    currentContentType: TIPContentType,
    canTransform: (from: TIPContentType, to: TIPContentType) => boolean
  ): TIPTool[] {
    return this.getAll().filter((tool) =>
      tool.consumes.some(
        (accepted) =>
          accepted === currentContentType ||
          canTransform(currentContentType, accepted)
      )
    );
  },

  /**
   * AUTO-DISCOVER PIPELINE.
   *
   * Given a starting content type and a target content type, find all valid
   * paths through registered tools that transform `from` into `to`.
   *
   * Uses BFS — guarantees the shortest paths are returned first.
   * Results are sorted by path length (shortest first).
   *
   * This function powers:
   *  - "What's the shortest way to get from PDF to PNG?" queries
   *  - Future AI-suggested pipeline recommendations
   *  - Pipeline validation (does a path exist at all?)
   *
   * @param from     - Starting content type (e.g., 'application/pdf')
   * @param to       - Target content type (e.g., 'image/png')
   * @param maxDepth - Maximum chain length to explore (default 5, prevents infinite loops)
   *
   * @returns Array of TIPTool arrays — each inner array is one valid pipeline.
   *          Returns [] if no path exists.
   *
   * @example
   * const paths = TIPToolRegistry.discoverPath('application/pdf', 'image/png');
   * // paths[0] → the shortest valid tool chain
   * // paths[0].map(t => t.id) → ['magic-pdf/pdf-to-images']
   */
  discoverPath(
    from: TIPContentType,
    to: TIPContentType,
    maxDepth = 5
  ): TIPTool[][] {
    type QueueItem = { path: TIPTool[]; currentType: TIPContentType };

    const queue: QueueItem[] = [{ path: [], currentType: from }];
    const results: TIPTool[][] = [];

    while (queue.length > 0) {
      const { path, currentType } = queue.shift()!;

      // Guard against runaway paths
      if (path.length >= maxDepth) continue;

      const candidates = this.findConsumers(currentType);

      for (const tool of candidates) {
        // Avoid cycles — don't add a tool already in the current path
        if (path.some((t) => t.id === tool.id)) continue;

        const newPath = [...path, tool];

        for (const outputType of tool.produces) {
          if (outputType === to) {
            // We reached the target type — record this path
            results.push(newPath);
          } else {
            // Keep exploring from this output type
            queue.push({ path: newPath, currentType: outputType });
          }
        }
      }
    }

    // Sort by path length — shortest first (BFS already ensures this,
    // but an explicit sort makes the contract clear and handles equal lengths)
    return results.sort((a, b) => a.length - b.length);
  },
};
