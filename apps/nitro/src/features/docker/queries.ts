import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { DockerFeatureBinding } from "./binding";
import { getDockerFeatureScope } from "./binding";
import type { DockerAction, DockerContainer } from "./client";
import { getContainerTarget } from "./client";

export function useDockerInventory(binding: DockerFeatureBinding, endpointIds: string[]) {
  const key = getDockerFeatureScope(binding);
  return useQuery({
    queryKey: [...key, "getContainers", endpointIds],
    queryFn: ({ signal }) => binding.client.docker.getContainers({ endpointIds }, { signal }),
    retry: false,
  });
}

export function useDockerEndpoints(binding: DockerFeatureBinding) {
  return useQuery({
    queryKey: [...getDockerFeatureScope(binding), "getEndpoints"],
    queryFn: ({ signal }) => binding.client.docker.getEndpoints(undefined, { signal }),
    retry: false,
  });
}

export function useDockerReconciliation(binding: DockerFeatureBinding, enabled: boolean) {
  return useQuery({
    queryKey: [...getDockerFeatureScope(binding), "reconcileServices"],
    queryFn: ({ signal }) => binding.client.docker.reconcileServices(undefined, { signal }),
    enabled,
    retry: false,
  });
}

export function useDockerHealth(binding: DockerFeatureBinding, enabled: boolean) {
  return useQuery({
    queryKey: [...getDockerFeatureScope(binding), "getServiceHealth"],
    queryFn: ({ signal }) => binding.client.docker.getServiceHealth(undefined, { signal }),
    enabled,
    retry: false,
  });
}

function useDockerMutationSignal() {
  const controllers = useRef(new Set<AbortController>());
  useEffect(
    () => () => {
      for (const controller of controllers.current) controller.abort();
      controllers.current.clear();
    },
    [],
  );
  return async <Output>(call: (signal: AbortSignal) => Promise<Output>) => {
    const controller = new AbortController();
    controllers.current.add(controller);
    try {
      return await call(controller.signal);
    } finally {
      controllers.current.delete(controller);
    }
  };
}

export function useDockerRefresh(binding: DockerFeatureBinding) {
  const queryClient = useQueryClient();
  const run = useDockerMutationSignal();
  return useMutation({
    mutationKey: [...getDockerFeatureScope(binding), "refreshInventory"],
    retry: false,
    mutationFn: () => {
      if (binding.readOnly) throw new Error("Docker actions are read-only");
      return run((signal) => binding.client.docker.refreshInventory(undefined, { signal }));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: getDockerFeatureScope(binding) }),
  });
}

export function useDockerAction(binding: DockerFeatureBinding) {
  const queryClient = useQueryClient();
  const run = useDockerMutationSignal();
  return useMutation({
    mutationKey: [...getDockerFeatureScope(binding), "containerAction"],
    retry: false,
    mutationFn: ({ action, containers }: { action: DockerAction; containers: DockerContainer[] }) => {
      if (binding.readOnly) throw new Error("Docker actions are read-only");
      if (containers.length < 1 || containers.length > 100) throw new Error("Select between 1 and 100 containers");
      const input = { targets: containers.map(getContainerTarget) };
      return run((signal) => {
        if (action === "start") return binding.client.docker.startAll(input, { signal });
        if (action === "stop") return binding.client.docker.stopAll(input, { signal });
        if (action === "restart") return binding.client.docker.restartAll(input, { signal });
        return binding.client.docker.removeAll(input, { signal });
      });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: getDockerFeatureScope(binding) }),
  });
}
