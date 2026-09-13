/** Start work in bounded batches so valid manifests do not exhaust their own request limiter. */
export async function mapCustomWidgetRequests<T, R>(
  inputs: readonly T[],
  concurrency: number,
  execute: (input: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(inputs.length);
  let cursor = 0;
  const worker = async () => {
    while (cursor < inputs.length) {
      const index = cursor++;
      const input = inputs[index];
      if (input !== undefined) results[index] = await execute(input);
    }
  };
  await Promise.all(Array.from({ length: Math.min(Math.max(1, concurrency), inputs.length) }, worker));
  return results;
}
