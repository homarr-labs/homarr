import { describe, expect, test } from "vitest";

import {
  getAssistantAffirmativeOption,
  getAssistantAffirmativeResult,
  getAssistantAskUserOptionKind,
} from "./assistant-ask-user";

describe("assistant structured choice categories", () => {
  test("uses the explicit category instead of button order or wording", () => {
    const options = [
      { id: "home", label: "Home", kind: "alternative" as const },
      { id: "continue", label: "Use the proposed board", kind: "affirmative" as const },
      { id: "cancel", label: "Keep the current board", kind: "negative" as const },
    ];

    expect(getAssistantAffirmativeOption(options)).toEqual(options[1]);
    expect(getAssistantAffirmativeResult(options)).toEqual({
      answer: "Use the proposed board",
      optionId: "continue",
      optionKind: "affirmative",
      source: "option",
    });
  });

  test("does not guess among neutral selections", () => {
    expect(
      getAssistantAffirmativeOption([
        { id: "home", label: "Home", kind: "alternative" },
        { id: "media", label: "Media", kind: "alternative" },
      ]),
    ).toBeUndefined();
  });

  test("recognizes affirmative and negative legacy choices", () => {
    expect(getAssistantAskUserOptionKind({ id: "yes", label: "Yes, create it" })).toBe("affirmative");
    expect(getAssistantAskUserOptionKind({ id: "no", label: "No, keep it" })).toBe("negative");
    expect(getAssistantAskUserOptionKind({ id: "home", label: "Home" })).toBe("alternative");
  });
});
