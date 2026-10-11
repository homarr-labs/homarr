import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { emitAssistantEvent } from "./mocks/assistant-ui";
import {
  __auditSourceMetadata,
  __auditRuntimeState,
  AssistantComposerSurfaceBoundary,
  AssistantComposerSurfaceEvents,
  AssistantRunFocusPreserver,
} from "virtual:assistant-surface-boundary";

interface AuditWindow extends Window {
  __assistantSurfaceSourceMetadata?: typeof __auditSourceMetadata;
  __assistantSurfaceAudit?: {
    mountTarget(cycle: number): void;
    removeTarget(cycle: number): void;
    commitNeutralRender(): void;
    state(): ReturnType<typeof __auditRuntimeState>;
    emitRunStart(): void;
    weakTargets: WeakRef<HTMLTextAreaElement>[];
  };
}

const Target = ({ cycle }: { cycle: number }) => {
  const payload = `assistant-surface-audit-${cycle}:` + "x".repeat(512 * 1024);
  return (
    <section data-audit-cycle={cycle}>
      <textarea
        data-audit-target={cycle}
        aria-label={`Assistant test composer ${cycle}`}
        ref={(element) => {
          if (element) {
            // Calibrates heap retention independently from the native DOM-node count.
            // It is synthetic data and must not be interpreted as production payload size.
            Object.assign(element, { __auditPayload: { sentinel: payload } });
          }
        }}
      />
      <article data-audit-message>synthetic assistant message {cycle}</article>
    </section>
  );
};

const Harness = ({ cycles }: { cycles: number[] }) => (
  <>
    <button type="button" data-audit-outside-focus>Continue outside assistant</button>
    <AssistantComposerSurfaceEvents />
    <AssistantRunFocusPreserver />
    <AssistantComposerSurfaceBoundary surfaceId="unfocused-survivor">
      <section data-audit-survivor>
        <textarea data-audit-survivor-input aria-label="Unfocused surviving composer" />
      </section>
    </AssistantComposerSurfaceBoundary>
    {cycles.map((cycle) => (
      <AssistantComposerSurfaceBoundary key={cycle} surfaceId={`target-${cycle}`}>
        <Target cycle={cycle} />
      </AssistantComposerSurfaceBoundary>
    ))}
  </>
);

const root = createRoot(document.getElementById("root")!);
const activeCycles = new Set<number>();
const render = () => {
  root.render(
    <StrictMode>
      <Harness cycles={[...activeCycles]} />
    </StrictMode>,
  );
};
root.render(
  <StrictMode>
    <Harness cycles={[]} />
  </StrictMode>,
);

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
await nextFrame();
await nextFrame();

const auditWindow = window as AuditWindow;
auditWindow.__assistantSurfaceSourceMetadata = __auditSourceMetadata;
auditWindow.__assistantSurfaceAudit = {
  weakTargets: [],
  mountTarget(cycle) {
    activeCycles.add(cycle);
    render();
  },
  removeTarget(cycle) {
    activeCycles.delete(cycle);
    render();
  },
  commitNeutralRender() {
    render();
  },
  state: __auditRuntimeState,
  emitRunStart() {
    emitAssistantEvent("thread.runStart");
  },
};

document.documentElement.dataset.auditReady = "true";
