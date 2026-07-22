interface RegexGroupState {
  atomCount: number;
  containsAlternation: boolean;
  containsQuantifier: boolean;
}

interface RegexQuantifier {
  nextIndex: number;
  variable: boolean;
}

const MAX_REGEX_PATTERN_LENGTH = 128;
const MAX_EXACT_REPETITION = 1_000;

/**
 * JavaScript's regular-expression engine can backtrack exponentially. Keep authored
 * expressions in a deliberately small, linear-time subset: no lookarounds or
 * backreferences, no repeated alternatives/groups, and at most one quantifier that
 * can consume a variable number of characters in the whole expression.
 */
export function isSafeRegexLiteral(regex: unknown): boolean {
  if (!regex || typeof regex !== "object") return false;
  const { pattern, flags } = regex as { pattern?: unknown; flags?: unknown };
  if (
    typeof pattern !== "string" ||
    pattern.length > MAX_REGEX_PATTERN_LENGTH ||
    typeof flags !== "string" ||
    /[^gimsu]/u.test(flags)
  ) {
    return false;
  }
  return isSafeRegexPattern(pattern);
}

function isSafeRegexPattern(pattern: string): boolean {
  const groups: RegexGroupState[] = [createGroupState()];
  let variableQuantifiers = 0;
  let index = 0;

  const consumeAtom = (nested?: RegexGroupState): boolean => {
    const parent = groups.at(-1);
    if (!parent) return false;
    parent.atomCount += 1;
    if (nested) {
      parent.containsAlternation ||= nested.containsAlternation;
      parent.containsQuantifier ||= nested.containsQuantifier;
    }
    const quantifier = readQuantifier(pattern, index);
    if (!quantifier) return true;
    if (quantifier.nextIndex > pattern.length) return false;
    if (nested && (nested.atomCount === 0 || nested.containsAlternation || nested.containsQuantifier)) return false;
    parent.containsQuantifier = true;
    if (quantifier.variable && ++variableQuantifiers > 1) return false;
    index = quantifier.nextIndex;
    return true;
  };

  while (index < pattern.length) {
    const character = pattern[index];
    if (character === "\\") {
      const escaped = pattern[index + 1];
      if (escaped === undefined || /[1-9k]/u.test(escaped)) return false;
      index += 2;
      if (!consumeAtom()) return false;
      continue;
    }
    if (character === "[") {
      index += 1;
      let closed = false;
      while (index < pattern.length) {
        if (pattern[index] === "\\") index += 2;
        else {
          const classCharacter = pattern[index++];
          if (classCharacter === "]") {
            closed = true;
            break;
          }
        }
      }
      if (!closed || !consumeAtom()) return false;
      continue;
    }
    if (character === "(") {
      if (pattern[index + 1] === "?") return false;
      groups.push(createGroupState());
      index += 1;
      continue;
    }
    if (character === ")") {
      if (groups.length === 1) return false;
      const nested = groups.pop();
      index += 1;
      if (!nested || !consumeAtom(nested)) return false;
      continue;
    }
    if (character === "|") {
      const current = groups.at(-1);
      if (!current) return false;
      current.containsAlternation = true;
      index += 1;
      continue;
    }
    if (character === "^" || character === "$") {
      index += 1;
      continue;
    }
    if (character === "*" || character === "+" || character === "?" || character === "{") {
      // A valid quantifier is consumed with its atom. Reaching one here means it is
      // malformed or is an unsupported literal brace construct.
      return false;
    }
    index += 1;
    if (!consumeAtom()) return false;
  }

  return groups.length === 1;
}

function createGroupState(): RegexGroupState {
  return { atomCount: 0, containsAlternation: false, containsQuantifier: false };
}

function readQuantifier(pattern: string, index: number): RegexQuantifier | null {
  const character = pattern[index];
  if (character === "*" || character === "+" || character === "?") {
    const nextIndex = pattern[index + 1] === "?" ? index + 2 : index + 1;
    return { nextIndex, variable: true };
  }
  if (character !== "{") return null;
  const match = /^\{(\d+)(?:,(\d*))?\}/u.exec(pattern.slice(index));
  if (!match) return null;
  const minimum = Number(match[1]);
  const maximum = match[2] === undefined || match[2] === "" ? undefined : Number(match[2]);
  if (
    !Number.isSafeInteger(minimum) ||
    minimum > MAX_EXACT_REPETITION ||
    (maximum !== undefined && (!Number.isSafeInteger(maximum) || maximum > MAX_EXACT_REPETITION))
  ) {
    return { nextIndex: pattern.length + 1, variable: true };
  }
  let nextIndex = index + match[0].length;
  if (pattern[nextIndex] === "?") nextIndex += 1;
  return { nextIndex, variable: match[2] !== undefined && maximum !== minimum };
}
