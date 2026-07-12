"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Fieldset,
  Group,
  NumberInput,
  Paper,
  PasswordInput,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
  Textarea,
  ThemeIcon,
  UnstyledButton,
} from "@mantine/core";
import {
  Icon123,
  IconActivityHeartbeat,
  IconAlertTriangle,
  IconBraces,
  IconCode,
  IconHash,
  IconLayoutGrid,
  IconListDetails,
  IconPlayerPlay,
  IconPointer,
  IconProgress,
  IconTable,
  IconTrash,
  IconPlus,
} from "@tabler/icons-react";
import { z } from "zod/v4";

import { clientApi } from "@homarr/api/client";
import { useZodForm } from "@homarr/form";
import { IconPicker } from "@homarr/forms-collection";
import { useConfirmModal } from "@homarr/modals";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useI18n, useScopedI18n } from "@homarr/translation/client";

import type {
  CustomWidgetAuthType,
  CustomWidgetDisplayType,
  CustomWidgetMethod,
  CustomWidgetSecretKind,
} from "@homarr/validation/custom-widget";
import type { displayConfigSchema } from "@homarr/validation/custom-widget";
import { JsonPathTreePicker } from "@homarr/widgets/_inputs/json-path-tree-picker";

import {
  analyzeJsxTemplate,
  analyzeRequestManifest,
  CodeEditor,
  CUSTOM_JSX_TEMPLATE_LIMIT,
  parseRequestManifest,
} from "./_code-editor";
import { CopyAiPromptButton } from "./_copy-ai-prompt-button";
import { CustomWidgetPreview } from "./_custom-widget-preview";
import type { PreviewFetchResult } from "./_custom-widget-preview";
import {
  buildDisplayFormValues,
  CUSTOM_JSX_STARTER,
  getImportReview,
  parseCustomWidgetClipboard,
} from "./_custom-widget-import-utils";
import classes from "./_custom-widget-form.module.css";

const requiredFieldValidators: Record<string, (data: Record<string, unknown>, ctx: z.core.$RefinementCtx) => void> = {
  singleValue: (data, ctx) => {
    if (!data.jsonPath)
      ctx.addIssue({
        code: "too_small",
        minimum: 1,
        origin: "string",
        inclusive: true,
        input: data.jsonPath,
        path: ["jsonPath"],
      });
  },
  keyValue: (data, ctx) => {
    (data.mappings as Array<{ label: string; jsonPath: string }>)?.forEach((m, i) => {
      if (!m.label)
        ctx.addIssue({
          code: "too_small",
          minimum: 1,
          origin: "string",
          inclusive: true,
          input: m.label,
          path: ["mappings", i, "label"],
        });
      if (!m.jsonPath)
        ctx.addIssue({
          code: "too_small",
          minimum: 1,
          origin: "string",
          inclusive: true,
          input: m.jsonPath,
          path: ["mappings", i, "jsonPath"],
        });
    });
  },
  table: (data, ctx) => {
    if (!data.tablePath)
      ctx.addIssue({
        code: "too_small",
        minimum: 1,
        origin: "string",
        inclusive: true,
        input: data.tablePath,
        path: ["tablePath"],
      });
    (data.columns as Array<{ header: string; jsonPath: string }>)?.forEach((c, i) => {
      if (!c.header)
        ctx.addIssue({
          code: "too_small",
          minimum: 1,
          origin: "string",
          inclusive: true,
          input: c.header,
          path: ["columns", i, "header"],
        });
      if (!c.jsonPath)
        ctx.addIssue({
          code: "too_small",
          minimum: 1,
          origin: "string",
          inclusive: true,
          input: c.jsonPath,
          path: ["columns", i, "jsonPath"],
        });
    });
  },
  statGrid: (data, ctx) => {
    (data.statGridItems as Array<{ label: string; jsonPath: string }>)?.forEach((item, i) => {
      if (!item.label)
        ctx.addIssue({
          code: "too_small",
          minimum: 1,
          origin: "string",
          inclusive: true,
          input: item.label,
          path: ["statGridItems", i, "label"],
        });
      if (!item.jsonPath)
        ctx.addIssue({
          code: "too_small",
          minimum: 1,
          origin: "string",
          inclusive: true,
          input: item.jsonPath,
          path: ["statGridItems", i, "jsonPath"],
        });
    });
  },
  progressBars: (data, ctx) => {
    (data.progressBars as Array<{ label: string; valuePath: string }>)?.forEach((bar, i) => {
      if (!bar.label)
        ctx.addIssue({
          code: "too_small",
          minimum: 1,
          origin: "string",
          inclusive: true,
          input: bar.label,
          path: ["progressBars", i, "label"],
        });
      if (!bar.valuePath)
        ctx.addIssue({
          code: "too_small",
          minimum: 1,
          origin: "string",
          inclusive: true,
          input: bar.valuePath,
          path: ["progressBars", i, "valuePath"],
        });
    });
  },
  statusIndicator: (data, ctx) => {
    (
      data.statusItems as Array<{
        label: string;
        jsonPath: string;
        goodValues: string;
      }>
    )?.forEach((item, i) => {
      if (!item.label)
        ctx.addIssue({
          code: "too_small",
          minimum: 1,
          origin: "string",
          inclusive: true,
          input: item.label,
          path: ["statusItems", i, "label"],
        });
      if (!item.jsonPath)
        ctx.addIssue({
          code: "too_small",
          minimum: 1,
          origin: "string",
          inclusive: true,
          input: item.jsonPath,
          path: ["statusItems", i, "jsonPath"],
        });
      if (!item.goodValues)
        ctx.addIssue({
          code: "too_small",
          minimum: 1,
          origin: "string",
          inclusive: true,
          input: item.goodValues,
          path: ["statusItems", i, "goodValues"],
        });
    });
  },
  countGrid: (data, ctx) => {
    (data.countGridItems as Array<{ label: string; jsonPath: string }>)?.forEach((item, i) => {
      if (!item.label)
        ctx.addIssue({
          code: "too_small",
          minimum: 1,
          origin: "string",
          inclusive: true,
          input: item.label,
          path: ["countGridItems", i, "label"],
        });
      if (!item.jsonPath)
        ctx.addIssue({
          code: "too_small",
          minimum: 1,
          origin: "string",
          inclusive: true,
          input: item.jsonPath,
          path: ["countGridItems", i, "jsonPath"],
        });
    });
  },
  raw: (data, ctx) => {
    if (!data.rawJsonPath)
      ctx.addIssue({
        code: "too_small",
        minimum: 1,
        origin: "string",
        inclusive: true,
        input: data.rawJsonPath,
        path: ["rawJsonPath"],
      });
  },
  actionButton: (data, ctx) => {
    if (!data.buttonLabel)
      ctx.addIssue({
        code: "too_small",
        minimum: 1,
        origin: "string",
        inclusive: true,
        input: data.buttonLabel,
        path: ["buttonLabel"],
      });
  },
  customJsx: (data, ctx) => {
    if (!data.template)
      ctx.addIssue({
        code: "too_small",
        minimum: 1,
        origin: "string",
        inclusive: true,
        input: data.template,
        path: ["template"],
      });
    if (data.jsxApiVersion === "2" && analyzeRequestManifest(String(data.requestManifest ?? "[]")).length > 0) {
      ctx.addIssue({
        code: "custom",
        message: "invalidRequestManifest",
        input: data.requestManifest,
        path: ["requestManifest"],
      });
    }
  },
};

const formSchema = z
  .object({
    name: z.string().trim().min(1).max(128),
    description: z.string(),
    iconUrl: z.string(),
    url: z.string().trim().min(1),
    authType: z.string(),
    headerName: z.string(),
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
    statGridItems: z.array(
      z.object({
        label: z.string(),
        jsonPath: z.string(),
        unit: z.string(),
        color: z.string(),
      }),
    ),
    statGridColumns: z.number(),
    cardStyle: z.string(),
    progressBars: z.array(
      z.object({
        label: z.string(),
        valuePath: z.string(),
        maxPath: z.string(),
        unit: z.string(),
        color: z.string(),
      }),
    ),
    showPercentage: z.boolean(),
    barSize: z.string(),
    statusItems: z.array(
      z.object({
        label: z.string(),
        jsonPath: z.string(),
        goodValues: z.string(),
      }),
    ),
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
    template: z.string(),
    jsxApiVersion: z.string(),
    networkScope: z.string(),
    requestManifest: z.string(),
    secrets: z.array(
      z.object({
        kind: z.string(),
        value: z.string(),
        hasValue: z.boolean().optional(),
      }),
    ),
  })
  .superRefine((data, ctx) => {
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
  url: "",
  authType: "none",
  headerName: "",
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
  template: CUSTOM_JSX_STARTER,
  jsxApiVersion: "2",
  networkScope: "public",
  requestManifest: "[]",
  secrets: [],
};

interface CustomWidgetFormProps {
  mode: "create" | "edit";
  initialValues?: Partial<z.infer<typeof formSchema>>;
  definitionId?: string;
}

const displayConfigBuilders: Record<string, (values: z.infer<typeof formSchema>) => Record<string, unknown>> = {
  singleValue: (v) => ({
    type: "singleValue",
    jsonPath: v.jsonPath,
    label: v.label,
    unit: v.unit,
    valueSize: v.valueSize,
    labelPosition: v.labelPosition,
  }),
  keyValue: (v) => ({
    type: "keyValue",
    mappings: v.mappings,
    layout: v.kvLayout,
    columns: v.kvColumns,
  }),
  table: (v) => ({
    type: "table",
    tablePath: v.tablePath,
    columns: v.columns,
    striped: v.striped,
    compact: v.compact,
  }),
  statGrid: (v) => ({
    type: "statGrid",
    items: v.statGridItems,
    columns: v.statGridColumns,
    cardStyle: v.cardStyle,
  }),
  progressBars: (v) => ({
    type: "progressBars",
    bars: v.progressBars.map((b) => ({
      ...b,
      maxPath: b.maxPath || undefined,
    })),
    showPercentage: v.showPercentage,
    barSize: v.barSize,
  }),
  statusIndicator: (v) => ({
    type: "statusIndicator",
    items: v.statusItems.map((item) => ({
      ...item,
      goodValues: item.goodValues
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    })),
    layout: v.statusLayout,
    dotSize: v.dotSize,
  }),
  countGrid: (v) => ({
    type: "countGrid",
    items: v.countGridItems,
    columns: v.countGridColumns,
    valueSize: v.countValueSize,
  }),
  raw: (v) => ({
    type: "raw",
    jsonPath: v.rawJsonPath,
    maxHeight: v.rawMaxHeight,
  }),
  actionButton: (v) => ({
    type: "actionButton",
    buttonLabel: v.buttonLabel,
    buttonColor: v.buttonColor,
    confirmText: v.confirmText || undefined,
    successMessage: v.successMessage || undefined,
  }),
  customJsx: (v) =>
    v.jsxApiVersion === "2"
      ? {
          type: "customJsx",
          jsxApiVersion: 2,
          template: v.template.trim() || CUSTOM_JSX_STARTER,
          networkScope: v.networkScope,
          requests: parseRequestManifest(v.requestManifest),
        }
      : { type: "customJsx", template: v.template.trim() || CUSTOM_JSX_STARTER },
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
  customJsx: { template: "template", requests: "requestManifest", networkScope: "networkScope" },
};

function extractServerErrors(err: unknown, displayType: string): Record<string, string> {
  const errors: Record<string, string> = {};
  const trpcErr = err as {
    data?: { zodError?: { fieldErrors?: Record<string, string[]> } };
    message?: string;
  };

  if (trpcErr?.data?.zodError?.fieldErrors) {
    for (const [field, messages] of Object.entries(trpcErr.data.zodError.fieldErrors)) {
      if (messages?.[0]) {
        errors[field] = messages[0];
      }
    }
    return errors;
  }

  try {
    const issues = JSON.parse(trpcErr?.message ?? "[]") as Array<{
      path: (string | number)[];
      message: string;
    }>;
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

const listItemDefaults = {
  mapping: { label: "", jsonPath: "$", unit: "" },
  column: { header: "", jsonPath: "$" },
  statGridItem: { label: "", jsonPath: "$", unit: "", color: "blue" },
  progressBar: {
    label: "",
    valuePath: "$",
    maxPath: "",
    unit: "",
    color: "blue",
  },
  statusItem: { label: "", jsonPath: "$", goodValues: "online,true" },
  countGridItem: { label: "", jsonPath: "$", unit: "" },
} as const;

function cloneLast<T extends Record<string, unknown>>(arr: T[], fallback: T): T {
  const last = arr[arr.length - 1];
  return last ? { ...last } : { ...fallback };
}

const ALL_DISPLAY_TYPES = [
  "singleValue",
  "keyValue",
  "table",
  "statGrid",
  "progressBars",
  "statusIndicator",
  "countGrid",
  "raw",
  "actionButton",
  "customJsx",
] as const;

const DISPLAY_TYPE_ICONS: Record<(typeof ALL_DISPLAY_TYPES)[number], typeof Icon123> = {
  singleValue: Icon123,
  keyValue: IconListDetails,
  table: IconTable,
  statGrid: IconLayoutGrid,
  progressBars: IconProgress,
  statusIndicator: IconActivityHeartbeat,
  countGrid: IconHash,
  raw: IconBraces,
  actionButton: IconPointer,
  customJsx: IconCode,
};
const MANTINE_COLORS = [
  "blue",
  "teal",
  "green",
  "red",
  "orange",
  "yellow",
  "violet",
  "pink",
  "cyan",
  "grape",
  "indigo",
  "lime",
] as const;

const REQUEST_MANIFEST_STARTER = `[
  {
    "id": "details",
    "kind": "query",
    "method": "GET",
    "pathTemplate": "/api/details/{id}",
    "parameters": { "id": "string" },
    "auth": "inherit",
    "minimumBoardPermission": "view",
    "cacheTtlSeconds": 30
  }
]`;

export function CustomWidgetForm({ mode, initialValues, definitionId }: CustomWidgetFormProps) {
  const router = useRouter();
  const globalT = useI18n();
  const t = useScopedI18n("customWidget");
  const { openConfirmModal } = useConfirmModal();
  const utils = clientApi.useUtils();
  const createMutation = clientApi.customWidget.create.useMutation();
  const updateMutation = clientApi.customWidget.update.useMutation();
  const previewMutation = clientApi.customWidget.preview.useMutation();
  const setPreviewLiveActionsMutation = clientApi.customWidget.setPreviewLiveActions.useMutation();
  const [previewRefreshSignal, setPreviewRefreshSignal] = useState(0);
  const [previewJson, setPreviewJson] = useState<unknown>(null);
  const [previewFetchResult, setPreviewFetchResult] = useState<PreviewFetchResult | null>(null);
  const [lastPreviewFingerprint, setLastPreviewFingerprint] = useState<string | null>(null);
  const [mobilePane, setMobilePane] = useState<"configure" | "preview">("configure");
  const formatSectionRef = useRef<HTMLElement>(null);
  const connectionSectionRef = useRef<HTMLElement>(null);
  const configureSectionRef = useRef<HTMLElement>(null);
  const scrollToSection = useCallback((section: number) => {
    const element = [formatSectionRef.current, connectionSectionRef.current, configureSectionRef.current][section];
    if (!element) return;
    element.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => element.focus({ preventScroll: true }), 250);
  }, []);
  const hasTestedRef = useRef(false);

  const mergedInitialValues = { ...defaultCreateValues, ...initialValues };
  if (mergedInitialValues.displayType === "customJsx" && !mergedInitialValues.template.trim()) {
    mergedInitialValues.template = CUSTOM_JSX_STARTER;
  }
  const form = useZodForm(formSchema, { initialValues: mergedInitialValues });

  const queueClipboardReplacement = useCallback(
    (widget: Record<string, unknown>) => {
      const review = getImportReview(widget);
      if (!review) return;
      openConfirmModal({
        title: t("importReview.replaceTitle"),
        children: (
          <Stack gap="sm">
            <Text size="sm">{t("importReview.replaceDescription", { name: review.name, origin: review.origin })}</Text>
            <Group gap={6}>
              {review.methods.map((method) => (
                <Badge key={method} color={{ DELETE: "red", GET: "blue" }[method] ?? "orange"}>
                  {method}
                </Badge>
              ))}
            </Group>
            {review.hasActions && (
              <Alert color="yellow" icon={<IconAlertTriangle size={16} />}>
                <Text size="sm">{t("importReview.actionWarning.description")}</Text>
              </Alert>
            )}
          </Stack>
        ),
        labels: { confirm: t("importReview.replaceConfirm"), cancel: t("importReview.cancel") },
        onConfirm: () => {
          const displayType = String(widget.displayType);
          const displayConfig = widget.displayConfig as Record<string, unknown>;
          const authType = typeof widget.authType === "string" ? widget.authType : "none";
          const secrets = (authTypeSecretFields[authType] ?? []).map((field) => {
            const existing = form.values.secrets.find((secret) => secret.kind === field.kind);
            return { kind: field.kind, value: existing?.value ?? "", hasValue: existing?.hasValue ?? false };
          });
          form.setValues({
            ...form.values,
            name: String(widget.name),
            description: typeof widget.description === "string" ? widget.description : "",
            iconUrl: typeof widget.iconUrl === "string" ? widget.iconUrl : "",
            url: String(widget.url),
            authType,
            headerName: typeof widget.headerName === "string" ? widget.headerName : "",
            method: typeof widget.method === "string" ? widget.method : "GET",
            requestBody: typeof widget.requestBody === "string" ? widget.requestBody : "",
            ...buildDisplayFormValues(displayType, displayConfig),
            secrets,
          });
          setPreviewJson(null);
          setPreviewFetchResult(null);
          setLastPreviewFingerprint(null);
          showSuccessNotification({ title: t("action.import"), message: t("notification.pastedForReplacement") });
        },
      });
    },
    [form, openConfirmModal, t],
  );

  useEffect(() => {
    if (mode !== "edit") return;
    const handlePaste = (event: ClipboardEvent) => {
      const widget = parseCustomWidgetClipboard(event.clipboardData?.getData("text/plain") ?? "");
      if (!widget) return;
      event.preventDefault();
      queueClipboardReplacement(widget);
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [mode, queueClipboardReplacement]);

  const requestManifest = parseRequestManifest(form.values.requestManifest);
  const requestIds = requestManifest
    .map((request) => (request && typeof request === "object" && "id" in request ? request.id : null))
    .filter((id): id is string => typeof id === "string");
  const editorDiagnostics =
    form.values.displayType === "customJsx"
      ? analyzeJsxTemplate(form.values.template, {
          apiVersion: form.values.jsxApiVersion === "2" ? 2 : 1,
          requestIds,
        })
      : [];
  const requestDiagnostics =
    form.values.displayType === "customJsx" && form.values.jsxApiVersion === "2"
      ? analyzeRequestManifest(form.values.requestManifest)
      : [];
  const hasEditorErrors = [...editorDiagnostics, ...requestDiagnostics].some(
    (diagnostic) => diagnostic.severity === "error",
  );
  const isDirtyRef = useRef(false);
  isDirtyRef.current = form.isDirty();

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isDirtyRef.current) event.preventDefault();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  useEffect(() => {
    if (form.values.displayType === "customJsx" && form.values.jsxApiVersion === "2" && form.values.method !== "GET") {
      form.setFieldValue("method", "GET");
      form.setFieldValue("requestBody", "");
    }
  }, [form, form.values.displayType, form.values.jsxApiVersion, form.values.method]);

  const focusStepForErrors = (errors: Record<string, unknown>) => {
    const fields = Object.keys(errors);
    if (fields.some((field) => ["name", "description", "iconUrl", "displayType"].includes(field.split(".")[0] ?? ""))) {
      scrollToSection(0);
      return;
    }
    if (
      fields.some((field) =>
        ["url", "method", "authType", "headerName", "requestBody", "secrets"].includes(field.split(".")[0] ?? ""),
      )
    ) {
      scrollToSection(1);
      return;
    }
    scrollToSection(2);
  };

  const handleSubmit = form.onSubmit(async (values) => {
    if (hasEditorErrors) return;
    const buildConfig = displayConfigBuilders[values.displayType] ?? displayConfigBuilders.singleValue;
    const displayConfig = buildConfig?.(values);

    const payload = {
      name: values.name,
      description: values.description || undefined,
      iconUrl: values.iconUrl || undefined,
      url: values.url,
      authType: values.authType as CustomWidgetAuthType,
      headerName: values.headerName || undefined,
      method: values.method as "GET" | "POST" | "PUT" | "DELETE" | "PATCH",
      requestBody: values.requestBody || undefined,
      displayType: values.displayType as CustomWidgetDisplayType,
      displayConfig: displayConfig as never,
      secrets: values.secrets
        .filter((s) => s.value)
        .map((s) => ({
          kind: s.kind as "apiKey" | "username" | "password",
          value: s.value,
        })),
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
        showSuccessNotification({
          title: t("action.save"),
          message: t("notification.updated", { name: values.name }),
        });
        setPreviewRefreshSignal((n) => n + 1);
        await utils.customWidget.all.invalidate();
        await utils.customWidget.byId.invalidate({ id: definitionId });
        await utils.widget.customApi.getData.invalidate();
        form.setInitialValues(values);
        form.resetDirty();
      }
    } catch (err) {
      const serverErrors = extractServerErrors(err, values.displayType);
      if (Object.keys(serverErrors).length > 0) {
        form.setErrors(serverErrors);
        focusStepForErrors(serverErrors);
      }
      const errorKey = mode === "create" ? "notification.createError" : "notification.updateError";
      showErrorNotification({
        title: t("action.save"),
        message: t(errorKey as never),
      });
    }
  }, focusStepForErrors);

  const secretFields = authTypeSecretFields[form.values.authType] ?? [];
  const authTypeOptions = ["none", "bearer", "basic", "apiKeyHeader", "apiKeyQuery"].map((value) => ({
    value,
    label: t(`authType.${value}` as never),
  }));
  const handleAuthTypeChange = (value: string) => {
    form.setFieldValue("authType", value);
    const newSecrets = (authTypeSecretFields[value] ?? []).map((field) => ({
      kind: field.kind,
      value: form.values.secrets.find((secret) => secret.kind === field.kind)?.value ?? "",
    }));
    form.setFieldValue("secrets", newSecrets);
  };

  const getPreviewInput = useCallback(() => {
    const values = form.values;
    const buildConfig = displayConfigBuilders[values.displayType] ?? displayConfigBuilders.singleValue;
    return {
      url: values.url,
      method: values.method as CustomWidgetMethod,
      authType: values.authType as CustomWidgetAuthType,
      headerName: values.headerName || undefined,
      requestBody: values.requestBody || undefined,
      displayType: values.displayType as CustomWidgetDisplayType,
      displayConfig: buildConfig?.(values) as z.infer<typeof displayConfigSchema>,
      secrets: values.secrets
        .filter((s) => s.value)
        .map((s) => ({
          kind: s.kind as CustomWidgetSecretKind,
          value: s.value,
        })),
      definitionId,
    };
  }, [form.values, definitionId]);

  const handlePreviewTest = useCallback(async () => {
    const input = getPreviewInput();
    if (!input.url || input.method !== "GET") return;
    setMobilePane("preview");
    setLastPreviewFingerprint(JSON.stringify(input));
    try {
      const res = await previewMutation.mutateAsync(input);
      hasTestedRef.current = true;
      setPreviewFetchResult({
        success: res.success,
        error: res.success ? undefined : res.error,
        responseInfo: res.responseInfo,
        rawResponse: res.rawResponse,
        previewSession: res.previewSession,
      });
      if (res.success && res.rawResponse) {
        try {
          setPreviewJson(JSON.parse(res.rawResponse));
        } catch {
          setPreviewJson(null);
        }
      } else {
        setPreviewJson(null);
      }
    } catch {
      setPreviewFetchResult({
        success: false,
        error: t("notification.previewError"),
        responseInfo: null,
        rawResponse: null,
        previewSession: null,
      });
      setPreviewJson(null);
    }
  }, [getPreviewInput, previewMutation, t]);

  const handleSetPreviewLiveActions = useCallback(
    async (enabled: boolean) => {
      const sessionId = previewFetchResult?.previewSession?.id;
      if (!sessionId) return;
      try {
        const previewSession = await setPreviewLiveActionsMutation.mutateAsync({ sessionId, enabled });
        setPreviewFetchResult((current) => (current ? { ...current, previewSession } : current));
      } catch {
        showErrorNotification({
          title: t("preview.capabilities.liveActions"),
          message: t("notification.previewActionsError"),
        });
      }
    },
    [previewFetchResult?.previewSession?.id, setPreviewLiveActionsMutation, t],
  );

  const handlePreviewTestRef = useRef(handlePreviewTest);
  handlePreviewTestRef.current = handlePreviewTest;
  const getPreviewInputRef = useRef(getPreviewInput);
  getPreviewInputRef.current = getPreviewInput;
  const pendingRefreshRef = useRef(false);

  useEffect(() => {
    if (previewRefreshSignal > 0 && hasTestedRef.current) {
      if (previewMutation.isPending) {
        pendingRefreshRef.current = true;
        return;
      }
      const input = getPreviewInputRef.current();
      if (input.method === "GET") {
        void handlePreviewTestRef.current();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally only react to signal changes
  }, [previewRefreshSignal]);

  useEffect(() => {
    if (!previewMutation.isPending && pendingRefreshRef.current) {
      pendingRefreshRef.current = false;
      const input = getPreviewInputRef.current();
      if (input.method === "GET" && hasTestedRef.current) {
        void handlePreviewTestRef.current();
      }
    }
  }, [previewMutation.isPending]);

  const previewInput = getPreviewInput();
  const isPreviewStale = lastPreviewFingerprint !== null && lastPreviewFingerprint !== JSON.stringify(previewInput);
  const handleInsertDataPath = useCallback(
    (path: string) => {
      if (form.values.displayType !== "customJsx") return;
      const template = form.values.template.trimEnd();
      const snippet = `<Text>{${path}}</Text>`;
      form.setFieldValue("template", template.length > 0 ? `${template}\n${snippet}` : snippet);
    },
    [form],
  );
  const handleSampleDataChange = useCallback((value: unknown) => {
    const rawResponse = JSON.stringify(value, null, 2);
    setPreviewJson(value);
    setPreviewFetchResult({
      success: true,
      responseInfo: null,
      rawResponse,
      previewSession: null,
    });
    setLastPreviewFingerprint(null);
  }, []);

  const continueToSection = (currentSection: number, field: string, nextSection: number) => {
    if (form.validateField(field).hasError) {
      scrollToSection(currentSection);
      return;
    }
    scrollToSection(nextSection);
  };

  return (
    <form onSubmit={handleSubmit} className={classes.form}>
      <SegmentedControl
        className={classes.paneSwitcher}
        fullWidth
        value={mobilePane}
        onChange={(value) => setMobilePane(value as "configure" | "preview")}
        data={[
          { value: "configure", label: t("workbench.configure") },
          { value: "preview", label: t("workbench.preview") },
        ]}
      />
      <div className={classes.workbench} data-mobile-pane={mobilePane}>
        <Stack gap="xl" className={classes.configuration}>
          <Stack gap={0} className={classes.formFlow}>
            <section ref={formatSectionRef} className={classes.formSection} tabIndex={-1}>
              <ThemeIcon className={classes.sectionMarker} variant="filled" size={40} radius="xl">
                <IconLayoutGrid size={20} />
              </ThemeIcon>
              <Stack gap="xl">
                <div>
                  <Text fw={700} size="lg">
                    {t("steps.format.label")}
                  </Text>
                  <Text size="sm" c="dimmed">
                    {t("steps.format.description")}
                  </Text>
                </div>
                <Fieldset legend={t("fieldset.general")}>
                  <Stack gap="sm">
                    <TextInput label={t("field.name")} required {...form.getInputProps("name")} />
                    <Textarea label={t("field.description")} {...form.getInputProps("description")} />
                    <IconPicker withAsterisk={false} {...form.getInputProps("iconUrl")} />
                  </Stack>
                </Fieldset>
                <Fieldset legend={t("field.displayType")}>
                  <Stack gap="sm">
                    <Text size="sm" c="dimmed">
                      {t("steps.format.help")}
                    </Text>
                    <DisplayTypePicker
                      value={form.values.displayType}
                      onChange={(value) => {
                        form.setFieldValue("displayType", value);
                        if (value === "customJsx" && !form.values.template.trim()) {
                          form.setFieldValue("template", CUSTOM_JSX_STARTER);
                        }
                      }}
                      t={t}
                    />
                  </Stack>
                </Fieldset>
                <Group justify="flex-end">
                  <Button variant="light" size="md" onClick={() => continueToSection(0, "name", 1)}>
                    {t("steps.continueTo", { step: t("steps.connection.label") })}
                  </Button>
                </Group>
              </Stack>
            </section>

            <section ref={connectionSectionRef} className={classes.formSection} tabIndex={-1}>
              <ThemeIcon className={classes.sectionMarker} variant="light" size={40} radius="xl">
                <IconPlayerPlay size={20} />
              </ThemeIcon>
              <Stack gap="xl">
                <div>
                  <Text fw={700} size="lg">
                    {t("steps.connection.label")}
                  </Text>
                  <Text size="sm" c="dimmed">
                    {t("steps.connection.description")}
                  </Text>
                </div>
                <Fieldset legend={t("fieldset.connection")}>
                  <Stack gap="sm">
                    <Group align="end" wrap="wrap" gap="xs">
                      <Select
                        label={t("field.method")}
                        data={["GET", "POST", "PUT", "DELETE", "PATCH"].map((value) => ({
                          value,
                          label: t(`method.${value}` as never),
                        }))}
                        w={110}
                        {...form.getInputProps("method")}
                        allowDeselect={false}
                        disabled={form.values.displayType === "customJsx" && form.values.jsxApiVersion === "2"}
                      />
                      <TextInput
                        label={t("field.url")}
                        required
                        placeholder={t("placeholder.url")}
                        style={{ flex: "1 1 260px" }}
                        {...form.getInputProps("url")}
                      />
                      <Button
                        size="sm"
                        variant="light"
                        leftSection={<IconPlayerPlay size={16} />}
                        onClick={() => void handlePreviewTest()}
                        loading={previewMutation.isPending}
                        disabled={!form.values.url || form.values.method !== "GET"}
                      >
                        {t("preview.test")}
                      </Button>
                    </Group>
                    <div>
                      <Text size="sm" fw={500} mb={4}>
                        {t("field.authType")}
                      </Text>
                      <Select
                        hiddenFrom="sm"
                        value={form.values.authType}
                        data={authTypeOptions}
                        onChange={(value) => handleAuthTypeChange(value ?? "none")}
                        allowDeselect={false}
                        aria-label={t("field.authType")}
                      />
                      <SegmentedControl
                        visibleFrom="sm"
                        fullWidth
                        value={form.values.authType}
                        data={authTypeOptions}
                        onChange={handleAuthTypeChange}
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
                      const secret = form.values.secrets[secretIndex];
                      if (!secret) return null;
                      const placeholder =
                        secret.hasValue && !secret.value ? t("secret.savedPlaceholder" as never) : undefined;
                      return field.isPassword ? (
                        <PasswordInput
                          key={field.kind}
                          label={t(`secret.${field.labelKey}` as never)}
                          placeholder={placeholder}
                          {...form.getInputProps(`secrets.${secretIndex}.value`)}
                        />
                      ) : (
                        <TextInput
                          key={field.kind}
                          label={t(`secret.${field.labelKey}` as never)}
                          placeholder={placeholder}
                          {...form.getInputProps(`secrets.${secretIndex}.value`)}
                        />
                      );
                    })}
                    {form.values.method !== "GET" && (
                      <Textarea label={t("field.requestBody")} minRows={3} {...form.getInputProps("requestBody")} />
                    )}
                  </Stack>
                </Fieldset>
                <Group justify="flex-end">
                  <Button variant="light" size="md" onClick={() => continueToSection(1, "url", 2)}>
                    {t("steps.continueTo", { step: t("steps.configure.label") })}
                  </Button>
                </Group>
              </Stack>
            </section>

            <section ref={configureSectionRef} className={classes.formSection} tabIndex={-1}>
              <ThemeIcon className={classes.sectionMarker} variant="light" size={40} radius="xl">
                <IconCode size={20} />
              </ThemeIcon>
              <Stack gap="xl">
                <div>
                  <Text fw={700} size="lg">
                    {t("steps.configure.label")}
                  </Text>
                  <Text size="sm" c="dimmed">
                    {t("steps.configure.description")}
                  </Text>
                </div>
                <Fieldset legend={t("fieldset.display")}>
                  <Stack gap="sm">
                    <Group gap="xs">
                      <ThemeIcon variant="light" size="lg">
                        {(() => {
                          const SelectedIcon =
                            DISPLAY_TYPE_ICONS[form.values.displayType as keyof typeof DISPLAY_TYPE_ICONS];
                          return SelectedIcon ? <SelectedIcon size={20} /> : null;
                        })()}
                      </ThemeIcon>
                      <div>
                        <Text fw={600}>{t(`displayType.${form.values.displayType}` as never)}</Text>
                        <Text size="xs" c="dimmed">
                          {t(`displayTypeDescription.${form.values.displayType}` as never)}
                        </Text>
                      </div>
                    </Group>
                    <DisplayTypeFields form={form} t={t} previewJson={previewJson} />
                  </Stack>
                </Fieldset>
              </Stack>
            </section>
          </Stack>
          <Paper p="md" className={classes.mobileSaveBar} shadow="sm">
            <Group justify="space-between" wrap="nowrap">
              <Text size="sm" fw={600}>
                {form.isDirty() ? globalT("common.unsavedChanges") : t("action.readyToSave")}
              </Text>
              <Button
                type="submit"
                size="md"
                loading={createMutation.isPending || updateMutation.isPending}
                disabled={hasEditorErrors}
              >
                {mode === "create" ? t("action.create") : t("action.save")}
              </Button>
            </Group>
          </Paper>
        </Stack>

        <Box component="aside" className={classes.previewPane} aria-label={t("preview.title")}>
          <Paper p="md" className={classes.actionBar} shadow="sm">
            <Group justify="space-between" wrap="nowrap">
              <div>
                <Text size="sm" fw={600}>
                  {form.isDirty() ? globalT("common.unsavedChanges") : t("action.readyToSave")}
                </Text>
                <Text size="xs" c="dimmed" visibleFrom="sm">
                  {hasEditorErrors ? t("editor.saveBlocked") : t("editor.saveReady")}
                </Text>
              </div>
              <Button
                type="submit"
                size="md"
                loading={createMutation.isPending || updateMutation.isPending}
                disabled={hasEditorErrors}
                miw={160}
              >
                {mode === "create" ? t("action.create") : t("action.save")}
              </Button>
            </Group>
          </Paper>
          <CopyAiPromptButton
            rawResponse={previewFetchResult?.rawResponse}
            currentConfig={{
              $schema: "homarr-custom-widget-v3",
              name: form.values.name,
              description: form.values.description,
              iconUrl: form.values.iconUrl,
              url: form.values.url,
              authType: form.values.authType,
              headerName: form.values.headerName,
              method: form.values.method,
              requestBody: form.values.requestBody,
              displayType: form.values.displayType,
              displayConfig: previewInput.displayConfig,
            }}
          />
          <CustomWidgetPreview
            getFormValues={getPreviewInput}
            formValues={previewInput}
            fetchResult={previewFetchResult}
            cachedJson={previewJson}
            onTest={() => void handlePreviewTest()}
            isTesting={previewMutation.isPending}
            isSampleStale={isPreviewStale}
            testError={previewMutation.error ? t("notification.previewError") : null}
            onInsertDataPath={form.values.displayType === "customJsx" ? handleInsertDataPath : undefined}
            onSetPreviewLiveActions={handleSetPreviewLiveActions}
            isUpdatingPreviewActions={setPreviewLiveActionsMutation.isPending}
            onSampleDataChange={handleSampleDataChange}
          />
        </Box>
      </div>
    </form>
  );
}

function DisplayTypePicker({
  value,
  onChange,
  t,
}: {
  value: string;
  onChange: (value: (typeof ALL_DISPLAY_TYPES)[number]) => void;
  t: ReturnType<typeof useScopedI18n<"customWidget">>;
}) {
  return (
    <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="sm">
      {ALL_DISPLAY_TYPES.map((displayType) => {
        const Icon = DISPLAY_TYPE_ICONS[displayType];
        const selected = value === displayType;
        return (
          <UnstyledButton
            key={displayType}
            className={classes.displayTypeOption}
            data-selected={selected || undefined}
            onClick={() => onChange(displayType)}
            aria-pressed={selected}
          >
            <ThemeIcon variant={selected ? "filled" : "light"} size={42} radius="md">
              <Icon size={22} />
            </ThemeIcon>
            <div className={classes.displayTypeCopy}>
              <Text fw={600} size="sm">
                {t(`displayType.${displayType}` as never)}
              </Text>
              <Text size="xs" c="dimmed" lineClamp={3}>
                {t(`displayTypeDescription.${displayType}` as never)}
              </Text>
            </div>
          </UnstyledButton>
        );
      })}
    </SimpleGrid>
  );
}

function DisplayTypeFields({
  form,
  t,
  previewJson,
}: {
  form: ReturnType<typeof useZodForm<typeof formSchema>>;
  t: ReturnType<typeof useScopedI18n<"customWidget">>;
  previewJson: unknown;
}) {
  const dt = form.values.displayType;

  if (dt === "singleValue") {
    return (
      <>
        <JsonPathTreePicker
          json={previewJson}
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
        <TextInput label={t("field.unit")} placeholder={t("placeholder.exampleUnit")} {...form.getInputProps("unit")} />
        <Group grow>
          <Select
            label={t("field.valueSize")}
            data={["sm", "md", "lg", "xl"].map((v) => ({
              value: v,
              label: t(`sizeOption.${v}` as never),
            }))}
            {...form.getInputProps("valueSize")}
            allowDeselect={false}
          />
          <Select
            label={t("field.labelPosition")}
            data={["above", "below"].map((v) => ({
              value: v,
              label: t(`labelPositionOption.${v}` as never),
            }))}
            {...form.getInputProps("labelPosition")}
            allowDeselect={false}
          />
        </Group>
      </>
    );
  }

  if (dt === "keyValue") {
    return (
      <Stack gap="xs">
        <Group grow>
          <Select
            label={t("field.kvLayout")}
            data={["list", "grid"].map((v) => ({
              value: v,
              label: t(`layoutOption.${v}` as never),
            }))}
            {...form.getInputProps("kvLayout")}
            allowDeselect={false}
          />
          {form.values.kvLayout === "grid" && (
            <NumberInput label={t("field.gridColumns")} min={1} max={3} {...form.getInputProps("kvColumns")} />
          )}
        </Group>
        <Text size="sm" fw={500}>
          {t("field.mappings")}
        </Text>
        {form.values.mappings.map((_m, i) => (
          <Group key={i} align="end" wrap="nowrap">
            <TextInput
              label={t("field.label")}
              placeholder={t("placeholder.exampleLabelShort")}
              style={{ flex: 1 }}
              {...form.getInputProps(`mappings.${i}.label`)}
            />
            <Box style={{ flex: 1 }}>
              <JsonPathTreePicker
                json={previewJson}
                label={t("field.jsonPath")}
                placeholder={t("placeholder.jsonPath")}
                {...form.getInputProps(`mappings.${i}.jsonPath`)}
              />
            </Box>
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
          onClick={() => form.insertListItem("mappings", cloneLast(form.values.mappings, listItemDefaults.mapping))}
        >
          {t("action.addMapping")}
        </Button>
      </Stack>
    );
  }

  if (dt === "table") {
    return (
      <Stack gap="xs">
        <JsonPathTreePicker
          json={previewJson}
          label={t("field.tablePath")}
          description={t("field.tablePathHint")}
          required
          placeholder={t("placeholder.tablePath")}
          {...form.getInputProps("tablePath")}
        />
        <Group grow>
          <Switch label={t("field.striped")} {...form.getInputProps("striped", { type: "checkbox" })} />
          <Switch label={t("field.compact")} {...form.getInputProps("compact", { type: "checkbox" })} />
        </Group>
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
            <Box style={{ flex: 1 }}>
              <JsonPathTreePicker
                json={previewJson}
                label={t("field.jsonPath")}
                placeholder={t("placeholder.columnJsonPath")}
                {...form.getInputProps(`columns.${i}.jsonPath`)}
              />
            </Box>
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
          onClick={() => form.insertListItem("columns", cloneLast(form.values.columns, listItemDefaults.column))}
        >
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
          <Select
            label={t("field.cardStyle")}
            data={["filled", "outline", "subtle"].map((v) => ({
              value: v,
              label: t(`cardStyleOption.${v}` as never),
            }))}
            {...form.getInputProps("cardStyle")}
            allowDeselect={false}
          />
        </Group>
        <Text size="sm" fw={500}>
          {t("field.items")}
        </Text>
        {form.values.statGridItems.map((_item, i) => (
          <Group key={i} align="end" wrap="nowrap">
            <TextInput
              label={t("field.label")}
              placeholder={t("placeholder.exampleLabelShort")}
              style={{ flex: 1 }}
              {...form.getInputProps(`statGridItems.${i}.label`)}
            />
            <Box style={{ flex: 1 }}>
              <JsonPathTreePicker
                json={previewJson}
                label={t("field.jsonPath")}
                placeholder={t("placeholder.jsonPath")}
                {...form.getInputProps(`statGridItems.${i}.jsonPath`)}
              />
            </Box>
            <TextInput
              label={t("field.unit")}
              placeholder={t("placeholder.exampleUnit")}
              style={{ width: 80 }}
              {...form.getInputProps(`statGridItems.${i}.unit`)}
            />
            <Select
              label={t("field.color")}
              data={MANTINE_COLORS.map((c) => ({ value: c, label: c }))}
              style={{ width: 100 }}
              {...form.getInputProps(`statGridItems.${i}.color`)}
              allowDeselect={false}
            />
            <ActionIcon
              color="red"
              variant="subtle"
              onClick={() => form.removeListItem("statGridItems", i)}
              disabled={form.values.statGridItems.length <= 1}
              aria-label={t("action.removeItem")}
            >
              <IconTrash size={16} />
            </ActionIcon>
          </Group>
        ))}
        <Button
          variant="light"
          size="xs"
          leftSection={<IconPlus size={14} />}
          onClick={() =>
            form.insertListItem("statGridItems", cloneLast(form.values.statGridItems, listItemDefaults.statGridItem))
          }
        >
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
          <Select
            label={t("field.barSize")}
            data={["sm", "md", "lg"].map((v) => ({
              value: v,
              label: t(`sizeOption.${v}` as never),
            }))}
            {...form.getInputProps("barSize")}
            allowDeselect={false}
          />
        </Group>
        <Text size="sm" fw={500}>
          {t("field.bars")}
        </Text>
        {form.values.progressBars.map((_bar, i) => (
          <Group key={i} align="end" wrap="nowrap">
            <TextInput
              label={t("field.label")}
              placeholder={t("placeholder.exampleLabelShort")}
              style={{ flex: 1 }}
              {...form.getInputProps(`progressBars.${i}.label`)}
            />
            <Box style={{ flex: 1 }}>
              <JsonPathTreePicker
                json={previewJson}
                label={t("field.valuePath")}
                placeholder={t("placeholder.valuePath")}
                {...form.getInputProps(`progressBars.${i}.valuePath`)}
              />
            </Box>
            <Box style={{ flex: 1 }}>
              <JsonPathTreePicker
                json={previewJson}
                label={t("field.maxPath")}
                placeholder={t("placeholder.maxPath")}
                {...form.getInputProps(`progressBars.${i}.maxPath`)}
              />
            </Box>
            <TextInput
              label={t("field.unit")}
              placeholder={t("placeholder.exampleUnit")}
              style={{ width: 60 }}
              {...form.getInputProps(`progressBars.${i}.unit`)}
            />
            <Select
              label={t("field.color")}
              data={MANTINE_COLORS.map((c) => ({ value: c, label: c }))}
              style={{ width: 100 }}
              {...form.getInputProps(`progressBars.${i}.color`)}
              allowDeselect={false}
            />
            <ActionIcon
              color="red"
              variant="subtle"
              onClick={() => form.removeListItem("progressBars", i)}
              disabled={form.values.progressBars.length <= 1}
              aria-label={t("action.removeItem")}
            >
              <IconTrash size={16} />
            </ActionIcon>
          </Group>
        ))}
        <Button
          variant="light"
          size="xs"
          leftSection={<IconPlus size={14} />}
          onClick={() =>
            form.insertListItem("progressBars", cloneLast(form.values.progressBars, listItemDefaults.progressBar))
          }
        >
          {t("action.addBar")}
        </Button>
      </Stack>
    );
  }

  if (dt === "statusIndicator") {
    return (
      <Stack gap="xs">
        <Group grow>
          <Select
            label={t("field.kvLayout")}
            data={["list", "grid"].map((v) => ({
              value: v,
              label: t(`layoutOption.${v}` as never),
            }))}
            {...form.getInputProps("statusLayout")}
            allowDeselect={false}
          />
          <Select
            label={t("field.dotSize")}
            data={["sm", "md", "lg"].map((v) => ({
              value: v,
              label: t(`sizeOption.${v}` as never),
            }))}
            {...form.getInputProps("dotSize")}
            allowDeselect={false}
          />
        </Group>
        <Text size="sm" fw={500}>
          {t("field.items")}
        </Text>
        {form.values.statusItems.map((_item, i) => (
          <Group key={i} align="end" wrap="nowrap">
            <TextInput
              label={t("field.label")}
              placeholder={t("placeholder.exampleLabelShort")}
              style={{ flex: 1 }}
              {...form.getInputProps(`statusItems.${i}.label`)}
            />
            <Box style={{ flex: 1 }}>
              <JsonPathTreePicker
                json={previewJson}
                label={t("field.jsonPath")}
                placeholder={t("placeholder.jsonPath")}
                {...form.getInputProps(`statusItems.${i}.jsonPath`)}
              />
            </Box>
            <TextInput
              label={t("field.goodValues")}
              placeholder={t("placeholder.goodValues")}
              style={{ flex: 1 }}
              {...form.getInputProps(`statusItems.${i}.goodValues`)}
            />
            <ActionIcon
              color="red"
              variant="subtle"
              onClick={() => form.removeListItem("statusItems", i)}
              disabled={form.values.statusItems.length <= 1}
              aria-label={t("action.removeItem")}
            >
              <IconTrash size={16} />
            </ActionIcon>
          </Group>
        ))}
        <Button
          variant="light"
          size="xs"
          leftSection={<IconPlus size={14} />}
          onClick={() =>
            form.insertListItem("statusItems", cloneLast(form.values.statusItems, listItemDefaults.statusItem))
          }
        >
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
          <Select
            label={t("field.valueSize")}
            data={["sm", "md", "lg"].map((v) => ({
              value: v,
              label: t(`sizeOption.${v}` as never),
            }))}
            {...form.getInputProps("countValueSize")}
            allowDeselect={false}
          />
        </Group>
        <Text size="sm" fw={500}>
          {t("field.items")}
        </Text>
        {form.values.countGridItems.map((_item, i) => (
          <Group key={i} align="end" wrap="nowrap">
            <TextInput
              label={t("field.label")}
              placeholder={t("placeholder.exampleLabelShort")}
              style={{ flex: 1 }}
              {...form.getInputProps(`countGridItems.${i}.label`)}
            />
            <Box style={{ flex: 1 }}>
              <JsonPathTreePicker
                json={previewJson}
                label={t("field.jsonPath")}
                placeholder={t("placeholder.jsonPath")}
                {...form.getInputProps(`countGridItems.${i}.jsonPath`)}
              />
            </Box>
            <TextInput
              label={t("field.unit")}
              placeholder={t("placeholder.exampleUnit")}
              style={{ width: 80 }}
              {...form.getInputProps(`countGridItems.${i}.unit`)}
            />
            <ActionIcon
              color="red"
              variant="subtle"
              onClick={() => form.removeListItem("countGridItems", i)}
              disabled={form.values.countGridItems.length <= 1}
              aria-label={t("action.removeItem")}
            >
              <IconTrash size={16} />
            </ActionIcon>
          </Group>
        ))}
        <Button
          variant="light"
          size="xs"
          leftSection={<IconPlus size={14} />}
          onClick={() =>
            form.insertListItem("countGridItems", cloneLast(form.values.countGridItems, listItemDefaults.countGridItem))
          }
        >
          {t("action.addItem")}
        </Button>
      </Stack>
    );
  }

  if (dt === "raw") {
    return (
      <>
        <JsonPathTreePicker
          json={previewJson}
          label={t("field.jsonPath")}
          description={t("field.jsonPathHint")}
          placeholder={t("placeholder.jsonPath")}
          {...form.getInputProps("rawJsonPath")}
        />
        <NumberInput
          label={t("field.maxHeight")}
          min={50}
          max={1000}
          step={50}
          {...form.getInputProps("rawMaxHeight")}
        />
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
        <TextInput
          label={t("field.confirmText")}
          description={t("field.confirmTextHint")}
          {...form.getInputProps("confirmText")}
        />
        <TextInput
          label={t("field.successMessage")}
          description={t("field.successMessageHint")}
          {...form.getInputProps("successMessage")}
        />
      </Stack>
    );
  }

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
