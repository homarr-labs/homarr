import type { AssistantRuntime, Toolkit } from "@assistant-ui/react";
import { useAuiState } from "@assistant-ui/react";
import { Alert } from "@mantine/core";
import type { ReactNode } from "react";
import { useCallback, useSyncExternalStore } from "react";

import {
  AssistantAutoApprovalProvider,
  AssistantComposerRuntimeProvider,
  AssistantComposerSurfaceBoundary,
  AssistantConversationSurface,
  AssistantPreferencesContext,
  AssistantRunFocusPreserver,
  AssistantRuntimeProviderWithTools,
  AssistantSourceBindingsProvider,
  AssistantSourcePanel,
} from "../../source-ui/assistant";
import type {
  AssistantConversationSurfaceProps,
  AssistantPanelProps,
  AssistantPreferencesContextValue,
  AssistantSourceBindings,
} from "../../source-ui/assistant";

export type AssistantRichBinding =
  | { kind: "held"; reason: string }
  | {
      kind: "available";
      runtime: AssistantRuntime;
      toolkit: Toolkit;
      bindings: AssistantSourceBindings;
      preferences: AssistantPreferencesContextValue;
    };

export interface AssistantRichBoundaryProps {
  binding: AssistantRichBinding;
  children: ReactNode;
}

export function AssistantRichBoundary({ binding, children }: AssistantRichBoundaryProps) {
  if (binding.kind === "held") return <Alert color="yellow">{binding.reason}</Alert>;
  return (
    <AssistantRichAccess key={binding.bindings.scope.key} binding={binding}>
      {children}
    </AssistantRichAccess>
  );
}

function AssistantRichAccess({
  binding,
  children,
}: {
  binding: Extract<AssistantRichBinding, { kind: "available" }>;
  children: ReactNode;
}) {
  const signal = binding.bindings.scope.signal;
  const subscribe = useCallback(
    (notify: () => void) => {
      signal.addEventListener("abort", notify);
      return () => signal.removeEventListener("abort", notify);
    },
    [signal],
  );
  const revoked = useSyncExternalStore(
    subscribe,
    () => signal.aborted,
    () => signal.aborted,
  );
  if (revoked) return <Alert color="yellow">{binding.bindings.unavailableLabel}</Alert>;
  return (
    <AssistantSourceBindingsProvider bindings={binding.bindings}>
      <AssistantPreferencesContext.Provider value={binding.preferences}>
        <AssistantRuntimeProviderWithTools runtime={binding.runtime} toolkit={binding.toolkit}>
          <AssistantRunFocusPreserver />
          <AssistantRichConversationLifetime>{children}</AssistantRichConversationLifetime>
        </AssistantRuntimeProviderWithTools>
      </AssistantPreferencesContext.Provider>
    </AssistantSourceBindingsProvider>
  );
}

function AssistantRichConversationLifetime({ children }: { children: ReactNode }) {
  const conversationId = useAuiState((state) => state.threadListItem.id);
  return <AssistantAutoApprovalProvider conversationId={conversationId}>{children}</AssistantAutoApprovalProvider>;
}

export function AssistantRichConversation(props: AssistantConversationSurfaceProps & { surfaceId: string }) {
  const { surfaceId, ...surface } = props;
  return (
    <AssistantComposerRuntimeProvider>
      <AssistantComposerSurfaceBoundary surfaceId={surfaceId}>
        <AssistantConversationSurface {...surface} />
      </AssistantComposerSurfaceBoundary>
    </AssistantComposerRuntimeProvider>
  );
}

export function AssistantRichPanel(props: AssistantPanelProps & { surfaceId: string }) {
  const { surfaceId, ...panel } = props;
  return (
    <AssistantComposerRuntimeProvider>
      <AssistantComposerSurfaceBoundary surfaceId={surfaceId}>
        <AssistantSourcePanel {...panel} />
      </AssistantComposerSurfaceBoundary>
    </AssistantComposerRuntimeProvider>
  );
}
