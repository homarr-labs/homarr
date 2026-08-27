interface QueryWithStatus {
  state: {
    status: string;
  };
}

const getErrorRefetchInterval = (query: QueryWithStatus) => {
  if (query.state.status === "error") return 30_000;
  return false;
};

export const createKubernetesResourceQueryOptions = <TData>(initialData: TData) => ({
  initialData,
  refetchOnMount: "always" as const,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
  refetchInterval: getErrorRefetchInterval,
});
