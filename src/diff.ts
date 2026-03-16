import type { DiffNode, DiffStatus } from './types';

interface DiffOptions {
  caseInsensitiveKeys: boolean;
  sortKeys: boolean;
  missingLabel: string;
}

export interface DiffSummary {
  total: number;
  changed: number;
  typeChanged: number;
  added: number;
  removed: number;
  keyChanged: number;
  valueChanged: number;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getTypeLabel(value: unknown) {
  if (Array.isArray(value)) {
    return 'array';
  }

  if (value === null) {
    return 'null';
  }

  return typeof value;
}

function formatValue(value: unknown, missingLabel: string) {
  if (value === undefined) {
    return missingLabel;
  }

  if (typeof value === 'string') {
    return `"${value}"`;
  }

  if (typeof value === 'number' || typeof value === 'boolean' || value === null) {
    return String(value);
  }

  if (Array.isArray(value)) {
    return `Array(${value.length})`;
  }

  if (isPlainObject(value)) {
    return `Object(${Object.keys(value).length})`;
  }

  return String(value);
}

function normalizeKey(key: string, caseInsensitiveKeys: boolean) {
  return caseInsensitiveKeys ? key.toLowerCase() : key;
}

function makePath(parentPath: string, segment: string) {
  return parentPath ? `${parentPath}.${segment}` : segment;
}

function comparePrimitive(left: unknown, right: unknown): DiffStatus {
  if (left === right) {
    return 'equal';
  }

  if (getTypeLabel(left) !== getTypeLabel(right)) {
    return 'type-changed';
  }

  return 'changed';
}

function hasNodeDifference(node: DiffNode) {
  return node.keyChanged || node.valueChanged;
}

function shouldCountAsPrimaryDiff(node: DiffNode) {
  if (!hasNodeDifference(node)) {
    return false;
  }

  if (!node.children?.length) {
    return true;
  }

  return node.status === 'added' || node.status === 'removed';
}

function buildObjectKeyOrder(
  left: Record<string, unknown>,
  right: Record<string, unknown>,
  options: DiffOptions,
) {
  const orderedKeys: string[] = [];
  const seen = new Set<string>();

  for (const key of Object.keys(left)) {
    const normalizedKey = normalizeKey(key, options.caseInsensitiveKeys);

    if (!seen.has(normalizedKey)) {
      seen.add(normalizedKey);
      orderedKeys.push(normalizedKey);
    }
  }

  for (const key of Object.keys(right)) {
    const normalizedKey = normalizeKey(key, options.caseInsensitiveKeys);

    if (!seen.has(normalizedKey)) {
      seen.add(normalizedKey);
      orderedKeys.push(normalizedKey);
    }
  }

  return options.sortKeys ? [...orderedKeys].sort() : orderedKeys;
}

function diffObjects(
  left: Record<string, unknown>,
  right: Record<string, unknown>,
  path: string,
  options: DiffOptions,
): DiffNode[] {
  const leftMap = new Map<string, string>();
  const rightMap = new Map<string, string>();

  Object.keys(left).forEach((key) => {
    leftMap.set(normalizeKey(key, options.caseInsensitiveKeys), key);
  });

  Object.keys(right).forEach((key) => {
    rightMap.set(normalizeKey(key, options.caseInsensitiveKeys), key);
  });

  const allKeys = buildObjectKeyOrder(left, right, options);

  return allKeys.map((normalizedKey) => {
    const leftKey = leftMap.get(normalizedKey);
    const rightKey = rightMap.get(normalizedKey);
    const displayKey = leftKey ?? rightKey ?? normalizedKey;

    return diffValue(
      leftKey ? left[leftKey] : undefined,
      rightKey ? right[rightKey] : undefined,
      makePath(path, displayKey),
      options,
      leftKey,
      rightKey,
    );
  });
}

function diffArrays(left: unknown[], right: unknown[], path: string, options: DiffOptions) {
  const maxLength = Math.max(left.length, right.length);
  const children: DiffNode[] = [];

  for (let index = 0; index < maxLength; index += 1) {
    children.push(
      diffValue(left[index], right[index], `${path}[${index}]`, options, `[${index}]`, `[${index}]`),
    );
  }

  return children;
}

export function diffValue(
  leftValue: unknown,
  rightValue: unknown,
  path = 'root',
  options: DiffOptions,
  leftKey?: string,
  rightKey?: string,
): DiffNode {
  const keyChanged = Boolean(leftKey && rightKey && leftKey !== rightKey);

  if (leftValue === undefined && rightValue !== undefined) {
    return {
      path,
      leftKey,
      rightKey,
      status: 'added',
      keyChanged,
      valueChanged: true,
      leftValue,
      rightValue,
      leftDisplay: options.missingLabel,
      rightDisplay: formatValue(rightValue, options.missingLabel),
    };
  }

  if (leftValue !== undefined && rightValue === undefined) {
    return {
      path,
      leftKey,
      rightKey,
      status: 'removed',
      keyChanged,
      valueChanged: true,
      leftValue,
      rightValue,
      leftDisplay: formatValue(leftValue, options.missingLabel),
      rightDisplay: options.missingLabel,
    };
  }

  if (Array.isArray(leftValue) && Array.isArray(rightValue)) {
    const children = diffArrays(leftValue, rightValue, path, options);
    const valueChanged = children.some(hasNodeDifference);

    return {
      path,
      leftKey,
      rightKey,
      status: valueChanged ? 'changed' : 'equal',
      keyChanged,
      valueChanged,
      leftValue,
      rightValue,
      leftDisplay: formatValue(leftValue, options.missingLabel),
      rightDisplay: formatValue(rightValue, options.missingLabel),
      children,
    };
  }

  if (isPlainObject(leftValue) && isPlainObject(rightValue)) {
    const children = diffObjects(leftValue, rightValue, path, options);
    const valueChanged = children.some(hasNodeDifference);

    return {
      path,
      leftKey,
      rightKey,
      status: valueChanged ? 'changed' : 'equal',
      keyChanged,
      valueChanged,
      leftValue,
      rightValue,
      leftDisplay: formatValue(leftValue, options.missingLabel),
      rightDisplay: formatValue(rightValue, options.missingLabel),
      children,
    };
  }

  const status = comparePrimitive(leftValue, rightValue);
  const valueChanged = status !== 'equal';

  return {
    path,
    leftKey,
    rightKey,
    status,
    keyChanged,
    valueChanged,
    leftValue,
    rightValue,
    leftDisplay: formatValue(leftValue, options.missingLabel),
    rightDisplay: formatValue(rightValue, options.missingLabel),
  };
}

export function nodeHasDifference(node: DiffNode): boolean {
  return hasNodeDifference(node);
}

export function summarizeDiffNodes(node: DiffNode): DiffSummary {
  const summary: DiffSummary = {
    total: 0,
    changed: 0,
    typeChanged: 0,
    added: 0,
    removed: 0,
    keyChanged: 0,
    valueChanged: 0,
  };

  if (shouldCountAsPrimaryDiff(node)) {
    summary.total += 1;

    if (node.status === 'added') {
      summary.added += 1;
    } else if (node.status === 'removed') {
      summary.removed += 1;
    } else if (node.status === 'type-changed') {
      summary.typeChanged += 1;
    } else if (node.status === 'changed' || node.keyChanged) {
      summary.changed += 1;
    }
  }

  if (node.keyChanged) {
    summary.keyChanged += 1;
  }

  if (node.valueChanged) {
    summary.valueChanged += 1;
  }

  if (!node.children?.length) {
    return summary;
  }

  for (const child of node.children) {
    const childSummary = summarizeDiffNodes(child);
    summary.total += childSummary.total;
    summary.changed += childSummary.changed;
    summary.typeChanged += childSummary.typeChanged;
    summary.added += childSummary.added;
    summary.removed += childSummary.removed;
    summary.keyChanged += childSummary.keyChanged;
    summary.valueChanged += childSummary.valueChanged;
  }

  return summary;
}

export function countDiffNodes(node: DiffNode): number {
  return summarizeDiffNodes(node).total;
}
