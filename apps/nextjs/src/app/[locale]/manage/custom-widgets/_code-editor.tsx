"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { autocompletion } from "@codemirror/autocomplete";
import type { CompletionSource } from "@codemirror/autocomplete";
import { redo, redoDepth, undo, undoDepth } from "@codemirror/commands";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { linter } from "@codemirror/lint";
import type { EditorView } from "@codemirror/view";
import {
  Alert,
  Badge,
  Button,
  Group,
  Input,
  Loader,
  Popover,
  ScrollArea,
  Stack,
  Text,
  TextInput,
  UnstyledButton,
  useComputedColorScheme,
} from "@mantine/core";
import {
  IconAlertTriangle,
  IconArrowBackUp,
  IconArrowForwardUp,
  IconCheck,
  IconCode,
  IconComponents,
  IconFileCode,
  IconSearch,
  IconWand,
} from "@tabler/icons-react";
import { enabledCustomJsxComponents } from "@homarr/definitions";
import { useScopedI18n } from "@homarr/translation/client";
import { validateCustomJsxTemplate } from "@homarr/validation/custom-jsx-template";

import classes from "./_code-editor.module.css";

const Editor = dynamic(() => import("@uiw/react-codemirror").then((module) => module.default), {
  ssr: false,
  loading: () => (
    <Group justify="center" p="xl">
      <Loader size="sm" />
    </Group>
  ),
});

export const CUSTOM_JSX_TEMPLATE_LIMIT = 50_000;

export type EditorDiagnosticCode =
  | "ast"
  | "dangerousProperty"
  | "dynamicRequestId"
  | "eventHandler"
  | "invalidRequestManifest"
  | "legacyNetworkProps"
  | "missingRequestId"
  | "templateEmpty"
  | "templateTooLong"
  | "unknownRequest"
  | "unsafeTag";

export interface EditorDiagnostic {
  code: EditorDiagnosticCode;
  severity: "error" | "warning";
  line?: number;
  column?: number;
  index?: number;
  value?: string;
}

interface AnalyzeJsxTemplateOptions {
  apiVersion?: 1 | 2;
  requestIds?: string[];
}

const unsafeTagPattern = /<\s*\/?\s*(script|iframe|object|embed|form|style|link|meta|base)\b/giu;
const eventHandlerPattern = /\s(on[A-Z][\w]*)\s*=/gu;
const dangerousPropertyPattern =
  /(?:\.|\[\s*["'])(constructor|prototype|__proto__|caller|callee|arguments|bind|call|apply)(?:["']\s*\])?/giu;
const networkComponentPattern = /<(SubFetch|ActionButton|ToggleSwitch)\b([^>]*)>/giu;

const getLine = (source: string, index: number) => source.slice(0, index).split("\n").length;

const customJsxCompletionSource: CompletionSource = (context) => {
  const word = context.matchBefore(/[A-Z][\w.]*/u);
  if (!word && !context.explicit) return null;
  return {
    from: word?.from ?? context.pos,
    options: enabledCustomJsxComponents.map((component) => ({
      label: component.name,
      type: "class",
      detail: `${component.category} · ${component.safety}`,
    })),
  };
};

export function analyzeJsxTemplate(
  template: string,
  { apiVersion = 1, requestIds = [] }: AnalyzeJsxTemplateOptions = {},
): EditorDiagnostic[] {
  const diagnostics: EditorDiagnostic[] = [];

  if (template.trim().length === 0) {
    diagnostics.push({ code: "templateEmpty", severity: "error", line: 1, column: 1, index: 0 });
  }
  if (template.length > CUSTOM_JSX_TEMPLATE_LIMIT) {
    diagnostics.push({ code: "templateTooLong", severity: "error", line: 1, column: 1, index: 0 });
  }

  for (const diagnostic of validateCustomJsxTemplate(template)) {
    diagnostics.push({
      code: "ast",
      severity: diagnostic.severity,
      line: diagnostic.line,
      column: diagnostic.column,
      index: diagnostic.index,
      value: diagnostic.message,
    });
  }

  for (const match of template.matchAll(unsafeTagPattern)) {
    diagnostics.push({
      code: "unsafeTag",
      severity: "error",
      line: getLine(template, match.index),
      index: match.index,
      value: match[1],
    });
  }
  for (const match of template.matchAll(eventHandlerPattern)) {
    if (match[1] === "onParams") continue;
    diagnostics.push({
      code: "eventHandler",
      severity: "error",
      line: getLine(template, match.index),
      index: match.index,
      value: match[1],
    });
  }
  for (const match of template.matchAll(dangerousPropertyPattern)) {
    diagnostics.push({
      code: "dangerousProperty",
      severity: "error",
      line: getLine(template, match.index),
      index: match.index,
      value: match[1],
    });
  }

  if (apiVersion === 2) {
    const knownRequestIds = new Set(requestIds);
    for (const match of template.matchAll(networkComponentPattern)) {
      const props = match[2] ?? "";
      const line = getLine(template, match.index);
      if (/\b(?:url|method|headers|body|onBody|offBody)\s*=/iu.test(props)) {
        diagnostics.push({ code: "legacyNetworkProps", severity: "error", line, index: match.index });
      }

      const staticRequest = props.match(/\brequestId\s*=\s*["']([^"']+)["']/iu);
      if (staticRequest?.[1]) {
        if (!knownRequestIds.has(staticRequest[1])) {
          diagnostics.push({
            code: "unknownRequest",
            severity: "error",
            line,
            index: match.index,
            value: staticRequest[1],
          });
        }
      } else if (/\brequestId\s*=/iu.test(props)) {
        diagnostics.push({ code: "dynamicRequestId", severity: "error", line, index: match.index });
      } else {
        diagnostics.push({ code: "missingRequestId", severity: "error", line, index: match.index });
      }
    }
  }

  return diagnostics;
}

export function analyzeRequestManifest(value: string): EditorDiagnostic[] {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return [{ code: "invalidRequestManifest", severity: "error", line: 1 }];
    }
    return [];
  } catch {
    return [{ code: "invalidRequestManifest", severity: "error", line: 1 }];
  }
}

export function parseRequestManifest(value: string): unknown[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

interface CodeEditorProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  label: string;
  description?: string;
  placeholder?: string;
  language: "jsx" | "json";
  diagnostics?: EditorDiagnostic[];
  error?: React.ReactNode;
  required?: boolean;
  maxLength?: number;
  starter?: string;
}

export function CodeEditor({
  id,
  value,
  onChange,
  label,
  description,
  placeholder,
  language,
  diagnostics = [],
  error,
  required,
  maxLength,
  starter,
}: CodeEditorProps) {
  const t = useScopedI18n("customWidget.editor");
  const [cursor, setCursor] = useState({ line: 1, column: 1 });
  const [editorView, setEditorView] = useState<EditorView | null>(null);
  const [historyDepth, setHistoryDepth] = useState({ undo: 0, redo: 0 });
  const colorScheme = useComputedColorScheme("light");
  const extensions = useMemo(() => {
    const diagnosticsExtension = linter((view) =>
      diagnostics.map((diagnostic) => {
        const from = Math.min(diagnostic.index ?? 0, view.state.doc.length);
        return {
          from,
          to: Math.min(from + 1, view.state.doc.length),
          severity: diagnostic.severity,
          message: t(`diagnostics.${diagnostic.code}` as never, { value: diagnostic.value ?? "" } as never),
        };
      }),
    );
    return language === "jsx"
      ? [javascript({ jsx: true }), autocompletion({ override: [customJsxCompletionSource] }), diagnosticsExtension]
      : [json(), diagnosticsExtension];
  }, [diagnostics, language, t]);
  const errorCount = diagnostics.filter((diagnostic) => diagnostic.severity === "error").length;
  const warningCount = diagnostics.length - errorCount;

  const formattedValue = useMemo(() => {
    if (language === "json") {
      try {
        return `${JSON.stringify(JSON.parse(value) as unknown, null, 2)}\n`;
      } catch {
        return value;
      }
    }
    return value
      .replace(/\r\n?/gu, "\n")
      .split("\n")
      .map((line) => line.trimEnd())
      .join("\n")
      .trim();
  }, [language, value]);

  return (
    <Input.Wrapper
      label={label}
      description={description}
      error={error}
      required={required}
      labelProps={{ htmlFor: id }}
      inputWrapperOrder={["label", "description", "input", "error"]}
    >
      <div className={classes.root}>
        <Group className={classes.toolbar} justify="space-between" gap="xs" wrap="wrap">
          <Group gap={6}>
            <IconCode size={16} aria-hidden />
            <Text size="xs" fw={600}>
              {language === "jsx" ? t("language.jsx") : t("language.json")}
            </Text>
          </Group>
          <Group gap={6}>
            <Button
              size="compact-xs"
              variant="subtle"
              leftSection={<IconArrowBackUp size={14} />}
              onClick={() => editorView && undo(editorView)}
              disabled={!editorView || historyDepth.undo === 0}
            >
              {t("action.undo")}
            </Button>
            <Button
              size="compact-xs"
              variant="subtle"
              leftSection={<IconArrowForwardUp size={14} />}
              onClick={() => editorView && redo(editorView)}
              disabled={!editorView || historyDepth.redo === 0}
            >
              {t("action.redo")}
            </Button>
            {language === "jsx" && <ComponentReference />}
            {starter && value.trim().length === 0 && (
              <Button
                size="compact-xs"
                variant="subtle"
                leftSection={<IconFileCode size={14} />}
                onClick={() => onChange(starter)}
              >
                {t("action.insertStarter")}
              </Button>
            )}
            <Button
              size="compact-xs"
              variant="subtle"
              leftSection={<IconWand size={14} />}
              onClick={() => onChange(formattedValue)}
              disabled={formattedValue === value}
            >
              {t("action.format")}
            </Button>
          </Group>
        </Group>

        <div className={classes.viewport}>
          <Editor
            id={id}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            extensions={extensions}
            theme={colorScheme}
            height={language === "jsx" ? "320px" : "220px"}
            basicSetup={{
              autocompletion: language !== "jsx",
              bracketMatching: true,
              closeBrackets: true,
              foldGutter: true,
              history: true,
              highlightActiveLine: true,
              highlightActiveLineGutter: true,
              indentOnInput: true,
              lineNumbers: true,
            }}
            onCreateEditor={setEditorView}
            onUpdate={(update) => {
              if (!update.selectionSet && !update.docChanged) return;
              const head = update.state.selection.main.head;
              const line = update.state.doc.lineAt(head);
              setCursor({ line: line.number, column: head - line.from + 1 });
              setHistoryDepth({ undo: undoDepth(update.state), redo: redoDepth(update.state) });
            }}
          />
        </div>

        <Group className={classes.footer} justify="space-between" gap="xs">
          <Group gap={6}>
            {errorCount > 0 ? (
              <Badge size="xs" color="red" variant="light">
                {t("status.errors", { count: errorCount })}
              </Badge>
            ) : warningCount > 0 ? (
              <Badge size="xs" color="yellow" variant="light">
                {t("status.warnings", { count: warningCount })}
              </Badge>
            ) : (
              <Group gap={4}>
                <IconCheck size={13} color="var(--mantine-color-green-6)" aria-hidden />
                <Text size="xs" c="dimmed">
                  {t("status.ready")}
                </Text>
              </Group>
            )}
            <Text size="xs" c="dimmed">
              {t("status.position", cursor)}
            </Text>
          </Group>
          <Text
            size="xs"
            c={maxLength && value.length > maxLength * 0.95 ? (value.length > maxLength ? "red" : "orange") : "dimmed"}
          >
            {maxLength
              ? t("status.charactersWithLimit", { count: value.length, limit: maxLength })
              : t("status.characters", { count: value.length })}
          </Text>
        </Group>
      </div>

      {diagnostics.length > 0 && (
        <Stack component="ul" gap={6} mt="xs" pl={0} style={{ listStyle: "none" }} aria-label={t("diagnostics.title")}>
          {diagnostics.map((diagnostic, index) => (
            <li key={`${diagnostic.code}-${diagnostic.line ?? 0}-${index}`}>
              <UnstyledButton
                w="100%"
                className={classes.diagnosticButton}
                onClick={() => {
                  if (!editorView || diagnostic.index === undefined) return;
                  const anchor = Math.min(diagnostic.index, editorView.state.doc.length);
                  editorView.dispatch({ selection: { anchor }, scrollIntoView: true });
                  editorView.focus();
                }}
              >
                <Alert
                  color={diagnostic.severity === "error" ? "red" : "yellow"}
                  variant="light"
                  p="xs"
                  icon={<IconAlertTriangle size={15} />}
                >
                  <Text size="xs">
                    {diagnostic.line ? `${t("diagnostics.line", { line: diagnostic.line })}: ` : ""}
                    {t(`diagnostics.${diagnostic.code}` as never, { value: diagnostic.value ?? "" } as never)}
                  </Text>
                </Alert>
              </UnstyledButton>
            </li>
          ))}
        </Stack>
      )}
    </Input.Wrapper>
  );
}

function ComponentReference() {
  const t = useScopedI18n("customWidget.editor");
  const [query, setQuery] = useState("");
  const components = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return enabledCustomJsxComponents.filter(
      (component) =>
        normalizedQuery.length === 0 ||
        component.name.toLocaleLowerCase().includes(normalizedQuery) ||
        component.category.toLocaleLowerCase().includes(normalizedQuery),
    );
  }, [query]);

  return (
    <Popover width={320} position="bottom-end" withinPortal shadow="md">
      <Popover.Target>
        <Button size="compact-xs" variant="subtle" leftSection={<IconComponents size={14} />}>
          {t("action.components")}
        </Button>
      </Popover.Target>
      <Popover.Dropdown p="xs">
        <Stack gap="xs">
          <TextInput
            size="xs"
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder={t("componentReference.search")}
            aria-label={t("componentReference.search")}
            leftSection={<IconSearch size={14} />}
          />
          <ScrollArea.Autosize mah={300} type="auto">
            <Stack gap={4}>
              {components.map((component) => (
                <Group key={component.name} justify="space-between" wrap="nowrap" py={3} px={4}>
                  <Text size="xs" ff="monospace" fw={600}>
                    {component.name}
                  </Text>
                  <Badge size="xs" variant="light" color={component.safety === "wrapped" ? "yellow" : "gray"}>
                    {component.category}
                  </Badge>
                </Group>
              ))}
              {components.length === 0 && (
                <Text size="xs" c="dimmed" ta="center" py="md">
                  {t("componentReference.empty")}
                </Text>
              )}
            </Stack>
          </ScrollArea.Autosize>
          <Text size="xs" c="dimmed">
            {t("componentReference.count", { count: enabledCustomJsxComponents.length })}
          </Text>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
