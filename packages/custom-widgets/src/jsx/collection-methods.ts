import { isSafeCallable } from "./safe-bindings";
import { isInterpreterCallback, normalizedSliceIndex, numericArgument, SafeJsxError } from "./interpreter-foundation";
import type { InterpreterCallback } from "./interpreter-foundation";
import type { InterpreterMethodContext } from "./interpreter-method-context";
import { callStringMethod } from "./string-methods";

export function callCollectionMethod(
  receiver: unknown,
  method: string,
  args: unknown[],
  depth: number,
  context: InterpreterMethodContext,
): { handled: boolean; value?: unknown } {
  if (Array.isArray(receiver)) {
    if (method === "map" || method === "filter" || method === "flatMap") {
      const callback = args[0];
      if (isSafeCallable(callback)) {
        const result: unknown[] = [];
        for (let index = 0; index < receiver.length; index += 1) {
          context.budget.collection();
          const callbackResult = callback(receiver[index] as never);
          if (method === "flatMap" && Array.isArray(callbackResult)) {
            context.budget.collection(callbackResult.length);
            result.push(...callbackResult);
          } else if (method === "map" || method === "flatMap") result.push(callbackResult);
          else if (callbackResult) result.push(receiver[index]);
        }
        return { handled: true, value: result };
      }
      if (!isInterpreterCallback(callback)) throw new SafeJsxError(`${method} requires an inline arrow callback`);
      const result: unknown[] = [];
      for (let index = 0; index < receiver.length; index += 1) {
        context.budget.collection();
        const callbackResult = context.runCallback(callback, [receiver[index], index, receiver], depth + 1);
        if (method === "flatMap" && Array.isArray(callbackResult)) {
          context.budget.collection(callbackResult.length);
          result.push(...callbackResult);
        } else if (method === "map" || method === "flatMap" || callbackResult) {
          result.push(method === "map" || method === "flatMap" ? callbackResult : receiver[index]);
        }
      }
      return { handled: true, value: result };
    }
    if (method === "concat") {
      const result = [...receiver];
      for (const value of args) {
        if (Array.isArray(value)) {
          context.budget.collection(value.length);
          result.push(...value);
        } else {
          context.budget.collection();
          result.push(value);
        }
      }
      return { handled: true, value: result };
    }
    if (method === "pop") {
      context.budget.collection();
      return { handled: true, value: receiver.length > 0 ? receiver[receiver.length - 1] : undefined };
    }
    if (method === "slice") {
      const start = normalizedSliceIndex(args[0], receiver.length, 0);
      const end = normalizedSliceIndex(args[1], receiver.length, receiver.length);
      const result: unknown[] = [];
      for (let index = start; index < Math.max(start, end); index += 1) {
        context.budget.collection();
        result.push(receiver[index]);
      }
      return { handled: true, value: result };
    }
    if (method === "join") {
      context.budget.collection(receiver.length);
      const separator = String(args[0] ?? ",");
      let result = "";
      receiver.forEach((item, index) => {
        result += `${index === 0 ? "" : separator}${String(item ?? "")}`;
        context.budget.string(result);
      });
      return { handled: true, value: result };
    }
    if (method === "includes") {
      context.budget.collection(receiver.length);
      return { handled: true, value: receiver.some((item) => Object.is(item, args[0])) };
    }
    if (method === "indexOf") {
      context.budget.collection(receiver.length);
      return { handled: true, value: receiver.findIndex((item) => Object.is(item, args[0])) };
    }
    if (method === "find" || method === "findIndex" || method === "some" || method === "every") {
      const callback = args[0];
      const useSafe = isSafeCallable(callback);
      if (!useSafe && !isInterpreterCallback(callback))
        throw new SafeJsxError(`${method} requires an inline arrow callback`);
      for (let index = 0; index < receiver.length; index += 1) {
        context.budget.collection();
        const result = useSafe
          ? (callback as (...a: never[]) => unknown)(receiver[index] as never)
          : context.runCallback(callback as InterpreterCallback, [receiver[index], index, receiver], depth + 1);
        if (method === "find" && result) return { handled: true, value: receiver[index] };
        if (method === "findIndex" && result) return { handled: true, value: index };
        if (method === "some" && result) return { handled: true, value: true };
        if (method === "every" && !result) return { handled: true, value: false };
      }
      const defaults: Record<string, unknown> = { find: undefined, findIndex: -1, some: false, every: true };
      return { handled: true, value: defaults[method] };
    }
    if (method === "sort") {
      const callback = args[0];
      if (!isInterpreterCallback(callback)) throw new SafeJsxError("sort requires an inline arrow callback");
      const copy = [...receiver];
      copy.sort((left, right) => {
        context.budget.collection();
        const delta = Number(context.runCallback(callback, [left, right], depth + 1));
        if (!Number.isFinite(delta)) return 0;
        return delta;
      });
      return { handled: true, value: copy };
    }
    if (method === "reduce") {
      const callback = args[0];
      if (!isInterpreterCallback(callback)) throw new SafeJsxError("reduce requires an inline arrow callback");
      if (receiver.length === 0 && args.length < 2) {
        throw new SafeJsxError("Reduce of empty array with no initial value");
      }
      let startIndex = 0;
      let accumulator: unknown;
      if (args.length < 2) {
        accumulator = receiver[0];
        startIndex = 1;
      } else {
        accumulator = args[1];
      }
      for (let index = startIndex; index < receiver.length; index += 1) {
        context.budget.collection();
        accumulator = context.runCallback(callback, [accumulator, receiver[index], index, receiver], depth + 1);
      }
      return { handled: true, value: accumulator };
    }
    if (method === "at") {
      const index = numericArgument(args[0], 0);
      let normalizedIndex = index;
      if (index < 0) normalizedIndex = receiver.length + index;
      context.budget.collection();
      const outOfBounds = normalizedIndex < 0 || normalizedIndex >= receiver.length;
      return { handled: true, value: outOfBounds ? undefined : receiver[normalizedIndex] };
    }
    if (method === "flat") {
      // ponytail: only depth=1 supported; deeper nesting requires recursive budget tracking
      const flatDepth = numericArgument(args[0], 1);
      if (flatDepth !== 1) throw new SafeJsxError("flat() only supports depth 1");
      const result: unknown[] = [];
      for (const item of receiver) {
        context.budget.collection();
        if (Array.isArray(item)) {
          for (const nested of item) {
            context.budget.collection();
            result.push(nested);
          }
        } else {
          result.push(item);
        }
      }
      return { handled: true, value: result };
    }
    if (method === "reverse") {
      const copy = [...receiver];
      const result: unknown[] = [];
      for (let index = copy.length - 1; index >= 0; index -= 1) {
        context.budget.collection();
        result.push(copy[index]);
      }
      return { handled: true, value: result };
    }
  }

  if (typeof receiver === "string") return callStringMethod(receiver, method, args, context);

  if (receiver instanceof RegExp && method === "test") {
    const value = String(args[0] ?? "");
    return { handled: true, value: receiver.test(value) };
  }

  if (typeof receiver === "number") {
    if (method === "toFixed") {
      const digits = Math.max(0, Math.min(20, numericArgument(args[0], 0)));
      return { handled: true, value: receiver.toFixed(digits) };
    }
    if (method === "toPrecision") {
      const precision = Math.max(1, Math.min(21, numericArgument(args[0], 1)));
      return { handled: true, value: receiver.toPrecision(precision) };
    }
    if (method === "toLocaleString") {
      return { handled: true, value: context.budget.string(receiver.toLocaleString()) };
    }
  }

  if (
    (typeof receiver === "number" || typeof receiver === "boolean" || typeof receiver === "string") &&
    method === "toString"
  ) {
    return { handled: true, value: context.budget.string(String(receiver)) };
  }

  return { handled: false };
}
