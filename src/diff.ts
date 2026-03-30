import type { DiffFilter, DiffNode, DiffStatus } from './types';

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

export function hasVisibleKeyDifference(
  node: DiffNode,
  caseInsensitiveKeys: boolean,
) {
  return !caseInsensitiveKeys && node.keyChanged;
}

export function hasVisibleDifference(
  node: DiffNode,
  caseInsensitiveKeys: boolean,
) {
  return hasVisibleKeyDifference(node, caseInsensitiveKeys) || node.valueChanged;
}

export function getPrimaryDiffKind(
  node: DiffNode,
  caseInsensitiveKeys = false,
): Exclude<DiffFilter, 'all'> | null {
  if (!hasVisibleDifference(node, caseInsensitiveKeys)) {
    return null;
  }

  if (node.status === 'added') {
    return 'added';
  }

  if (node.status === 'removed') {
    return 'removed';
  }

  if (hasVisibleKeyDifference(node, caseInsensitiveKeys)) {
    return 'changed';
  }

  if (!node.children?.length) {
    return node.status === 'equal' ? null : 'changed';
  }

  return null;
}

function shouldCountAsPrimaryDiff(node: DiffNode, caseInsensitiveKeys: boolean) {
  return getPrimaryDiffKind(node, caseInsensitiveKeys) !== null;
}

function buildObjectKeyOrder(
  left: Record<string, unknown>,
  right: Record<string, unknown>,
  options: DiffOptions,
) {
  const leftKeys = Object.keys(left).map((key) =>
    normalizeKey(key, options.caseInsensitiveKeys),
  );
  const rightKeys = Object.keys(right).map((key) =>
    normalizeKey(key, options.caseInsensitiveKeys),
  );
  const orderedKeys: string[] = [];
  const seen = new Set<string>();
  const maxLength = Math.max(leftKeys.length, rightKeys.length);

  for (let index = 0; index < maxLength; index += 1) {
    const candidates = [leftKeys[index], rightKeys[index]];

    for (const candidate of candidates) {
      if (!candidate || seen.has(candidate)) {
        continue;
      }

      seen.add(candidate);
      orderedKeys.push(candidate);
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
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  const leftMap = new Map<string, string>();
  const rightMap = new Map<string, string>();

  leftKeys.forEach((key) => {
    leftMap.set(normalizeKey(key, options.caseInsensitiveKeys), key);
  });

  rightKeys.forEach((key) => {
    rightMap.set(normalizeKey(key, options.caseInsensitiveKeys), key);
  });

  if (options.caseInsensitiveKeys || options.sortKeys) {
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

  const children: DiffNode[] = [];
  let leftIndex = 0;
  let rightIndex = 0;

  while (leftIndex < leftKeys.length || rightIndex < rightKeys.length) {
    const leftKey = leftKeys[leftIndex];
    const rightKey = rightKeys[rightIndex];

    if (leftKey === undefined) {
      children.push(
        diffValue(
          undefined,
          right[rightKey],
          makePath(path, rightKey),
          options,
          undefined,
          rightKey,
        ),
      );
      rightIndex += 1;
      continue;
    }

    if (rightKey === undefined) {
      children.push(
        diffValue(
          left[leftKey],
          undefined,
          makePath(path, leftKey),
          options,
          leftKey,
          undefined,
        ),
      );
      leftIndex += 1;
      continue;
    }

    if (leftKey === rightKey) {
      children.push(
        diffValue(
          left[leftKey],
          right[rightKey],
          makePath(path, leftKey),
          options,
          leftKey,
          rightKey,
        ),
      );
      leftIndex += 1;
      rightIndex += 1;
      continue;
    }

    const rightHasLeftLater = rightKeys.indexOf(leftKey, rightIndex + 1) !== -1;
    const leftHasRightLater = leftKeys.indexOf(rightKey, leftIndex + 1) !== -1;

    if (!rightHasLeftLater && !leftHasRightLater) {
      children.push(
        diffValue(
          left[leftKey],
          right[rightKey],
          makePath(path, leftKey),
          options,
          leftKey,
          rightKey,
        ),
      );
      leftIndex += 1;
      rightIndex += 1;
      continue;
    }

    if (rightHasLeftLater && !leftHasRightLater) {
      children.push(
        diffValue(
          undefined,
          right[rightKey],
          makePath(path, rightKey),
          options,
          undefined,
          rightKey,
        ),
      );
      rightIndex += 1;
      continue;
    }

    if (!rightHasLeftLater && leftHasRightLater) {
      children.push(
        diffValue(
          left[leftKey],
          undefined,
          makePath(path, leftKey),
          options,
          leftKey,
          undefined,
        ),
      );
      leftIndex += 1;
      continue;
    }

    children.push(
      diffValue(
        left[leftKey],
        undefined,
        makePath(path, leftKey),
        options,
        leftKey,
        undefined,
      ),
    );
    leftIndex += 1;
  }

  return children;
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
    const valueChanged = children.some((child) =>
      hasVisibleDifference(child, options.caseInsensitiveKeys),
    );

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
    const valueChanged = children.some((child) =>
      hasVisibleDifference(child, options.caseInsensitiveKeys),
    );

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
  return hasVisibleDifference(node, false);
}

export function summarizeDiffNodes(
  node: DiffNode,
  caseInsensitiveKeys = false,
): DiffSummary {
  const summary: DiffSummary = {
    total: 0,
    changed: 0,
    typeChanged: 0,
    added: 0,
    removed: 0,
    keyChanged: 0,
    valueChanged: 0,
  };

  if (shouldCountAsPrimaryDiff(node, caseInsensitiveKeys)) {
    summary.total += 1;

    const primaryDiffKind = getPrimaryDiffKind(node, caseInsensitiveKeys);

    if (primaryDiffKind === 'added') {
      summary.added += 1;
    } else if (primaryDiffKind === 'removed') {
      summary.removed += 1;
    } else if (node.status === 'type-changed') {
      summary.typeChanged += 1;
    } else if (primaryDiffKind === 'changed') {
      summary.changed += 1;
    }
  }

  if (hasVisibleKeyDifference(node, caseInsensitiveKeys)) {
    summary.keyChanged += 1;
  }

  if (node.valueChanged) {
    summary.valueChanged += 1;
  }

  if (!node.children?.length) {
    return summary;
  }

  for (const child of node.children) {
    const childSummary = summarizeDiffNodes(child, caseInsensitiveKeys);
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
