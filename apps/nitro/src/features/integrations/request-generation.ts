import { useLayoutEffect, useRef } from "react";

import { useIntegrationFeature } from "./provider";

export function useIntegrationRequestGeneration() {
  const { isCurrent: isAuthorityCurrent } = useIntegrationFeature();
  const lifecycle = useRef({ mounted: false, generation: 0 });
  useLayoutEffect(() => {
    lifecycle.current.mounted = true;
    return () => {
      lifecycle.current.mounted = false;
      lifecycle.current.generation += 1;
    };
  }, []);
  const invalidate = () => {
    lifecycle.current.generation += 1;
  };
  const isActive = () => lifecycle.current.mounted && isAuthorityCurrent();
  return {
    begin: () => {
      invalidate();
      return lifecycle.current.generation;
    },
    invalidate,
    isActive,
    isCurrent: (generation: number) => isActive() && lifecycle.current.generation === generation,
  };
}
