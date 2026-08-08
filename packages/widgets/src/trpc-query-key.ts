export const createTrpcQueryKey = <TInput>(path: string, input: TInput) => [
  path.split("."),
  { input, type: "query" as const },
];
