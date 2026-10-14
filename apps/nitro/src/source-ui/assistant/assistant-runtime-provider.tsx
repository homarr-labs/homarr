import type { ClipboardEvent, PropsWithChildren } from "react";
import { createContext, useCallback, useContext, useEffect, useId, useLayoutEffect, useMemo, useRef } from "react";
import type { AssistantRuntime, AttachmentAdapter, ThreadListRuntime, Toolkit } from "@assistant-ui/react";
import { AssistantRuntimeProvider, INTERNAL, Tools, useAui, useAuiEvent, useAuiState } from "@assistant-ui/react";

import { useAssistantNotifications, useAssistantSourceAction, useAssistantSourceBindings } from "./bindings";
import type { AssistantSourceReadOwner } from "./bindings";
import { useI18n } from "./bindings";

interface AssistantRuntimeProviderWithToolsProps extends PropsWithChildren {
  runtime: AssistantRuntime;
  toolkit: Toolkit;
}

export const AssistantRuntimeProviderWithTools = ({
  children,
  runtime,
  toolkit,
}: AssistantRuntimeProviderWithToolsProps) => {
  const toolsAui = useAui({ tools: Tools({ toolkit }) });
  const registry = useMemo<AssistantSurfaceRegistry>(
    () => ({
      runtime,
      elements: new Map<string, HTMLElement>(),
      lastFocusedElement: null,
      lastFocusedAt: 0,
      generation: 0,
    }),
    [runtime],
  );
  useLayoutEffect(() => {
    registry.generation += 1;
    return () => {
      registry.generation += 1;
      registry.elements.clear();
      registry.lastFocusedElement = null;
      registry.lastFocusedAt = 0;
    };
  }, [registry]);
  return (
    <AssistantSurfaceRegistryContext.Provider value={registry}>
      <AssistantRuntimeProvider aui={toolsAui} runtime={runtime}>
        {children}
      </AssistantRuntimeProvider>
    </AssistantSurfaceRegistryContext.Provider>
  );
};

type ThreadCore = INTERNAL.ThreadRuntimeCore;
type ThreadCoreWithAdapters = ConstructorParameters<typeof INTERNAL.DefaultThreadComposerRuntimeCore>[0];
type ComposerConnectionDisposer = () => void;

export const assistantSurfaceComposerCacheLimit = 12;
const assistantSurfaceAttachmentLimit = 5;
const composerConnectionDisposers = new WeakMap<object, ComposerConnectionDisposer>();

class AssistantSurfaceComposerRuntimeCore extends INTERNAL.DefaultThreadComposerRuntimeCore {
  public override connect() {
    const dispose = super.connect();
    composerConnectionDisposers.set(this, dispose);
    return dispose;
  }

  public dispose() {
    composerConnectionDisposers.get(this)?.();
    composerConnectionDisposers.delete(this);
  }
}

interface AssistantSurfaceRuntime extends AssistantRuntime {
  dispose(): void;
}

interface AssistantSurfaceComposerEntry {
  composer: AssistantSurfaceComposerRuntimeCore;
  source: ThreadCore;
}

const getThreadAdapters = (threadCore: ThreadCore) => {
  const host: ThreadCoreWithAdapters = threadCore;
  return host.adapters;
};

const bindRuntimeValue = (target: object, property: PropertyKey, cache: WeakMap<object, Map<PropertyKey, unknown>>) => {
  const value: unknown = Reflect.get(target, property, target);
  if (typeof value !== "function") return value;

  let targetCache = cache.get(target);
  if (!targetCache) {
    targetCache = new Map();
    cache.set(target, targetCache);
  }
  const cached = targetCache.get(property);
  if (cached) return cached;
  const bound: unknown = value.bind(target);
  targetCache.set(property, bound);
  return bound;
};

const createSurfaceAttachmentAdapter = (threadCore: ThreadCore): AttachmentAdapter => {
  const pendingAttachmentIds = new Set<string>();
  let pendingAdds = 0;
  const getAdapter = () => {
    const adapter = getThreadAdapters(threadCore)?.attachments;
    if (!adapter) throw new Error("Attachments are not supported");
    return adapter;
  };

  return {
    get accept() {
      return getThreadAdapters(threadCore)?.attachments?.accept ?? "";
    },
    add({ file }) {
      if (pendingAttachmentIds.size + pendingAdds >= assistantSurfaceAttachmentLimit) {
        throw new Error(`A message can include up to ${assistantSurfaceAttachmentLimit} attachments.`);
      }

      pendingAdds += 1;
      let result: ReturnType<AttachmentAdapter["add"]>;
      try {
        result = getAdapter().add({ file });
      } catch (error) {
        pendingAdds -= 1;
        throw error;
      }

      if (Symbol.asyncIterator in result) {
        return (async function* () {
          let reservationPending = true;
          try {
            for await (const attachment of result) {
              if (reservationPending) {
                reservationPending = false;
                pendingAdds -= 1;
              }
              pendingAttachmentIds.add(attachment.id);
              yield attachment;
            }
          } finally {
            if (reservationPending) pendingAdds -= 1;
          }
        })();
      }

      return result.then(
        (attachment) => {
          pendingAdds -= 1;
          pendingAttachmentIds.add(attachment.id);
          return attachment;
        },
        (error: unknown) => {
          pendingAdds -= 1;
          throw error;
        },
      );
    },
    async remove(attachment) {
      try {
        await getAdapter().remove(attachment);
      } finally {
        pendingAttachmentIds.delete(attachment.id);
      }
    },
    async send(attachment) {
      try {
        return await getAdapter().send(attachment);
      } finally {
        pendingAttachmentIds.delete(attachment.id);
      }
    },
  };
};

const createSurfaceComposerHost = (
  threadCore: ThreadCore,
  boundRuntimeValues: WeakMap<object, Map<PropertyKey, unknown>>,
) => {
  const attachments = createSurfaceAttachmentAdapter(threadCore);
  const adapters = {
    get attachments() {
      return getThreadAdapters(threadCore)?.attachments ? attachments : undefined;
    },
  };

  const host: ThreadCoreWithAdapters = threadCore;
  return new Proxy(host, {
    get(target, property) {
      if (property === "adapters") return adapters;
      return bindRuntimeValue(target, property, boundRuntimeValues);
    },
  });
};

export const createAssistantSurfaceRuntime = (runtime: AssistantRuntime): AssistantSurfaceRuntime => {
  const sharedThread = runtime.thread;
  if (!(sharedThread instanceof INTERNAL.ThreadRuntimeImpl)) throw new Error("Unsupported Assistant thread runtime");
  const sharedBinding = sharedThread["__internal_threadBinding"];
  const composerByConversation = new Map<string, AssistantSurfaceComposerEntry>();
  const surfaceCoreByConversation = new Map<string, { source: ThreadCore; surface: ThreadCore }>();
  const activeConversationCounts = new Map<string, number>();
  const boundRuntimeValues = new WeakMap<object, Map<PropertyKey, unknown>>();

  const disposeComposer = (conversationId: string, entry: AssistantSurfaceComposerEntry) => {
    const reset = entry.composer.reset();
    entry.composer.dispose();
    composerByConversation.delete(conversationId);
    surfaceCoreByConversation.delete(conversationId);
    void reset.catch(() => {});
  };

  const evictInactiveComposers = () => {
    while (composerByConversation.size > assistantSurfaceComposerCacheLimit) {
      let candidate: [string, AssistantSurfaceComposerEntry] | undefined;
      for (const entry of composerByConversation) {
        if (!activeConversationCounts.has(entry[0])) {
          candidate = entry;
          break;
        }
      }
      if (!candidate) return;
      disposeComposer(candidate[0], candidate[1]);
    }
  };

  const retainConversation = (conversationId: string) => {
    activeConversationCounts.set(conversationId, (activeConversationCounts.get(conversationId) ?? 0) + 1);
  };

  const releaseConversation = (conversationId: string) => {
    const count = activeConversationCounts.get(conversationId);
    if (count === undefined) return;
    if (count <= 1) activeConversationCounts.delete(conversationId);
    else activeConversationCounts.set(conversationId, count - 1);
    evictInactiveComposers();
  };

  const getComposer = (conversationId: string, threadCore: ThreadCore) => {
    const existing = composerByConversation.get(conversationId);
    if (existing?.source === threadCore) {
      composerByConversation.delete(conversationId);
      composerByConversation.set(conversationId, existing);
      return existing.composer;
    }
    const draft = existing
      ? {
          attachments: existing.composer.attachments,
          quote: existing.composer.quote,
          role: existing.composer.role,
          runConfig: existing.composer.runConfig,
          text: existing.composer.text,
        }
      : undefined;
    if (existing) disposeComposer(conversationId, existing);

    const host = createSurfaceComposerHost(threadCore, boundRuntimeValues);
    const composer = new AssistantSurfaceComposerRuntimeCore(host);
    composerByConversation.set(conversationId, { composer, source: threadCore });
    if (draft) {
      composer.setText(draft.text);
      composer.setRole(draft.role);
      composer.setRunConfig(draft.runConfig);
      composer.setQuote(draft.quote);
      for (const attachment of draft.attachments) {
        if (attachment.status.type === "complete" && attachment.content) {
          void composer
            .addAttachment({
              id: attachment.id,
              type: attachment.type,
              name: attachment.name,
              contentType: attachment.contentType,
              content: attachment.content,
            })
            .catch(() => {});
        } else if (attachment.file) {
          void composer.addAttachment(attachment.file).catch(() => {});
        }
      }
    }
    evictInactiveComposers();
    return composer;
  };

  const getSurfaceCore = (conversationId: string, threadCore: ThreadCore) => {
    const existing = surfaceCoreByConversation.get(conversationId);
    if (existing?.source === threadCore) return existing.surface;

    const composer = getComposer(conversationId, threadCore);
    const surfaceCore = new Proxy(threadCore, {
      get(target, property) {
        if (property === "composer") return composer;
        return bindRuntimeValue(target, property, boundRuntimeValues);
      },
    });
    surfaceCoreByConversation.set(conversationId, { source: threadCore, surface: surfaceCore });
    return surfaceCore;
  };

  const getConversationId = () => runtime.threads.mainItem.getState().id;

  const surfaceBinding: INTERNAL.ThreadRuntimeCoreBinding = {
    path: sharedBinding.path,
    getState: () => getSurfaceCore(getConversationId(), sharedBinding.getState()),
    outerSubscribe: (callback) => sharedBinding.outerSubscribe(callback),
    subscribe(callback) {
      let activeCore = sharedBinding.getState();
      let activeConversationId = getConversationId();
      let activeComposer = getComposer(activeConversationId, activeCore);
      retainConversation(activeConversationId);
      let unsubscribeComposer = activeComposer.subscribe(callback);
      const handleSharedUpdate = () => {
        const nextCore = sharedBinding.getState();
        const nextConversationId = getConversationId();
        if (nextCore !== activeCore || nextConversationId !== activeConversationId) {
          if (activeCore.speech !== undefined) activeCore.stopSpeaking();
          unsubscribeComposer();
          releaseConversation(activeConversationId);
          activeCore = nextCore;
          activeConversationId = nextConversationId;
          retainConversation(activeConversationId);
          activeComposer = getComposer(activeConversationId, activeCore);
          unsubscribeComposer = activeComposer.subscribe(callback);
        }
        callback();
      };
      const unsubscribeThread = sharedBinding.subscribe(handleSharedUpdate);
      const unsubscribeThreadItem = runtime.threads.mainItem.subscribe(handleSharedUpdate);
      return () => {
        unsubscribeComposer();
        releaseConversation(activeConversationId);
        unsubscribeThread();
        unsubscribeThreadItem();
      };
    },
  };

  const sharedMainItem = runtime.threads.mainItem;
  const mainItemBinding: INTERNAL.ThreadListItemRuntimeBinding = {
    path: sharedMainItem.path,
    getState: () => sharedMainItem.getState(),
    subscribe: (callback) => sharedMainItem.subscribe(callback),
  };
  const surfaceThread = new INTERNAL.ThreadRuntimeImpl(surfaceBinding, mainItemBinding);
  const sharedThreads = runtime.threads;
  const getSurfaceThreadById = (threadId: string) => {
    const requestedItem = sharedThreads.getItemById(threadId).getState();
    if (requestedItem.id === sharedMainItem.getState().id) return surfaceThread;
    return sharedThreads.getById(threadId);
  };
  const surfaceThreads: ThreadListRuntime = {
    main: surfaceThread,
    mainItem: sharedMainItem,
    getState: () => sharedThreads.getState(),
    subscribe: (callback) => sharedThreads.subscribe(callback),
    getById: getSurfaceThreadById,
    getItemById: (threadId) => sharedThreads.getItemById(threadId),
    getItemByIndex: (index) => sharedThreads.getItemByIndex(index),
    getArchivedItemByIndex: (index) => sharedThreads.getArchivedItemByIndex(index),
    switchToThread: (threadId, options) => sharedThreads.switchToThread(threadId, options),
    switchToNewThread: () => sharedThreads.switchToNewThread(),
    getLoadThreadsPromise: () => sharedThreads.getLoadThreadsPromise(),
    reload: () => sharedThreads.reload(),
    reloadMainThread: () => sharedThreads.reloadMainThread(),
    loadMore: () => sharedThreads.loadMore(),
  };

  return {
    threads: surfaceThreads,
    thread: surfaceThread,
    registerModelContextProvider: () => () => {},
    dispose() {
      activeConversationCounts.clear();
      const threadCores = new Set([
        ...Array.from(surfaceCoreByConversation.values(), (entry) => entry.source),
        ...Array.from(composerByConversation.values(), (entry) => entry.source),
      ]);
      for (const threadCore of threadCores) {
        if (threadCore.speech !== undefined) threadCore.stopSpeaking();
      }
      for (const [conversationId, entry] of composerByConversation) disposeComposer(conversationId, entry);
    },
  };
};

interface AssistantComposerSurfaceValue {
  id: string;
  isCurrent: () => boolean;
}

const AssistantComposerSurfaceContext = createContext<AssistantComposerSurfaceValue | null>(null);

export const useAssistantComposerSurface = () => {
  const value = useContext(AssistantComposerSurfaceContext);
  if (!value) throw new Error("useAssistantComposerSurface must be used within AssistantComposerSurfaceBoundary");
  return value;
};

interface AssistantSurfaceRegistry {
  runtime: AssistantRuntime;
  elements: Map<string, HTMLElement>;
  lastFocusedElement: HTMLElement | null;
  lastFocusedAt: number;
  generation: number;
}

const AssistantSurfaceRegistryContext = createContext<AssistantSurfaceRegistry | null>(null);

const useAssistantSurfaceRegistry = () => {
  const registry = useContext(AssistantSurfaceRegistryContext);
  if (!registry) throw new Error("AssistantRuntimeProviderWithTools is required for surface ownership");
  return registry;
};

export const useAssistantToolReadOwner = (toolCallId: string): AssistantSourceReadOwner => {
  const bindings = useAssistantSourceBindings();
  const conversationId = useAuiState((state) => state.threadListItem.id);
  return useMemo(
    () => ({ scopeKey: bindings.scope.key, conversationId, toolCallId }),
    [bindings.scope.key, conversationId, toolCallId],
  );
};

export const useAssistantToolOwnerLease = ({
  toolCallId,
  args,
  evidence,
  ready,
}: {
  toolCallId: string;
  args: unknown;
  evidence: unknown;
  ready: boolean;
}) => {
  const aui = useAui();
  const bindings = useAssistantSourceBindings();
  const surface = useContext(AssistantComposerSurfaceContext);
  const conversationId = useAuiState((state) => state.threadListItem.id);
  const messageId = useAuiState((state) => state.message.id);
  const runtime = aui.threads()["__internal_getAssistantRuntime"]?.();
  const hasCurrentTool = useCallback(() => {
    if (!runtime || !ready || bindings.scope.signal.aborted) return false;
    if (runtime.threads.mainItem.getState().id !== conversationId) return false;
    const message = runtime.thread.getState().messages.find((candidate) => candidate.id === messageId);
    if (message?.role !== "assistant" || message.status?.type === "incomplete") return false;
    return message.content.some(
      (part) =>
        part.type === "tool-call" &&
        part.toolCallId === toolCallId &&
        part.args === args &&
        part.result === undefined &&
        !part.isError,
    );
  }, [args, bindings.scope.signal, conversationId, messageId, ready, runtime, toolCallId]);
  const owner = useMemo(
    () => ({ active: false, generation: 0, evidence, hasCurrentTool, surface }),
    [evidence, hasCurrentTool, surface],
  );

  useLayoutEffect(() => {
    owner.generation += 1;
    owner.active = owner.hasCurrentTool();
    const retireObsoleteOwner = () => {
      if (!owner.hasCurrentTool()) owner.active = false;
    };
    const unsubscribeItem = runtime?.threads.mainItem.subscribe(retireObsoleteOwner);
    const unsubscribeThread = runtime?.thread.subscribe(retireObsoleteOwner);
    return () => {
      owner.active = false;
      unsubscribeItem?.();
      unsubscribeThread?.();
    };
  }, [owner, runtime]);

  const acquire = () => {
    const generation = owner.generation;
    return () =>
      owner.active && owner.generation === generation && owner.surface?.isCurrent() === true && owner.hasCurrentTool();
  };
  return { acquire, isCurrent: () => owner.active && owner.surface?.isCurrent() === true && owner.hasCurrentTool() };
};

interface AssistantSurfaceScrollPosition {
  element: HTMLElement;
  left: number;
  top: number;
}

const captureAssistantSurfaceScrollPositions = (registry: AssistantSurfaceRegistry) => {
  const elements = new Set<HTMLElement>();
  for (const surfaceElement of registry.elements.values()) {
    let element: HTMLElement | null = surfaceElement;
    while (element) {
      elements.add(element);
      element = element.parentElement;
    }
  }

  return Array.from(elements, (element): AssistantSurfaceScrollPosition => ({
    element,
    left: element.scrollLeft,
    top: element.scrollTop,
  }));
};

const restoreAssistantSurfaceScrollPositions = (positions: AssistantSurfaceScrollPosition[]) => {
  for (const { element, left, top } of positions) {
    if (!element.isConnected) continue;
    element.scrollLeft = left;
    element.scrollTop = top;
  }
};

const getSurfaceIdForElement = (registry: AssistantSurfaceRegistry, element: Element | null) => {
  if (!element) return null;
  for (const [surfaceId, surfaceElement] of registry.elements) {
    if (surfaceElement.contains(element)) return surfaceId;
  }
  return null;
};

const getClipboardAttachmentName = (file: File, index: number) => {
  if (file.name.trim().length > 0) return file.name;
  const extension = file.type.split("/")[1]?.replace("jpeg", "jpg") ?? "bin";
  return `pasted-file-${index + 1}.${extension}`;
};

const AssistantComposerSurfaceEvents = () => {
  const { showErrorNotification } = useAssistantNotifications();
  const t = useI18n("assistant");
  useAuiEvent("composer.attachmentAddError", ({ message }) => {
    showErrorNotification({ title: t("attachments.errorTitle"), message });
  });
  return null;
};

export const AssistantComposerSurfaceBoundary = ({ children, surfaceId }: PropsWithChildren<{ surfaceId: string }>) => {
  const registry = useAssistantSurfaceRegistry();
  const { showErrorNotification } = useAssistantNotifications();
  const attachmentAction = useAssistantSourceAction("attachments");
  const t = useI18n("assistant");
  const aui = useAui();
  const instanceId = useId();
  const resolvedSurfaceId = `${surfaceId}:${instanceId}`;
  const elementRef = useRef<HTMLDivElement>(null);
  const contextValue = useMemo(
    () => ({ id: resolvedSurfaceId, isCurrent: () => registry.elements.get(resolvedSurfaceId) === elementRef.current }),
    [registry, resolvedSurfaceId],
  );

  useLayoutEffect(() => {
    const element = elementRef.current;
    if (!element) return undefined;
    registry.elements.set(resolvedSurfaceId, element);

    return () => {
      if (registry.elements.get(resolvedSurfaceId) === element) registry.elements.delete(resolvedSurfaceId);
      if (registry.lastFocusedElement && element.contains(registry.lastFocusedElement)) {
        registry.lastFocusedElement = null;
        registry.lastFocusedAt = 0;
      }
    };
  }, [registry, resolvedSurfaceId]);

  const handlePasteCapture = (event: ClipboardEvent<HTMLDivElement>) => {
    const target = event.target;
    if (!(target instanceof HTMLElement) || !target.closest("[data-assistant-composer-input]")) return;
    const files = Array.from(event.clipboardData.files);
    if (files.length === 0) return;

    event.preventDefault();
    if (!attachmentAction.enabled) {
      showErrorNotification({ title: t("attachments.errorTitle"), message: attachmentAction.reason });
      return;
    }
    const composer = aui.composer();
    const acceptedTypes = new Set(
      composer
        .getState()
        .attachmentAccept.split(",")
        .map((type) => type.trim())
        .filter(Boolean),
    );

    files.forEach((file, index) => {
      if (
        file.type.startsWith("image/") &&
        !acceptedTypes.has("*") &&
        !acceptedTypes.has(file.type) &&
        !acceptedTypes.has("image/*")
      ) {
        showErrorNotification({
          title: t("attachments.errorTitle"),
          message: t("attachments.imageUnsupported"),
        });
        return;
      }
      const attachment =
        file.name.trim().length > 0
          ? file
          : new File([file], getClipboardAttachmentName(file, index), {
              type: file.type,
              lastModified: file.lastModified,
            });
      void composer.addAttachment(attachment).catch(() => {});
    });
  };

  return (
    <AssistantComposerSurfaceContext.Provider value={contextValue}>
      <div
        ref={elementRef}
        style={{ display: "contents" }}
        onFocusCapture={(event) => {
          if (!(event.target instanceof HTMLElement)) return;
          registry.lastFocusedElement = event.target;
          registry.lastFocusedAt = performance.now();
        }}
        onPasteCapture={handlePasteCapture}
      >
        {children}
      </div>
    </AssistantComposerSurfaceContext.Provider>
  );
};

export const AssistantRunFocusPreserver = () => {
  const registry = useAssistantSurfaceRegistry();
  useAuiEvent("thread.runStart", () => {
    const generation = registry.generation;
    const activeElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const recentlyFocusedSurface = performance.now() - registry.lastFocusedAt < 1000;
    const focusedBeforeRun =
      activeElement && activeElement !== document.body
        ? activeElement
        : recentlyFocusedSurface && registry.lastFocusedElement?.isConnected
          ? registry.lastFocusedElement
          : activeElement;
    const surfaceIdBeforeRun = getSurfaceIdForElement(registry, focusedBeforeRun);
    const scrollPositionsBeforeRun = captureAssistantSurfaceScrollPositions(registry);
    let isRestoring = false;

    const restoreFocus = () => {
      if (isRestoring || registry.generation !== generation) return;
      if (surfaceIdBeforeRun !== null && !registry.elements.has(surfaceIdBeforeRun)) return;
      const surfaceIdAfterRun = getSurfaceIdForElement(registry, document.activeElement);
      const movedToAnotherSurface = surfaceIdAfterRun !== null && surfaceIdAfterRun !== surfaceIdBeforeRun;
      const leftInitiatingSurface = surfaceIdBeforeRun !== null && surfaceIdAfterRun !== surfaceIdBeforeRun;
      if (!movedToAnotherSurface && !leftInitiatingSurface) return;

      isRestoring = true;
      try {
        if (focusedBeforeRun?.isConnected) focusedBeforeRun.focus({ preventScroll: true });
        if (
          getSurfaceIdForElement(registry, document.activeElement) !== surfaceIdBeforeRun &&
          document.activeElement instanceof HTMLElement
        ) {
          document.activeElement.blur();
        }
        restoreAssistantSurfaceScrollPositions(scrollPositionsBeforeRun);
      } finally {
        isRestoring = false;
      }
    };

    queueMicrotask(() => queueMicrotask(restoreFocus));
    requestAnimationFrame(restoreFocus);
  });
  return null;
};

export const AssistantComposerRuntimeProvider = ({ children }: PropsWithChildren) => {
  const parentAui = useAui();
  const sharedRuntime = parentAui.threads()["__internal_getAssistantRuntime"]?.();
  const surfaceRuntime = useMemo(() => {
    if (!sharedRuntime) throw new Error("Assistant runtime is not available for this composer surface");
    return createAssistantSurfaceRuntime(sharedRuntime);
  }, [sharedRuntime]);
  useEffect(() => () => surfaceRuntime.dispose(), [surfaceRuntime]);

  return (
    <AssistantRuntimeProvider aui={parentAui} runtime={surfaceRuntime}>
      <AssistantComposerSurfaceEvents />
      {children}
    </AssistantRuntimeProvider>
  );
};
