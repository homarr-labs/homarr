interface Options<TData, TInput extends Record<string, unknown>> {
  requestAsync: (input: TInput) => Promise<TData>;
}

export const createRequestHandler = <TData, TInput extends Record<string, unknown>>(
  options: Options<TData, TInput>,
) => ({
  handler: (input: TInput) => ({
    async getDataAsync(): Promise<{ data: TData; timestamp: Date }> {
      const data = await options.requestAsync(input);
      return { data, timestamp: new Date() };
    },
  }),
});
