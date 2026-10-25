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
  staleTime: 30_000,
  refetchOnMount: true,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
  refetchInterval: getErrorRefetchInterval,
});
