import { numericArgument, SafeJsxError } from "./interpreter-foundation";
import type { InterpreterMethodContext } from "./interpreter-method-context";

export function callStringMethod(
  receiver: string,
  method: string,
  args: unknown[],
  context: InterpreterMethodContext,
): { handled: boolean; value?: unknown } {
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
      const search = args[0] instanceof RegExp ? args[0] : String(args[0] ?? "");
      const replacement = String(args[1] ?? "");
      if (search instanceof RegExp)
        return { handled: true, value: context.budget.string(receiver.replace(search, replacement)) };
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
      const search = args[0] instanceof RegExp ? args[0] : String(args[0] ?? "");
      const replacement = String(args[1] ?? "");
      if (search instanceof RegExp) {
        if (!search.global) throw new SafeJsxError("replaceAll() requires a global regular expression");
        return { handled: true, value: context.budget.string(receiver.replaceAll(search, replacement)) };
      }
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
      const maxCount = receiver.length > 0 ? Math.floor(200_001 / receiver.length) : 0;
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
    case "localeCompare":
      return { handled: true, value: receiver.localeCompare(String(args[0] ?? "")) };
    case "split": {
      const limit = Math.max(0, Math.min(2_000, numericArgument(args[1], 2_000)));
      const separator = args[0] instanceof RegExp ? args[0] : args[0] === undefined ? undefined : String(args[0]);
      const split = separator === undefined ? [receiver] : receiver.split(separator, limit);
      context.budget.collection(split.length);
      return { handled: true, value: split };
    }
    case "match": {
      const pattern = args[0] instanceof RegExp ? args[0] : String(args[0] ?? "");
      const matches = receiver.match(pattern);
      if (matches) context.budget.collection(matches.length);
      return { handled: true, value: matches ? [...matches] : null };
    }
    case "search":
      return { handled: true, value: receiver.search(args[0] instanceof RegExp ? args[0] : String(args[0] ?? "")) };
    default:
      return { handled: false };
  }
}
