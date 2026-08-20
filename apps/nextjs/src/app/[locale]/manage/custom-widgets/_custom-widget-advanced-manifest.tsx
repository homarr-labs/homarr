"use client";

import { useEffect, useState } from "react";
import { Accordion } from "@mantine/core";

import { customWidgetDefinitionSchema } from "@homarr/custom-widgets/core";
import { useI18n } from "@homarr/translation/client";

import { CodeEditor } from "./_code-editor";
import { applyDefinition, parseJson } from "./_custom-widget-form-utils";
import type { CustomWidgetWorkbenchForm } from "./_custom-widget-form-utils";

export function CustomWidgetAdvancedManifest({ form }: { form: CustomWidgetWorkbenchForm }) {
  const t = useI18n("customWidget.workbench.builder");
  const serialized = JSON.stringify(
    {
      $schema: "homarr-custom-widget-v2",
      name: form.values.name,
      ...(form.values.description ? { description: form.values.description } : {}),
      ...(form.values.iconUrl ? { iconUrl: form.values.iconUrl } : {}),
      sources: parseJson(form.values.sources),
      requests: parseJson(form.values.requests),
      options: parseJson(form.values.options),
      template: form.values.template,
    },
    null,
    2,
  );
  const [draft, setDraft] = useState(serialized);
  const [error, setError] = useState<string>();
  useEffect(() => setDraft(serialized), [serialized]);
  return (
    <Accordion variant="contained">
      <Accordion.Item value="manifest">
        <Accordion.Control>{t("advancedManifest")}</Accordion.Control>
        <Accordion.Panel>
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
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  );
}
