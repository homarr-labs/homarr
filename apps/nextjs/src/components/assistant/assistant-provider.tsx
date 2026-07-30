"use client";

import type { PropsWithChildren } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  MessageFormatAdapter,
  RemoteThreadListAdapter,
  ThreadHistoryAdapter,
  ThreadMessage,
  Toolkit,
} from "@assistant-ui/react";
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
import { showErrorNotification, showWarningNotification } from "@homarr/notifications";
import { useScopedI18n } from "@homarr/translation/client";
import {
  openMediaRequestSearch,
  openSpotlight,
  useRegisterSpotlightContextActions,
  useRegisterSpotlightContextResults,
} from "@homarr/spotlight";

import { AssistantPanel } from "./assistant-panel";
import { createAssistantPromptInteraction } from "./assistant-spotlight";
import { browserToolContracts } from "./assistant-tool-contracts";

interface AssistantContextValue {
  enabled: boolean;
  opened: boolean;
  isRunning: boolean;
  unreadCount: number;
  open: () => void;
  close: () => void;
  toggle: () => void;
  sendPrompt: (prompt: string) => void;
}

const AssistantContext = createContext<AssistantContextValue | null>(null);
const ignoreUnsupportedArchiveAction = () => Promise.resolve();

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
        status: "regular",
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
      status: "regular",
      title: thread.title ?? undefined,
      lastMessageAt: thread.updatedAt,
      custom: { modelId: thread.modelId },
    };
  },
  async rename(threadId, title) {
    await fetchApi.assistant.renameThread.mutate({ threadId, title });
  },
  // assistant-ui requires these callbacks even when the product does not expose archiving.
  archive: ignoreUnsupportedArchiveAction,
  unarchive: ignoreUnsupportedArchiveAction,
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

const getMessageText = (message: ThreadMessage | undefined) =>
  message?.content
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n")
    .trim() ?? "";

const getLatestMessage = (messages: readonly ThreadMessage[], role: ThreadMessage["role"]) =>
  messages.findLast((message) => message.role === role);

const getNotificationKey = (message: ThreadMessage | undefined) => {
  if (message?.role !== "assistant") return null;
  if (message.status.type === "running") return null;
  return `${message.id}:${message.status.type}:${"reason" in message.status ? message.status.reason : ""}`;
};

const EnabledAssistantProvider = ({ children }: PropsWithChildren) => {
  const t = useScopedI18n("common.assistant");
  const [opened, setOpened] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const aui = useAui();
  const messages = useAuiState((state) => state.thread.messages);
  const isRunning = useAuiState((state) => state.thread.isRunning);
  const isLoading = useAuiState((state) => state.thread.isLoading);
  const latestAssistantMessage = getLatestMessage(messages, "assistant");
  const latestUserMessage = getLatestMessage(messages, "user");
  const latestAssistantText = getMessageText(latestAssistantMessage);
  const latestUserText = getMessageText(latestUserMessage);
  const latestStatus = latestAssistantMessage?.role === "assistant" ? latestAssistantMessage.status : undefined;
  const notificationKey = getNotificationKey(latestAssistantMessage);
  const initializedRef = useRef(false);
  const lastNotifiedKeyRef = useRef<string | null>(null);

  const markRead = useCallback(() => {
    lastNotifiedKeyRef.current = notificationKey;
    setUnreadCount(0);
  }, [notificationKey]);
  const open = useCallback(() => {
    markRead();
    setOpened(true);
  }, [markRead]);
  const close = useCallback(() => setOpened(false), []);
  const toggle = useCallback(() => {
    setOpened((current) => {
      if (!current) markRead();
      return !current;
    });
  }, [markRead]);
  const sendPrompt = useCallback(
    (prompt: string) => {
      const text = prompt.trim();
      if (text.length === 0) return;
      if (isRunning || latestStatus?.type === "requires-action") {
        showWarningNotification({
          title: t("busy.title"),
          message: t("busy.description"),
        });
        return;
      }
      aui.thread().append({ role: "user", content: [{ type: "text", text }] });
    },
    [aui, isRunning, latestStatus?.type, t],
  );

  useEffect(() => {
    if (isLoading) return;

    if (!initializedRef.current) {
      initializedRef.current = true;
      lastNotifiedKeyRef.current = notificationKey;
      return;
    }

    if (notificationKey === null || notificationKey === lastNotifiedKeyRef.current) return;

    if (opened) {
      lastNotifiedKeyRef.current = notificationKey;
      setUnreadCount(0);
      return;
    }

    lastNotifiedKeyRef.current = notificationKey;
    setUnreadCount((current) => current + 1);
  }, [isLoading, notificationKey, opened]);

  useHotkeys([[hotkeys.openAssistant, open]]);

  const spotlightItem = useMemo(
    () => ({
      id: "homarr-assistant",
      name: t("spotlight"),
      icon: "/logo/logo.png",
      description: t("spotlightDescription"),
      interaction: () => createAssistantPromptInteraction({ sendPrompt }),
    }),
    [sendPrompt, t],
  );
  useRegisterSpotlightContextResults("homarr-assistant", [spotlightItem], [spotlightItem]);
  useRegisterSpotlightContextActions("homarr-assistant", [spotlightItem], [spotlightItem]);

  const value = useMemo(
    () => ({ enabled: true, opened, isRunning, unreadCount, open, close, toggle, sendPrompt }),
    [close, isRunning, open, opened, sendPrompt, toggle, unreadCount],
  );

  return (
    <AssistantContext.Provider value={value}>
      {children}
      <AssistantPanel
        opened={opened}
        onOpen={open}
        onClose={close}
        onMarkRead={markRead}
        isRunning={isRunning}
        unreadCount={unreadCount}
        latestAssistantText={latestAssistantText}
        latestUserText={latestUserText}
        latestStatus={latestStatus}
      />
    </AssistantContext.Provider>
  );
};

interface DisabledAssistantProviderProps extends PropsWithChildren {
  description: string;
}

const DisabledAssistantProvider = ({ children, description }: DisabledAssistantProviderProps) => {
  const t = useScopedI18n("common.assistant");
  const spotlightItem = useMemo(
    () => ({
      id: "homarr-assistant",
      name: t("spotlight"),
      icon: "/logo/logo.png",
      description,
      unavailable: true,
      interaction: () => ({ type: "none" as const }),
    }),
    [description, t],
  );
  useRegisterSpotlightContextResults("homarr-assistant", [spotlightItem], [spotlightItem]);
  useRegisterSpotlightContextActions("homarr-assistant", [spotlightItem], [spotlightItem]);

  const value = useMemo(
    () => ({
      enabled: false,
      opened: false,
      isRunning: false,
      unreadCount: 0,
      open: () => undefined,
      close: () => undefined,
      toggle: () => undefined,
      sendPrompt: () => undefined,
    }),
    [],
  );

  return <AssistantContext.Provider value={value}>{children}</AssistantContext.Provider>;
};

export const AssistantProvider = ({ children }: PropsWithChildren) => {
  const t = useScopedI18n("common.assistant");
  const session = useSession();
  const { data, isLoading, isError } = clientApi.assistant.getAvailability.useQuery(undefined, {
    enabled: session.status === "authenticated",
    staleTime: 60_000,
  });
  const enabled = Boolean(data?.enabled && session.status === "authenticated");

  if (enabled) {
    return (
      <AssistantRuntime>
        <EnabledAssistantProvider>{children}</EnabledAssistantProvider>
      </AssistantRuntime>
    );
  }

  const unavailableDescription =
    session.status !== "authenticated"
      ? t("unavailable.signIn")
      : isLoading
        ? t("unavailable.checking")
        : isError
          ? t("unavailable.error")
          : t("unavailable.notConfigured");

  return <DisabledAssistantProvider description={unavailableDescription}>{children}</DisabledAssistantProvider>;
};
