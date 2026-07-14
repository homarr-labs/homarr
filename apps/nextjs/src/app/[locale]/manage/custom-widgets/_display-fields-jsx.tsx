import { Alert, SegmentedControl, Select, Stack, Text } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";
import { CUSTOM_JSX_STARTER } from "@homarr/custom-widgets/core";
import {
  analyzeJsxTemplate,
  analyzeRequestManifest,
  CUSTOM_JSX_TEMPLATE_LIMIT,
  parseRequestManifest,
} from "@homarr/custom-widgets/workbench";
import { CodeEditor } from "./_code-editor";
import { REQUEST_MANIFEST_STARTER } from "./_display-field-shared";
import type { DisplayFieldsProps } from "./_display-field-types";

export function CustomJsxDisplayFields({ form, t }: DisplayFieldsProps) {
  const dt = form.values.displayType;

  if (dt === "customJsx") {
    const parsedRequests = parseRequestManifest(form.values.requestManifest);
    const requestIds = parsedRequests
      .map((request) => (request && typeof request === "object" && "id" in request ? request.id : null))
      .filter((id): id is string => typeof id === "string");
    const templateDiagnostics = analyzeJsxTemplate(form.values.template, {
      apiVersion: form.values.jsxApiVersion === "2" ? 2 : 1,
      requestIds,
    });
    const manifestDiagnostics =
      form.values.jsxApiVersion === "2" ? analyzeRequestManifest(form.values.requestManifest) : [];

    return (
      <Stack gap="md">
        <div>
          <Text size="sm" fw={500} mb={4}>
            {t("field.jsxApiVersion.label")}
          </Text>
          <SegmentedControl
            fullWidth
            value={form.values.jsxApiVersion}
            onChange={(value) => form.setFieldValue("jsxApiVersion", value)}
            data={[
              { value: "2", label: t("field.jsxApiVersion.v2") },
              { value: "1", label: t("field.jsxApiVersion.v1") },
            ]}
          />
        </div>

        {form.values.jsxApiVersion === "1" ? (
          <Alert color="yellow" variant="light" icon={<IconAlertTriangle size={16} />}>
            <Text size="sm">{t("field.jsxApiVersion.legacyWarning")}</Text>
          </Alert>
        ) : (
          <Stack gap="sm">
            <Select
              label={t("field.networkScope.label")}
              description={t(`field.networkScope.description.${form.values.networkScope}` as never)}
              value={form.values.networkScope}
              onChange={(value) => form.setFieldValue("networkScope", value ?? "public")}
              data={(["public", "private", "loopback"] as const).map((value) => ({
                value,
                label: t(`field.networkScope.option.${value}` as never),
              }))}
              allowDeselect={false}
            />
            <CodeEditor
              id="custom-widget-request-manifest"
              language="json"
              label={t("field.requestManifest.label")}
              description={t("field.requestManifest.description")}
              value={form.values.requestManifest}
              onChange={(value) => form.setFieldValue("requestManifest", value)}
              placeholder={REQUEST_MANIFEST_STARTER}
              starter={REQUEST_MANIFEST_STARTER}
              diagnostics={manifestDiagnostics}
              error={form.errors.requestManifest ? t("field.requestManifest.invalid") : undefined}
            />
          </Stack>
        )}

        <CodeEditor
          id="custom-widget-jsx-template"
          language="jsx"
          label={t("field.template.label")}
          description={t("field.template.description")}
          value={form.values.template}
          onChange={(value) => form.setFieldValue("template", value)}
          placeholder={CUSTOM_JSX_STARTER}
          starter={CUSTOM_JSX_STARTER}
          diagnostics={templateDiagnostics}
          error={form.errors.template}
          required
          maxLength={CUSTOM_JSX_TEMPLATE_LIMIT}
        />
      </Stack>
    );
  }

  return null;
}
