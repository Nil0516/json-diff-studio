import type { DiffNode, DiffStatus } from './types';

interface DiffOptions {
  caseInsensitiveKeys: boolean;
  missingLabel: string;
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

  const allKeys = Array.from(new Set([...leftMap.keys(), ...rightMap.keys()])).sort();

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

export function countDiffNodes(node: DiffNode): number {
  const selfCount = hasNodeDifference(node) ? 1 : 0;

  if (!node.children?.length) {
    return selfCount;
  }

  return selfCount + node.children.reduce((total, child) => total + countDiffNodes(child), 0);
}
