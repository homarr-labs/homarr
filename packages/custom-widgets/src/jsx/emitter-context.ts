import type { ComponentType, ReactNode } from "react";

import type { AstNode, Budget, Environment, InterpreterCallback } from "./interpreter-foundation";

export interface JsxEmitterContext {
  components: Readonly<Record<string, ComponentType<never>>>;
  budget: Budget;
  warnings: Set<string>;
  evaluate(node: AstNode, environment: Environment, depth: number): unknown;
  createCallback(node: AstNode, environment: Environment): InterpreterCallback;
  renderCallback(callback: InterpreterCallback, args: unknown[], depth: number): ReactNode;
}
