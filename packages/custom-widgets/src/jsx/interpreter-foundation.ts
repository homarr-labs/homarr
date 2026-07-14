import { CUSTOM_JSX_LIMITS } from "./policy";

export interface AstNode {
  type: string;
  start?: number;
  end?: number;
  [key: string]: unknown;
}

export interface EvaluationBudgets {
  maxAstDepth: number;
  maxOperations: number;
  maxCollectionItems: number;
  maxRenderedNodes: number;
  maxStringLength: number;
}

export interface SafeJsxBudgets extends Partial<EvaluationBudgets> {}
export const INTERPRETER_CALLBACK = Symbol("custom-jsx-interpreter-callback");
export const DEFAULT_BUDGETS: EvaluationBudgets = {
  maxAstDepth: CUSTOM_JSX_LIMITS.astDepth,
  maxOperations: CUSTOM_JSX_LIMITS.operations,
  maxCollectionItems: CUSTOM_JSX_LIMITS.collectionItems,
  maxRenderedNodes: CUSTOM_JSX_LIMITS.renderedNodes,
  maxStringLength: CUSTOM_JSX_LIMITS.stringLength,
};

export interface InterpreterCallback {
  readonly kind: typeof INTERPRETER_CALLBACK;
  readonly params: readonly string[];
  readonly body: AstNode;
  readonly environment: Environment;
}

export class SafeJsxError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "SafeJsxError";
  }
}

export class Environment {
  public constructor(
    private readonly values: Readonly<Record<string, unknown>>,
    private readonly parent?: Environment,
  ) {}
  public get(name: string): unknown {
    if (Object.hasOwn(this.values, name)) return this.values[name];
    if (this.parent) return this.parent.get(name);
    if (name === "undefined") return undefined;
    if (name === "NaN") return Number.NaN;
    if (name === "Infinity") return Number.POSITIVE_INFINITY;
    throw new SafeJsxError(`Unknown binding: ${name}`);
  }
}

export class Budget {
  private operations = 0;
  private collectionItems = 0;
  private renderedNodes = 0;
  public constructor(private readonly limits: EvaluationBudgets) {}
  public operation(depth: number): void {
    if (depth > this.limits.maxAstDepth)
      throw new SafeJsxError(`Template exceeded the AST depth limit (${this.limits.maxAstDepth})`);
    if (++this.operations > this.limits.maxOperations)
      throw new SafeJsxError(`Template exceeded the operation limit (${this.limits.maxOperations})`);
  }
  public collection(count = 1): void {
    this.collectionItems += count;
    if (this.collectionItems > this.limits.maxCollectionItems)
      throw new SafeJsxError(`Template exceeded the collection limit (${this.limits.maxCollectionItems})`);
  }
  public rendered(): void {
    if (++this.renderedNodes > this.limits.maxRenderedNodes)
      throw new SafeJsxError(`Template exceeded the rendered node limit (${this.limits.maxRenderedNodes})`);
  }
  public string(value: string): string {
    if (value.length > this.limits.maxStringLength)
      throw new SafeJsxError(`Template exceeded the string length limit (${this.limits.maxStringLength})`);
    return value;
  }
}

export function asNode(value: unknown, context: string): AstNode {
  if (!value || typeof value !== "object" || typeof (value as { type?: unknown }).type !== "string")
    throw new SafeJsxError(`Invalid ${context} node`);
  return value as AstNode;
}

export function asNodeArray(value: unknown, context: string): AstNode[] {
  if (!Array.isArray(value)) throw new SafeJsxError(`Invalid ${context}`);
  return value.map((item) => asNode(item, context));
}

export const isInterpreterCallback = (value: unknown): value is InterpreterCallback =>
  typeof value === "object" && value !== null && (value as { kind?: unknown }).kind === INTERPRETER_CALLBACK;

export function numericArgument(value: unknown, fallback: number): number {
  const number = value === undefined ? fallback : Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.trunc(number);
}

export function normalizedSliceIndex(value: unknown, length: number, fallback: number): number {
  const index = numericArgument(value, fallback);
  if (index < 0) return Math.max(length + index, 0);
  return Math.min(index, length);
}
