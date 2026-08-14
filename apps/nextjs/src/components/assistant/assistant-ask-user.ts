import type { AskUserArgs, AskUserResult, AssistantAskUserOptionKind } from "./assistant-tool-contracts";

export type AssistantAskUserOption = AskUserArgs["options"][number];

const affirmativeTokens = new Set(["accept", "agree", "allow", "approve", "confirm", "continue", "proceed", "yes"]);
const negativeTokens = new Set(["cancel", "decline", "deny", "disagree", "no", "reject", "stop"]);

const inferOptionKind = (option: Pick<AssistantAskUserOption, "id" | "label">): AssistantAskUserOptionKind => {
  const tokens = `${option.id} ${option.label}`
    .toLocaleLowerCase("en")
    .split(/[^a-z]+/u)
    .filter(Boolean);
  if (tokens.some((token) => affirmativeTokens.has(token))) return "affirmative";
  if (tokens.some((token) => negativeTokens.has(token))) return "negative";
  return "alternative";
};

export const getAssistantAskUserOptionKind = (
  option: Pick<AssistantAskUserOption, "id" | "label"> & { kind?: AssistantAskUserOptionKind },
) => option.kind ?? inferOptionKind(option);

export const getAssistantAffirmativeOption = (options: readonly AssistantAskUserOption[]) =>
  options.find((option) => getAssistantAskUserOptionKind(option) === "affirmative");

export const getAssistantAffirmativeResult = (
  options: readonly AssistantAskUserOption[],
): AskUserResult | undefined => {
  const option = getAssistantAffirmativeOption(options);
  if (!option) return undefined;

  return {
    answer: option.label,
    optionId: option.id,
    optionKind: "affirmative",
    source: "option",
  };
};
