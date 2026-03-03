"use client";

import React from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type DataGraphProps = {
  value: unknown;
  rootLabel?: string;
  className?: string;
  maxDepth?: number;
  maxNodes?: number;
  defaultExpandDepth?: number;
  expandedPaths?: Set<string>;
  onTogglePath?: (path: string) => void;
};

type GraphNodeProps = {
  label: string;
  value: unknown;
  path: string;
  depth: number;
  nodeBudget: { count: number; max: number };
  maxDepth: number;
  defaultExpandDepth: number;
  expandedPaths?: Set<string>;
  onTogglePath?: (path: string) => void;
};

function isObjectLike(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function getValueType(value: unknown): "object" | "array" | "string" | "number" | "boolean" | "null" {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (isObjectLike(value)) return "object";
  if (typeof value === "string") return "string";
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  return "string";
}

function getPreview(value: unknown): string {
  const type = getValueType(value);

  if (type === "object") return `{${Object.keys(value as Record<string, unknown>).length} keys}`;
  if (type === "array") return `[${(value as unknown[]).length} items]`;
  if (type === "string") return `"${String(value)}"`;
  if (type === "null") return "null";

  return String(value);
}

function GraphNode({
  label,
  value,
  path,
  depth,
  nodeBudget,
  maxDepth,
  defaultExpandDepth,
  expandedPaths,
  onTogglePath,
}: GraphNodeProps) {
  if (nodeBudget.count >= nodeBudget.max) return null;
  nodeBudget.count += 1;

  const type = getValueType(value);
  const hasChildren =
    (type === "object" && Object.keys(value as Record<string, unknown>).length > 0) ||
    (type === "array" && (value as unknown[]).length > 0);
  const depthLimitReached = depth >= maxDepth;
  const canExpand = hasChildren && !depthLimitReached;
  const isExpanded = canExpand && (expandedPaths?.has(path) ?? depth < defaultExpandDepth);

  const renderChildren = () => {
    if (!isExpanded || !canExpand) return null;

    if (type === "array") {
      return (value as unknown[]).map((child, index) => {
        const childPath = `${path}[${index}]`;
        return (
          <GraphNode
            key={childPath}
            label={`[${index}]`}
            value={child}
            path={childPath}
            depth={depth + 1}
            nodeBudget={nodeBudget}
            maxDepth={maxDepth}
            defaultExpandDepth={defaultExpandDepth}
            expandedPaths={expandedPaths}
            onTogglePath={onTogglePath}
          />
        );
      });
    }

    return Object.entries(value as Record<string, unknown>).map(([key, child]) => {
      const childPath = `${path}.${key}`;
      return (
        <GraphNode
          key={childPath}
          label={key}
          value={child}
          path={childPath}
          depth={depth + 1}
          nodeBudget={nodeBudget}
          maxDepth={maxDepth}
          defaultExpandDepth={defaultExpandDepth}
          expandedPaths={expandedPaths}
          onTogglePath={onTogglePath}
        />
      );
    });
  };

  return (
    <div>
      <div
        className="group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-gray-50"
        style={{ paddingLeft: `${depth * 14 + 8}px` }}
      >
        {canExpand ? (
          <button
            type="button"
            onClick={() => onTogglePath?.(path)}
            className="inline-flex h-4 w-4 items-center justify-center rounded text-gray-500 hover:bg-gray-100"
          >
            {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        ) : (
          <span className="inline-block h-4 w-4" />
        )}

        <span className="text-xs font-semibold text-gray-700">{label}</span>
        <span className="text-xs text-gray-400">:</span>
        <span className="truncate text-xs text-gray-600">{getPreview(value)}</span>
        <span className="ml-auto rounded bg-gray-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-gray-500">
          {type}
        </span>
      </div>

      {renderChildren()}
    </div>
  );
}

export function DataGraph({
  value,
  rootLabel = "root",
  className,
  maxDepth = 12,
  maxNodes = 600,
  defaultExpandDepth = 2,
  expandedPaths,
  onTogglePath,
}: DataGraphProps) {
  const nodeBudget = React.useMemo(() => ({ count: 0, max: Math.max(1, maxNodes) }), [maxNodes]);
  const safeMaxDepth = Math.max(1, maxDepth);
  const safeDefaultExpandDepth = Math.max(0, defaultExpandDepth);

  return (
    <div className={cn("overflow-auto rounded-xl border border-gray-200 bg-white p-2", className)}>
      <GraphNode
        label={rootLabel}
        value={value}
        path={rootLabel}
        depth={0}
        nodeBudget={nodeBudget}
        maxDepth={safeMaxDepth}
        defaultExpandDepth={safeDefaultExpandDepth}
        expandedPaths={expandedPaths}
        onTogglePath={onTogglePath}
      />
      {nodeBudget.count >= nodeBudget.max && (
        <div className="border-t border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          Node limit reached ({maxNodes}). Increase the node cap to render more.
        </div>
      )}
    </div>
  );
}
