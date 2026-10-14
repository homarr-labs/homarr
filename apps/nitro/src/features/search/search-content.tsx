import { Alert, Badge, Button, Group, Skeleton, Stack, Text } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReactNode, RefObject } from "react";
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { IconChevronRight, IconExternalLink, IconEye, IconSearch } from "@tabler/icons-react";

import {
  SearchPalette,
  SearchPreferenceResults,
  SearchResultAction,
  SearchResultGroup,
  runtimeSearchModes,
  hasSearchPreferenceResults,
} from "../../source-ui/search";

import type { SearchEngine, SearchRpcClient } from "./client";
import type {
  SearchBinding,
  SearchContextResult,
  SearchDestination,
  SearchMode,
  SearchOption,
  SearchAction,
  SearchPaletteSources,
  SearchPreferenceKey,
  SearchPreferenceValue,
  SearchRuntime,
  SearchSession,
  SearchDirectoryCapability,
  SearchPaletteControls,
  SearchUnconfirmedOutcome,
} from "./contracts";
import { searchQueryKey } from "./contracts";
import { MediaRequestContent } from "./media-request";

export interface SearchContentProps {
  binding: SearchBinding;
  session: SearchSession;
  contextResults?: SearchContextResult[];
  initialMode?: SearchMode;
  initialQuery?: string;
  integrationIds?: string[];
  opened?: boolean;
  openIntentRevision?: string | number;
  sources?: SearchPaletteSources;
  controlsRef?: RefObject<SearchPaletteControls | null>;
  onUnconfirmedOutcome?(outcome: SearchUnconfirmedOutcome): void;
  onClose(): void;
}

export function SearchContent(props: SearchContentProps) {
  if (props.opened === false) return null;
  if (props.binding.kind === "held") return <HeldSearchPalette {...props} reason={props.binding.reason} />;
  return (
    <BoundSearchContent
      key={JSON.stringify([props.session.scope, props.openIntentRevision])}
      {...props}
      runtime={props.binding.runtime}
    />
  );
}

function HeldSearchPalette({
  initialMode = "search",
  initialQuery = "",
  session,
  onClose,
  reason,
  controlsRef,
}: SearchContentProps & { reason: string }) {
  const [mode, setMode] = useState<SearchMode>(initialMode);
  const [query, setQuery] = useState(initialQuery);
  const [unavailableNotice, setUnavailableNotice] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  useLayoutEffect(() => {
    const controls = {
      requestClose: () => {
        onClose();
        return true;
      },
      canReplace: () => true,
    };
    if (controlsRef) controlsRef.current = controls;
    return () => {
      if (controlsRef?.current === controls) controlsRef.current = null;
    };
  }, [controlsRef, onClose]);
  return (
    <SearchPalette
      mode={mode}
      query={query}
      inputRef={input}
      canManageUsers={session.permissions.includes("admin")}
      selectionRevision={`${mode}:${query}`}
      canGoBack={mode !== "search"}
      onBack={() => {
        setMode("search");
        setQuery("");
      }}
      onClose={onClose}
      onEscape={() => {
        if (mode !== "search") {
          setMode("search");
          setQuery("");
        } else onClose();
      }}
      onModeChange={setMode}
      onQueryChange={setQuery}
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
    >
      <Alert title="Search is unavailable" m="md">
        {reason}
        {unavailableNotice && <Text size="sm">{unavailableNotice}</Text>}
      </Alert>
      {mode === "preferences" && (
        <SearchPreferenceResults
          preferences={[]}
          authenticated={session.authenticated}
          query={query}
          selectedKey={null}
          pendingKey={null}
          current={false}
          onOpen={(key) => setUnavailableNotice(`${key} is unavailable: ${reason}`)}
          onSelect={(key) => setUnavailableNotice(`${key} could not be changed: ${reason}`)}
        />
      )}
    </SearchPalette>
  );
}

interface PendingSearchOperation {
  controller: AbortController;
  action: SearchUnconfirmedOutcome["action"];
  dispatched: boolean;
  settled: boolean;
}

function BoundSearchContent({
  runtime,
  session,
  contextResults = [],
  initialMode = "search",
  initialQuery = "",
  integrationIds,
  sources = {},
  onClose,
  controlsRef,
  onUnconfirmedOutcome,
}: SearchContentProps & { runtime: SearchRuntime }) {
  const [mode, setMode] = useState<SearchMode>(initialMode);
  const [query, setQuery] = useState(initialQuery);
  const [target, setTarget] = useState<{ integrationId: string; name: string } | null>(null);
  const [media, setMedia] = useState<Extract<SearchOption["action"], { kind: "media" }> | null>(null);
  const [app, setApp] = useState<Extract<SearchOption["action"], { kind: "app" }> | null>(null);
  const [navigationError, setNavigationError] = useState<string | null>(null);
  const [childrenStack, setChildrenStack] = useState<Extract<SearchAction, { kind: "children" }>[]>([]);
  const [preferenceKey, setPreferenceKey] = useState<SearchPreferenceKey | null>(null);
  const [pendingPreference, setPendingPreference] = useState<SearchPreferenceKey | null>(null);
  const [busy, setBusy] = useState(false);
  const [mediaMutationPending, setMediaMutationPending] = useState(false);
  const mediaDetail = useRef<HTMLDivElement>(null);
  const detachedMediaMutation = useRef(false);
  const [unconfirmedOutcome, setUnconfirmedOutcome] = useState<SearchUnconfirmedOutcome | null>(null);
  const outcomeRef = useRef<SearchUnconfirmedOutcome | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const appOpenControl = useRef<HTMLButtonElement>(null);
  const appEditControl = useRef<HTMLButtonElement>(null);
  const appBackControl = useRef<HTMLButtonElement>(null);
  const previousAppQuery = useRef("");
  const lifetime = useRef({ mounted: false, open: false, revision: 0 });
  const activeOperation = useRef<PendingSearchOperation | null>(null);
  const isContentCurrent = useCallback(
    () => lifetime.current.mounted && lifetime.current.open && session.isCurrent(),
    [session],
  );
  const queryClient = useQueryClient();
  const retireOperation = useCallback(
    (reason: string) => {
      const operation = activeOperation.current;
      lifetime.current.revision += 1;
      operation?.controller.abort();
      activeOperation.current = null;
      if (operation?.action === "media") detachedMediaMutation.current = true;
      if (operation?.dispatched && !operation.settled) {
        const outcome = { scope: session.scope, action: operation.action, reason };
        outcomeRef.current = outcome;
        onUnconfirmedOutcome?.(outcome);
        if (lifetime.current.mounted) setUnconfirmedOutcome(outcome);
      }
      if (lifetime.current.mounted) {
        setBusy(false);
        if (operation?.action === "media") setMediaMutationPending(false);
        setPendingPreference(null);
      }
    },
    [session.scope, onUnconfirmedOutcome],
  );
  const retirement = useRef(retireOperation);
  useLayoutEffect(() => {
    retirement.current = retireOperation;
  });
  const observedMediaRuntime = useMemo(() => {
    const requestMedia: SearchRpcClient["integration"]["requestMedia"] = async (request, options) => {
      if (!isContentCurrent() || activeOperation.current || outcomeRef.current)
        throw new Error("A media request cannot be started in this search lifetime");
      const operation: PendingSearchOperation = {
        controller: new AbortController(),
        action: "media",
        dispatched: true,
        settled: false,
      };
      activeOperation.current = operation;
      setBusy(true);
      const signal = options?.signal
        ? AbortSignal.any([options.signal, operation.controller.signal])
        : operation.controller.signal;
      try {
        const result = await runtime.client.integration.requestMedia(request, { ...options, signal });
        if (signal.aborted || activeOperation.current !== operation || !isContentCurrent())
          throw new Error("The media request outcome is unconfirmed in this search lifetime");
        operation.settled = true;
        return result;
      } catch (error) {
        if (activeOperation.current === operation)
          retirement.current(
            "The media request outcome is unconfirmed. Refresh the integration before submitting again.",
          );
        throw error;
      } finally {
        if (activeOperation.current === operation) {
          activeOperation.current = null;
          setBusy(false);
        }
      }
    };
    const integration = new Proxy(runtime.client.integration, {
      get(originalIntegration, property, receiver) {
        if (property === "requestMedia") return requestMedia;
        return Reflect.get(originalIntegration, property, receiver);
      },
    });
    const client = new Proxy(runtime.client, {
      get(originalClient, property, receiver) {
        if (property === "integration") return integration;
        return Reflect.get(originalClient, property, receiver);
      },
    });
    return { ...runtime, client };
  }, [runtime, isContentCurrent]);
  const {
    options: sourceOptions,
    loading: sourceLoading,
    errors: sourceErrors,
    hint,
    refetch: refetchSources,
    retryable: sourcesRetryable,
  } = useSearchOptions(
    runtime,
    session,
    mode,
    query,
    contextResults,
    target,
    integrationIds,
    Boolean(media || app || childrenStack.length || preferenceKey),
  );
  const children = childrenStack.at(-1);
  const directory = useDirectoryResults(
    sources,
    runtime,
    session,
    mode,
    query,
    Boolean(media || app || children || preferenceKey),
  );
  const errors = [...sourceErrors, ...directory.errors];
  const loading = sourceLoading || directory.loading;
  const retryable = sourcesRetryable || directory.retryable;
  const refetch = () => {
    refetchSources();
    directory.retry();
  };
  const options = children
    ? runtime.helpers.filterCatalog(children.options, query, (option) => [option.label, option.description ?? ""])
    : [...sourceOptions, ...localPaletteOptions(mode, query, sources, runtime, session), ...directory.options];
  const selectedPreference = sources.preferences?.find((preference) => preference.key === preferenceKey);
  const hasPreferences =
    (mode === "search" || mode === "command") &&
    !children &&
    hasSearchPreferenceResults(sources.preferences ?? [], session.authenticated, query);
  const optionKeys = JSON.stringify([
    mode,
    query,
    options.map((option) => [option.key, option.disabled]),
    preferenceKey,
    selectedPreference?.kind === "select" && selectedPreference.choices,
    pendingPreference,
    busy,
    Boolean(unconfirmedOutcome),
    childrenStack.length,
    app?.id,
    media?.result.id,
    runtime.navigation.kind,
    session.isCurrent(),
    sources.preferences?.map((preference) => [
      preference.key,
      preference.kind,
      preference.kind !== "link" && preference.writer.kind,
      preference.kind !== "link" && preference.value,
    ]),
  ]);

  useLayoutEffect(() => {
    const currentLifetime = lifetime.current;
    currentLifetime.mounted = true;
    currentLifetime.open = true;
    return () => {
      currentLifetime.mounted = false;
      currentLifetime.open = false;
      currentLifetime.revision += 1;
      retirement.current("Search was unmounted before the dispatched action's outcome was confirmed.");
      void queryClient.cancelQueries({ queryKey: searchQueryKey(session.scope) });
    };
  }, [queryClient, session.scope]);

  useLayoutEffect(() => {
    return () => {
      retirement.current("The search binding changed before the dispatched action's outcome was confirmed.");
    };
  }, [runtime.navigation, runtime.client, session.isCurrent, onClose]);

  useLayoutEffect(() => {
    if (!isContentCurrent()) return;
    if (!media) input.current?.focus();
  }, [app, media, isContentCurrent]);

  useLayoutEffect(() => {
    const detail = mediaDetail.current;
    const updatePending = () =>
      setMediaMutationPending(!detachedMediaMutation.current && Boolean(detail?.querySelector("button[data-loading]")));
    updatePending();
    if (!detail) return;
    const observer = new MutationObserver(updatePending);
    observer.observe(detail, { subtree: true, childList: true, attributes: true, attributeFilter: ["data-loading"] });
    return () => observer.disconnect();
  }, [media]);

  function invalidateIntent() {
    retireOperation("The search intent changed before the dispatched action's outcome was confirmed.");
  }

  function canLeave() {
    if (
      activeOperation.current ||
      outcomeRef.current ||
      (!detachedMediaMutation.current && mediaDetail.current?.querySelector("button[data-loading]"))
    )
      return false;
    return true;
  }

  function navigate(destination: SearchDestination, errorMessage: string) {
    if (!isContentCurrent() || !canLeave()) return;
    invalidateIntent();
    setNavigationError(null);
    const navigation = runtime.navigation;
    if (navigation.kind === "held") {
      setNavigationError(navigation.reason);
      return;
    }
    const operation: PendingSearchOperation = {
      controller: new AbortController(),
      action: "navigation",
      dispatched: false,
      settled: false,
    };
    activeOperation.current = operation;
    setBusy(true);
    const revision = lifetime.current.revision;
    const isCurrent = () =>
      !operation.controller.signal.aborted && lifetime.current.revision === revision && isContentCurrent();
    void Promise.resolve()
      .then(async () => {
        if (!isCurrent()) return;
        operation.dispatched = true;
        await navigation.go(destination, { signal: operation.controller.signal, isCurrent });
        if (isCurrent()) {
          operation.settled = true;
          activeOperation.current = null;
          setBusy(false);
          close();
        } else if (activeOperation.current === operation)
          retireOperation("Navigation completed outside the current search binding; its outcome is unconfirmed here.");
      })
      .catch(() => {
        if (activeOperation.current === operation) {
          retireOperation(errorMessage);
          setNavigationError(errorMessage);
        }
      })
      .finally(() => {
        if (activeOperation.current === operation) {
          activeOperation.current = null;
          setBusy(false);
        }
      });
  }

  function backToResults() {
    if (!isContentCurrent() || !canLeave()) return;
    invalidateIntent();
    setMedia(null);
    setApp(null);
    if (media || app) {
      if (app) setQuery(previousAppQuery.current);
      setNavigationError(null);
      return;
    }
    if (preferenceKey) setPreferenceKey(null);
    else if (childrenStack.length) setChildrenStack((stack) => stack.slice(0, -1));
    else if (target) setTarget(null);
    else if (mode !== "search") setMode("search");
    setQuery("");
    setNavigationError(null);
  }

  function changeQuery(value: string, interpretPrefix = false) {
    if (!isContentCurrent() || !canLeave()) return;
    invalidateIntent();
    if (interpretPrefix && !target && !children && !preferenceKey) {
      if (mode === "external" && value.startsWith("!")) value = value.slice(1);
      const prefixMode = runtimeSearchModes.find((entry) => entry.character === value);
      if (prefixMode) {
        setMode(prefixMode.mode);
        value = "";
      }
    }
    setQuery(value);
    setNavigationError(null);
  }

  function changeMode(value: string | null) {
    if (!runtimeSearchModes.some((entry) => entry.mode === value) && value !== "bookmarks") return;
    if (value === "userGroup" && !session.permissions.includes("admin")) return;
    if (!isContentCurrent() || !canLeave()) return;
    invalidateIntent();
    const selectedMode = runtimeSearchModes.find((entry) => entry.mode === value);
    setMode(selectedMode?.mode ?? "bookmarks");
    setTarget(null);
    setMedia(null);
    setApp(null);
    setChildrenStack([]);
    setPreferenceKey(null);
    setNavigationError(null);
    input.current?.focus();
  }

  function close() {
    if (!lifetime.current.mounted || !lifetime.current.open || !canLeave()) return false;
    invalidateIntent();
    lifetime.current.open = false;
    void queryClient.cancelQueries({ queryKey: searchQueryKey(session.scope) });
    onClose();
    return true;
  }

  useLayoutEffect(() => {
    const controls: SearchPaletteControls = { requestClose: close, canReplace: canLeave };
    if (controlsRef) controlsRef.current = controls;
    return () => {
      if (controlsRef?.current === controls) controlsRef.current = null;
    };
  });

  function select(key: string) {
    const option = options.find((entry) => entry.key === key);
    if (!option || option.disabled || !canLeave() || !isContentCurrent()) return;
    invalidateIntent();
    setNavigationError(null);
    performAction(option.action);
  }

  function performAction(action: SearchAction) {
    if (!isContentCurrent() || !canLeave()) return;
    if (action.kind === "query") {
      changeQuery(action.query);
      input.current?.focus();
    } else if (action.kind === "integration") {
      setTarget(action);
      setMode("external");
      changeQuery(action.query);
      input.current?.focus();
    } else if (action.kind === "media") {
      void queryClient.cancelQueries({ queryKey: searchQueryKey(session.scope) });
      detachedMediaMutation.current = false;
      setMediaMutationPending(false);
      setMedia(action);
    } else if (action.kind === "app") {
      void queryClient.cancelQueries({ queryKey: searchQueryKey(session.scope) });
      previousAppQuery.current = query;
      setQuery("");
      setApp(action);
    } else if (action.kind === "route") {
      navigate(action.destination, "The navigation outcome is unconfirmed. Check the current page.");
    } else if (action.kind === "children") {
      setChildrenStack((stack) => [...stack, action]);
      changeQuery("");
    } else if (action.kind === "mode") {
      changeMode(action.mode);
      changeQuery(action.query ?? "");
    } else if (action.kind === "invoke") {
      runAction(action.run, action.closeOnSuccess ?? true);
    } else if (action.kind === "link") {
      const href =
        action.policy === "app"
          ? runtime.helpers.getSafeAppHref(action.href)
          : runtime.helpers.getSafeApplicationUrl(action.href);
      if (!href) {
        setNavigationError("This result has an unsafe or invalid URL and cannot be opened.");
        return;
      }
      if (action.newTab) window.open(href, "_blank", "noopener,noreferrer");
      else window.location.assign(href);
      close();
    }
  }

  function runAction(
    run: (lifecycle: { signal: AbortSignal; isCurrent(): boolean }) => void | Promise<void>,
    closeOnSuccess: boolean,
    key?: SearchPreferenceKey,
  ) {
    if (!isContentCurrent() || !canLeave()) return;
    invalidateIntent();
    setPendingPreference(key ?? null);
    setNavigationError(null);
    const operation: PendingSearchOperation = {
      controller: new AbortController(),
      action: key ? "preference" : "command",
      dispatched: false,
      settled: false,
    };
    activeOperation.current = operation;
    setBusy(true);
    const revision = lifetime.current.revision;
    const isCurrent = () =>
      !operation.controller.signal.aborted && lifetime.current.revision === revision && isContentCurrent();
    void Promise.resolve()
      .then(async () => {
        if (!isCurrent()) return;
        operation.dispatched = true;
        await run({ signal: operation.controller.signal, isCurrent });
        if (isCurrent()) {
          operation.settled = true;
          activeOperation.current = null;
          setBusy(false);
          setPendingPreference(null);
          if (closeOnSuccess) close();
        } else if (activeOperation.current === operation)
          retireOperation("The action completed outside the current search binding; its outcome is unconfirmed here.");
      })
      .catch(() => {
        if (activeOperation.current === operation)
          retireOperation("The action's outcome could not be confirmed. Check its current state before trying again.");
      })
      .finally(() => {
        if (activeOperation.current === operation) {
          activeOperation.current = null;
          setBusy(false);
          setPendingPreference(null);
        }
      });
  }

  function openPreference(key: SearchPreferenceKey) {
    if (!isContentCurrent() || !canLeave()) return;
    const preference = sources.preferences?.find((entry) => entry.key === key);
    if (preference?.kind === "link" && !preference.unavailable) performAction(preference.action);
    else if (preference?.kind === "select") {
      invalidateIntent();
      setPreferenceKey(key);
      setQuery("");
      setNavigationError(null);
      input.current?.focus();
    }
  }

  function writePreference(key: SearchPreferenceKey, value: SearchPreferenceValue | boolean) {
    if (!isContentCurrent() || !canLeave()) return;
    const preference = sources.preferences?.find((entry) => entry.key === key);
    if (!preference || preference.kind === "link" || preference.writer.kind === "held") return;
    if (preference.kind === "boolean" && typeof value === "boolean") {
      const writer = preference.writer;
      runAction((lifecycle) => writer.setValue(value, lifecycle), false, key);
    } else if (
      preference.kind === "select" &&
      typeof value !== "boolean" &&
      preference.choices.some((choice) => choice.value === value && !choice.unavailable)
    ) {
      const writer = preference.writer;
      runAction((lifecycle) => writer.setValue(value, lifecycle), false, key);
    }
  }

  function palette(content: ReactNode) {
    return (
      <SearchPalette
        mode={mode}
        query={query}
        inputRef={input}
        canManageUsers={session.permissions.includes("admin")}
        selectionRevision={optionKeys}
        canGoBack={Boolean(media || app || target || children || preferenceKey || mode !== "search")}
        interactionBlocked={busy || mediaMutationPending || Boolean(unconfirmedOutcome)}
        canLeave={canLeave}
        onBack={backToResults}
        onClose={close}
        onEscape={() => {
          if (media || app || target || children || preferenceKey || mode !== "search") backToResults();
          else close();
        }}
        onModeChange={changeMode}
        onQueryChange={(value) => changeQuery(value, true)}
        placeholder={target ? `Search ${target.name}` : undefined}
        onKeyDown={(event) => {
          if (
            event.key === "Backspace" &&
            query.length === 0 &&
            (target || children || preferenceKey || mode !== "search")
          ) {
            backToResults();
          }
        }}
        detail={
          (target || children || selectedPreference) && (
            <Stack px="md" py="sm" gap="xs">
              {target && <Badge>{target.name}</Badge>}
              {children && <Text fw={600}>{children.title}</Text>}
              {selectedPreference && <Text fw={600}>{selectedPreference.label ?? selectedPreference.key}</Text>}
              <Text size="xs" c="dimmed">
                Backspace on an empty query returns to the previous list.
              </Text>
            </Stack>
          )
        }
      >
        {(busy || mediaMutationPending) && (
          <Text component="output" px="md" py="sm">
            An action is in progress. Wait for its outcome before leaving search.
          </Text>
        )}
        {unconfirmedOutcome && (
          <Alert title="Action outcome is unconfirmed" color="orange" m="md">
            <Stack gap="xs">
              <Text size="sm">{unconfirmedOutcome.reason}</Text>
              <Text size="sm">
                Aborting a request does not prove that the action was rolled back. Check the current page or affected
                service to establish what happened.
              </Text>
              <Button
                variant="light"
                onClick={() => {
                  outcomeRef.current = null;
                  setUnconfirmedOutcome(null);
                }}
              >
                Acknowledge unconfirmed outcome
              </Button>
            </Stack>
          </Alert>
        )}
        {navigationError && (
          <Alert color="red" title="Action status" m="md">
            {navigationError}
          </Alert>
        )}
        {content}
      </SearchPalette>
    );
  }

  if (media)
    return palette(
      <div ref={mediaDetail}>
        <MediaRequestContent
          key={`${media.result.integration.id}:${media.result.type}:${media.result.id}`}
          runtime={observedMediaRuntime}
          session={session}
          result={media.result}
          onBack={backToResults}
          isIntentCurrent={isContentCurrent}
        />
      </div>,
    );

  if (app) {
    const href = runtime.helpers.getSafeAppHref(app.href);
    return palette(
      <Stack
        onKeyDown={(event) => {
          if (event.key === "Escape" && !event.nativeEvent.isComposing) {
            event.preventDefault();
            event.stopPropagation();
            backToResults();
          }
        }}
      >
        <Stack mx="md" my="sm" gap="xs">
          <Text>App actions</Text>
          <Group>
            {runtime.helpers.getSafeApplicationUrl(app.iconUrl) && (
              <img
                src={runtime.helpers.getSafeApplicationUrl(app.iconUrl)}
                alt=""
                width={24}
                height={24}
                style={{ objectFit: "contain" }}
              />
            )}
            <Text fw={600}>{app.name}</Text>
          </Group>
        </Stack>
        <Stack gap={0}>
          {href && (
            <SearchResultAction
              actionKey={`app:${app.id}:open`}
              actionRef={appOpenControl}
              disabled={!session.isCurrent() || busy || Boolean(unconfirmedOutcome)}
              onSelect={() => performAction({ kind: "link", href, newTab: false, policy: "app" })}
            >
              <Group mx="md" my="sm">
                <IconExternalLink stroke={1.5} />
                <Text>Open app</Text>
              </Group>
            </SearchResultAction>
          )}
          <SearchResultAction
            actionKey={`app:${app.id}:edit`}
            actionRef={appEditControl}
            disabled={!session.isCurrent() || runtime.navigation.kind === "held" || busy || Boolean(unconfirmedOutcome)}
            onSelect={() => {
              navigate({ path: "/manage/apps/edit/$id", id: app.id }, "App editor navigation is unconfirmed.");
            }}
          >
            <Group mx="md" my="sm">
              <IconEye stroke={1.5} />
              <Text>Edit app</Text>
            </Group>
          </SearchResultAction>
          <Button
            ref={appBackControl}
            disabled={busy || Boolean(unconfirmedOutcome)}
            variant="subtle"
            mx="md"
            my="sm"
            onClick={backToResults}
          >
            Back to results
          </Button>
        </Stack>
        {app.href && !href && <Alert title="App URL unavailable">The configured app URL is invalid or unsafe.</Alert>}
        {runtime.navigation.kind === "held" && <Text size="sm">{runtime.navigation.reason}</Text>}
        {navigationError && <Alert color="red">{navigationError}</Alert>}
      </Stack>,
    );
  }

  if ((mode === "preferences" || preferenceKey) && !children)
    return palette(
      <SearchPreferenceResults
        preferences={sources.preferences ?? []}
        authenticated={session.authenticated}
        query={query}
        selectedKey={preferenceKey}
        pendingKey={pendingPreference}
        current={session.isCurrent() && !busy && !unconfirmedOutcome}
        onOpen={openPreference}
        onSelect={writePreference}
      />,
    );

  if (mode === "assistant" && !children)
    return palette(
      sources.assistant?.kind === "ready" ? (
        sources.assistant.render({ query, session, isCurrent: isContentCurrent })
      ) : (
        <Alert title="Assistant is unavailable" m="md">
          {sources.assistant?.reason ?? "The assistant host has not supplied an accepted composer and transport."}
        </Alert>
      ),
    );

  return palette(
    <>
      {errors.length > 0 && !children && (
        <Alert color="red" title="Some results could not be loaded" m="md">
          <Stack gap="xs">
            {errors.map((error) => (
              <Text key={error} size="sm">
                {error}
              </Text>
            ))}
            <Button variant="light" disabled={!retryable} onClick={refetch}>
              Retry search
            </Button>
          </Stack>
        </Alert>
      )}
      {loading && !children && (
        <Stack component="output" gap="xs" px="md" py="sm" aria-label="Loading search results">
          <Skeleton height={32} />
          <Skeleton height={32} />
        </Stack>
      )}
      {hint && !children && (
        <Text component="output" size="sm" px="md" py="sm">
          {hint}
        </Text>
      )}
      {Array.from(new Set(options.map((option) => option.group))).map((group) => (
        <SearchResultGroup key={group} label={group}>
          {options
            .filter((option) => option.group === group)
            .map((option) => {
              const heldNavigation = option.action.kind === "route" && runtime.navigation.kind === "held";
              return (
                <SearchResultAction
                  key={option.key}
                  actionKey={option.key}
                  disabled={
                    option.disabled ||
                    option.action.kind === "none" ||
                    heldNavigation ||
                    !session.isCurrent() ||
                    busy ||
                    Boolean(unconfirmedOutcome)
                  }
                  onSelect={() => select(option.key)}
                >
                  <Group px="md" py="sm" wrap="nowrap" w="100%">
                    {runtime.helpers.getSafeApplicationUrl(option.imageUrl) ? (
                      <img
                        src={runtime.helpers.getSafeApplicationUrl(option.imageUrl)}
                        alt=""
                        width={35}
                        height={35}
                        loading="lazy"
                        style={{ objectFit: "contain" }}
                      />
                    ) : (
                      (option.icon ?? <IconSearch stroke={1.5} size={24} />)
                    )}
                    <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                      <Text fw={500}>{option.label}</Text>
                      {option.description && (
                        <Text size="sm" c="dimmed">
                          {option.description}
                        </Text>
                      )}
                      {heldNavigation && runtime.navigation.kind === "held" && (
                        <Text size="xs">{runtime.navigation.reason}</Text>
                      )}
                    </Stack>
                    {(option.action.kind === "children" ||
                      option.action.kind === "app" ||
                      option.action.kind === "media") && <IconChevronRight size={16} aria-hidden />}
                  </Group>
                </SearchResultAction>
              );
            })}
        </SearchResultGroup>
      ))}
      {hasPreferences && (
        <SearchResultGroup label="Preferences">
          <SearchPreferenceResults
            preferences={sources.preferences ?? []}
            authenticated={session.authenticated}
            query={query}
            selectedKey={null}
            pendingKey={pendingPreference}
            current={session.isCurrent() && !busy && !unconfirmedOutcome}
            onOpen={openPreference}
            onSelect={writePreference}
          />
        </SearchResultGroup>
      )}
      {!loading && errors.length === 0 && options.length === 0 && !hasPreferences && (
        <Text px="md" py="xl" ta="center">
          {query.trim() ? "No results. Try another query or search mode." : "Type a query to begin."}
        </Text>
      )}
    </>,
  );
}

function localPaletteOptions(
  mode: SearchMode,
  query: string,
  sources: SearchPaletteSources,
  runtime: SearchRuntime,
  session: SearchSession,
): SearchOption[] {
  const options: SearchOption[] = [];
  const append = (items: SearchOption[] | undefined, group: string, reason: string) => {
    if (items === undefined) {
      options.push({
        key: `held:${group}`,
        group,
        label: `${group} unavailable`,
        description: reason,
        action: { kind: "none" },
        disabled: true,
      });
      return;
    }
    options.push(...runtime.helpers.filterCatalog(items, query, (option) => [option.label, option.description ?? ""]));
  };
  if (mode === "search" || mode === "apps")
    append(sources.boards, "Boards", "An accepted board catalog has not been supplied by the host.");
  if (mode === "search" || mode === "command")
    append(sources.pages, "Pages", "An accepted router page catalog has not been supplied by the host.");
  if (mode === "search" || mode === "command") {
    append(sources.commands, "Commands", "Accepted command actions have not been supplied by the host.");
  }
  if (mode === "userGroup") {
    if (!session.permissions.includes("admin"))
      return [
        {
          key: "held:userGroup",
          group: "Users and groups",
          label: "Users and groups unavailable",
          description: "Administrator access is required.",
          action: { kind: "none" },
          disabled: true,
        },
      ];
  }
  return options;
}

function useDirectoryResults(
  sources: SearchPaletteSources,
  runtime: SearchRuntime,
  session: SearchSession,
  mode: SearchMode,
  query: string,
  suspended: boolean,
) {
  const enabled =
    !suspended &&
    (mode === "search" || mode === "userGroup") &&
    session.authenticated &&
    session.permissions.includes("admin") &&
    session.isCurrent();
  const users = useDirectorySearch(sources.directory?.users, sources.users, "Users", runtime, session, query, enabled);
  const groups = useDirectorySearch(
    sources.directory?.groups,
    sources.groups,
    "Groups",
    runtime,
    session,
    query,
    enabled,
  );
  return {
    options: [...users.options, ...groups.options],
    loading: users.loading || groups.loading,
    errors: [...users.errors, ...groups.errors],
    retryable: users.retryable || groups.retryable,
    retry: () => {
      users.retry();
      groups.retry();
    },
  };
}

function useDirectorySearch(
  capability: SearchDirectoryCapability | undefined,
  supplied: SearchOption[] | undefined,
  group: "Users" | "Groups",
  runtime: SearchRuntime,
  session: SearchSession,
  query: string,
  enabled: boolean,
) {
  const normalized = query.trim();
  const [debounced] = useDebouncedValue(normalized, 180);
  const reader = capability?.kind === "ready" ? capability.search : undefined;
  const sourceRevision = capability?.kind === "ready" ? capability.revision : undefined;
  const readerGeneration = useRef(0);
  const acquisition = useMemo(() => {
    readerGeneration.current += 1;
    return { reader, generation: readerGeneration.current };
  }, [reader]);
  const generation = acquisition.generation;
  const key = useMemo(
    () =>
      searchQueryKey(session.scope, `directory.${group}`, {
        query: debounced,
        revision: sourceRevision,
        generation,
      }),
    [session.scope, group, debounced, sourceRevision, generation],
  );
  const queryClient = useQueryClient();
  const current = useRef({ scope: session.scope, query: normalized, reader, enabled });
  useLayoutEffect(() => {
    current.current = { scope: session.scope, query: normalized, reader, enabled };
    return () => {
      void queryClient.cancelQueries({ queryKey: key });
    };
  }, [session.scope, normalized, reader, enabled, queryClient, key]);
  const canRead = enabled && Boolean(reader) && normalized.length > 0 && normalized === debounced;
  const result = useQuery({
    queryKey: key,
    queryFn: async ({ signal }) => {
      const isCurrent = () =>
        !signal.aborted &&
        session.isCurrent() &&
        current.current.enabled &&
        current.current.scope === session.scope &&
        current.current.query === debounced &&
        current.current.reader === reader;
      if (!reader || !isCurrent()) throw new DOMException("Directory search intent changed", "AbortError");
      const options = await reader({ scope: session.scope, query: debounced, limit: 8 }, { signal, isCurrent });
      if (!isCurrent()) throw new DOMException("Directory search intent changed", "AbortError");
      return { scope: session.scope, query: debounced, reader, options: options.slice(0, 8) };
    },
    enabled: canRead,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
    retry: false,
  });
  const options: SearchOption[] = [];
  if (enabled && capability?.kind === "held")
    options.push({
      key: `held:${group}`,
      group,
      label: `${group} unavailable`,
      description: capability.reason,
      action: { kind: "none" },
      disabled: true,
    });
  else if (
    canRead &&
    result.data?.scope === session.scope &&
    result.data.query === normalized &&
    result.data.reader === reader
  )
    options.push(...result.data.options.map((option) => ({ ...option, group })));
  else if (enabled && !capability && supplied && normalized.length > 0)
    options.push(
      ...runtime.helpers
        .filterCatalog(supplied, normalized, (option) => [option.label, option.description ?? ""], 8)
        .map((option) => ({ ...option, group })),
    );
  else if (enabled && !capability && supplied === undefined)
    options.push({
      key: `held:${group}`,
      group,
      label: `${group} unavailable`,
      description: "An accepted private directory search capability has not been supplied by the host.",
      action: { kind: "none" },
      disabled: true,
    });
  return {
    options,
    loading:
      (canRead && result.isPending) ||
      (enabled && Boolean(reader) && normalized.length > 0 && normalized !== debounced),
    errors: canRead && result.isError ? [`${group} could not be loaded. Retry search.`] : [],
    retryable: canRead && result.isError,
    retry: () => {
      if (canRead && session.isCurrent() && result.isError) void result.refetch();
    },
  };
}

function useSearchOptions(
  runtime: SearchRuntime,
  session: SearchSession,
  mode: SearchMode,
  query: string,
  context: SearchContextResult[],
  target: { integrationId: string; name: string } | null,
  integrationIds?: string[],
  suspended = false,
) {
  const nativeSearchEngine = runtime.client.searchEngine;
  const nativeBangs = runtime.client.bangs;
  const nativeIntegration = runtime.client.integration;
  const live = session.isCurrent() && !suspended;
  const openInNewTab = session.openSearchInNewTab ?? true;
  const ddgBangs = session.ddgBangs ?? true;
  const bang = runtime.helpers.parseBangQuery(query);
  const [bangQuery] = useDebouncedValue(bang.bangToken, 160);
  const [remoteQuery] = useDebouncedValue(query.trim(), 220);
  const webMode = mode === "external" && target === null;
  const catalogueMode = mode === "search" || mode === "apps";
  const canBrowseApps =
    session.authenticated &&
    (session.permissions.includes("board-modify-all") || session.permissions.includes("app-modify-all"));
  const catalog = useQuery({
    queryKey: searchQueryKey(session.scope, "searchEngine.catalog"),
    queryFn: ({ signal }) => nativeSearchEngine.catalog(undefined, { signal }),
    enabled: live && runtime.authority.searchEngine.kind === "ready" && (catalogueMode || webMode),
    staleTime: runtime.helpers.catalogStaleTimeMs,
    refetchOnMount: "always",
    retry: false,
    refetchOnWindowFocus: false,
  });
  const defaultEngine = useQuery({
    queryKey: searchQueryKey(session.scope, "searchEngine.getDefaultSearchEngine"),
    queryFn: ({ signal }) => nativeSearchEngine.getDefaultSearchEngine(undefined, { signal }),
    enabled: live && runtime.authority.searchEngine.kind === "ready" && mode === "search",
    staleTime: runtime.helpers.catalogStaleTimeMs,
    refetchOnMount: "always",
    retry: false,
    refetchOnWindowFocus: false,
  });
  const apps = useQuery({
    queryKey: searchQueryKey(session.scope, "app.selectable"),
    queryFn: ({ signal }) => runtime.client.app.selectable(undefined, { signal }),
    enabled: live && canBrowseApps && catalogueMode && runtime.authority.apps.kind === "ready",
    staleTime: runtime.helpers.catalogStaleTimeMs,
    refetchOnMount: "always",
    retry: false,
    refetchOnWindowFocus: false,
  });
  const integrations = useQuery({
    queryKey: searchQueryKey(session.scope, "integration.all"),
    queryFn: ({ signal }) => nativeIntegration.all(undefined, { signal }),
    enabled: live && session.authenticated && catalogueMode && runtime.authority.integrations.kind === "ready",
    staleTime: runtime.helpers.catalogStaleTimeMs,
    refetchOnMount: "always",
    retry: false,
    refetchOnWindowFocus: false,
  });
  const bangsEnabled =
    live &&
    webMode &&
    ddgBangs &&
    bangQuery.length > 0 &&
    bangQuery === bang.bangToken &&
    runtime.authority.bangs.kind === "ready";
  const bangs = useQuery({
    queryKey: searchQueryKey(session.scope, "bangs.search", bangQuery),
    queryFn: ({ signal }) => nativeBangs.search({ query: bangQuery, limit: 10 }, { signal }),
    enabled: bangsEnabled,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const matchedEngine =
    webMode && bang.locked && runtime.authority.searchEngine.kind === "ready"
      ? catalog.data?.find((engine) => engine.short === bang.bangToken)
      : undefined;
  const integrationId =
    target?.integrationId ?? (matchedEngine?.type === "fromIntegration" ? matchedEngine.integrationId : undefined);
  const integrationText = target ? query.trim() : bang.searchText.trim();
  const [integrationQuery] = useDebouncedValue(integrationText, 220);
  const integrationEnabled =
    live &&
    session.authenticated &&
    mode === "external" &&
    Boolean(integrationId) &&
    integrationQuery.length > 0 &&
    integrationText === integrationQuery &&
    runtime.authority.integrationSearch.kind === "ready";
  const integrationResults = useQuery({
    queryKey: searchQueryKey(session.scope, "integration.searchInIntegration", {
      integrationId,
      query: integrationQuery,
    }),
    queryFn: ({ signal }) => {
      if (!integrationId) throw new Error("Select an integration before searching");
      return nativeIntegration.searchInIntegration({ integrationId, query: integrationQuery }, { signal });
    },
    enabled: integrationEnabled,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const targets = useQuery({
    queryKey: searchQueryKey(session.scope, "integration.mediaRequestSearchTargets"),
    queryFn: ({ signal }) => nativeIntegration.mediaRequestSearchTargets(undefined, { signal }),
    enabled:
      live &&
      session.authenticated &&
      (mode === "media" || integrationEnabled) &&
      runtime.authority.mediaSearch.kind === "ready",
    staleTime: 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const scopedTargets = (targets.data ?? []).filter(
    (entry) => integrationIds === undefined || integrationIds.includes(entry.id),
  );
  const mediaInput = {
    query: remoteQuery,
    integrationIds: integrationIds === undefined ? undefined : scopedTargets.map((entry) => entry.id),
  };
  const mediaEnabled =
    live &&
    session.authenticated &&
    mode === "media" &&
    remoteQuery.length > 0 &&
    remoteQuery === query.trim() &&
    scopedTargets.length > 0 &&
    runtime.authority.mediaSearch.kind === "ready";
  const media = useQuery({
    queryKey: searchQueryKey(session.scope, "integration.searchMediaRequests", mediaInput),
    queryFn: ({ signal }) => nativeIntegration.searchMediaRequests(mediaInput, { signal }),
    enabled: mediaEnabled,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const options: SearchOption[] = [];
  const errors: string[] = [];
  const activeQueries = [catalog, defaultEngine, apps, integrations, bangs, integrationResults, targets, media].filter(
    (entry) => entry.isEnabled,
  );
  for (const entry of activeQueries)
    if (entry.isError) errors.push("A search source failed. Retry to reload that source.");
  const addHold = (key: keyof SearchRuntime["authority"], active: boolean) => {
    const authority = runtime.authority[key];
    if (active && authority.kind === "held") errors.push(authority.reason);
  };
  addHold("searchEngine", catalogueMode || webMode);
  addHold("apps", canBrowseApps && catalogueMode);
  addHold("integrations", session.authenticated && catalogueMode);
  addHold("bangs", webMode && ddgBangs && bang.bangToken.length > 0);
  addHold("integrationSearch", mode === "external" && Boolean(integrationId));
  addHold("mediaSearch", mode === "media" && session.authenticated);
  const local = context.filter(
    (item) =>
      !item.unavailable &&
      (mode !== "bookmarks" || item.kind === "bookmark") &&
      ((mode === "apps" && query.trim() === "") || runtime.helpers.matchesContext(query, item)),
  );
  if (mode === "search" || mode === "apps" || mode === "bookmarks") {
    for (const item of local
      .toSorted((first, second) => runtime.helpers.rankContext(query, [first, second]))
      .slice(0, 8))
      options.push({
        key: `context:${item.id}`,
        group: "On this board",
        label: item.name,
        description: item.description,
        action: { kind: "link", href: item.href, newTab: item.newTab, policy: "app" },
      });
  }
  if (catalogueMode) {
    const dedupeKeys = new Set(context.map((entry) => entry.dedupeKey));
    for (const app of runtime.helpers.filterCatalog(
      (runtime.authority.apps.kind === "ready" && canBrowseApps ? (apps.data ?? []) : []).filter(
        (entry) => !dedupeKeys.has(`app:${entry.id}`),
      ),
      query,
      (entry) => [entry.name],
    )) {
      options.push({
        key: `app:${app.id}`,
        group: "Apps",
        label: app.name,
        imageUrl: app.iconUrl,
        action: { kind: "app", id: app.id, name: app.name, href: app.href, iconUrl: app.iconUrl },
      });
    }
    for (const integration of runtime.helpers.filterCatalog(
      runtime.authority.integrations.kind === "ready" && session.authenticated ? (integrations.data ?? []) : [],
      query,
      (entry) => [entry.name, entry.kind],
    ))
      options.push({
        key: `integration:${integration.id}`,
        group: "Integrations",
        label: integration.name,
        description: integration.kind,
        action: { kind: "route", destination: { path: "/manage/integrations/edit/$id", id: integration.id } },
      });
  }
  const engineOption = (engine: SearchEngine): SearchOption => ({
    key: `engine:${engine.id}`,
    group: "Search engines",
    label: query.trim() ? `Search ${engine.name} for “${query.trim()}”` : engine.name,
    description: engine.description,
    imageUrl: engine.iconUrl,
    action:
      engine.type === "generic" && engine.urlTemplate
        ? {
            kind: "link",
            href: runtime.helpers.buildSearchUrl(engine.urlTemplate, query.trim()),
            newTab: openInNewTab,
            policy: "http",
          }
        : engine.integrationId
          ? { kind: "query", query: `${engine.short} ${query.trim()}` }
          : { kind: "none" },
  });
  if (mode === "search") {
    const defaultId = defaultEngine.data?.id;
    const engines = runtime.authority.searchEngine.kind === "ready" ? (catalog.data ?? []) : [];
    for (const engine of [
      ...engines.filter((entry) => entry.id === defaultId),
      ...engines.filter((entry) => entry.id !== defaultId),
    ]) {
      const option = engineOption(engine);
      if (engine.type === "fromIntegration" && engine.integrationId)
        option.action = {
          kind: "integration",
          integrationId: engine.integrationId,
          name: engine.name,
          query: query.trim(),
        };
      options.push(option);
    }
    if (runtime.authority.searchEngine.kind === "ready" && catalog.isSuccess && engines.length === 0)
      options.push({
        key: "empty-engines",
        group: "Search engines",
        label: "No search engines configured",
        description: session.permissions.includes("search-engine-create")
          ? "Create a search engine to search the web."
          : "Ask an administrator to configure a search engine.",
        action: session.permissions.includes("search-engine-create")
          ? { kind: "route", destination: { path: "/manage/search-engines/new" } }
          : { kind: "none" },
      });
  }
  if (webMode) {
    const engines = runtime.helpers.filterCatalog(
      runtime.authority.searchEngine.kind === "ready" ? (catalog.data ?? []) : [],
      bang.bangToken,
      (entry) => [entry.short, entry.name],
      10,
    );
    const ddg = bangsEnabled ? (bangs.data ?? []) : [];
    const selectedBang = ddg.find((entry) => entry.t === bang.bangToken);
    const template =
      matchedEngine?.type === "generic" ? matchedEngine.urlTemplate : matchedEngine ? undefined : selectedBang?.u;
    if (bang.locked && template && bang.searchText.trim())
      options.push({
        key: "bang-search",
        group: "Search",
        label: `Search ${matchedEngine?.name ?? selectedBang?.s} for “${bang.searchText.trim()}”`,
        action: {
          kind: "link",
          href: runtime.helpers.buildSearchUrl(template, bang.searchText.trim()),
          newTab: openInNewTab,
          policy: "http",
        },
      });
    for (const engine of engines)
      options.push({
        key: `bang-engine:${engine.id}`,
        group: "Search engines",
        label: engine.name,
        imageUrl: engine.iconUrl,
        description: `!${engine.short}`,
        action: { kind: "query", query: `${`${engine.short} ${bang.searchText}`.trimEnd()} ` },
      });
    for (const entry of ddg.filter((item) => !engines.some((engine) => engine.short === item.t)))
      options.push({
        key: `bang:${entry.t}`,
        group: "DuckDuckGo bangs",
        label: entry.s,
        description: `!${entry.t} ${entry.d ?? ""}`,
        action: { kind: "query", query: `${`${entry.t} ${bang.searchText}`.trimEnd()} ` },
      });
  }
  if (integrationEnabled) {
    const mediaTarget = targets.data?.find((entry) => entry.id === integrationId);
    for (const result of (integrationResults.data ?? []).slice(0, 10))
      options.push({
        key: `integration-result:${integrationId}:${result.type}:${result.id}`,
        group: target?.name ?? matchedEngine?.name ?? "Integration results",
        label: result.name,
        description: result.text,
        imageUrl: result.image,
        action:
          mediaTarget && result.type !== "person"
            ? { kind: "media", result: { ...result, integration: mediaTarget } }
            : { kind: "link", href: result.link, newTab: mediaTarget ? openInNewTab : true, policy: "http" },
      });
  }
  if (mediaEnabled)
    for (const result of (media.data ?? []).slice(0, 10))
      options.push({
        key: `media:${result.integration.id}:${result.type}:${result.id}`,
        group: result.integration.name,
        label: result.name,
        description: [result.text, result.availability].filter(Boolean).join(" · "),
        imageUrl: result.image,
        action:
          result.type === "person"
            ? { kind: "link", href: result.link, newTab: openInNewTab, policy: "http" }
            : { kind: "media", result },
      });
  let hint: string | undefined;
  if (mode === "media" && !session.authenticated) hint = "Sign in to search media.";
  else if (mode === "media" && targets.isSuccess && scopedTargets.length === 0)
    hint = integrationIds
      ? "No accessible media search integrations in this scope."
      : "No accessible media search integrations are configured.";
  else if (mode === "media" && !query.trim()) hint = "Search for a movie or series.";
  else if (
    webMode &&
    bang.locked &&
    !bang.searchText.trim() &&
    (matchedEngine || (bangsEnabled && bangs.data?.some((entry) => entry.t === bang.bangToken)))
  )
    hint = "Engine selected. Type a query to continue.";
  else if (mode === "bookmarks" && context.length === 0)
    hint = "Board bookmarks are supplied by the active board. No bookmarks are available in this context.";
  const waiting =
    (mode === "media" && query.trim().length > 0 && remoteQuery !== query.trim()) ||
    (webMode && ddgBangs && bang.bangToken.length > 0 && bangQuery !== bang.bangToken) ||
    (mode === "external" &&
      Boolean(integrationId) &&
      integrationText.length > 0 &&
      integrationText !== integrationQuery);
  return {
    options: live ? options : [],
    loading: activeQueries.some((entry) => entry.isPending) || waiting,
    errors: Array.from(new Set(errors)),
    hint: live ? hint : "Your session changed. Reopen search to continue.",
    refetch: () => {
      if (!session.isCurrent()) return;
      for (const entry of activeQueries) if (entry.isError) void entry.refetch();
    },
    retryable: live && activeQueries.some((entry) => entry.isError),
  };
}
