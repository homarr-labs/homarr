"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { PropsWithChildren } from "react";
import { Alert, MantineProvider } from "@mantine/core";
import { QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider, useMessages } from "next-intl";
import type { AbstractIntlMessages } from "next-intl";
import dayjs from "dayjs";

import { clientApi } from "@homarr/api/client";
import { BoardReplayProvider } from "@homarr/api/board-replay";
import { IntegrationProvider, SessionProvider } from "@homarr/auth/client";
import { BoardPreviewProvider } from "@homarr/boards/context";
import { getLayoutIdForViewportWidth } from "@homarr/boards/layout-selection";
import { EditModeProvider } from "@homarr/boards/edit-mode";
import { ModalProvider } from "@homarr/modals";
import { Notifications } from "@homarr/notifications";
import { SettingsSnapshotProvider } from "@homarr/settings";
import { SpotlightProvider } from "@homarr/spotlight";
import { theme } from "@homarr/ui";
import { createLanguageMapping, isLocaleRTL, localeConfigurations } from "@homarr/translation";
import { DemoReadOnlyProvider } from "@homarr/widgets/demo-read-only";

import { ClientBoard } from "~/app/[locale]/boards/(content)/_client";
import { JotaiProvider } from "~/app/[locale]/_client-providers/jotai";
import { BoardReadyProvider } from "~/app/[locale]/boards/(content)/_ready-context";
import { BoardMantineProvider } from "~/app/[locale]/boards/(content)/_theme";
import { parseBoardSnapshot } from "./snapshot";
import type { BoardSnapshotPayload } from "./snapshot";
import { createReplayQueryClient, snapshotReplayLink } from "./replay-client";
import { installReplayStorage } from "./storage";

export const DebugPreviewProviders = ({ children }: PropsWithChildren) => (
  <JotaiProvider>
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <SpotlightProvider>
        <Notifications />
        {children}
      </SpotlightProvider>
    </MantineProvider>
  </JotaiProvider>
);

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
          const translated = (await createLanguageMapping()[parsed.locale]()).default;
          if (sequence !== loadSequence.current) return;
          installReplayStorage(parsed, snapshot.capturedAt);
          setLoaded({ payload: parsed, messages: mergeMessages(fallbackMessages, translated) });
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
    void localeConfigurations[payload.locale].importDayJsLocale().then((locale) => dayjs.locale(locale));
    document.documentElement.lang = payload.locale;
    let direction = "ltr";
    if (isLocaleRTL(payload.locale)) direction = "rtl";
    document.documentElement.dir = direction;
  }, [payload.locale]);
  const viewportWidth = useSyncExternalStore(
    subscribeWidth,
    () => window.innerWidth,
    () => payload.viewport.width,
  );
  let layoutId = payload.viewport.layoutId;
  if (viewportWidth !== payload.viewport.width)
    layoutId = getLayoutIdForViewportWidth(payload.board.layouts, viewportWidth);
  return (
    <SessionProvider session={null} refetchInterval={0} refetchOnWindowFocus={false}>
      <SettingsSnapshotProvider value={payload.settings}>
        <clientApi.Provider client={client} queryClient={queryClient}>
          <QueryClientProvider client={queryClient}>
            <BoardReplayProvider value>
              <DemoReadOnlyProvider value>
                <IntegrationProvider integrations={payload.integrations}>
                  <BoardPreviewProvider board={payload.board} layoutId={layoutId} initialViewportWidth={viewportWidth}>
                    <EditModeProvider>
                      <BoardReadyProvider>
                        <MantineProvider forceColorScheme={payload.colorScheme}>
                          <BoardMantineProvider
                            defaultColorScheme={payload.colorScheme}
                            forceColorScheme={payload.colorScheme}
                          >
                            <ModalProvider>
                              <NextIntlClientProvider locale={payload.locale} messages={messages}>
                                <div
                                  onClickCapture={(event) => {
                                    if ((event.target as HTMLElement).closest("a,form")) {
                                      event.preventDefault();
                                      event.stopPropagation();
                                    }
                                  }}
                                >
                                  <ClientBoard />
                                </div>
                              </NextIntlClientProvider>
                            </ModalProvider>
                          </BoardMantineProvider>
                        </MantineProvider>
                      </BoardReadyProvider>
                    </EditModeProvider>
                  </BoardPreviewProvider>
                </IntegrationProvider>
              </DemoReadOnlyProvider>
            </BoardReplayProvider>
          </QueryClientProvider>
        </clientApi.Provider>
      </SettingsSnapshotProvider>
    </SessionProvider>
  );
};
