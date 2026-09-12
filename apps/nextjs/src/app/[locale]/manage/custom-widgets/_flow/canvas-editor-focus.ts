import { useEffect } from "react";
import { useReducedMotion } from "@mantine/hooks";
import { useReactFlow } from "@xyflow/react";

/** Keep the rendered widget beside its JSX editor after the canvas gives the editor room. */
export function useCanvasEditorFocus(opened: boolean, selected: string) {
  const { fitView } = useReactFlow();
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    if (!opened || selected !== "widget") return;
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        void fitView({ nodes: [{ id: "widget" }], maxZoom: 1, padding: 0.2, duration: reducedMotion ? 0 : 180 });
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [fitView, opened, selected, reducedMotion]);
}

export function isPreviewInteraction(target: EventTarget) {
  return target instanceof Element && !!target.closest("[data-flow-preview], [data-mantine-portal]");
}
