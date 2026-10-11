declare module "virtual:assistant-surface-boundary" {
  export function __auditRuntimeState(): {
    surfaceIds: string[];
    lastFocusedSurfaceElement: HTMLElement | null;
    lastFocusedSurfaceAt: number;
  };
  export const AssistantComposerSurfaceBoundary: (props: {
    children?: import("react").ReactNode;
    surfaceId: string;
  }) => import("react").ReactElement;
  export const AssistantComposerSurfaceEvents: () => import("react").ReactElement;
  export const AssistantRunFocusPreserver: () => import("react").ReactElement | null;
}
