import type { Budget, InterpreterCallback } from "./interpreter-foundation";

export interface InterpreterMethodContext {
  budget: Budget;
  runCallback(callback: InterpreterCallback, args: unknown[], depth: number): unknown;
}
