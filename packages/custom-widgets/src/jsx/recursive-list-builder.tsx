import type { ReactNode } from "react";
import { Text } from "@mantine/core";
import type { TreeNodeData } from "@mantine/core";

import { SafeJsxBudgetError } from "./interpreter-foundation";
import {
  clampWithWarning,
  DEFAULT_MAX_DEPTH,
  DEFAULT_MAX_NODES,
  exceedsRecursiveListNodeLimit,
  formatPath,
  HARD_MAX_DEPTH,
  HARD_MAX_NODES,
  isObject,
  parseRestrictedPath,
  primitiveKey,
  readRestrictedPath,
} from "./recursive-list-helpers";
import type { RecursiveListBuildOptions, RecursiveListMetadata } from "./recursive-list-types";

const OMITTED_LABEL = "Additional levels omitted";

export function buildTrustedRecursiveList(options: RecursiveListBuildOptions): TreeNodeData[] {
  const maxDepth = clampWithWarning(
    options.maxDepth,
    DEFAULT_MAX_DEPTH,
    1,
    HARD_MAX_DEPTH,
    "maxDepth",
    options.warnings,
  );
  const maxNodes = clampWithWarning(
    options.maxNodes,
    DEFAULT_MAX_NODES,
    1,
    HARD_MAX_NODES,
    "maxNodes",
    options.warnings,
  );
  let childrenPath: string[];
  let keyPath: string[];
  try {
    childrenPath = parseRestrictedPath(options.childrenPath, "childrenPath");
    keyPath = parseRestrictedPath(options.keyPath, "keyPath");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    options.warnings.add(message);
    options.budget.operation(1);
    options.budget.collection();
    options.budget.rendered();
    return [diagnosticNode("diagnostic:path", message)];
  }
  const roots = Array.isArray(options.data) ? options.data : isObject(options.data) ? [options.data] : null;
  if (!roots) {
    options.warnings.add("RECURSIVE_LIST_INVALID_DATA: data must be an object or an array of objects");
    options.budget.operation(1);
    options.budget.collection();
    options.budget.rendered();
    return [diagnosticNode("diagnostic:root-data", "RecursiveList data must be an object or an array")];
  }

  const willExceedNodeLimit = exceedsRecursiveListNodeLimit(roots, childrenPath, maxDepth, maxNodes);
  let renderedRowCount = 0;
  let diagnosticCount = 0;
  let limitSentinelRendered = false;
  const usedKeys = new Set<string>();
  const chargeRow = (depth: number) => {
    options.budget.operation(depth + 1);
    options.budget.collection();
    options.budget.rendered();
    renderedRowCount += 1;
  };
  const makeLimitDiagnostic = (path: readonly number[], depth: number): TreeNodeData | null => {
    if (limitSentinelRendered || renderedRowCount >= maxNodes) return null;
    options.warnings.add(`RECURSIVE_LIST_NODE_LIMIT: Rendering stopped after ${maxNodes} nodes`);
    chargeRow(depth);
    diagnosticCount += 1;
    limitSentinelRendered = true;
    return diagnosticNode(`diagnostic:${path.join(".")}:${diagnosticCount}`, OMITTED_LABEL);
  };
  const makeDiagnostic = (path: readonly number[], message: string, depth: number): TreeNodeData | null => {
    if (renderedRowCount >= maxNodes) return null;
    if (willExceedNodeLimit && renderedRowCount === maxNodes - 1) return makeLimitDiagnostic(path, depth);
    chargeRow(depth);
    diagnosticCount += 1;
    return diagnosticNode(`diagnostic:${path.join(".")}:${diagnosticCount}`, message);
  };

  const visitSiblings = (
    values: readonly unknown[],
    depth: number,
    parentPath: readonly number[],
    ancestors: ReadonlySet<object>,
  ): TreeNodeData[] => {
    const result: TreeNodeData[] = [];
    for (let index = 0; index < values.length; index += 1) {
      if (renderedRowCount >= maxNodes) break;
      if (willExceedNodeLimit && renderedRowCount === maxNodes - 1) {
        const omitted = makeLimitDiagnostic(parentPath, depth);
        if (omitted) result.push(omitted);
        break;
      }
      const value = values[index];
      const path = [...parentPath, index];
      if (!isObject(value)) {
        options.warnings.add(`RECURSIVE_LIST_INVALID_NODE: Node at ${formatPath(path)} is not an object`);
        const invalid = makeDiagnostic(path, "Invalid tree node omitted", depth);
        if (invalid) result.push(invalid);
        continue;
      }
      if (ancestors.has(value)) {
        options.warnings.add(`RECURSIVE_LIST_CYCLE: Cycle detected at ${formatPath(path)}`);
        const cycle = makeDiagnostic(path, OMITTED_LABEL, depth);
        if (cycle) result.push(cycle);
        continue;
      }

      chargeRow(depth);
      const rawKey = readRestrictedPath(value, keyPath);
      const preferredKey = primitiveKey(rawKey);
      const namespacedPreferredKey = preferredKey === null ? null : `key:${typeof rawKey}:${preferredKey}`;
      let key = namespacedPreferredKey ?? `path:${path.join(".")}`;
      if (namespacedPreferredKey === null) {
        options.warnings.add(`RECURSIVE_LIST_MISSING_KEY: Node at ${formatPath(path)} uses a stable path key`);
      } else if (usedKeys.has(namespacedPreferredKey)) {
        key = `path:${path.join(".")}`;
        options.warnings.add(`RECURSIVE_LIST_DUPLICATE_KEY: '${preferredKey}' uses a stable path key`);
      }
      usedKeys.add(key);

      const rawChildren = readRestrictedPath(value, childrenPath);
      const childValues = rawChildren === undefined || rawChildren === null ? [] : rawChildren;
      const validChildren = Array.isArray(childValues);
      const childCount = validChildren ? childValues.length : 0;
      const metadata: RecursiveListMetadata = Object.freeze({
        depth,
        index,
        path: Object.freeze(path) as unknown as number[],
        key,
        hasChildren: childCount > 0,
        childCount,
        isLast: index === values.length - 1,
      });
      const nextAncestors = new Set(ancestors).add(value);
      const children: TreeNodeData[] = [];
      if (!validChildren) {
        options.warnings.add(
          `RECURSIVE_LIST_INVALID_CHILDREN: ${options.childrenPath} at ${formatPath(path)} must be an array`,
        );
        const invalidChildren = makeDiagnostic(path, `Expected ${options.childrenPath} to be an array`, depth + 1);
        if (invalidChildren) children.push(invalidChildren);
      } else if (childCount > 0 && depth + 1 >= maxDepth) {
        options.warnings.add(`RECURSIVE_LIST_DEPTH_LIMIT: Rendering stopped at depth ${maxDepth}`);
        const omitted = makeDiagnostic(path, OMITTED_LABEL, depth + 1);
        if (omitted) children.push(omitted);
      } else if (childCount > 0) {
        children.push(...visitSiblings(childValues, depth + 1, path, nextAncestors));
      }

      let label: ReactNode;
      try {
        label = options.render(value, metadata, depth + 1);
      } catch (error) {
        if (error instanceof SafeJsxBudgetError) throw error;
        const message = error instanceof Error ? error.message : String(error);
        options.warnings.add(`RECURSIVE_LIST_BRANCH_ERROR: ${formatPath(path)}: ${message}`);
        label = (
          <Text size="xs" c="red">
            Unable to render this branch: {message}
          </Text>
        );
      }

      result.push({
        value: key,
        label,
        ...(children.length > 0 ? { children } : {}),
      });
    }
    return result;
  };

  return visitSiblings(roots, 0, [], new Set());
}

function diagnosticNode(value: string, message: string): TreeNodeData {
  return {
    value,
    label: (
      <Text size="xs" c="dimmed" fs="italic">
        {message}
      </Text>
    ),
  };
}
