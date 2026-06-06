"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ActionIcon,
  Box,
  Button,
  Fieldset,
  Group,
  PasswordInput,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
  Textarea,
} from "@mantine/core";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { z } from "zod/v4";

import { clientApi } from "@homarr/api/client";
import { useZodForm } from "@homarr/form";
import { IconPicker } from "@homarr/forms-collection";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useScopedI18n } from "@homarr/translation/client";

import type { CustomWidgetAuthType, CustomWidgetDisplayType } from "@homarr/validation/custom-widget";
import { CustomWidgetPreview } from "./_custom-widget-preview";

const formSchema = z.object({
  name: z.string().min(1).max(128),
  description: z.string(),
  iconUrl: z.string(),
  baseUrl: z.string().min(1),
  authType: z.string(),
  headerName: z.string(),
  endpoint: z.string().min(1),
  method: z.string(),
  requestBody: z.string(),
  displayType: z.string(),
  jsonPath: z.string(),
  label: z.string(),
  unit: z.string(),
  mappings: z.array(z.object({ label: z.string(), jsonPath: z.string(), unit: z.string() })),
  tablePath: z.string(),
  columns: z.array(z.object({ header: z.string(), jsonPath: z.string() })),
  secrets: z.array(z.object({ kind: z.string(), value: z.string() })),
});

const authTypeSecretFields: Record<string, Array<{ kind: string; labelKey: string; isPassword: boolean }>> = {
  bearer: [{ kind: "apiKey", labelKey: "apiKey", isPassword: true }],
  basic: [
    { kind: "username", labelKey: "username", isPassword: false },
    { kind: "password", labelKey: "password", isPassword: true },
  ],
  apiKeyHeader: [{ kind: "apiKey", labelKey: "apiKey", isPassword: true }],
  apiKeyQuery: [{ kind: "apiKey", labelKey: "apiKey", isPassword: true }],
};

const showHeaderName: Record<string, boolean> = {
  apiKeyHeader: true,
  apiKeyQuery: true,
};

const defaultCreateValues: z.infer<typeof formSchema> = {
  name: "",
  description: "",
  iconUrl: "",
  baseUrl: "",
  authType: "none",
  headerName: "",
  endpoint: "",
  method: "GET",
  requestBody: "",
  displayType: "singleValue",
  jsonPath: "$",
  label: "",
  unit: "",
  mappings: [{ label: "", jsonPath: "$", unit: "" }],
  tablePath: "$",
  columns: [{ header: "", jsonPath: "$" }],
  secrets: [],
};

interface CustomWidgetFormProps {
  mode: "create" | "edit";
  initialValues?: Partial<z.infer<typeof formSchema>>;
  definitionId?: string;
}

const displayConfigBuilders: Record<string, (values: z.infer<typeof formSchema>) => Record<string, unknown>> = {
  singleValue: (values) => ({
    type: "singleValue",
    jsonPath: values.jsonPath,
    label: values.label,
    unit: values.unit,
  }),
  keyValue: (values) => ({
    type: "keyValue",
    mappings: values.mappings,
  }),
  table: (values) => ({
    type: "table",
    tablePath: values.tablePath,
    columns: values.columns,
  }),
};

export function CustomWidgetForm({ mode, initialValues, definitionId }: CustomWidgetFormProps) {
  const router = useRouter();
  const t = useScopedI18n("customWidget");
  const utils = clientApi.useUtils();
  const createMutation = clientApi.customWidget.create.useMutation();
  const updateMutation = clientApi.customWidget.update.useMutation();

  const form = useZodForm(formSchema, {
    initialValues: {
      ...defaultCreateValues,
      ...initialValues,
    },
  });

  const handleSubmit = form.onSubmit(async (values) => {
    const buildConfig = displayConfigBuilders[values.displayType] ?? displayConfigBuilders.singleValue!;
    const displayConfig = buildConfig!(values);

    const payload = {
      name: values.name,
      description: values.description || undefined,
      iconUrl: values.iconUrl || undefined,
      baseUrl: values.baseUrl,
      authType: values.authType as CustomWidgetAuthType,
      headerName: values.headerName || undefined,
      endpoint: values.endpoint,
      method: values.method as "GET" | "POST",
      requestBody: values.requestBody || undefined,
      displayType: values.displayType as CustomWidgetDisplayType,
      displayConfig: displayConfig as never,
      secrets: values.secrets
        .filter((s) => s.value)
        .map((s) => ({ kind: s.kind as "apiKey" | "username" | "password", value: s.value })),
    };

    try {
      if (mode === "create") {
        const result = await createMutation.mutateAsync(payload);
        showSuccessNotification({
          title: t("action.create"),
          message: t("notification.created", { name: values.name }),
        });
        await utils.customWidget.all.invalidate();
        router.push(`/manage/custom-widgets/edit/${result.id}`);
      } else if (definitionId) {
        await updateMutation.mutateAsync({ id: definitionId, ...payload });
        showSuccessNotification({ title: t("action.save"), message: t("notification.updated", { name: values.name }) });
        await utils.customWidget.all.invalidate();
        await utils.customWidget.byId.invalidate({ id: definitionId });
      }
    } catch {
      const errorKey = mode === "create" ? "notification.createError" : "notification.updateError";
      showErrorNotification({ title: t("action.save"), message: t(errorKey as never) });
    }
  });

  const secretFields = authTypeSecretFields[form.values.authType] ?? [];

  const getPreviewInput = useCallback(() => {
    const values = form.values;
    const buildConfig = displayConfigBuilders[values.displayType] ?? displayConfigBuilders.singleValue!;
    return {
      baseUrl: values.baseUrl,
      endpoint: values.endpoint,
      method: values.method,
      authType: values.authType,
      headerName: values.headerName || undefined,
      requestBody: values.requestBody || undefined,
      displayType: values.displayType,
      displayConfig: buildConfig!(values) as Record<string, unknown>,
      secrets: values.secrets.filter((s) => s.value),
      definitionId,
    };
  }, [form.values, definitionId]);

  return (
    <form onSubmit={handleSubmit}>
      <Group align="start" wrap="nowrap" gap="lg">
        <Stack gap="lg" style={{ flex: 1, minWidth: 0 }}>
        <Fieldset legend={t("fieldset.general")}>
          <Stack gap="sm">
            <TextInput label={t("field.name")} required {...form.getInputProps("name")} />
            <Textarea label={t("field.description")} {...form.getInputProps("description")} />
            <IconPicker withAsterisk={false} {...form.getInputProps("iconUrl")} />
          </Stack>
        </Fieldset>

        <Fieldset legend={t("fieldset.connection")}>
          <Stack gap="sm">
            <TextInput
              label={t("field.baseUrl")}
              required
              placeholder={t("placeholder.baseUrl")}
              {...form.getInputProps("baseUrl")}
            />
            <div>
              <Text size="sm" fw={500} mb={4}>
                {t("field.authType")}
              </Text>
              <SegmentedControl
                fullWidth
                data={["none", "bearer", "basic", "apiKeyHeader", "apiKeyQuery"].map((value) => ({
                  value,
                  label: t(`authType.${value}` as never),
                }))}
                {...form.getInputProps("authType")}
                onChange={(value) => {
                  form.setFieldValue("authType", value);
                  const newSecrets = (authTypeSecretFields[value] ?? []).map((f) => ({
                    kind: f.kind,
                    value: form.values.secrets.find((s) => s.kind === f.kind)?.value ?? "",
                  }));
                  form.setFieldValue("secrets", newSecrets);
                }}
              />
            </div>
            {showHeaderName[form.values.authType] && (
              <TextInput
                label={t("field.headerName")}
                placeholder={t("placeholder.headerName")}
                {...form.getInputProps("headerName")}
              />
            )}
            {secretFields.map((field) => {
              const secretIndex = form.values.secrets.findIndex((s) => s.kind === field.kind);
              if (secretIndex === -1) return null;
              return field.isPassword ? (
                <PasswordInput
                  key={field.kind}
                  label={t(`secret.${field.labelKey}` as never)}
                  {...form.getInputProps(`secrets.${secretIndex}.value`)}
                />
              ) : (
                <TextInput
                  key={field.kind}
                  label={t(`secret.${field.labelKey}` as never)}
                  {...form.getInputProps(`secrets.${secretIndex}.value`)}
                />
              );
            })}
          </Stack>
        </Fieldset>

        <Fieldset legend={t("fieldset.request")}>
          <Stack gap="sm">
            <TextInput
              label={t("field.endpoint")}
              required
              placeholder={t("placeholder.endpoint")}
              {...form.getInputProps("endpoint")}
            />
            <div>
              <Text size="sm" fw={500} mb={4}>
                {t("field.method")}
              </Text>
              <SegmentedControl
                data={["GET", "POST"].map((value) => ({ value, label: t(`method.${value}` as never) }))}
                {...form.getInputProps("method")}
              />
            </div>
            {form.values.method === "POST" && (
              <Textarea label={t("field.requestBody")} minRows={3} {...form.getInputProps("requestBody")} />
            )}
          </Stack>
        </Fieldset>

        <Fieldset legend={t("fieldset.display")}>
          <Stack gap="sm">
            <div>
              <Text size="sm" fw={500} mb={4}>
                {t("field.displayType")}
              </Text>
              <SegmentedControl
                fullWidth
                data={["singleValue", "keyValue", "table"].map((value) => ({
                  value,
                  label: t(`displayType.${value}` as never),
                }))}
                {...form.getInputProps("displayType")}
              />
              <Text size="xs" c="dimmed" mt={4}>
                {t(`displayTypeDescription.${form.values.displayType}` as never)}
              </Text>
            </div>

            {form.values.displayType === "singleValue" && (
              <>
                <TextInput
                  label={t("field.jsonPath")}
                  description={t("field.jsonPathHint")}
                  required
                  placeholder={t("placeholder.jsonPath")}
                  {...form.getInputProps("jsonPath")}
                />
                <TextInput
                  label={t("field.label")}
                  placeholder={t("placeholder.exampleLabel")}
                  {...form.getInputProps("label")}
                />
                <TextInput
                  label={t("field.unit")}
                  placeholder={t("placeholder.exampleUnit")}
                  {...form.getInputProps("unit")}
                />
              </>
            )}

            {form.values.displayType === "keyValue" && (
              <Stack gap="xs">
                <Text size="sm" fw={500}>
                  {t("field.mappings")}
                </Text>
                {form.values.mappings.map((_mapping, i) => (
                  <Group key={i} align="end" wrap="nowrap">
                    <TextInput
                      label={t("field.label")}
                      placeholder={t("placeholder.exampleLabelShort")}
                      style={{ flex: 1 }}
                      {...form.getInputProps(`mappings.${i}.label`)}
                    />
                    <TextInput
                      label={t("field.jsonPath")}
                      placeholder={t("placeholder.jsonPath")}
                      style={{ flex: 1 }}
                      {...form.getInputProps(`mappings.${i}.jsonPath`)}
                    />
                    <TextInput
                      label={t("field.unit")}
                      placeholder={t("placeholder.exampleUnit")}
                      style={{ width: 80 }}
                      {...form.getInputProps(`mappings.${i}.unit`)}
                    />
                    <ActionIcon
                      color="red"
                      variant="subtle"
                      onClick={() => form.removeListItem("mappings", i)}
                      disabled={form.values.mappings.length <= 1}
                      aria-label={t("action.removeMapping")}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                ))}
                <Button
                  variant="light"
                  size="xs"
                  leftSection={<IconPlus size={14} />}
                  onClick={() => form.insertListItem("mappings", { label: "", jsonPath: "$", unit: "" })}
                >
                  {t("action.addMapping")}
                </Button>
              </Stack>
            )}

            {form.values.displayType === "table" && (
              <Stack gap="xs">
                <TextInput
                  label={t("field.tablePath")}
                  description={t("field.tablePathHint")}
                  required
                  placeholder={t("placeholder.tablePath")}
                  {...form.getInputProps("tablePath")}
                />
                <Text size="sm" fw={500}>
                  {t("field.columns")}
                </Text>
                {form.values.columns.map((_col, i) => (
                  <Group key={i} align="end" wrap="nowrap">
                    <TextInput
                      label={t("field.header")}
                      placeholder={t("placeholder.exampleHeader")}
                      style={{ flex: 1 }}
                      {...form.getInputProps(`columns.${i}.header`)}
                    />
                    <TextInput
                      label={t("field.jsonPath")}
                      placeholder={t("placeholder.columnJsonPath")}
                      style={{ flex: 1 }}
                      {...form.getInputProps(`columns.${i}.jsonPath`)}
                    />
                    <ActionIcon
                      color="red"
                      variant="subtle"
                      onClick={() => form.removeListItem("columns", i)}
                      disabled={form.values.columns.length <= 1}
                      aria-label={t("action.removeColumn")}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                ))}
                <Button
                  variant="light"
                  size="xs"
                  leftSection={<IconPlus size={14} />}
                  onClick={() => form.insertListItem("columns", { header: "", jsonPath: "$" })}
                >
                  {t("action.addColumn")}
                </Button>
              </Stack>
            )}
          </Stack>
        </Fieldset>

        <Box hiddenFrom="md">
          <CustomWidgetPreview getFormValues={getPreviewInput} />
        </Box>
        </Stack>

        <Box w={340} style={{ flexShrink: 0, position: "sticky", top: 100, alignSelf: "start" }} visibleFrom="md">
          <Stack gap="sm">
            <Button type="submit" fullWidth loading={createMutation.isPending || updateMutation.isPending}>
              {mode === "create" ? t("action.create") : t("action.save")}
            </Button>
            <CustomWidgetPreview getFormValues={getPreviewInput} />
          </Stack>
        </Box>
      </Group>
    </form>
  );
}
