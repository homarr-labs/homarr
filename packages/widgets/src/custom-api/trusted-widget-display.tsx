"use client";

import type { ComponentType } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Button, Center, Loader, Stack, Text } from "@mantine/core";

import { useI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";
import { TrustedWidgetHost } from "./trusted-widget-host";
import { TrustedWidgetErrorBoundary } from "./trusted-widget-error-boundary";
import { loadTrustedWidgetModule, retainTrustedWidgetStylesheet } from "./trusted-widget-loader";
import type { TrustedWidgetData } from "./trusted-widget-types";

interface LoadedSurface {
  url: string;
  data: TrustedWidgetData;
  Component: ComponentType;
  releaseStyles?: () => void;
}

export default function TrustedWidgetDisplay({
  data,
  widget,
  surface: requestedSurface,
  onOptionsChange,
  frozen = false,
  onReady,
  onLoadError,
}: {
  data: TrustedWidgetData;
  widget: WidgetComponentProps<"customApi">;
  surface?: "tile" | "advanced" | "configuration";
  onOptionsChange?: (options: Record<string, unknown>) => void;
  frozen?: boolean;
  onReady?: (previewId: string) => void;
  onLoadError?: (previewId: string, error: Error) => void;
}) {
  const t = useI18n("widget.customApi.customJsx");
  let surface: "tile" | "advanced" | "configuration" = "tile";
  if (widget.displayMode === "advanced" && data.surfaceUrls.advanced) surface = "advanced";
  if (requestedSurface && data.surfaceUrls[requestedSurface]) surface = requestedSurface;
  const moduleUrl = data.surfaceUrls[surface] ?? data.surfaceUrls.tile;
  const cssUrl = data.stylesheetUrls[surface];
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<LoadedSurface>();
  const [failure, setFailure] = useState<Error>();
  const committed = useRef<LoadedSurface | undefined>(undefined);
  const styles = useRef(new Set<() => void>());
  const callbacks = useRef({ onReady, onLoadError });
  callbacks.current = { onReady, onLoadError };

  useEffect(() => {
    if (frozen) return;
    let active = true;
    let promoted = false;
    const retained = styles.current;
    setFailure(undefined);
    const stylesheet = cssUrl ? retainTrustedWidgetStylesheet(cssUrl) : undefined;
    if (stylesheet) retained.add(stylesheet.release);
    void Promise.all([loadTrustedWidgetModule(moduleUrl, attempt), stylesheet?.loaded]).then(
      ([module]) => {
        if (!active) return;
        promoted = true;
        setLoaded({ url: moduleUrl, data, Component: module.default, releaseStyles: stylesheet?.release });
      },
      (error: unknown) => {
        if (!active) return;
        const reason = error instanceof Error ? error : new Error(String(error));
        setFailure(reason);
        if (data.previewId) callbacks.current.onLoadError?.(data.previewId, reason);
      },
    );
    return () => {
      active = false;
      if (!promoted && stylesheet) {
        stylesheet.release();
        retained.delete(stylesheet.release);
      }
    };
  }, [attempt, cssUrl, data, frozen, moduleUrl]);

  useEffect(() => {
    const retained = styles.current;
    return () => {
      retained.forEach((release) => release());
      retained.clear();
    };
  }, []);

  const accept = useCallback((entry: LoadedSurface) => {
    committed.current = entry;
    for (const release of styles.current) {
      if (release === entry.releaseStyles) continue;
      release();
      styles.current.delete(release);
    }
    if (entry.data.previewId) callbacks.current.onReady?.(entry.data.previewId);
  }, []);

  const renderFailed = (error: Error) => {
    if (!data.previewId) return;
    setFailure(error);
    callbacks.current.onLoadError?.(data.previewId, error);
    if (!committed.current || loaded === committed.current) return;
    if (loaded?.releaseStyles) {
      loaded.releaseStyles();
      styles.current.delete(loaded.releaseStyles);
    }
    setLoaded(committed.current);
  };

  let content = (
    <Center h="100%">
      <Loader size="sm" />
    </Center>
  );
  if (loaded) {
    const Component = loaded.Component;
    content = (
      <>
        <Component key={loaded.url} />
        <SurfaceCommitted entry={loaded} onReady={accept} />
      </>
    );
  }
  let displayData = data;
  const retainingPrevious = Boolean(loaded && loaded.url !== moduleUrl);
  if (loaded && retainingPrevious) displayData = loaded.data;

  return (
    <TrustedWidgetHost
      data={displayData}
      widget={widget}
      onOptionsChange={onOptionsChange}
      frozen={frozen || retainingPrevious}
      notice={
        failure && (
          <Alert color="red" title={t("requestFailed")}>
            <Stack gap="xs">
              <Text size="sm">{failure.message}</Text>
              <Button
                disabled={frozen}
                size="compact-xs"
                variant="light"
                onClick={() => setAttempt((current) => current + 1)}
              >
                {t("retry")}
              </Button>
            </Stack>
          </Alert>
        )
      }
    >
      <TrustedWidgetErrorBoundary
        key={`${loaded?.url ?? moduleUrl}:${attempt}`}
        title={t("requestFailed")}
        retryLabel={t("retry")}
        onRetry={() => setAttempt((current) => current + 1)}
        onError={renderFailed}
      >
        {(!failure || loaded) && content}
      </TrustedWidgetErrorBoundary>
    </TrustedWidgetHost>
  );
}

function SurfaceCommitted({ entry, onReady }: { entry: LoadedSurface; onReady(entry: LoadedSurface): void }) {
  useEffect(() => onReady(entry), [entry, onReady]);
  return null;
}
