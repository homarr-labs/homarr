"use client";

import type { PropsWithChildren } from "react";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { MessageFormatAdapter, RemoteThreadListAdapter, ThreadHistoryAdapter, Toolkit } from "@assistant-ui/react";
import {
  AssistantRuntimeProvider,
  defineToolkit,
  Tools,
  useAui,
  useAuiState,
  useRemoteThreadListRuntime,
} from "@assistant-ui/react";
import { AssistantChatTransport, useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { useHotkeys } from "@mantine/hooks";
import { createAssistantStream } from "assistant-stream";
import type { UIMessage } from "ai";
import { lastAssistantMessageIsCompleteWithApprovalResponses } from "ai";

import { clientApi, fetchApi } from "@homarr/api/client";
import { useSession } from "@homarr/auth/client";
import { hotkeys } from "@homarr/definitions";
import { showErrorNotification } from "@homarr/notifications";
import { useScopedI18n } from "@homarr/translation/client";
import {
  openMediaRequestSearch,
  openSpotlight,
  useRegisterSpotlightContextActions,
  useRegisterSpotlightContextResults,
} from "@homarr/spotlight";

import { AssistantPanel } from "./assistant-panel";
import { browserToolContracts } from "./assistant-tool-contracts";

interface AssistantContextValue {
  enabled: boolean;
  opened: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const AssistantContext = createContext<AssistantContextValue | null>(null);

export const useHomarrAssistant = () => {
  const value = useContext(AssistantContext);
  if (!value) {
    throw new Error("useHomarrAssistant must be used within AssistantProvider");
  }
  return value;
};

export const useOptionalHomarrAssistant = () => useContext(AssistantContext);

const threadAdapter: RemoteThreadListAdapter = {
  async list() {
    const threads = await fetchApi.assistant.listThreads.query();
    return {
      threads: threads.map((thread) => ({
        remoteId: thread.id,
        status: thread.status,
        title: thread.title ?? undefined,
        lastMessageAt: thread.updatedAt,
        custom: { modelId: thread.modelId },
      })),
    };
  },
  async initialize(localId) {
    const thread = await fetchApi.assistant.createThread.mutate({ localId });
    return { remoteId: thread.id, externalId: undefined };
  },
  async fetch(threadId) {
    const { thread } = await fetchApi.assistant.getThread.query({ threadId });
    return {
      remoteId: thread.id,
      status: thread.status,
      title: thread.title ?? undefined,
      lastMessageAt: thread.updatedAt,
      custom: { modelId: thread.modelId },
    };
  },
  async rename(threadId, title) {
    await fetchApi.assistant.renameThread.mutate({ threadId, title });
  },
  async archive(threadId) {
    await fetchApi.assistant.setThreadStatus.mutate({ threadId, status: "archived" });
  },
  async unarchive(threadId) {
    await fetchApi.assistant.setThreadStatus.mutate({ threadId, status: "regular" });
  },
  async delete(threadId) {
    await fetchApi.assistant.deleteThread.mutate({ threadId });
  },
  async generateTitle(_threadId, messages) {
    const firstUserMessage = messages.find((message) => message.role === "user");
    const text =
      firstUserMessage?.content
        .filter((part) => part.type === "text")
        .map((part) => part.text)
        .join(" ")
        .trim()
        .slice(0, 72) || "New conversation";
    return createAssistantStream((controller) => controller.appendText(text));
  },
};

const createHistoryAdapter = (threadId: string | undefined): ThreadHistoryAdapter => ({
  async load() {
    return { messages: [] };
  },
  async append() {
    // AI SDK runtimes use the typed adapter returned by withFormat below.
  },
  withFormat<TMessage, TStorageFormat extends Record<string, unknown>>(
    formatAdapter: MessageFormatAdapter<TMessage, TStorageFormat>,
  ) {
    if (formatAdapter.format !== "ai-sdk/v6") {
      throw new Error(`Unsupported assistant message format: ${formatAdapter.format}`);
    }
    const storageFormat = formatAdapter.format;
    return {
      async load() {
        if (!threadId) return { messages: [] };
        const { messages } = await fetchApi.assistant.getThread.query({ threadId });
        return {
          messages: messages
            .filter((message) => message.format === formatAdapter.format)
            .map(
              (message) =>
                formatAdapter.decode({
                  id: message.id,
                  parent_id: message.parentId,
                  format: message.format,
                  content: message.content as TStorageFormat,
                }) as { parentId: string | null; message: TMessage },
            ),
        };
      },
      async append(item) {
        if (!threadId) return;
        await fetchApi.assistant.appendMessage.mutate({
          threadId,
          id: (formatAdapter as MessageFormatAdapter<unknown, TStorageFormat>).getId(item.message),
          parentId: item.parentId,
          format: storageFormat,
          content: (formatAdapter as MessageFormatAdapter<unknown, TStorageFormat>).encode(
            item as { parentId: string | null; message: unknown },
          ),
        });
      },
      async update(item, localMessageId) {
        if (!threadId) return;
        const erasedFormatAdapter = formatAdapter as MessageFormatAdapter<unknown, TStorageFormat>;
        const id = erasedFormatAdapter.getId(item.message);
        await fetchApi.assistant.appendMessage.mutate({
          threadId,
          id,
          parentId: item.parentId,
          format: storageFormat,
          content: erasedFormatAdapter.encode(item as { parentId: string | null; message: unknown }),
        });
        if (localMessageId !== id) {
          await fetchApi.assistant.deleteMessages.mutate({ threadId, ids: [localMessageId] });
        }
      },
      async delete(items) {
        if (!threadId || items.length === 0) return;
        await fetchApi.assistant.deleteMessages.mutate({
          threadId,
          ids: items.map((item) =>
            (formatAdapter as MessageFormatAdapter<unknown, TStorageFormat>).getId(item.message),
          ),
        });
      },
    };
  },
});

const AssistantThreadRuntime = () => {
  const t = useScopedI18n("common.assistant");
  const threadId = useAuiState((state) => state.threadListItem.remoteId);
  const transport = useMemo(() => new AssistantChatTransport({ api: "/api/assistant/chat" }), []);
  const history = useMemo(() => createHistoryAdapter(threadId), [threadId]);
  const onError = useCallback(
    () =>
      showErrorNotification({
        title: t("responseError.title"),
        message: t("responseError.description"),
        autoClose: 10_000,
      }),
    [t],
  );

  return useChatRuntime<UIMessage>({
    transport,
    onError,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
    adapters: { history },
  });
};

const AssistantRuntime = ({ children }: PropsWithChildren) => {
  const router = useRouter();
  const runtime = useRemoteThreadListRuntime({
    adapter: threadAdapter,
    runtimeHook: AssistantThreadRuntime,
  });

  const toolkit = useMemo(
    () =>
      defineToolkit({
        navigate_to_route: {
          type: "frontend",
          ...browserToolContracts.navigate_to_route,
          execute: async ({ path }) => {
            const target = URL.canParse(path, window.location.origin) ? new URL(path, window.location.origin) : null;
            if (
              !path.startsWith("/") ||
              path.startsWith("/\\") ||
              target === null ||
              target.origin !== window.location.origin
            ) {
              return { success: false, error: "Only internal Homarr paths are allowed." };
            }
            const internalPath = `${target.pathname}${target.search}${target.hash}`;
            router.push(internalPath);
            return { success: true, path: internalPath };
          },
          renderText: {
            running: ({ args }) => `Opening ${args.path}…`,
            complete: ({ args }) => `Opened ${args.path}`,
          },
        },
        open_command_menu: {
          type: "frontend",
          ...browserToolContracts.open_command_menu,
          execute: async () => {
            openSpotlight();
            return { success: true };
          },
          renderText: { running: "Opening command menu…", complete: "Command menu opened" },
        },
        open_media_request_search: {
          type: "frontend",
          ...browserToolContracts.open_media_request_search,
          execute: async () => {
            openMediaRequestSearch();
            return { success: true };
          },
          renderText: { running: "Opening media search…", complete: "Media search opened" },
        },
      }) as Toolkit,
    [router],
  );

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <AssistantTools toolkit={toolkit} />
      {children}
    </AssistantRuntimeProvider>
  );
};

const AssistantTools = ({ toolkit }: { toolkit: Toolkit }) => {
  useAui({ tools: Tools({ toolkit }) });
  return null;
};

export const AssistantProvider = ({ children }: PropsWithChildren) => {
  const t = useScopedI18n("common.assistant");
  const session = useSession();
  const [opened, setOpened] = useState(false);
  const { data, isLoading: isAvailabilityLoading } = clientApi.assistant.getAvailability.useQuery(undefined, {
    enabled: session.status === "authenticated",
    staleTime: 60_000,
  });
  const enabled = Boolean(data?.enabled && session.status === "authenticated");

  const open = useCallback(() => setOpened(true), []);
  const close = useCallback(() => setOpened(false), []);
  const toggle = useCallback(() => setOpened((current) => !current), []);
  const openIfEnabled = useCallback(() => {
    if (enabled) {
      open();
    }
  }, [enabled, open]);
  useHotkeys([[hotkeys.openAssistant, openIfEnabled]]);

  const spotlightItem = useMemo(
    () => ({
      id: "homarr-assistant",
      name: t("spotlight"),
      icon: "/logo/logo.png",
      description: enabled
        ? t("spotlightDescription")
        : session.status !== "authenticated"
          ? t("unavailable.signIn")
          : isAvailabilityLoading
            ? t("unavailable.checking")
            : t("unavailable.notConfigured"),
      unavailable: !enabled,
      interaction: () => (enabled ? { type: "javaScript" as const, onSelect: open } : { type: "none" as const }),
    }),
    [enabled, isAvailabilityLoading, open, session.status, t],
  );
  useRegisterSpotlightContextResults("homarr-assistant", [spotlightItem], [spotlightItem]);
  useRegisterSpotlightContextActions("homarr-assistant", [spotlightItem], [spotlightItem]);

  const value = useMemo(() => ({ enabled, opened, open, close, toggle }), [close, enabled, open, opened, toggle]);

  return (
    <AssistantContext.Provider value={value}>
      {enabled ? (
        <AssistantRuntime>
          {children}
          <AssistantPanel opened={opened} onClose={close} />
        </AssistantRuntime>
      ) : (
        children
      )}
    </AssistantContext.Provider>
  );
};
