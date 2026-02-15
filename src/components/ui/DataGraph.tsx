"use client";

import React, { useMemo } from "react";
import { cn } from "@/lib/utils";

type GraphNode = {
  id: string;
  label: string;
  subLabel?: string;
  path: string;
  children: GraphNode[];
};

type PositionedNode = GraphNode & {
  x: number;
  y: number;
  depth: number;
  subtreeHeight: number;
};

export type DataGraphProps = {
  value: unknown;
  rootLabel?: string;
  className?: string;
  maxDepth?: number;
  maxNodes?: number;
  onSelectPath?: (path: string) => void;
};

function typeLabel(value: unknown) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function buildTree(value: unknown, rootLabel: string, maxDepth: number, maxNodes: number) {
  let counter = 0;
  let truncated = false;

  const makeNode = (label: string, subLabel: string | undefined, path: string, children: GraphNode[]): GraphNode => {
    counter += 1;
    if (counter > maxNodes) {
      truncated = true;
      return {
        id: `n-${counter}`,
        label: "…",
        subLabel: "truncated",
        path,
        children: [],
      };
    }
    return { id: `n-${counter}`, label, subLabel, path, children };
  };

  const visit = (nodeValue: unknown, label: string, path: string, depth: number): GraphNode => {
    const t = typeLabel(nodeValue);
    const sub = t === "object" || t === "array" ? t : `${t}${t === "string" ? "" : ""}`;

    if (depth >= maxDepth) {
      return makeNode(label, `${sub} (max depth)`, path, []);
    }

    if (Array.isArray(nodeValue)) {
      const children = nodeValue.slice(0, 50).map((child, idx) => {
        const childPath = path ? `${path}.${idx}` : String(idx);
        return visit(child, `[${idx}]`, childPath, depth + 1);
      });
      if (nodeValue.length > 50) {
        children.push(makeNode("…", `${nodeValue.length - 50} more`, path ? `${path}.…` : "…", []));
      }
      return makeNode(label, `array (${nodeValue.length})`, path, children);
    }

    if (nodeValue && typeof nodeValue === "object") {
      const record = nodeValue as Record<string, unknown>;
      const keys = Object.keys(record).slice(0, 50);
      const children = keys.map((key) => {
        const childPath = path ? `${path}.${key}` : key;
        return visit(record[key], key, childPath, depth + 1);
      });
      const total = Object.keys(record).length;
      if (total > 50) {
        children.push(makeNode("…", `${total - 50} more`, path ? `${path}.…` : "…", []));
      }
      return makeNode(label, `object (${total})`, path, children);
    }

    // primitives
    let preview = "";
    if (typeof nodeValue === "string") preview = nodeValue.length > 18 ? nodeValue.slice(0, 18) + "…" : nodeValue;
    else if (typeof nodeValue === "number" || typeof nodeValue === "boolean") preview = String(nodeValue);
    else if (nodeValue === null) preview = "null";
    return makeNode(label, `${t}${preview ? `: ${preview}` : ""}`, path, []);
  };

  const root = visit(value, rootLabel, rootLabel, 0);
  return { root, truncated };
}

function layoutTree(root: GraphNode) {
  const NODE_W = 240;
  const NODE_H = 52;
  const COL_GAP = 72;
  const ROW_GAP = 18;
  const PADDING = 18;

  const positioned: PositionedNode[] = [];
  const edges: { from: string; to: string }[] = [];

  const measure = (node: GraphNode): number => {
    if (node.children.length === 0) return NODE_H;
    const childrenHeight = node.children.map(measure).reduce((a, b) => a + b, 0);
    const gaps = Math.max(0, node.children.length - 1) * ROW_GAP;
    return Math.max(NODE_H, childrenHeight + gaps);
  };

  const place = (node: GraphNode, depth: number, top: number): PositionedNode => {
    const subtreeHeight = measure(node);
    const x = PADDING + depth * (NODE_W + COL_GAP);
    const y = top + (subtreeHeight - NODE_H) / 2;

    const pnode: PositionedNode = { ...node, x, y, depth, subtreeHeight };
    positioned.push(pnode);

    let childTop = top;
    for (const child of node.children) {
      const childHeight = measure(child);
      const placedChild = place(child, depth + 1, childTop);
      edges.push({ from: pnode.id, to: placedChild.id });
      childTop += childHeight + ROW_GAP;
    }

    return pnode;
  };

  place(root, 0, PADDING);

  const maxX = positioned.reduce((m, n) => Math.max(m, n.x), 0);
  const maxY = positioned.reduce((m, n) => Math.max(m, n.y), 0);
  const width = maxX + NODE_W + PADDING;
  const height = maxY + NODE_H + PADDING;

  return { positioned, edges, width, height, constants: { NODE_W, NODE_H } };
}

export function DataGraph({
  value,
  rootLabel = "root",
  className,
  maxDepth = 7,
  maxNodes = 260,
  onSelectPath,
}: DataGraphProps) {
  const { root, truncated } = useMemo(() => buildTree(value, rootLabel, maxDepth, maxNodes), [value, rootLabel, maxDepth, maxNodes]);
  const { positioned, edges, width, height, constants } = useMemo(() => layoutTree(root), [root]);

  const byId = useMemo(() => {
    const map = new Map<string, PositionedNode>();
    positioned.forEach((n) => map.set(n.id, n));
    return map;
  }, [positioned]);

  return (
    <div className={cn("rounded-xl border border-gray-200 bg-white overflow-auto", className)}>
      {truncated && (
        <div className="px-4 py-2 text-xs text-amber-700 bg-amber-50 border-b border-amber-100">
          Graph truncated for performance.
        </div>
      )}
      <svg width={width} height={height} role="img" aria-label="Data graph">
        <g stroke="rgba(15, 23, 42, 0.22)" strokeWidth={2.5} fill="none">
          {edges.map((e) => {
            const from = byId.get(e.from);
            const to = byId.get(e.to);
            if (!from || !to) return null;
            const x1 = from.x + constants.NODE_W;
            const y1 = from.y + constants.NODE_H / 2;
            const x2 = to.x;
            const y2 = to.y + constants.NODE_H / 2;
            const mid = (x1 + x2) / 2;
            const d = `M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`;
            return <path key={`${e.from}-${e.to}`} d={d} />;
          })}
        </g>

        {positioned.map((n) => {
          const fill = "rgba(37, 99, 235, 0.10)";
          const stroke = "rgba(37, 99, 235, 0.30)";
          return (
            <g
              key={n.id}
              transform={`translate(${n.x}, ${n.y})`}
              onClick={() => onSelectPath?.(n.path)}
              style={{ cursor: onSelectPath ? "pointer" : "default" }}
            >
              <rect width={constants.NODE_W} height={constants.NODE_H} rx={14} fill={fill} stroke={stroke} strokeWidth={2} />
              <text x={14} y={22} fontSize={13} fill="rgba(17, 24, 39, 0.95)" fontWeight={700}>
                {n.label.length > 26 ? n.label.slice(0, 26) + "…" : n.label}
              </text>
              <text x={14} y={40} fontSize={11} fill="rgba(55, 65, 81, 0.85)" fontWeight={600}>
                {(n.subLabel || "").length > 34 ? (n.subLabel || "").slice(0, 34) + "…" : (n.subLabel || "")}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

"use client";

import React, { useMemo } from "react";
import { cn } from "@/lib/utils";

type GraphNode = {
  id: string;
  label: string;
  subLabel?: string;
  path: string;
  children: GraphNode[];
  canExpand?: boolean;
  expanded?: boolean;
};

type PositionedNode = GraphNode & {
  x: number;
  y: number;
  depth: number;
  subtreeHeight: number;
};

export type DataGraphProps = {
  value: unknown;
  rootLabel?: string;
  className?: string;
  maxDepth?: number;
  maxNodes?: number;
  defaultExpandDepth?: number;
  expandedPaths?: Set<string>;
  onTogglePath?: (path: string) => void;
  onSelectPath?: (path: string) => void;
};

function typeLabel(value: unknown) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function buildTree(
  value: unknown,
  rootLabel: string,
  maxDepth: number,
  maxNodes: number,
  defaultExpandDepth: number,
  expandedPaths: Set<string>
) {
  let counter = 0;
  let truncated = false;

  const makeNode = (
    label: string,
    subLabel: string | undefined,
    path: string,
    children: GraphNode[],
    extra?: Pick<GraphNode, "canExpand" | "expanded">
  ): GraphNode => {
    counter += 1;
    if (counter > maxNodes) {
      truncated = true;
      return {
        id: `n-${counter}`,
        label: "…",
        subLabel: "truncated",
        path,
        children: [],
        canExpand: false,
        expanded: false,
      };
    }
    return { id: `n-${counter}`, label, subLabel, path, children, ...extra };
  };

  const visit = (nodeValue: unknown, label: string, path: string, depth: number): GraphNode => {
    const t = typeLabel(nodeValue);
    const sub = t === "object" || t === "array" ? t : `${t}${t === "string" ? "" : ""}`;

    if (depth >= maxDepth) {
      return makeNode(label, `${sub} (max depth)`, path, []);
    }

    const isExpanded = depth < defaultExpandDepth || expandedPaths.has(path);

    if (Array.isArray(nodeValue)) {
      if (!isExpanded) {
        return makeNode(label, `array (${nodeValue.length})`, path, [], { canExpand: nodeValue.length > 0, expanded: false });
      }

      const children = nodeValue.slice(0, 50).map((child, idx) => {
        const childPath = `${path}.${idx}`;
        return visit(child, `[${idx}]`, childPath, depth + 1);
      });
      if (nodeValue.length > 50) {
        children.push(makeNode("…", `${nodeValue.length - 50} more`, `${path}.…`, []));
      }
      return makeNode(label, `array (${nodeValue.length})`, path, children, { canExpand: nodeValue.length > 0, expanded: true });
    }

    if (nodeValue && typeof nodeValue === "object") {
      const record = nodeValue as Record<string, unknown>;
      const allKeys = Object.keys(record);
      const total = allKeys.length;
      const keys = allKeys.slice(0, 50);
      if (!isExpanded) {
        return makeNode(label, `object (${total})`, path, [], { canExpand: total > 0, expanded: false });
      }

      const children = keys.map((key) => {
        const childPath = `${path}.${key}`;
        return visit(record[key], key, childPath, depth + 1);
      });
      if (total > 50) {
        children.push(makeNode("…", `${total - 50} more`, `${path}.…`, []));
      }
      return makeNode(label, `object (${total})`, path, children, { canExpand: total > 0, expanded: true });
    }

    // primitives
    let preview = "";
    if (typeof nodeValue === "string") preview = nodeValue.length > 18 ? nodeValue.slice(0, 18) + "…" : nodeValue;
    else if (typeof nodeValue === "number" || typeof nodeValue === "boolean") preview = String(nodeValue);
    else if (nodeValue === null) preview = "null";
    return makeNode(label, `${t}${preview ? `: ${preview}` : ""}`, path, []);
  };

  // Use a stable root path for toggling, regardless of the displayed label.
  const root = visit(value, rootLabel, "$", 0);
  return { root, truncated };
}

function layoutTree(root: GraphNode) {
  const NODE_W = 240;
  const NODE_H = 52;
  const COL_GAP = 72;
  const ROW_GAP = 18;
  const PADDING = 18;

  const positioned: PositionedNode[] = [];
  const edges: { from: string; to: string }[] = [];

  const measure = (node: GraphNode): number => {
    if (node.children.length === 0) return NODE_H;
    const childrenHeight = node.children.map(measure).reduce((a, b) => a + b, 0);
    const gaps = Math.max(0, node.children.length - 1) * ROW_GAP;
    return Math.max(NODE_H, childrenHeight + gaps);
  };

  const place = (node: GraphNode, depth: number, top: number): PositionedNode => {
    const subtreeHeight = measure(node);
    const x = PADDING + depth * (NODE_W + COL_GAP);
    const y = top + (subtreeHeight - NODE_H) / 2;

    const pnode: PositionedNode = { ...node, x, y, depth, subtreeHeight };
    positioned.push(pnode);

    let childTop = top;
    for (const child of node.children) {
      const childHeight = measure(child);
      const placedChild = place(child, depth + 1, childTop);
      edges.push({ from: pnode.id, to: placedChild.id });
      childTop += childHeight + ROW_GAP;
    }

    return pnode;
  };

  place(root, 0, PADDING);

  const maxX = positioned.reduce((m, n) => Math.max(m, n.x), 0);
  const maxY = positioned.reduce((m, n) => Math.max(m, n.y), 0);
  const width = maxX + NODE_W + PADDING;
  const height = maxY + NODE_H + PADDING;

  return { positioned, edges, width, height, constants: { NODE_W, NODE_H } };
}

export function DataGraph({
  value,
  rootLabel = "root",
  className,
  maxDepth = 7,
  maxNodes = 260,
  defaultExpandDepth = 2,
  expandedPaths,
  onTogglePath,
  onSelectPath,
}: DataGraphProps) {
  const expanded = useMemo(() => expandedPaths ?? new Set<string>(), [expandedPaths]);
  const { root, truncated } = useMemo(
    () => buildTree(value, rootLabel, maxDepth, maxNodes, defaultExpandDepth, expanded),
    [value, rootLabel, maxDepth, maxNodes, defaultExpandDepth, expanded]
  );
  const { positioned, edges, width, height, constants } = useMemo(() => layoutTree(root), [root]);

  const byId = useMemo(() => {
    const map = new Map<string, PositionedNode>();
    positioned.forEach((n) => map.set(n.id, n));
    return map;
  }, [positioned]);

  return (
    <div className={cn("rounded-xl border border-gray-200 bg-white overflow-auto", className)}>
      {truncated && (
        <div className="px-4 py-2 text-xs text-amber-700 bg-amber-50 border-b border-amber-100">
          Graph truncated for performance.
        </div>
      )}
      <svg width={width} height={height} role="img" aria-label="Data graph">
        <g stroke="rgba(15, 23, 42, 0.22)" strokeWidth={2.5} fill="none">
          {edges.map((e) => {
            const from = byId.get(e.from);
            const to = byId.get(e.to);
            if (!from || !to) return null;
            const x1 = from.x + constants.NODE_W;
            const y1 = from.y + constants.NODE_H / 2;
            const x2 = to.x;
            const y2 = to.y + constants.NODE_H / 2;
            const mid = (x1 + x2) / 2;
            const d = `M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`;
            return <path key={`${e.from}-${e.to}`} d={d} />;
          })}
        </g>

        {positioned.map((n) => {
          const fill = "rgba(37, 99, 235, 0.10)";
          const stroke = "rgba(37, 99, 235, 0.30)";
          const showToggle = !!onTogglePath && !!n.canExpand;
          return (
            <g
              key={n.id}
              transform={`translate(${n.x}, ${n.y})`}
              onClick={() => onSelectPath?.(n.path)}
              style={{ cursor: onSelectPath ? "pointer" : "default" }}
            >
              <rect width={constants.NODE_W} height={constants.NODE_H} rx={14} fill={fill} stroke={stroke} strokeWidth={2} />
              {showToggle && (
                <g
                  onClick={(e) => {
                    e.stopPropagation();
                    onTogglePath(n.path);
                  }}
                  style={{ cursor: "pointer" }}
                >
                  <rect x={constants.NODE_W - 34} y={10} width={22} height={22} rx={8} fill="rgba(255,255,255,0.85)" stroke="rgba(15,23,42,0.12)" />
                  <text x={constants.NODE_W - 23} y={26} textAnchor="middle" fontSize={14} fontWeight={900} fill="rgba(17,24,39,0.75)">
                    {n.expanded ? "−" : "+"}
                  </text>
                </g>
              )}
              <text x={14} y={22} fontSize={13} fill="rgba(17, 24, 39, 0.95)" fontWeight={700}>
                {n.label.length > 26 ? n.label.slice(0, 26) + "…" : n.label}
              </text>
              <text x={14} y={40} fontSize={11} fill="rgba(55, 65, 81, 0.85)" fontWeight={600}>
                {(n.subLabel || "").length > 34 ? (n.subLabel || "").slice(0, 34) + "…" : (n.subLabel || "")}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
