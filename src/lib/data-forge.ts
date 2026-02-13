import { XMLBuilder } from "fast-xml-parser";

export type DataType = "string" | "number" | "boolean" | "date" | "uuid";

export type ConstraintBase = {
  nullChance?: number; // 0..1
  link?: string; // path to another field in context, e.g. "parent.id"
};

export type StringConstraints = ConstraintBase & {
  minLength?: number;
  maxLength?: number;
  pattern?: string; // regex string
};

export type NumberConstraints = ConstraintBase & {
  min?: number;
  max?: number;
  precision?: number; // decimal places
};

export type ArrayConstraints = ConstraintBase & {
  minItems?: number;
  maxItems?: number;
};

export type LeafNode = {
  kind: "leaf";
  dataType: DataType;
  constraints?: StringConstraints | NumberConstraints | ConstraintBase;
  meta?: Record<string, unknown>;
};

export type BranchNode = {
  kind: "branch";
  properties: Record<string, BlueprintNode>;
  meta?: Record<string, unknown>;
};

export type ArrayNode = {
  kind: "array";
  items: BlueprintNode;
  constraints?: ArrayConstraints;
  meta?: Record<string, unknown>;
};

export type BlueprintNode = LeafNode | BranchNode | ArrayNode;

export type GenerateOptions = {
  includeMeta?: boolean;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function randInt(min: number, max: number) {
  if (max < min) [min, max] = [max, min];
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min: number, max: number, precision?: number) {
  if (max < min) [min, max] = [max, min];
  const value = Math.random() * (max - min) + min;
  if (typeof precision === "number" && precision >= 0) {
    const factor = Math.pow(10, precision);
    return Math.round(value * factor) / factor;
  }
  return value;
}

function randString(minLength = 4, maxLength = 12) {
  if (maxLength < minLength) [minLength, maxLength] = [maxLength, minLength];
  const length = randInt(minLength, maxLength);
  const chars = "abcdefghijklmnopqrstuvwxyz";
  let out = "";
  for (let i = 0; i < length; i++) {
    out += chars[randInt(0, chars.length - 1)];
  }
  return out;
}

function randDateIso() {
  const now = Date.now();
  const past = now - 1000 * 60 * 60 * 24 * 365 * 5;
  return new Date(randInt(past, now)).toISOString();
}

function randUuid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function getByPath(obj: unknown, path?: string): unknown {
  if (!path) return undefined;

  let current: unknown = obj;
  for (const part of path.split(".")) {
    if (!current || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function shouldNull(nullChance?: number) {
  if (nullChance === undefined) return false;
  const chance = clamp(nullChance, 0, 1);
  return Math.random() < chance;
}

function generateLeaf(node: LeafNode, ctx: unknown): unknown {
  const constraints = node.constraints || {};

  if ("link" in constraints && constraints.link) {
    const linked = getByPath(ctx, constraints.link);
    if (linked !== undefined) return linked;
  }

  if (shouldNull(constraints.nullChance)) return null;

  switch (node.dataType) {
    case "string": {
      const c = constraints as StringConstraints;
      if (c.pattern) {
        try {
          const re = new RegExp(c.pattern);
          for (let i = 0; i < 5; i++) {
            const s = randString(c.minLength ?? 4, c.maxLength ?? 12);
            if (re.test(s)) return s;
          }
        } catch {
          // ignore invalid regex and fall back
        }
      }
      return randString(c.minLength ?? 4, c.maxLength ?? 12);
    }
    case "number": {
      const c = constraints as NumberConstraints;
      return randFloat(c.min ?? 0, c.max ?? 100, c.precision);
    }
    case "boolean":
      return Math.random() > 0.5;
    case "date":
      return randDateIso();
    case "uuid":
    default:
      return randUuid();
  }
}

function withMeta(value: unknown, node: BlueprintNode, includeMeta?: boolean): unknown {
  if (!includeMeta) return value;
  return {
    value,
    _meta: node.meta || {},
  };
}

function generateNode(node: BlueprintNode, ctx: unknown, includeMeta?: boolean): unknown {
  if (node.kind === "leaf") {
    return withMeta(generateLeaf(node, ctx), node, includeMeta);
  }

  if (node.kind === "array") {
    if (shouldNull(node.constraints?.nullChance)) return withMeta(null, node, includeMeta);

    const minItems = node.constraints?.minItems ?? 1;
    const maxItems = node.constraints?.maxItems ?? Math.max(minItems, 3);
    const count = randInt(minItems, maxItems);

    const arr: unknown[] = [];
    for (let i = 0; i < count; i++) {
      arr.push(generateNode(node.items, ctx, includeMeta));
    }
    return withMeta(arr, node, includeMeta);
  }

  const obj: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(node.properties)) {
    // Pass the partially-built object as context so siblings can link to earlier fields.
    obj[key] = generateNode(child, obj, includeMeta);
  }
  return withMeta(obj, node, includeMeta);
}

export function generate(blueprint: BlueprintNode, count: number, options: GenerateOptions = {}) {
  const safeCount = Math.max(1, Math.floor(count));
  const records: unknown[] = [];

  for (let i = 0; i < safeCount; i++) {
    records.push(generateNode(blueprint, {}, options.includeMeta));
  }

  return records;
}

// -------------------------
// Field Builder (Flat Data)
// -------------------------

export type MockFieldType = "name" | "uuid" | "email" | "date" | "int" | "float" | "boolean" | "string";

export type MockField = {
  id: string;
  name: string;
  type: MockFieldType;
  constraints?: {
    min?: number;
    max?: number;
    start?: string; // YYYY-MM-DD
    end?: string; // YYYY-MM-DD
    minLength?: number;
    maxLength?: number;
    domains?: string[];
  };
};

const firstNames = ["Ava", "Liam", "Noah", "Mia", "Evelyn", "Lucas", "Maya", "Aria", "Ezra", "Leo"];
const lastNames = ["Patel", "Nguyen", "Kim", "Garcia", "Smith", "Johnson", "Brown", "Martin", "Lopez", "Davis"];
const defaultDomains = ["example.com", "mail.com", "test.dev", "corp.local", "demo.io"];

function randomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function randomDateFromRange(start?: string, end?: string) {
  const now = Date.now();
  const past = now - 1000 * 60 * 60 * 24 * 365 * 5;
  const startMs = start ? new Date(start).getTime() : past;
  const endMs = end ? new Date(end).getTime() : now;
  const validStart = Number.isFinite(startMs) ? startMs : past;
  const validEnd = Number.isFinite(endMs) ? endMs : now;
  return new Date(randInt(validStart, validEnd)).toISOString();
}

function mockValue(field: MockField): unknown {
  const constraints = field.constraints;

  switch (field.type) {
    case "name":
      return `${randomItem(firstNames)} ${randomItem(lastNames)}`;
    case "uuid":
      return randUuid();
    case "email": {
      const domains = constraints?.domains && constraints.domains.length > 0 ? constraints.domains : defaultDomains;
      return `${randomItem(firstNames).toLowerCase()}.${randomItem(lastNames).toLowerCase()}@${randomItem(domains)}`;
    }
    case "date":
      return randomDateFromRange(constraints?.start, constraints?.end);
    case "int":
      return randInt(constraints?.min ?? 1, constraints?.max ?? 1000);
    case "float":
      return randFloat(constraints?.min ?? 1, constraints?.max ?? 1000, 2);
    case "boolean":
      return Math.random() > 0.5;
    case "string":
    default: {
      if (constraints?.minLength || constraints?.maxLength) {
        const minLen = Math.max(1, constraints.minLength ?? 4);
        const maxLen = Math.max(minLen, constraints.maxLength ?? minLen + 6);
        return randString(minLen, maxLen);
      }
      return `value-${randInt(100, 999)}`;
    }
  }
}

export function generateMockRows(fields: MockField[], count: number) {
  const safeCount = Math.max(1, Math.floor(count));
  const rows: Record<string, unknown>[] = [];

  for (let i = 0; i < safeCount; i++) {
    const row: Record<string, unknown> = {};
    fields.forEach((field, idx) => {
      const key = field.name || `field_${idx + 1}`;
      row[key] = mockValue(field);
    });
    rows.push(row);
  }

  return rows;
}

export function mockRowsToOutput(rows: Record<string, unknown>[], format: "json" | "xml") {
  if (format === "json") return JSON.stringify(rows, null, 2);

  const builder = new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    format: true,
    indentBy: "  ",
  });

  return builder.build({ items: { item: rows } });
}
