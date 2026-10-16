"use client";

import type { ReactNode } from "react";
import { Alert, Center, Loader } from "@mantine/core";

import { useI18n } from "@homarr/translation/client";

export interface WorkerQueryState {
  isPending: boolean;
  error: { message: string } | null;
}

export function WorkerQueryStatus({ queries }: { queries: readonly WorkerQueryState[] }) {
  const t = useI18n("common");
  const error = queries.find((query) => query.error)?.error;
  if (error)
    return (
      <Alert color="red" role="alert" title={t("error")}>
        {error.message}
      </Alert>
    );
  if (queries.some((query) => query.isPending))
    return (
      <Center p="xl">
        <Loader />
      </Center>
    );
  return null;
}

export function WorkerQuery<T>({
  query,
  children,
}: {
  query: WorkerQueryState & { data: T | undefined };
  children: (data: T) => ReactNode;
}) {
  if (query.error || query.isPending || query.data === undefined) return <WorkerQueryStatus queries={[query]} />;
  return children(query.data);
}
