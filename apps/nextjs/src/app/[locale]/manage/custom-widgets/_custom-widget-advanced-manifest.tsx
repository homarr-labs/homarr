"use client";

import { useEffect, useState } from "react";

import { customWidgetDefinitionSchema } from "@homarr/custom-widgets/core";
import { useI18n } from "@homarr/translation/client";

import { CodeEditor } from "./_code-editor";
import { useDeferredCustomWidgetFormDocumentValues } from "./_custom-widget-form-state";
import { applyDefinition, parseJson } from "./_custom-widget-form-utils";
import type { CustomWidgetWorkbenchForm } from "./_custom-widget-form-utils";
import { LazyOnceAccordion } from "./_lazy-once-accordion";

export function CustomWidgetAdvancedManifest({ form }: { form: CustomWidgetWorkbenchForm }) {
  const t = useI18n("customWidget.workbench.builder");
  return (
    <LazyOnceAccordion label={t("advancedManifest")}>
      <CustomWidgetManifestEditor form={form} />
    </LazyOnceAccordion>
  );
}

function CustomWidgetManifestEditor({ form }: { form: CustomWidgetWorkbenchForm }) {
  const t = useI18n("customWidget.workbench.builder");
  const values = useDeferredCustomWidgetFormDocumentValues();
  const serialized = JSON.stringify(
    {
      $schema: "homarr-custom-widget-v2",
      name: values.name,
      ...(values.description ? { description: values.description } : {}),
      ...(values.iconUrl ? { iconUrl: values.iconUrl } : {}),
      sources: parseJson(values.sources),
      requests: parseJson(values.requests),
      options: parseJson(values.options),
      template: values.template,
    },
    null,
    2,
  );
  const [draft, setDraft] = useState(serialized);
  const [error, setError] = useState<string>();
  useEffect(() => setDraft(serialized), [serialized]);
  return (
    <CodeEditor
      id="raw-widget-manifest"
      label={t("manifestFilename")}
      language="json"
      value={draft}
      error={error}
      onChange={(next) => {
        setDraft(next);
        try {
          const parsed = customWidgetDefinitionSchema.safeParse(JSON.parse(next) as unknown);
          if (!parsed.success) {
            setError(parsed.error.issues[0]?.message ?? t("invalidWidget"));
            return;
          }
          setError(undefined);
          applyDefinition(form, parsed.data);
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : t("invalidJson"));
        }
      }}
    />
  );
}
