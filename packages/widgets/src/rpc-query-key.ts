export const createRpcQueryKey = <TInput>(path: string, input: TInput) => [
  path.split("."),
  { input, type: "query" as const },
];
