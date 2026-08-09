interface AssistantToolCallInput {
  toolName: string;
  input: string;
}

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
      default:
        result += character;
    }
  }
  return result;
};

export const repairCustomWidgetToolInput = <T extends AssistantToolCallInput>(toolCall: T): T | null => {
  if (!toolCall.toolName.startsWith("customWidget_")) return null;
  const repairedInput = escapeControlCharactersInsideJsonStrings(toolCall.input);
  if (repairedInput === toolCall.input) return null;
  try {
    JSON.parse(repairedInput);
    return { ...toolCall, input: repairedInput };
  } catch {
    return null;
  }
};
