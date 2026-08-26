interface AssistantToolCallInput {
  toolName: string;
  input: string;
}

const customWidgetNoInputToolNames = new Set([
  "customWidget_schema",
  "customWidget_getAuthoringPrompt",
  "customWidget_getSkill",
  "customWidget_getComponentCatalog",
  "customWidget_list",
]);

const escapeControlCharactersInsideJsonStrings = (value: string) => {
  let result = "";
  let insideString = false;
  let escaped = false;
  for (const character of value) {
    if (!insideString) {
      result += character;
      if (character === '"') insideString = true;
      continue;
    }
    if (escaped) {
      result += character;
      escaped = false;
      continue;
    }
    if (character === "\\") {
      result += character;
      escaped = true;
      continue;
    }
    if (character === '"') {
      result += character;
      insideString = false;
      continue;
    }
    switch (character) {
      case "\n":
        result += "\\n";
        break;
      case "\r":
        result += "\\r";
        break;
      case "\t":
        result += "\\t";
        break;
      case "\b":
        result += "\\b";
        break;
      case "\f":
        result += "\\f";
        break;
      default:
        result +=
          character.charCodeAt(0) < 0x20 ? `\\u${character.charCodeAt(0).toString(16).padStart(4, "0")}` : character;
    }
  }
  return result;
};

const repairIconSearchInput = <T extends AssistantToolCallInput>(toolCall: T): T | null => {
  if (toolCall.toolName !== "icon_findIcons") return null;

  // Some OpenAI-compatible providers finish a streamed tool call after the last value but before
  // the closing object delimiter. Recover only the harmless, read-only icon search fields instead
  // of trying to balance arbitrary mutation input.
  const searchTextMatch = /"searchText"\s*:\s*("(?:\\.|[^"\\])*")/u.exec(toolCall.input);
  if (!searchTextMatch?.[1]) return null;
  let searchText: unknown;
  try {
    searchText = JSON.parse(searchTextMatch[1]);
  } catch {
    return null;
  }
  if (typeof searchText !== "string") return null;

  const limitMatch = /"limitPerGroup"\s*:\s*(\d+)/u.exec(toolCall.input);
  const limitPerGroup = limitMatch?.[1] ? Number(limitMatch[1]) : undefined;
  const hasValidLimit =
    limitPerGroup !== undefined && Number.isInteger(limitPerGroup) && limitPerGroup >= 1 && limitPerGroup <= 500;
  return {
    ...toolCall,
    input: JSON.stringify({
      searchText,
      ...(hasValidLimit ? { limitPerGroup } : {}),
    }),
  };
};

const repairMultilineToolInput = <T extends AssistantToolCallInput>(toolCall: T): T | null => {
  const isCustomWidgetTool = toolCall.toolName.startsWith("customWidget_");
  if (!isCustomWidgetTool && toolCall.toolName !== "configure_board_settings") return null;
  if (customWidgetNoInputToolNames.has(toolCall.toolName)) {
    try {
      const input = JSON.parse(toolCall.input) as unknown;
      if (typeof input === "object" && input !== null && !Array.isArray(input) && Object.keys(input).length === 0) {
        return null;
      }
    } catch {
      // These read-only resource tools accept no input, so malformed provider arguments are
      // unambiguous and can be replaced without guessing at user data.
    }
    return { ...toolCall, input: "{}" };
  }
  const repairedInput = escapeControlCharactersInsideJsonStrings(toolCall.input);
  if (repairedInput === toolCall.input) return null;
  try {
    JSON.parse(repairedInput);
    return { ...toolCall, input: repairedInput };
  } catch {
    return null;
  }
};

export const repairAssistantToolInput = <T extends AssistantToolCallInput>(toolCall: T): T | null =>
  repairIconSearchInput(toolCall) ?? repairMultilineToolInput(toolCall);
