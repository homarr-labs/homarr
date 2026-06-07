"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ActionIcon,
  Box,
  Button,
  Fieldset,
  Group,
  NumberInput,
  PasswordInput,
  SegmentedControl,
  Select,
  Stack,
  Switch,
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

const requiredFieldValidators: Record<string, (data: Record<string, unknown>, ctx: z.core.$ZodRefinementCtx) => void> = {
  singleValue: (data, ctx) => {
    if (!data.jsonPath) ctx.addIssue({ code: "too_small", minimum: 1, type: "string", inclusive: true, input: data.jsonPath, path: ["jsonPath"] });
  },
  keyValue: (data, ctx) => {
    (data.mappings as Array<{ label: string; jsonPath: string }>)?.forEach((m, i) => {
      if (!m.label) ctx.addIssue({ code: "too_small", minimum: 1, type: "string", inclusive: true, input: m.label, path: ["mappings", i, "label"] });
      if (!m.jsonPath) ctx.addIssue({ code: "too_small", minimum: 1, type: "string", inclusive: true, input: m.jsonPath, path: ["mappings", i, "jsonPath"] });
    });
  },
  table: (data, ctx) => {
    if (!data.tablePath) ctx.addIssue({ code: "too_small", minimum: 1, type: "string", inclusive: true, input: data.tablePath, path: ["tablePath"] });
    (data.columns as Array<{ header: string; jsonPath: string }>)?.forEach((c, i) => {
      if (!c.header) ctx.addIssue({ code: "too_small", minimum: 1, type: "string", inclusive: true, input: c.header, path: ["columns", i, "header"] });
      if (!c.jsonPath) ctx.addIssue({ code: "too_small", minimum: 1, type: "string", inclusive: true, input: c.jsonPath, path: ["columns", i, "jsonPath"] });
    });
  },
  statGrid: (data, ctx) => {
    (data.statGridItems as Array<{ label: string; jsonPath: string }>)?.forEach((item, i) => {
      if (!item.label) ctx.addIssue({ code: "too_small", minimum: 1, type: "string", inclusive: true, input: item.label, path: ["statGridItems", i, "label"] });
      if (!item.jsonPath) ctx.addIssue({ code: "too_small", minimum: 1, type: "string", inclusive: true, input: item.jsonPath, path: ["statGridItems", i, "jsonPath"] });
    });
  },
  progressBars: (data, ctx) => {
    (data.progressBars as Array<{ label: string; valuePath: string }>)?.forEach((bar, i) => {
      if (!bar.label) ctx.addIssue({ code: "too_small", minimum: 1, type: "string", inclusive: true, input: bar.label, path: ["progressBars", i, "label"] });
      if (!bar.valuePath) ctx.addIssue({ code: "too_small", minimum: 1, type: "string", inclusive: true, input: bar.valuePath, path: ["progressBars", i, "valuePath"] });
    });
  },
  statusIndicator: (data, ctx) => {
    (data.statusItems as Array<{ label: string; jsonPath: string; goodValues: string }>)?.forEach((item, i) => {
      if (!item.label) ctx.addIssue({ code: "too_small", minimum: 1, type: "string", inclusive: true, input: item.label, path: ["statusItems", i, "label"] });
      if (!item.jsonPath) ctx.addIssue({ code: "too_small", minimum: 1, type: "string", inclusive: true, input: item.jsonPath, path: ["statusItems", i, "jsonPath"] });
      if (!item.goodValues) ctx.addIssue({ code: "too_small", minimum: 1, type: "string", inclusive: true, input: item.goodValues, path: ["statusItems", i, "goodValues"] });
    });
  },
  countGrid: (data, ctx) => {
    (data.countGridItems as Array<{ label: string; jsonPath: string }>)?.forEach((item, i) => {
      if (!item.label) ctx.addIssue({ code: "too_small", minimum: 1, type: "string", inclusive: true, input: item.label, path: ["countGridItems", i, "label"] });
      if (!item.jsonPath) ctx.addIssue({ code: "too_small", minimum: 1, type: "string", inclusive: true, input: item.jsonPath, path: ["countGridItems", i, "jsonPath"] });
    });
  },
  raw: (data, ctx) => {
    if (!data.rawJsonPath) ctx.addIssue({ code: "too_small", minimum: 1, type: "string", inclusive: true, input: data.rawJsonPath, path: ["rawJsonPath"] });
  },
  actionButton: (data, ctx) => {
    if (!data.buttonLabel) ctx.addIssue({ code: "too_small", minimum: 1, type: "string", inclusive: true, input: data.buttonLabel, path: ["buttonLabel"] });
  },
};

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
  valueSize: z.string(),
  labelPosition: z.string(),
  mappings: z.array(z.object({ label: z.string(), jsonPath: z.string(), unit: z.string() })),
  kvLayout: z.string(),
  kvColumns: z.number(),
  tablePath: z.string(),
  columns: z.array(z.object({ header: z.string(), jsonPath: z.string() })),
  striped: z.boolean(),
  compact: z.boolean(),
  statGridItems: z.array(z.object({ label: z.string(), jsonPath: z.string(), unit: z.string(), color: z.string() })),
  statGridColumns: z.number(),
  cardStyle: z.string(),
  progressBars: z.array(z.object({ label: z.string(), valuePath: z.string(), maxPath: z.string(), unit: z.string(), color: z.string() })),
  showPercentage: z.boolean(),
  barSize: z.string(),
  statusItems: z.array(z.object({ label: z.string(), jsonPath: z.string(), goodValues: z.string() })),
  statusLayout: z.string(),
  dotSize: z.string(),
  countGridItems: z.array(z.object({ label: z.string(), jsonPath: z.string(), unit: z.string() })),
  countGridColumns: z.number(),
  countValueSize: z.string(),
  rawJsonPath: z.string(),
  rawMaxHeight: z.number(),
  buttonLabel: z.string(),
  buttonColor: z.string(),
  confirmText: z.string(),
  successMessage: z.string(),
  secrets: z.array(z.object({ kind: z.string(), value: z.string(), hasValue: z.boolean().optional() })),
}).superRefine((data, ctx) => {
  const validator = requiredFieldValidators[data.displayType];
  validator?.(data as unknown as Record<string, unknown>, ctx);
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
  valueSize: "lg",
  labelPosition: "below",
  mappings: [{ label: "", jsonPath: "$", unit: "" }],
  kvLayout: "list",
  kvColumns: 2,
  tablePath: "$",
  columns: [{ header: "", jsonPath: "$" }],
  striped: true,
  compact: false,
  statGridItems: [{ label: "", jsonPath: "$", unit: "", color: "blue" }],
  statGridColumns: 2,
  cardStyle: "filled",
  progressBars: [{ label: "", valuePath: "$", maxPath: "", unit: "", color: "blue" }],
  showPercentage: true,
  barSize: "md",
  statusItems: [{ label: "", jsonPath: "$", goodValues: "online,true" }],
  statusLayout: "list",
  dotSize: "md",
  countGridItems: [{ label: "", jsonPath: "$", unit: "" }],
  countGridColumns: 2,
  countValueSize: "md",
  rawJsonPath: "$",
  rawMaxHeight: 300,
  buttonLabel: "Execute",
  buttonColor: "blue",
  confirmText: "",
  successMessage: "",
  secrets: [],
};

interface CustomWidgetFormProps {
  mode: "create" | "edit";
  initialValues?: Partial<z.infer<typeof formSchema>>;
  definitionId?: string;
}

const displayConfigBuilders: Record<string, (values: z.infer<typeof formSchema>) => Record<string, unknown>> = {
  singleValue: (v) => ({ type: "singleValue", jsonPath: v.jsonPath, label: v.label, unit: v.unit, valueSize: v.valueSize, labelPosition: v.labelPosition }),
  keyValue: (v) => ({ type: "keyValue", mappings: v.mappings, layout: v.kvLayout, columns: v.kvColumns }),
  table: (v) => ({ type: "table", tablePath: v.tablePath, columns: v.columns, striped: v.striped, compact: v.compact }),
  statGrid: (v) => ({ type: "statGrid", items: v.statGridItems, columns: v.statGridColumns, cardStyle: v.cardStyle }),
  progressBars: (v) => ({ type: "progressBars", bars: v.progressBars.map((b) => ({ ...b, maxPath: b.maxPath || undefined })), showPercentage: v.showPercentage, barSize: v.barSize }),
  statusIndicator: (v) => ({
    type: "statusIndicator",
    items: v.statusItems.map((item) => ({ ...item, goodValues: item.goodValues.split(",").map((s) => s.trim()).filter(Boolean) })),
    layout: v.statusLayout,
    dotSize: v.dotSize,
  }),
  countGrid: (v) => ({ type: "countGrid", items: v.countGridItems, columns: v.countGridColumns, valueSize: v.countValueSize }),
  raw: (v) => ({ type: "raw", jsonPath: v.rawJsonPath, maxHeight: v.rawMaxHeight }),
  actionButton: (v) => ({ type: "actionButton", buttonLabel: v.buttonLabel, buttonColor: v.buttonColor, confirmText: v.confirmText || undefined, successMessage: v.successMessage || undefined }),
};

const serverToFormFieldMap: Record<string, Record<string, string>> = {
  statGrid: { items: "statGridItems" },
  countGrid: { items: "countGridItems" },
  statusIndicator: { items: "statusItems" },
  progressBars: { bars: "progressBars" },
  keyValue: { mappings: "mappings" },
  table: { columns: "columns", tablePath: "tablePath" },
  singleValue: { jsonPath: "jsonPath", label: "label", unit: "unit" },
  raw: { jsonPath: "rawJsonPath" },
  actionButton: { buttonLabel: "buttonLabel" },
};

function extractServerErrors(err: unknown, displayType: string): Record<string, string> {
  const errors: Record<string, string> = {};
  const trpcErr = err as { data?: { zodError?: { fieldErrors?: Record<string, string[]> } }; message?: string };

  if (trpcErr?.data?.zodError?.fieldErrors) {
    for (const [field, messages] of Object.entries(trpcErr.data.zodError.fieldErrors)) {
      if (messages?.[0]) {
        errors[field] = messages[0];
      }
    }
    return errors;
  }

  try {
    const issues = JSON.parse(trpcErr?.message ?? "[]") as Array<{ path: (string | number)[]; message: string }>;
    const fieldMap = serverToFormFieldMap[displayType] ?? {};

    for (const issue of issues) {
      const path = [...issue.path];
      if (path[0] === "displayConfig") {
        path.shift();
        const serverField = String(path[0]);
        const formField = fieldMap[serverField] ?? serverField;
        path[0] = formField;
      }
      errors[path.join(".")] = issue.message;
    }
  } catch {
    // not parseable, ignore
  }

  return errors;
}

const ALL_DISPLAY_TYPES = ["singleValue", "keyValue", "table", "statGrid", "progressBars", "statusIndicator", "countGrid", "raw", "actionButton"] as const;
const MANTINE_COLORS = ["blue", "teal", "green", "red", "orange", "yellow", "violet", "pink", "cyan", "grape", "indigo", "lime"] as const;

export function CustomWidgetForm({ mode, initialValues, definitionId }: CustomWidgetFormProps) {
  const router = useRouter();
  const t = useScopedI18n("customWidget");
  const utils = clientApi.useUtils();
  const createMutation = clientApi.customWidget.create.useMutation();
  const updateMutation = clientApi.customWidget.update.useMutation();
  const [previewRefreshSignal, setPreviewRefreshSignal] = useState(0);

  const form = useZodForm(formSchema, {
    initialValues: { ...defaultCreateValues, ...initialValues },
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
        showSuccessNotification({ title: t("action.create"), message: t("notification.created", { name: values.name }) });
        await utils.customWidget.all.invalidate();
        router.push(`/manage/custom-widgets/edit/${result.id}`);
      } else if (definitionId) {
        await updateMutation.mutateAsync({ id: definitionId, ...payload });
        showSuccessNotification({ title: t("action.save"), message: t("notification.updated", { name: values.name }) });
        setPreviewRefreshSignal((n) => n + 1);
        await utils.customWidget.all.invalidate();
        await utils.customWidget.byId.invalidate({ id: definitionId });
      }
    } catch (err) {
      const serverErrors = extractServerErrors(err, values.displayType);
      if (Object.keys(serverErrors).length > 0) {
        form.setErrors(serverErrors);
      }
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
              <TextInput label={t("field.baseUrl")} required placeholder={t("placeholder.baseUrl")} {...form.getInputProps("baseUrl")} />
              <div>
                <Text size="sm" fw={500} mb={4}>{t("field.authType")}</Text>
                <SegmentedControl
                  fullWidth
                  data={["none", "bearer", "basic", "apiKeyHeader", "apiKeyQuery"].map((value) => ({ value, label: t(`authType.${value}` as never) }))}
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
                <TextInput label={t("field.headerName")} placeholder={t("placeholder.headerName")} {...form.getInputProps("headerName")} />
              )}
              {secretFields.map((field) => {
                const secretIndex = form.values.secrets.findIndex((s) => s.kind === field.kind);
                if (secretIndex === -1) return null;
                const secret = form.values.secrets[secretIndex]!;
                const placeholder = secret.hasValue && !secret.value ? t("secret.savedPlaceholder" as never) : undefined;
                return field.isPassword ? (
                  <PasswordInput key={field.kind} label={t(`secret.${field.labelKey}` as never)} placeholder={placeholder} {...form.getInputProps(`secrets.${secretIndex}.value`)} />
                ) : (
                  <TextInput key={field.kind} label={t(`secret.${field.labelKey}` as never)} placeholder={placeholder} {...form.getInputProps(`secrets.${secretIndex}.value`)} />
                );
              })}
            </Stack>
          </Fieldset>

          <Fieldset legend={t("fieldset.request")}>
            <Stack gap="sm">
              <TextInput label={t("field.endpoint")} required placeholder={t("placeholder.endpoint")} {...form.getInputProps("endpoint")} />
              <div>
                <Text size="sm" fw={500} mb={4}>{t("field.method")}</Text>
                <SegmentedControl data={["GET", "POST", "PUT", "DELETE", "PATCH"].map((value) => ({ value, label: t(`method.${value}` as never) }))} {...form.getInputProps("method")} />
              </div>
              {form.values.method === "POST" && (
                <Textarea label={t("field.requestBody")} minRows={3} {...form.getInputProps("requestBody")} />
              )}
            </Stack>
          </Fieldset>

          <Fieldset legend={t("fieldset.display")}>
            <Stack gap="sm">
              <Select
                label={t("field.displayType")}
                data={ALL_DISPLAY_TYPES.map((value) => ({
                  value,
                  label: t(`displayType.${value}` as never),
                }))}
                {...form.getInputProps("displayType")}
                allowDeselect={false}
              />
              <Text size="xs" c="dimmed">{t(`displayTypeDescription.${form.values.displayType}` as never)}</Text>

              <DisplayTypeFields form={form} t={t} />
            </Stack>
          </Fieldset>

          <Box hiddenFrom="md">
            <CustomWidgetPreview getFormValues={getPreviewInput} refreshSignal={previewRefreshSignal} />
          </Box>

          <Group justify="end">
            <Button type="submit" loading={createMutation.isPending || updateMutation.isPending}>
              {mode === "create" ? t("action.create") : t("action.save")}
            </Button>
          </Group>
        </Stack>

        <Box w={340} style={{ flexShrink: 0, position: "sticky", top: 100, alignSelf: "start" }} visibleFrom="md">
          <Stack gap="sm">
            <Button type="submit" fullWidth loading={createMutation.isPending || updateMutation.isPending}>
              {mode === "create" ? t("action.create") : t("action.save")}
            </Button>
            <CustomWidgetPreview getFormValues={getPreviewInput} refreshSignal={previewRefreshSignal} />
          </Stack>
        </Box>
      </Group>
    </form>
  );
}

function DisplayTypeFields({ form, t }: { form: ReturnType<typeof useZodForm<typeof formSchema>>; t: ReturnType<typeof useScopedI18n<"customWidget">> }) {
  const dt = form.values.displayType;

  if (dt === "singleValue") {
    return (
      <>
        <TextInput label={t("field.jsonPath")} description={t("field.jsonPathHint")} required placeholder={t("placeholder.jsonPath")} {...form.getInputProps("jsonPath")} />
        <TextInput label={t("field.label")} placeholder={t("placeholder.exampleLabel")} {...form.getInputProps("label")} />
        <TextInput label={t("field.unit")} placeholder={t("placeholder.exampleUnit")} {...form.getInputProps("unit")} />
        <Group grow>
          <Select label={t("field.valueSize")} data={["sm", "md", "lg", "xl"].map((v) => ({ value: v, label: t(`sizeOption.${v}` as never) }))} {...form.getInputProps("valueSize")} allowDeselect={false} />
          <Select label={t("field.labelPosition")} data={["above", "below"].map((v) => ({ value: v, label: t(`labelPositionOption.${v}` as never) }))} {...form.getInputProps("labelPosition")} allowDeselect={false} />
        </Group>
      </>
    );
  }

  if (dt === "keyValue") {
    return (
      <Stack gap="xs">
        <Group grow>
          <Select label={t("field.kvLayout")} data={["list", "grid"].map((v) => ({ value: v, label: t(`layoutOption.${v}` as never) }))} {...form.getInputProps("kvLayout")} allowDeselect={false} />
          {form.values.kvLayout === "grid" && (
            <NumberInput label={t("field.gridColumns")} min={1} max={3} {...form.getInputProps("kvColumns")} />
          )}
        </Group>
        <Text size="sm" fw={500}>{t("field.mappings")}</Text>
        {form.values.mappings.map((_m, i) => (
          <Group key={i} align="end" wrap="nowrap">
            <TextInput label={t("field.label")} placeholder={t("placeholder.exampleLabelShort")} style={{ flex: 1 }} {...form.getInputProps(`mappings.${i}.label`)} />
            <TextInput label={t("field.jsonPath")} placeholder={t("placeholder.jsonPath")} style={{ flex: 1 }} {...form.getInputProps(`mappings.${i}.jsonPath`)} />
            <TextInput label={t("field.unit")} placeholder={t("placeholder.exampleUnit")} style={{ width: 80 }} {...form.getInputProps(`mappings.${i}.unit`)} />
            <ActionIcon color="red" variant="subtle" onClick={() => form.removeListItem("mappings", i)} disabled={form.values.mappings.length <= 1} aria-label={t("action.removeMapping")}>
              <IconTrash size={16} />
            </ActionIcon>
          </Group>
        ))}
        <Button variant="light" size="xs" leftSection={<IconPlus size={14} />} onClick={() => form.insertListItem("mappings", { label: "", jsonPath: "$", unit: "" })}>
          {t("action.addMapping")}
        </Button>
      </Stack>
    );
  }

  if (dt === "table") {
    return (
      <Stack gap="xs">
        <TextInput label={t("field.tablePath")} description={t("field.tablePathHint")} required placeholder={t("placeholder.tablePath")} {...form.getInputProps("tablePath")} />
        <Group grow>
          <Switch label={t("field.striped")} {...form.getInputProps("striped", { type: "checkbox" })} />
          <Switch label={t("field.compact")} {...form.getInputProps("compact", { type: "checkbox" })} />
        </Group>
        <Text size="sm" fw={500}>{t("field.columns")}</Text>
        {form.values.columns.map((_col, i) => (
          <Group key={i} align="end" wrap="nowrap">
            <TextInput label={t("field.header")} placeholder={t("placeholder.exampleHeader")} style={{ flex: 1 }} {...form.getInputProps(`columns.${i}.header`)} />
            <TextInput label={t("field.jsonPath")} placeholder={t("placeholder.columnJsonPath")} style={{ flex: 1 }} {...form.getInputProps(`columns.${i}.jsonPath`)} />
            <ActionIcon color="red" variant="subtle" onClick={() => form.removeListItem("columns", i)} disabled={form.values.columns.length <= 1} aria-label={t("action.removeColumn")}>
              <IconTrash size={16} />
            </ActionIcon>
          </Group>
        ))}
        <Button variant="light" size="xs" leftSection={<IconPlus size={14} />} onClick={() => form.insertListItem("columns", { header: "", jsonPath: "$" })}>
          {t("action.addColumn")}
        </Button>
      </Stack>
    );
  }

  if (dt === "statGrid") {
    return (
      <Stack gap="xs">
        <Group grow>
          <NumberInput label={t("field.gridColumns")} min={1} max={4} {...form.getInputProps("statGridColumns")} />
          <Select label={t("field.cardStyle")} data={["filled", "outline", "subtle"].map((v) => ({ value: v, label: t(`cardStyleOption.${v}` as never) }))} {...form.getInputProps("cardStyle")} allowDeselect={false} />
        </Group>
        <Text size="sm" fw={500}>{t("field.items")}</Text>
        {form.values.statGridItems.map((_item, i) => (
          <Group key={i} align="end" wrap="nowrap">
            <TextInput label={t("field.label")} placeholder={t("placeholder.exampleLabelShort")} style={{ flex: 1 }} {...form.getInputProps(`statGridItems.${i}.label`)} />
            <TextInput label={t("field.jsonPath")} placeholder={t("placeholder.jsonPath")} style={{ flex: 1 }} {...form.getInputProps(`statGridItems.${i}.jsonPath`)} />
            <TextInput label={t("field.unit")} placeholder={t("placeholder.exampleUnit")} style={{ width: 80 }} {...form.getInputProps(`statGridItems.${i}.unit`)} />
            <Select label={t("field.color")} data={MANTINE_COLORS.map((c) => ({ value: c, label: c }))} style={{ width: 100 }} {...form.getInputProps(`statGridItems.${i}.color`)} allowDeselect={false} />
            <ActionIcon color="red" variant="subtle" onClick={() => form.removeListItem("statGridItems", i)} disabled={form.values.statGridItems.length <= 1} aria-label={t("action.removeItem")}>
              <IconTrash size={16} />
            </ActionIcon>
          </Group>
        ))}
        <Button variant="light" size="xs" leftSection={<IconPlus size={14} />} onClick={() => form.insertListItem("statGridItems", { label: "", jsonPath: "$", unit: "", color: "blue" })}>
          {t("action.addItem")}
        </Button>
      </Stack>
    );
  }

  if (dt === "progressBars") {
    return (
      <Stack gap="xs">
        <Group grow>
          <Switch label={t("field.showPercentage")} {...form.getInputProps("showPercentage", { type: "checkbox" })} />
          <Select label={t("field.barSize")} data={["sm", "md", "lg"].map((v) => ({ value: v, label: t(`sizeOption.${v}` as never) }))} {...form.getInputProps("barSize")} allowDeselect={false} />
        </Group>
        <Text size="sm" fw={500}>{t("field.bars")}</Text>
        {form.values.progressBars.map((_bar, i) => (
          <Group key={i} align="end" wrap="nowrap">
            <TextInput label={t("field.label")} placeholder={t("placeholder.exampleLabelShort")} style={{ flex: 1 }} {...form.getInputProps(`progressBars.${i}.label`)} />
            <TextInput label={t("field.valuePath")} placeholder={t("placeholder.valuePath")} style={{ flex: 1 }} {...form.getInputProps(`progressBars.${i}.valuePath`)} />
            <TextInput label={t("field.maxPath")} placeholder={t("placeholder.maxPath")} style={{ flex: 1 }} {...form.getInputProps(`progressBars.${i}.maxPath`)} />
            <TextInput label={t("field.unit")} placeholder={t("placeholder.exampleUnit")} style={{ width: 60 }} {...form.getInputProps(`progressBars.${i}.unit`)} />
            <Select label={t("field.color")} data={MANTINE_COLORS.map((c) => ({ value: c, label: c }))} style={{ width: 100 }} {...form.getInputProps(`progressBars.${i}.color`)} allowDeselect={false} />
            <ActionIcon color="red" variant="subtle" onClick={() => form.removeListItem("progressBars", i)} disabled={form.values.progressBars.length <= 1} aria-label={t("action.removeItem")}>
              <IconTrash size={16} />
            </ActionIcon>
          </Group>
        ))}
        <Button variant="light" size="xs" leftSection={<IconPlus size={14} />} onClick={() => form.insertListItem("progressBars", { label: "", valuePath: "$", maxPath: "", unit: "", color: "blue" })}>
          {t("action.addBar")}
        </Button>
      </Stack>
    );
  }

  if (dt === "statusIndicator") {
    return (
      <Stack gap="xs">
        <Group grow>
          <Select label={t("field.kvLayout")} data={["list", "grid"].map((v) => ({ value: v, label: t(`layoutOption.${v}` as never) }))} {...form.getInputProps("statusLayout")} allowDeselect={false} />
          <Select label={t("field.dotSize")} data={["sm", "md", "lg"].map((v) => ({ value: v, label: t(`sizeOption.${v}` as never) }))} {...form.getInputProps("dotSize")} allowDeselect={false} />
        </Group>
        <Text size="sm" fw={500}>{t("field.items")}</Text>
        {form.values.statusItems.map((_item, i) => (
          <Group key={i} align="end" wrap="nowrap">
            <TextInput label={t("field.label")} placeholder={t("placeholder.exampleLabelShort")} style={{ flex: 1 }} {...form.getInputProps(`statusItems.${i}.label`)} />
            <TextInput label={t("field.jsonPath")} placeholder={t("placeholder.jsonPath")} style={{ flex: 1 }} {...form.getInputProps(`statusItems.${i}.jsonPath`)} />
            <TextInput label={t("field.goodValues")} placeholder={t("placeholder.goodValues")} style={{ flex: 1 }} {...form.getInputProps(`statusItems.${i}.goodValues`)} />
            <ActionIcon color="red" variant="subtle" onClick={() => form.removeListItem("statusItems", i)} disabled={form.values.statusItems.length <= 1} aria-label={t("action.removeItem")}>
              <IconTrash size={16} />
            </ActionIcon>
          </Group>
        ))}
        <Button variant="light" size="xs" leftSection={<IconPlus size={14} />} onClick={() => form.insertListItem("statusItems", { label: "", jsonPath: "$", goodValues: "online,true" })}>
          {t("action.addItem")}
        </Button>
      </Stack>
    );
  }

  if (dt === "countGrid") {
    return (
      <Stack gap="xs">
        <Group grow>
          <NumberInput label={t("field.gridColumns")} min={2} max={4} {...form.getInputProps("countGridColumns")} />
          <Select label={t("field.valueSize")} data={["sm", "md", "lg"].map((v) => ({ value: v, label: t(`sizeOption.${v}` as never) }))} {...form.getInputProps("countValueSize")} allowDeselect={false} />
        </Group>
        <Text size="sm" fw={500}>{t("field.items")}</Text>
        {form.values.countGridItems.map((_item, i) => (
          <Group key={i} align="end" wrap="nowrap">
            <TextInput label={t("field.label")} placeholder={t("placeholder.exampleLabelShort")} style={{ flex: 1 }} {...form.getInputProps(`countGridItems.${i}.label`)} />
            <TextInput label={t("field.jsonPath")} placeholder={t("placeholder.jsonPath")} style={{ flex: 1 }} {...form.getInputProps(`countGridItems.${i}.jsonPath`)} />
            <TextInput label={t("field.unit")} placeholder={t("placeholder.exampleUnit")} style={{ width: 80 }} {...form.getInputProps(`countGridItems.${i}.unit`)} />
            <ActionIcon color="red" variant="subtle" onClick={() => form.removeListItem("countGridItems", i)} disabled={form.values.countGridItems.length <= 1} aria-label={t("action.removeItem")}>
              <IconTrash size={16} />
            </ActionIcon>
          </Group>
        ))}
        <Button variant="light" size="xs" leftSection={<IconPlus size={14} />} onClick={() => form.insertListItem("countGridItems", { label: "", jsonPath: "$", unit: "" })}>
          {t("action.addItem")}
        </Button>
      </Stack>
    );
  }

  if (dt === "raw") {
    return (
      <>
        <TextInput label={t("field.jsonPath")} description={t("field.jsonPathHint")} placeholder={t("placeholder.jsonPath")} {...form.getInputProps("rawJsonPath")} />
        <NumberInput label={t("field.maxHeight")} min={50} max={1000} step={50} {...form.getInputProps("rawMaxHeight")} />
      </>
    );
  }

  if (dt === "actionButton") {
    return (
      <Stack gap="sm">
        <TextInput label={t("field.buttonLabel")} required {...form.getInputProps("buttonLabel")} />
        <Select
          label={t("field.buttonColor")}
          data={MANTINE_COLORS.map((c) => ({ value: c, label: c }))}
          {...form.getInputProps("buttonColor")}
          allowDeselect={false}
        />
        <TextInput label={t("field.confirmText")} description={t("field.confirmTextHint")} {...form.getInputProps("confirmText")} />
        <TextInput label={t("field.successMessage")} description={t("field.successMessageHint")} {...form.getInputProps("successMessage")} />
      </Stack>
    );
  }

  return null;
}
