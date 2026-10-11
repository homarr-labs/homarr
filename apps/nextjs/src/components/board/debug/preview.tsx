"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Alert, AppShellMain, Avatar, DirectionProvider, MantineProvider, v8CssVariablesResolver } from "@mantine/core";
import { QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider, useMessages } from "next-intl";
import type { AbstractIntlMessages } from "next-intl";
import dayjs from "dayjs";

import { clientApi } from "@homarr/api/client";
import { BoardReplayProvider } from "@homarr/api/board-replay";
import { IntegrationProvider, SessionContext } from "@homarr/auth/client";
import { BoardPreviewProvider } from "@homarr/boards/context";
import { getLayoutIdForViewportWidth } from "@homarr/boards/layout-selection";
import { EditModeProvider } from "@homarr/boards/edit-mode";
import { ModalProvider } from "@homarr/modals";
import { SettingsSnapshotProvider } from "@homarr/settings";
import { createLanguageMapping, isLocaleRTL, localeConfigurations } from "@homarr/translation";
import { DemoReadOnlyProvider } from "@homarr/widgets/demo-read-only";

import { ClientBoard } from "~/app/[locale]/boards/(content)/_client";
import { BoardReadyProvider } from "~/app/[locale]/boards/(content)/_ready-context";
import { BoardMantineProvider } from "~/app/[locale]/boards/(content)/_theme";
import { parseBoardSnapshot } from "./snapshot";
import type { BoardSnapshotPayload } from "./snapshot";
import { createReplayQueryClient, snapshotReplayLink } from "./replay-client";
import { installReplayStorage } from "./storage";
import { CustomCss } from "~/app/[locale]/boards/(content)/_custom-css";
import { ClientShell } from "~/components/layout/shell";
import { ConfigurableHeader } from "~/components/layout/header/configurable-header";
import { BoardLogo, BoardLogoWithTitle } from "~/components/layout/logo/board-logo";
import { appShellLogoHeight } from "~/components/layout/constants";
import { createBrandTheme } from "~/theme/branding";

export const BoardDebugPreview = () => {
  const [loaded, setLoaded] = useState<{ payload: BoardSnapshotPayload; messages: AbstractIntlMessages } | null>(null);
  const fallbackMessages = useMessages();
  const [error, setError] = useState(false);
  const loadSequence = useRef(0);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (
        event.origin !== window.location.origin ||
        event.source !== window.parent ||
        event.data?.type !== "homarr-board-snapshot" ||
        typeof event.data.text !== "string"
      )
        return;
      const sequence = ++loadSequence.current;
      void parseBoardSnapshot(event.data.text)
        .then(async ({ payload: parsed, snapshot }) => {
          const [translated, dayJsLocale] = await Promise.all([
            createLanguageMapping()[parsed.locale](),
            localeConfigurations[parsed.locale].importDayJsLocale(),
          ]);
          if (sequence !== loadSequence.current) return;
          dayjs.locale(dayJsLocale);
          installReplayStorage(parsed, snapshot.capturedAt);
          setLoaded({ payload: parsed, messages: mergeMessages(fallbackMessages, translated.default) });
          setError(false);
        })
        .catch(() => {
          if (sequence === loadSequence.current) setError(true);
        });
    };
    window.addEventListener("message", receive);
    window.parent.postMessage({ type: "homarr-board-preview-ready" }, window.location.origin);
    return () => window.removeEventListener("message", receive);
  }, [fallbackMessages]);
  if (error) return <Alert color="red">Unable to replay this snapshot.</Alert>;
  if (!loaded) return null;
  return <ReplayBoard key={loadSequence.current} {...loaded} />;
};

const mergeMessages = (fallback: AbstractIntlMessages, translated: AbstractIntlMessages): AbstractIntlMessages => {
  const result = { ...fallback };
  for (const [key, value] of Object.entries(translated)) {
    if (typeof value === "string") {
      if (value.trim()) result[key] = value;
      continue;
    }
    const previous = fallback[key];
    let nested = {};
    if (typeof previous === "object") nested = previous;
    result[key] = mergeMessages(nested, value);
  }
  return result;
};

const subscribeWidth = (callback: () => void) => {
  window.addEventListener("resize", callback);
  return () => window.removeEventListener("resize", callback);
};

const ReplayBoard = ({ payload, messages }: { payload: BoardSnapshotPayload; messages: AbstractIntlMessages }) => {
  const [queryClient] = useState(() => createReplayQueryClient(payload));
  const [client] = useState(() => clientApi.createClient({ links: [snapshotReplayLink(payload)] }));
  useEffect(() => () => queryClient.clear(), [queryClient]);
  useEffect(() => {
    document.documentElement.lang = payload.locale;
    let direction = "ltr";
    if (isLocaleRTL(payload.locale)) direction = "rtl";
    document.documentElement.dir = direction;
  }, [payload.locale]);
  const viewportWidth = useSyncExternalStore(
    subscribeWidth,
    () => document.documentElement.clientWidth || window.innerWidth,
    () => payload.viewport.width,
  );
  let layoutId = payload.viewport.layoutId;
  const isCapturedViewport = window.innerWidth === payload.viewport.width;
  if (!isCapturedViewport) layoutId = getLayoutIdForViewportWidth(payload.board.layouts, viewportWidth);
  useEffect(() => {
    if (!isCapturedViewport) return;
    // Widgets load lazily, so restore the captured scroll after their canvas
    // settles. User interaction immediately ends restoration.
    const restore = () => window.scrollTo(payload.viewport.scrollX, payload.viewport.scrollY);
    const observer = new ResizeObserver(restore);
    observer.observe(document.body);
    const stop = () => observer.disconnect();
    const timeout = window.setTimeout(stop, 5000);
    const userInteractions = ["wheel", "pointerdown", "touchstart", "keydown"];
    for (const event of userInteractions) window.addEventListener(event, stop, { once: true });
    restore();
    return () => {
      stop();
      window.clearTimeout(timeout);
      for (const event of userInteractions) window.removeEventListener(event, stop);
    };
  }, [payload.viewport, viewportWidth, isCapturedViewport]);
  return (
    <SessionContext.Provider value={{ data: null, status: "unauthenticated", update: async () => null }}>
      <SettingsSnapshotProvider value={payload.settings}>
        <clientApi.Provider client={client} queryClient={queryClient}>
          <QueryClientProvider client={queryClient}>
            <BoardReplayProvider value>
              <DemoReadOnlyProvider value>
                <IntegrationProvider integrations={payload.integrations}>
                  <BoardPreviewProvider board={payload.board} layoutId={layoutId} initialViewportWidth={viewportWidth}>
                    <EditModeProvider>
                      <BoardReadyProvider>
                        <DirectionProvider initialDirection={isLocaleRTL(payload.locale) ? "rtl" : "ltr"}>
                          <MantineProvider
                            forceColorScheme={payload.colorScheme}
                            theme={createBrandTheme(payload.settings.branding)}
                            cssVariablesResolver={v8CssVariablesResolver}
                          >
                            <BoardMantineProvider
                              defaultColorScheme={payload.colorScheme}
                              forceColorScheme={payload.colorScheme}
                            >
                              <ModalProvider>
                                <NextIntlClientProvider locale={payload.locale} messages={messages}>
                                  <div
                                    onClickCapture={(event) => {
                                      if (
                                        event.target instanceof Element &&
                                        event.target.closest("a,form,[data-app-shell-header]")
                                      ) {
                                        event.preventDefault();
                                        event.stopPropagation();
                                      }
                                    }}
                                  >
                                    <style data-homarr-global-custom-css>{payload.settings.branding.customCss}</style>
                                    <CustomCss />
                                    <ClientShell hasNavigation={false}>
                                      <ConfigurableHeader
                                        logo={<BoardLogo size={appShellLogoHeight} />}
                                        logoWithTitle={<BoardLogoWithTitle size="md" />}
                                        hasNavigation={false}
                                        avatar={<Avatar size="md" />}
                                        userId={null}
                                        isAdmin={false}
                                        isDockerEnabled={false}
                                      />
                                      <AppShellMain data-advanced-focus-background>
                                        <ClientBoard />
                                      </AppShellMain>
                                    </ClientShell>
                                  </div>
                                </NextIntlClientProvider>
                              </ModalProvider>
                            </BoardMantineProvider>
                          </MantineProvider>
                        </DirectionProvider>
                      </BoardReadyProvider>
                    </EditModeProvider>
                  </BoardPreviewProvider>
                </IntegrationProvider>
              </DemoReadOnlyProvider>
            </BoardReplayProvider>
          </QueryClientProvider>
        </clientApi.Provider>
      </SettingsSnapshotProvider>
    </SessionContext.Provider>
  );
};
