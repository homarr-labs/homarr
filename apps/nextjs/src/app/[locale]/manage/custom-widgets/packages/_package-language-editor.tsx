"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Accordion, Alert, Button, Group, Stack, Text, TextInput, Tooltip } from "@mantine/core";
import {
  PackageLanguageClient,
  createPackageLanguageExtensions,
} from "@homarr/custom-widgets/workbench/package-language";
import type {
  PackageLanguageDiagnostic,
  PackageLanguageLocation,
} from "@homarr/custom-widgets/workbench/package-language";
import { useI18n } from "@homarr/translation/client";

import { CodeEditor } from "~/components/custom-widgets/code-editor";
import type { usePackageWorkspace } from "./_use-package-workspace";

export default function PackageLanguageEditor({ state }: { state: ReturnType<typeof usePackageWorkspace> }) {
  const t = useI18n("customWidget.package.languageService");
  const current = useRef(state);
  current.current = state;
  const [client, setClient] = useState<PackageLanguageClient>();
  const [diagnostics, setDiagnostics] = useState<PackageLanguageDiagnostic[]>([]);
  const [error, setError] = useState("");
  const [checked, setChecked] = useState(false);
  const [definition, setDefinition] = useState<PackageLanguageLocation>();
  const [reveal, setReveal] = useState<PackageLanguageLocation>();
  const [rename, setRename] = useState<{ path: string; position: number; name: string; revision: number }>();
  const [operationPending, setOperationPending] = useState(false);
  useEffect(() => {
    try {
      const service = new PackageLanguageClient();
      setClient(service);
      return () => service.dispose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }, []);
  useEffect(() => {
    client?.update(state.document.files);
  }, [client, state.document.files]);
  useEffect(() => {
    setDefinition(undefined);
    setRename(undefined);
    setDiagnostics([]);
    setChecked(false);
    setError("");
  }, [state.selected]);
  const navigate = (location: PackageLanguageLocation) => {
    setReveal(location);
    if (location.declaration) setDefinition(location);
    else {
      setDefinition(undefined);
      current.current.setSelected(location.path);
    }
  };
  const extensions = useMemo(() => {
    if (!client || state.language !== "tsx") return undefined;
    const path = state.selected;
    return createPackageLanguageExtensions(client, path, {
      navigate,
      diagnostics: (next) => {
        if (current.current.selected !== path) return;
        setDiagnostics(next);
        setChecked(true);
        setError("");
      },
      error: (message) => {
        if (current.current.selected === path) setError(message);
      },
      rename: (position, name) => setRename({ path, position, name, revision: client.getRevision() }),
    });
  }, [client, state.language, state.selected]);
  const reportError = (cause: unknown) => {
    if (cause instanceof Error && cause.name === "AbortError") return;
    setError(cause instanceof Error ? cause.message : String(cause));
  };
  const format = async () => {
    if (!client) return;
    const path = state.selected;
    const submittedFiles = state.document.files;
    client.update(state.document.files);
    setOperationPending(true);
    try {
      const source = await client.request("format", { path });
      const latest = current.current;
      if (latest.selected !== path || latest.document.files !== submittedFiles) return;
      latest.edit({ ...latest.document, files: { ...latest.document.files, [path]: source } });
    } catch (cause) {
      reportError(cause);
    } finally {
      setOperationPending(false);
    }
  };
  const renameSymbol = async () => {
    if (!client || !rename) return;
    if (client.getRevision() !== rename.revision) {
      setError(t("changed"));
      return;
    }
    const submittedFiles = current.current.document.files;
    setOperationPending(true);
    try {
      const files = await client.request("rename", rename);
      const latest = current.current;
      if (latest.document.files !== submittedFiles) {
        setError(t("changed"));
        return;
      }
      latest.edit({ ...latest.document, files: { ...latest.document.files, ...files } });
      setRename(undefined);
    } catch (cause) {
      reportError(cause);
    } finally {
      setOperationPending(false);
    }
  };
  let status = t("loading");
  if (checked) status = t("ready");
  if (diagnostics.length) status = t("problems", { count: diagnostics.length });
  if (error) status = t("unavailable");
  let visiblePath = state.selected;
  let value = state.editorValue;
  let language = state.language;
  if (definition?.declaration) {
    visiblePath = definition.path;
    value = definition.declaration.source;
    language = "tsx";
  }
  let range: { from: number; to: number } | undefined;
  if (reveal?.path === visiblePath) range = reveal;
  return (
    <Stack gap="xs" miw={0}>
      {rename && (
        <Group align="end" gap="xs">
          <TextInput
            label={t("rename")}
            value={rename.name}
            onChange={(event) => setRename({ ...rename, name: event.currentTarget.value })}
          />
          <Button size="sm" loading={operationPending} disabled={state.busy} onClick={() => void renameSymbol()}>
            {t("applyRename")}
          </Button>
          <Button size="sm" variant="subtle" onClick={() => setRename(undefined)}>
            {t("cancel")}
          </Button>
        </Group>
      )}
      {definition?.declaration && (
        <Group justify="space-between" gap="xs">
          <Text size="xs" c="dimmed">
            {t("declaration", { line: definition.declaration.line })}
          </Text>
          <Button size="compact-xs" variant="subtle" onClick={() => setDefinition(undefined)}>
            {t("backToSource")}
          </Button>
        </Group>
      )}
      <CodeEditor
        key={visiblePath}
        id="package-source"
        label={visiblePath}
        language={language}
        value={value}
        hideHistoryActions
        readOnly={state.busy || operationPending || Boolean(definition?.declaration)}
        height="max(280px, calc(100dvh - 310px))"
        extensions={definition?.declaration ? undefined : extensions}
        revealRange={range}
        onFormat={state.language === "tsx" && client ? () => void format() : undefined}
        status={
          state.language === "tsx" &&
          !definition?.declaration && (
            <Tooltip label={t("help")} multiline maw={380}>
              <Text size="xs" c="dimmed">
                {status}
              </Text>
            </Tooltip>
          )
        }
        onChange={(next) => {
          if (state.selected === "/widget.json") state.edit({ ...state.document, metadata: next }, state.selected);
          else
            state.edit(
              { ...state.document, files: { ...state.document.files, [state.selected]: next } },
              state.selected,
            );
        }}
      />
      {error && (
        <Alert color="yellow" title={t("unavailable")}>
          {error}
        </Alert>
      )}
      {!definition && diagnostics.length > 0 && (
        <Accordion variant="default">
          <Accordion.Item value="types">
            <Accordion.Control>{t("problems", { count: diagnostics.length })}</Accordion.Control>
            <Accordion.Panel>
              <Stack gap={4}>
                {diagnostics.slice(0, 20).map((diagnostic, index) => (
                  <Button
                    key={index}
                    variant="subtle"
                    size="compact-xs"
                    justify="start"
                    styles={{ label: { whiteSpace: "normal", textAlign: "start" } }}
                    onClick={() => navigate(diagnostic)}
                  >
                    {`TS${diagnostic.code}: ${diagnostic.message}`}
                  </Button>
                ))}
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
      )}
    </Stack>
  );
}
