"use client";

import { revalidatePathActionAsync as revalidateHostedPathActionAsync } from "./revalidate-path-action";

type WorkerRevalidation = (path: string) => void | Promise<void>;
let workerRevalidation: WorkerRevalidation | undefined;

/** The native worker shell refreshes its own query scope instead of the hosted server's data. */
export function registerWorkerRevalidation(handler: WorkerRevalidation) {
  workerRevalidation = handler;
  return () => {
    if (workerRevalidation === handler) workerRevalidation = undefined;
  };
}

export async function revalidatePathActionAsync(path: string) {
  if (typeof window !== "undefined" && workerRevalidation) return workerRevalidation(path);
  return revalidateHostedPathActionAsync(path);
}
