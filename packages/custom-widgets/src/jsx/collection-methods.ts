import { isSafeCallable } from "./safe-bindings";
import { isInterpreterCallback, normalizedSliceIndex, numericArgument, SafeJsxError } from "./interpreter-foundation";
import type { Budget, InterpreterCallback } from "./interpreter-foundation";

interface CollectionMethodContext {
  budget: Budget;
  runCallback(callback: InterpreterCallback, args: unknown[], depth: number): unknown;
}

export function callCollectionMethod(
  receiver: unknown,
  method: string,
  args: unknown[],
  depth: number,
  context: CollectionMethodContext,
): { handled: boolean; value?: unknown } {
  if (Array.isArray(receiver)) {
    if (method === "map" || method === "filter") {
      const callback = args[0];
      if (isSafeCallable(callback)) {
        const result: unknown[] = [];
        for (let index = 0; index < receiver.length; index += 1) {
          context.budget.collection();
          const callbackResult = callback(receiver[index] as never);
          if (method === "map") result.push(callbackResult);
          else if (callbackResult) result.push(receiver[index]);
        }
        return { handled: true, value: result };
      }
      if (!isInterpreterCallback(callback)) throw new SafeJsxError(`${method} requires an inline arrow callback`);
      const result: unknown[] = [];
      for (let index = 0; index < receiver.length; index += 1) {
        context.budget.collection();
        const callbackResult = context.runCallback(callback, [receiver[index], index, receiver], depth + 1);
        if (method === "map" || callbackResult) result.push(method === "map" ? callbackResult : receiver[index]);
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

  if (typeof receiver === "string") {
    switch (method) {
      case "toUpperCase":
        return { handled: true, value: context.budget.string(receiver.toUpperCase()) };
      case "toLowerCase":
        return { handled: true, value: context.budget.string(receiver.toLowerCase()) };
      case "trim":
        return { handled: true, value: context.budget.string(receiver.trim()) };
      case "trimStart":
        return { handled: true, value: context.budget.string(receiver.trimStart()) };
      case "trimEnd":
        return { handled: true, value: context.budget.string(receiver.trimEnd()) };
      case "replace": {
        const search = String(args[0] ?? "");
        const replacement = String(args[1] ?? "");
        const matchIndex = receiver.indexOf(search);
        if (matchIndex === -1) return { handled: true, value: context.budget.string(receiver) };
        return {
          handled: true,
          value: context.budget.string(
            receiver.slice(0, matchIndex) + replacement + receiver.slice(matchIndex + search.length),
          ),
        };
      }
      case "replaceAll": {
        const search = String(args[0] ?? "");
        const replacement = String(args[1] ?? "");
        if (search.length === 0) return { handled: true, value: context.budget.string(receiver) };
        let result = "";
        let cursor = 0;
        while (cursor < receiver.length) {
          const matchIndex = receiver.indexOf(search, cursor);
          if (matchIndex === -1) {
            result += receiver.slice(cursor);
            break;
          }
          result += receiver.slice(cursor, matchIndex) + replacement;
          cursor = matchIndex + search.length;
        }
        return { handled: true, value: context.budget.string(result) };
      }
      case "indexOf":
        return { handled: true, value: receiver.indexOf(String(args[0] ?? ""), numericArgument(args[1], 0)) };
      case "lastIndexOf": {
        const fromIndex = args[1] !== undefined ? numericArgument(args[1], receiver.length) : undefined;
        return { handled: true, value: receiver.lastIndexOf(String(args[0] ?? ""), fromIndex) };
      }
      case "repeat": {
        let maxCount = 0;
        if (receiver.length > 0) maxCount = Math.floor(200_001 / receiver.length);
        const count = Math.max(0, Math.min(numericArgument(args[0], 0), maxCount));
        return { handled: true, value: context.budget.string(receiver.repeat(count).slice(0, 200_001)) };
      }
      case "slice":
        return {
          handled: true,
          value: context.budget.string(receiver.slice(numericArgument(args[0], 0), args[1] as number | undefined)),
        };
      case "substring":
        return {
          handled: true,
          value: context.budget.string(receiver.substring(numericArgument(args[0], 0), args[1] as number | undefined)),
        };
      case "includes":
        return { handled: true, value: receiver.includes(String(args[0] ?? ""), numericArgument(args[1], 0)) };
      case "startsWith":
        return { handled: true, value: receiver.startsWith(String(args[0] ?? ""), numericArgument(args[1], 0)) };
      case "endsWith":
        return { handled: true, value: receiver.endsWith(String(args[0] ?? ""), args[1] as number | undefined) };
      case "padStart":
        return {
          handled: true,
          value: context.budget.string(
            receiver.padStart(Math.min(numericArgument(args[0], 0), 200_001), String(args[1] ?? " ")),
          ),
        };
      case "padEnd":
        return {
          handled: true,
          value: context.budget.string(
            receiver.padEnd(Math.min(numericArgument(args[0], 0), 200_001), String(args[1] ?? " ")),
          ),
        };
      case "charAt":
        return { handled: true, value: receiver.charAt(numericArgument(args[0], 0)) };
      case "split": {
        const limit = Math.max(0, Math.min(2_000, numericArgument(args[1], 2_000)));
        const split = args[0] === undefined ? [receiver] : receiver.split(String(args[0]), limit);
        context.budget.collection(split.length);
        return { handled: true, value: split };
      }
    }
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
  }

  if (
    (typeof receiver === "number" || typeof receiver === "boolean" || typeof receiver === "string") &&
    method === "toString"
  ) {
    return { handled: true, value: context.budget.string(String(receiver)) };
  }

  return { handled: false };
}
