// Development runs background services as separate processes. The aliases in
// next.config.ts keep production-only instrumentation imports out of the graph.
export const instrumentationNoop = true;
export const startupPromise = Promise.resolve();
export const registerNodeInstrumentation = () => Promise.resolve();
