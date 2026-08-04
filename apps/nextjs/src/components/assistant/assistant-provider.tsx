"use client";

import type { PropsWithChildren } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  AttachmentAdapter,
  MessageFormatAdapter,
  RemoteThreadListAdapter,
  ThreadHistoryAdapter,
  ThreadMessage,
  Toolkit,
} from "@assistant-ui/react";
import { defineToolkit, useAui, useAuiEvent, useAuiState, useRemoteThreadListRuntime } from "@assistant-ui/react";
import { AssistantChatTransport, useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { useHotkeys } from "@mantine/hooks";
import { createAssistantStream } from "assistant-stream";

import { clientApi, fetchApi } from "@homarr/api/client";
import { useSession } from "@homarr/auth/client";
import { createId } from "@homarr/common";
import { hotkeys } from "@homarr/definitions";
import { showErrorNotification, showWarningNotification } from "@homarr/notifications";
import { useScopedI18n } from "@homarr/translation/client";
import {
  closeSpotlight,
  openMediaRequestSearch,
  openSpotlight,
  useRegisterSpotlightContextResults,
} from "@homarr/spotlight";
import { AssistantWidgetRendererProvider } from "@homarr/widgets";

import { shouldAutomaticallyContinueAssistant } from "./assistant-auto-submit";
import { AssistantAutoApprovalProvider } from "./assistant-auto-approval";
import { createAssistantBrowserToolExecutors } from "./assistant-browser-tool-executors";
import { AssistantAskUserTool, AssistantConfigureAppTool } from "./assistant-human-tools";
import { AssistantPanel } from "./assistant-panel";
import { getPendingAssistantAction } from "./assistant-pending-action";
import type { AssistantReasoningMode, AssistantRuntimeModelOption } from "./assistant-preferences";
import { resolveAssistantPreferenceModelId, resolveAssistantThreadPreferenceModelId } from "./assistant-preferences";
import { AssistantRuntimeProviderWithTools } from "./assistant-runtime-provider";
import { sendAssistantPrompt as sendPromptThroughRuntime } from "./assistant-send";
import { createAssistantPromptInteraction } from "./assistant-spotlight";
import { browserToolContracts } from "./assistant-tool-contracts";
import { AssistantConfigureBoardSettingsTool } from "./assistant-board-settings-tool";
import { AssistantConfigureWidgetTool } from "./assistant-widget-tool";
import type { AssistantUIMessage } from "./assistant-message-metadata";
import {
  getSuccessfulApprovedAssistantMutationIds,
  updateAssistantMutationRefreshState,
} from "./assistant-mutation-refresh";
import { initialAssistantNotificationState, updateAssistantNotificationState } from "./assistant-notifications";
import { AssistantViewRefreshProvider, useAssistantViewRefresh } from "./assistant-view-refresh";
import { AssistantBoardWidget } from "./assistant-widget";

interface AssistantContextValue {
  enabled: boolean;
  unavailableDescription: string | null;
  opened: boolean;
  isRunning: boolean;
  isRefreshing: boolean;
  unreadCount: number;
  open: () => void;
  close: () => void;
  toggle: () => void;
  sendPrompt: (prompt: string) => boolean;
  refreshCurrentView: () => Promise<void>;
}

const AssistantContext = createContext<AssistantContextValue | null>(null);
interface AssistantPreferencesContextValue {
  defaultModelId: string | null;
  modelId: string | null;
  models: AssistantRuntimeModelOption[];
  reasoning: AssistantReasoningMode;
  isLoading: boolean;
  setModelId: (modelId: string) => void;
  setReasoning: (reasoning: AssistantReasoningMode) => void;
  getRequestBody: () => { modelId?: string; reasoning: AssistantReasoningMode };
}

const AssistantPreferencesContext = createContext<AssistantPreferencesContextValue | null>(null);
const ignoreUnsupportedArchiveAction = () => Promise.resolve();
const assistantImageAttachmentTypes = ["image/gif", "image/jpeg", "image/png", "image/webp"];
const assistantDocumentAttachmentTypes = [
  "application/json",
  "text/csv",
  "text/html",
  "text/markdown",
  "text/plain",
  "text/xml",
];

const fileToDataUrlAsync = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result)), { once: true });
    reader.addEventListener("error", () => reject(new Error("The attachment could not be read.")), { once: true });
    reader.readAsDataURL(file);
  });

const createAssistantAttachmentAdapter = (allowImages: boolean): AttachmentAdapter => {
  const pendingAttachmentIds = new Set<string>();

  return {
    accept: [...(allowImages ? assistantImageAttachmentTypes : []), ...assistantDocumentAttachmentTypes].join(","),
    async add({ file }) {
      if (pendingAttachmentIds.size >= 5) {
        throw new Error("A message can include up to 5 attachments.");
      }
      const isImage = file.type.startsWith("image/");
      if (isImage && !allowImages) {
        throw new Error("The selected model does not support image input.");
      }
      if (
        (!isImage && !assistantDocumentAttachmentTypes.includes(file.type)) ||
        (isImage && !assistantImageAttachmentTypes.includes(file.type))
      ) {
        throw new Error("This file type is not supported.");
      }
      const sizeLimit = isImage ? 1_000_000 : 350_000;
      if (file.size === 0) throw new Error("Empty files cannot be attached.");
      if (file.size > sizeLimit) {
        throw new Error(isImage ? "Images must be smaller than 1 MB." : "Documents must be smaller than 350 KB.");
      }
      const id = createId();
      pendingAttachmentIds.add(id);
      return {
        id,
        type: isImage ? "image" : "document",
        name: file.name,
        file,
        contentType: file.type,
        status: { type: "requires-action", reason: "composer-send" },
      };
    },
    async send(attachment) {
      try {
        return {
          ...attachment,
          status: { type: "complete" },
          content: [
            {
              type: "file",
              filename: attachment.name,
              mimeType: attachment.contentType ?? "application/octet-stream",
              data: await fileToDataUrlAsync(attachment.file),
            },
          ],
        };
      } finally {
        pendingAttachmentIds.delete(attachment.id);
      }
    },
    async remove(attachment) {
      pendingAttachmentIds.delete(attachment.id);
    },
  };
};

export const useHomarrAssistant = () => {
  const value = useContext(AssistantContext);
  if (!value) {
    throw new Error("useHomarrAssistant must be used within AssistantProvider");
  }
  return value;
};

export const useOptionalHomarrAssistant = () => useContext(AssistantContext);

export const useAssistantPreferences = () => {
  const value = useContext(AssistantPreferencesContext);
  if (!value) throw new Error("useAssistantPreferences must be used within AssistantPreferencesProvider");
  return value;
};

const AssistantPreferencesProvider = ({ children }: PropsWithChildren) => {
  const { data, isLoading } = clientApi.assistant.getRuntimeOptions.useQuery(undefined, {
    staleTime: 10 * 60_000,
  });
  const [modelId, setModelIdState] = useState<string | null>(null);
  const [reasoning, setReasoningState] = useState<AssistantReasoningMode>("auto");
  const previousDefaultModelIdRef = useRef<string | null | undefined>(undefined);
  const preferencesRef = useRef<{ modelId: string | null; reasoning: AssistantReasoningMode }>({
    modelId: null,
    reasoning: "auto",
  });
  const models = useMemo<AssistantRuntimeModelOption[]>(
    () =>
      data?.models.map(({ id, name, description, contextLength, promptPrice, completionPrice, inputModalities }) => ({
        id,
        name,
        description,
        contextLength,
        promptPrice,
        completionPrice,
        inputModalities,
      })) ?? [],
    [data?.models],
  );

  const setModelId = useCallback((nextModelId: string) => {
    preferencesRef.current.modelId = nextModelId;
    setModelIdState(nextModelId);
  }, []);
  const setReasoning = useCallback((nextReasoning: AssistantReasoningMode) => {
    preferencesRef.current.reasoning = nextReasoning;
    setReasoningState(nextReasoning);
  }, []);
  const getRequestBody = useCallback(() => {
    const current = preferencesRef.current;
    return {
      ...(current.modelId ? { modelId: current.modelId } : {}),
      reasoning: current.reasoning,
    };
  }, []);

  useEffect(() => {
    if (!data) return;
    const nextModelId = resolveAssistantPreferenceModelId({
      currentModelId: preferencesRef.current.modelId,
      previousDefaultModelId: previousDefaultModelIdRef.current,
      defaultModelId: data.defaultModelId,
      models: data.models,
    });
    previousDefaultModelIdRef.current = data.defaultModelId;
    if (nextModelId === preferencesRef.current.modelId) return;
    preferencesRef.current.modelId = nextModelId;
    setModelIdState(nextModelId);
  }, [data]);

  const value = useMemo(
    () => ({
      defaultModelId: data?.defaultModelId ?? null,
      modelId,
      models,
      reasoning,
      isLoading,
      setModelId,
      setReasoning,
      getRequestBody,
    }),
    [data?.defaultModelId, getRequestBody, isLoading, modelId, models, reasoning, setModelId, setReasoning],
  );

  return <AssistantPreferencesContext.Provider value={value}>{children}</AssistantPreferencesContext.Provider>;
};

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
  async updateCustom(threadId, custom) {
    const modelId = custom?.modelId;
    if (typeof modelId !== "string") return;
    await fetchApi.assistant.updateThreadModel.mutate({ threadId, modelId });
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
  const preferences = useAssistantPreferences();
  const transport = useMemo(
    () =>
      new AssistantChatTransport({
        api: "/api/assistant/chat",
        body: preferences.getRequestBody,
      }),
    [preferences.getRequestBody],
  );
  const history = useMemo(() => createHistoryAdapter(threadId), [threadId]);
  const selectedModel = preferences.models.find((model) => model.id === preferences.modelId);
  const attachments = useMemo(
    () =>
      createAssistantAttachmentAdapter(
        selectedModel === undefined ||
          selectedModel.inputModalities.length === 0 ||
          selectedModel.inputModalities.includes("image"),
      ),
    [selectedModel],
  );
  const feedback = useMemo(
    () => ({
      submit: ({ message, type }: { message: ThreadMessage; type: "positive" | "negative" }) => {
        if (!threadId) return;
        void fetchApi.assistant.submitFeedback
          .mutate({ threadId, messageId: message.id, type })
          .catch(() => showErrorNotification({ title: t("responseError.title"), message: t("feedbackError") }));
      },
    }),
    [t, threadId],
  );
  const onError = useCallback(
    () =>
      showErrorNotification({
        title: t("responseError.title"),
        message: t("responseError.description"),
        autoClose: 10_000,
      }),
    [t],
  );

  return useChatRuntime<AssistantUIMessage>({
    transport,
    onError,
    sendAutomaticallyWhen: shouldAutomaticallyContinueAssistant,
    adapters: {
      history,
      attachments,
      feedback,
    },
  });
};

const AssistantRuntime = ({ children }: PropsWithChildren) => {
  const router = useRouter();
  const { refreshCurrentView } = useAssistantViewRefresh();
  const runtime = useRemoteThreadListRuntime({
    adapter: threadAdapter,
    runtimeHook: AssistantThreadRuntime,
  });
  const browserToolExecutors = useMemo(
    () =>
      createAssistantBrowserToolExecutors({
        getOrigin: () => window.location.origin,
        navigate: (path) => router.push(path),
        openCommandMenu: openSpotlight,
        openMediaRequestSearch,
        refreshCurrentView,
      }),
    [refreshCurrentView, router],
  );

  const toolkit = useMemo(
    () =>
      defineToolkit({
        ask_user: {
          type: "human",
          display: "standalone",
          ...browserToolContracts.ask_user,
          render: AssistantAskUserTool,
        },
        configure_app: {
          type: "human",
          display: "standalone",
          ...browserToolContracts.configure_app,
          render: AssistantConfigureAppTool,
        },
        configure_board_settings: {
          type: "human",
          display: "standalone",
          ...browserToolContracts.configure_board_settings,
          render: AssistantConfigureBoardSettingsTool,
        },
        configure_widget: {
          type: "human",
          display: "standalone",
          ...browserToolContracts.configure_widget,
          render: AssistantConfigureWidgetTool,
        },
        navigate_to_route: {
          type: "frontend",
          ...browserToolContracts.navigate_to_route,
          execute: browserToolExecutors.navigate_to_route,
          renderText: {
            running: ({ args }) => `Opening ${args.path}…`,
            complete: ({ args }) => `Opened ${args.path}`,
          },
        },
        open_command_menu: {
          type: "frontend",
          ...browserToolContracts.open_command_menu,
          execute: browserToolExecutors.open_command_menu,
          renderText: { running: "Opening command menu…", complete: "Command menu opened" },
        },
        open_media_request_search: {
          type: "frontend",
          ...browserToolContracts.open_media_request_search,
          execute: browserToolExecutors.open_media_request_search,
          renderText: { running: "Opening media search…", complete: "Media search opened" },
        },
        refresh_current_view: {
          type: "frontend",
          ...browserToolContracts.refresh_current_view,
          execute: browserToolExecutors.refresh_current_view,
          renderText: { running: "Refreshing current view…", complete: "Current view refreshed" },
        },
      }) as Toolkit,
    [browserToolExecutors],
  );
  return (
    <AssistantRuntimeProviderWithTools runtime={runtime} toolkit={toolkit}>
      <AssistantRuntimeEvents />
      <AssistantPreferenceSync />
      {children}
    </AssistantRuntimeProviderWithTools>
  );
};

const AssistantPreferenceSync = () => {
  const preferences = useAssistantPreferences();
  // The local id distinguishes every thread immediately, including threads that do not have a remote id yet.
  const conversationId = useAuiState((state) => state.threadListItem.id);
  const remoteId = useAuiState((state) => state.threadListItem.remoteId);
  const threadCustom = useAuiState((state) => state.threadListItem.custom);
  const threadModelId = threadCustom?.modelId;
  const previousSyncKeyRef = useRef<string | null>(null);
  const modelCatalogKey = preferences.models.map((model) => model.id).join("\0");

  useEffect(() => {
    if (preferences.models.length === 0) return;
    const syncKey = `${conversationId}:${modelCatalogKey}`;
    if (previousSyncKeyRef.current === syncKey) return;
    const nextModelId = resolveAssistantThreadPreferenceModelId({
      isRemote: remoteId !== undefined,
      metadataLoaded: threadCustom !== undefined,
      threadModelId,
      defaultModelId: preferences.defaultModelId,
      models: preferences.models,
    });
    if (nextModelId === undefined) return;
    previousSyncKeyRef.current = syncKey;
    if (nextModelId) preferences.setModelId(nextModelId);
  }, [conversationId, modelCatalogKey, preferences, remoteId, threadCustom, threadModelId]);

  return null;
};

const AssistantRuntimeEvents = () => {
  const t = useScopedI18n("common.assistant");
  useAuiEvent("composer.attachmentAddError", ({ message }) => {
    showErrorNotification({
      title: t("attachments.errorTitle"),
      message,
    });
  });
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
  const [activityDismissed, setActivityDismissed] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [queuedPrompt, setQueuedPrompt] = useState<string | null>(null);
  const aui = useAui();
  const preferences = useAssistantPreferences();
  const { isRefreshing, refreshCurrentView } = useAssistantViewRefresh();
  const messages = useAuiState((state) => state.thread.messages);
  // The local id is stable while a new thread is initialized and changes for every real thread switch.
  const conversationId = useAuiState((state) => state.threadListItem.id);
  const isRunning = useAuiState((state) => state.thread.isRunning);
  const isLoading = useAuiState((state) => state.thread.isLoading);
  const latestAssistantMessage = getLatestMessage(messages, "assistant");
  const latestUserMessage = getLatestMessage(messages, "user");
  const latestAssistantText = getMessageText(latestAssistantMessage);
  const latestUserText = getMessageText(latestUserMessage);
  const latestStatus = latestAssistantMessage?.role === "assistant" ? latestAssistantMessage.status : undefined;
  const pendingAction = getPendingAssistantAction(latestAssistantMessage);
  const assistantIsRunning = isRunning || queuedPrompt !== null;
  const notificationKey = getNotificationKey(latestAssistantMessage);
  const notificationStateRef = useRef(initialAssistantNotificationState);
  const mutationRefreshStateRef = useRef<{ conversationId: string | null; toolCallIds: Set<string> }>({
    conversationId: null,
    toolCallIds: new Set(),
  });
  const successfulMutationIds = useMemo(() => getSuccessfulApprovedAssistantMutationIds(messages), [messages]);

  const markRead = useCallback(() => {
    notificationStateRef.current = {
      initialized: true,
      conversationId,
      notificationKey,
    };
    setUnreadCount(0);
  }, [conversationId, notificationKey]);
  const open = useCallback(() => {
    markRead();
    setActivityDismissed(false);
    setOpened(true);
  }, [markRead]);
  const close = useCallback(() => setOpened(false), []);
  const toggle = useCallback(() => {
    if (opened) close();
    else open();
  }, [close, open, opened]);
  const sendPrompt = useCallback(
    (prompt: string) => {
      const text = prompt.trim();
      if (text.length === 0) return false;
      if (assistantIsRunning || latestStatus?.type === "requires-action") {
        showWarningNotification({
          title: t("busy.title"),
          message: t("busy.description"),
        });
        return false;
      }
      setActivityDismissed(false);
      if (isLoading) {
        setQueuedPrompt(text);
        return true;
      }
      return sendPromptThroughRuntime(aui, text);
    },
    [assistantIsRunning, aui, isLoading, latestStatus?.type, t],
  );
  const selectModel = useCallback(
    (modelId: string) => {
      preferences.setModelId(modelId);
      const threadListItem = aui.threadListItem();
      if (!threadListItem.getState().remoteId) return;
      threadListItem.updateCustom({ ...threadListItem.getState().custom, modelId });
    },
    [aui, preferences],
  );

  useEffect(() => {
    if (assistantIsRunning) setActivityDismissed(false);
  }, [assistantIsRunning]);

  useEffect(() => {
    if (isLoading || isRunning || queuedPrompt === null) return;
    const prompt = queuedPrompt;
    setQueuedPrompt(null);
    sendPromptThroughRuntime(aui, prompt);
  }, [aui, isLoading, isRunning, queuedPrompt]);

  useEffect(() => {
    if (isLoading) return;
    const update = updateAssistantNotificationState(notificationStateRef.current, {
      conversationId,
      notificationKey,
    });
    notificationStateRef.current = update.state;
    if (!update.shouldNotify) return;
    setActivityDismissed(false);

    if (opened) {
      setUnreadCount(0);
      return;
    }

    setUnreadCount((current) => current + 1);
  }, [conversationId, isLoading, notificationKey, opened]);

  useEffect(() => {
    if (isLoading) return;

    const update = updateAssistantMutationRefreshState(
      mutationRefreshStateRef.current,
      conversationId,
      successfulMutationIds,
    );
    mutationRefreshStateRef.current = update.state;
    if (!update.shouldRefresh) return;

    void refreshCurrentView().catch(() => {
      showWarningNotification({
        title: t("refresh.failedTitle"),
        message: t("refresh.failedDescription"),
      });
    });
  }, [conversationId, isLoading, refreshCurrentView, successfulMutationIds, t]);

  useHotkeys([[hotkeys.openAssistant, open, { preventDefault: true }]]);

  const spotlightItem = useMemo(() => {
    const canSend = !assistantIsRunning && latestStatus?.type !== "requires-action";
    return {
      id: "homarr-assistant",
      name: t("spotlight"),
      icon: "/logo/logo.png",
      description: canSend ? t("spotlightDescription") : t("busy.description"),
      unavailable: !canSend,
      alwaysVisible: true,
      interaction: (query: string) =>
        createAssistantPromptInteraction({
          sendPrompt,
          onPromptAccepted: closeSpotlight,
          prompt: query,
          canSend,
        }),
    };
  }, [assistantIsRunning, latestStatus?.type, sendPrompt, t]);
  useRegisterSpotlightContextResults("homarr-assistant", [spotlightItem], [spotlightItem]);

  const value = useMemo(
    () => ({
      enabled: true,
      unavailableDescription: null,
      opened,
      isRunning: assistantIsRunning,
      isRefreshing,
      unreadCount,
      open,
      close,
      toggle,
      sendPrompt,
      refreshCurrentView,
    }),
    [assistantIsRunning, close, isRefreshing, open, opened, refreshCurrentView, sendPrompt, toggle, unreadCount],
  );

  return (
    <AssistantAutoApprovalProvider conversationId={conversationId}>
      <AssistantContext.Provider value={value}>
        <AssistantWidgetRendererProvider renderer={AssistantBoardWidget}>{children}</AssistantWidgetRendererProvider>
        <AssistantPanel
          opened={opened}
          onOpen={open}
          onClose={close}
          onDismissActivity={() => {
            markRead();
            setActivityDismissed(true);
          }}
          activityDismissed={activityDismissed}
          isRunning={assistantIsRunning}
          unreadCount={unreadCount}
          latestAssistantText={latestAssistantText}
          latestUserText={queuedPrompt ?? latestUserText}
          latestStatus={latestStatus}
          pendingAction={pendingAction}
          modelId={preferences.modelId}
          models={preferences.models}
          modelOptionsLoading={preferences.isLoading}
          reasoning={preferences.reasoning}
          isRefreshing={isRefreshing}
          onRefresh={refreshCurrentView}
          onModelChange={selectModel}
          onReasoningChange={preferences.setReasoning}
        />
      </AssistantContext.Provider>
    </AssistantAutoApprovalProvider>
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
      alwaysVisible: true,
      interaction: (_query: string) => ({ type: "none" as const }),
    }),
    [description, t],
  );
  useRegisterSpotlightContextResults("homarr-assistant", [spotlightItem], [spotlightItem]);

  const value = useMemo(
    () => ({
      enabled: false,
      unavailableDescription: description,
      opened: false,
      isRunning: false,
      isRefreshing: false,
      unreadCount: 0,
      open: () => undefined,
      close: () => undefined,
      toggle: () => undefined,
      sendPrompt: () => false,
      refreshCurrentView: () => Promise.resolve(),
    }),
    [description],
  );

  return (
    <AssistantContext.Provider value={value}>
      <AssistantWidgetRendererProvider renderer={AssistantBoardWidget}>{children}</AssistantWidgetRendererProvider>
    </AssistantContext.Provider>
  );
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
      <AssistantPreferencesProvider>
        <AssistantViewRefreshProvider>
          <AssistantRuntime>
            <EnabledAssistantProvider>{children}</EnabledAssistantProvider>
          </AssistantRuntime>
        </AssistantViewRefreshProvider>
      </AssistantPreferencesProvider>
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
