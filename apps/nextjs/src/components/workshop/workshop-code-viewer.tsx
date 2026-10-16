"use client";

import { useId, useMemo } from "react";

import { ReadOnlyCustomWidgetCode } from "@homarr/custom-widgets/workbench";
import type { CustomWidgetEditorMessages } from "@homarr/custom-widgets/workbench";
import { useI18n } from "@homarr/translation/client";

import { useCustomWidgetEditorMessages } from "../custom-widgets/use-custom-widget-editor-messages";

const displayDiagnostic: CustomWidgetEditorMessages["diagnostic"] = (diagnostic) => diagnostic.value ?? diagnostic.code;

/** Read-only source view of a Workshop submission, used for both widget JSON and Custom CSS. */
export function WorkshopCodeViewer({
  value,
  language,
  height = "360px",
}: {
  value: string;
  language: "json" | "css";
  height?: string;
}) {
  const id = useId();
  const workshopT = useI18n("workshop");
  const messages = useCustomWidgetEditorMessages(displayDiagnostic);
  const displayValue = useMemo(() => {
    if (language === "json") {
      try {
        return JSON.stringify(JSON.parse(value) as unknown, null, 2);
      } catch {}
    }
    return value;
  }, [language, value]);

  return (
    <ReadOnlyCustomWidgetCode
      id={`workshop-source-${id}`}
      label={workshopT("sourceCode")}
      language={language}
      value={displayValue}
      messages={messages}
      height={height}
    />
  );
}
