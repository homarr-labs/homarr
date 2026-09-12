"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { getCustomWidgetDefaultOptions } from "@homarr/custom-widgets/core";
import { customWidgetPackageSchema, widgetPackagePathSchema } from "@homarr/custom-widgets/package";
import { useI18n } from "@homarr/translation/client";
import clock from "@homarr/widget-sdk/examples/clock.json";
import { documentFromSource, documentFromTemplate, documentSource } from "./_package-document";
import { usePackageDocument } from "./_use-package-document";
export type Installation = RouterOutputs["customWidget"]["package"]["get"];
type Preview = RouterOutputs["customWidget"]["package"]["preview"] & { liveActions: boolean };
export function usePackageWorkspace(
  installation: Installation | undefined,
  userId: string,
  initialSource?: unknown,
  initialName?: string,
  initialBindings?: Record<string, string>,
  initialBoardId?: string,
) {
  const t = useI18n("customWidget.package");
  const utils = clientApi.useUtils();
  const [initial] = useState(() => {
    if (installation) return documentFromSource(installation.name, installation.source);
    return documentFromTemplate(initialName ?? t("newName"), initialSource ?? clock);
  });
  const editor = usePackageDocument(initial, userId, installation?.id);
  const { document, edit } = editor;
  const [selected, setSelected] = useState(Object.keys(initial.files)[0] ?? "/widget.json");
  const [path, setPath] = useState("");
  useEffect(() => {
    if (selected !== "/widget.json" && !Object.hasOwn(document.files, selected)) setSelected("/widget.json");
  }, [document.files, selected]);
  const [pane, setPane] = useState("edit");
  const [trusted, setTrusted] = useState(false);
  const [scenario, setScenario] = useState<string | null>(null);
  const [liveActions, setLiveActions] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [bindings, setBindings] = useState(installation?.bindings ?? initialBindings ?? {});
  const savedInstallationId = useRef(installation?.id);
  const [options, setOptions] = useState<Record<string, unknown>>({});
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewExecutionKey, setPreviewExecutionKey] = useState("");
  const [stale, setStale] = useState(false);
  const [surface, setSurface] = useState<"tile" | "advanced" | "configuration">("tile");
  const [width, setWidth] = useState(320);
  const [height, setHeight] = useState(260);
  const [scale, setScale] = useState(1);
  const [previewTheme, setPreviewTheme] = useState<"system" | "light" | "dark">("system");
  const previewId = useRef<string | null>(null);
  const retiredPreviewIds = useRef(new Set<string>());
  const generation = useRef(0);
  const source = useMemo(() => documentSource(document), [document]);
  const parsed = useMemo(() => customWidgetPackageSchema.safeParse(source), [source]);
  const defaults = useMemo(() => (parsed.success ? getCustomWidgetDefaultOptions(parsed.data.options) : {}), [parsed]);
  const effectiveOptions = useMemo(() => ({ ...defaults, ...options }), [defaults, options]);
  const save = clientApi.customWidget.package.saveDraft.useMutation();
  const previewMutation = clientApi.customWidget.package.preview.useMutation();
  const discard = clientApi.customWidget.package.discardPreview.useMutation();
  const saveBindings = clientApi.customWidget.package.setBindings.useMutation();
  const discardPreview = discard.mutate;
  const busy = save.isPending || saveBindings.isPending || previewMutation.isPending;
  const resetExecution = useCallback(() => {
    generation.current += 1;
    if (previewId.current) setStale(true);
  }, []);
  const executionKey = JSON.stringify([source, bindings, effectiveOptions, liveActions, scenario]);
  useEffect(() => {
    resetExecution();
  }, [executionKey, resetExecution]);
  useEffect(() => {
    setTrusted(false);
  }, [source]);
  useEffect(() => {
    setLiveActions(false);
  }, [source, bindings, scenario]);
  useEffect(() => {
    if (scenario && parsed.success && !parsed.data.previewScenarios?.[scenario]) setScenario(null);
  }, [parsed, scenario]);
  useEffect(
    () => () => {
      generation.current += 1;
      if (previewId.current) discardPreview({ previewId: previewId.current });
      for (const id of retiredPreviewIds.current) discardPreview({ previewId: id });
      retiredPreviewIds.current.clear();
    },
    [discardPreview],
  );

  const saveDraft = async () => {
    setError("");
    setMessage("");
    const submitted = document;
    try {
      const result = await save.mutateAsync({ id: savedInstallationId.current, name: document.name, source });
      savedInstallationId.current = result.id;
      if (!installation && Object.keys(bindings).length > 0)
        await saveBindings.mutateAsync({ id: result.id, bindings });
      editor.markSaved(submitted);
      await Promise.all([
        utils.customWidget.package.get.invalidate(),
        utils.customWidget.package.list.invalidate(),
        utils.customWidget.package.draftChanges.invalidate(),
        utils.customWidget.package.inspectArtifact.invalidate(),
      ]);
      setMessage(t("draftSaved"));
      if (!installation) {
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        const destination = new URL(result.managementPath, window.location.origin);
        if (initialBoardId) destination.searchParams.set("boardId", initialBoardId);
        window.location.assign(destination.pathname + destination.search);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };
  const runPreview = async () => {
    if (!installation || !trusted || !parsed.success) return;
    resetExecution();
    setError("");
    const currentGeneration = generation.current;
    try {
      const next = await previewMutation.mutateAsync({
        id: installation.id,
        source,
        options: effectiveOptions,
        bindings,
        trusted: true,
        liveActions,
        scenario: scenario ?? undefined,
      });
      if (generation.current !== currentGeneration) {
        discardPreview({ previewId: next.previewId });
        return;
      }
      if (previewId.current) retiredPreviewIds.current.add(previewId.current);
      previewId.current = next.previewId;
      setPreview({ ...next, liveActions });
      setPreviewExecutionKey(executionKey);
      setStale(false);
      setPane("preview");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };
  const addFile = () => {
    const checked = widgetPackagePathSchema.safeParse(path.trim());
    if (!checked.success) {
      setError(checked.error.issues[0]?.message ?? t("invalidPath"));
      return;
    }
    if (Object.hasOwn(document.files, checked.data)) {
      setError(t("duplicatePath"));
      return;
    }
    edit({ ...document, files: { ...document.files, [checked.data]: "" } });
    setSelected(checked.data);
    setPath("");
  };
  const removeFile = () => {
    if (selected === "/widget.json") return;
    const files = { ...document.files };
    delete files[selected];
    edit({ ...document, files });
    setSelected("/widget.json");
  };
  const renameFile = () => {
    if (selected === "/widget.json") return;
    const checked = widgetPackagePathSchema.safeParse(path.trim());
    if (!checked.success || Object.hasOwn(document.files, path.trim())) {
      setError(t("invalidPath"));
      return;
    }
    const files = { ...document.files, [checked.data]: document.files[selected] ?? "" };
    delete files[selected];
    edit({ ...document, files });
    setSelected(checked.data);
    setPath("");
    setMessage(t("renameImports"));
  };
  let editorValue = document.metadata;
  let language: "tsx" | "json" | "css" = "json";
  if (selected !== "/widget.json") {
    editorValue = document.files[selected] ?? "";
    language = "tsx";
    if (selected.endsWith(".css")) language = "css";
    if (selected.endsWith(".json")) language = "json";
  }
  const surfaceChoices = [{ value: "tile", label: t("tile") }];
  if (parsed.success && parsed.data.manifest.entrypoints.advanced)
    surfaceChoices.push({ value: "advanced", label: t("advanced") });
  if (parsed.success && parsed.data.manifest.entrypoints.configuration)
    surfaceChoices.push({ value: "configuration", label: t("configuration") });
  const saveLocalBindings = () => {
    if (!installation) return;
    saveBindings.mutate(
      { id: installation.id, bindings },
      {
        onSuccess: () => {
          setMessage(t("bindingsSaved"));
          void utils.customWidget.package.get.invalidate();
          void utils.customWidget.package.guestGrants.invalidate();
          void utils.customWidget.package.webhooks.invalidate();
        },
        onError: (cause) => setError(cause.message),
      },
    );
  };

  const previewReady = (id: string) => {
    if (previewId.current !== id) return;
    for (const retired of retiredPreviewIds.current) {
      if (retired !== id) discardPreview({ previewId: retired });
    }
    retiredPreviewIds.current.clear();
  };
  const previewLoadError = (id: string, cause: Error) => {
    if (previewId.current !== id) return;
    setStale(true);
    setError(cause.message);
  };

  return {
    installationId: savedInstallationId.current,
    editor,
    document,
    edit,
    selected,
    setSelected,
    path,
    setPath,
    pane,
    setPane,
    trusted,
    setTrusted,
    liveActions,
    setLiveActions,
    scenario,
    setScenario,
    error,
    setError,
    message,
    setMessage,
    bindings,
    setBindings,
    options,
    setOptions,
    preview,
    stale: Boolean(preview) && (stale || previewExecutionKey !== executionKey),
    previewReady,
    previewLoadError,
    surface,
    setSurface,
    width,
    setWidth,
    height,
    setHeight,
    scale,
    setScale,
    previewTheme,
    setPreviewTheme,
    source,
    parsed,
    effectiveOptions,
    save,
    previewMutation,
    saveBindings,
    busy,
    saveDraft,
    runPreview,
    addFile,
    removeFile,
    renameFile,
    editorValue,
    language,
    surfaceChoices,
    saveLocalBindings,
    resetExecution,
    connectionChanged: () => {
      setLiveActions(false);
      resetExecution();
    },
  };
}
