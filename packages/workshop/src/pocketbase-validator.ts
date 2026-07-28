import { customWidgetDefinitionSchema } from "@homarr/custom-widgets/core";

import { installPocketBaseUrlPolyfill } from "./pocketbase-url";

installPocketBaseUrlPolyfill();

export type PocketBaseWidgetValidationResult = { success: true; content: string } | { success: false; error: string };

/**
 * PocketBase loads the generated CommonJS bundle of this module in its
 * embedded JSVM. Keeping the canonical schema here prevents direct Workshop
 * writes from accepting definitions that Homarr would reject at install time.
 */
export function validatePocketBaseWidget(content: string): PocketBaseWidgetValidationResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content) as unknown;
  } catch {
    return { success: false, error: "Widget content must be valid JSON" };
  }

  const result = customWidgetDefinitionSchema.safeParse(parsed);
  if (!result.success) {
    return {
      success: false,
      error:
        result.error.issues
          .slice(0, 5)
          .map((issue) => `${issue.path.join(".") || "widget"}: ${issue.message}`)
          .join("\n") || "Invalid widget",
    };
  }

  return { success: true, content: JSON.stringify(result.data) };
}
