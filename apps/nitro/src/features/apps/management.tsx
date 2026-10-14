import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Alert, Button, Container, Skeleton, Stack, Title } from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import { useI18n } from "@homarr/translation/standalone/client";
import { Link } from "@homarr/ui";
import { useNavigation } from "@homarr/ui/navigation";

import { SourceAppDeleteButton, SourceAppsManagement } from "../../source-ui/apps/management";
import type { AppsManagementPresentation, SourceAppFormComponent } from "../../source-ui/apps/contracts";
import { AppForm } from "./app-form";
import { useAppsFeature } from "./context";
import type { ManagedApp } from "./context";
import { AppsAccessNotice, AppsRequestError } from "./feedback";

const searchParamsSchema = z.object({
  search: z.string().optional(),
  pageSize: z
    .string()
    .regex(/^[1-9]\d*$/u)
    .transform(Number)
    .pipe(z.number().int().positive().max(100))
    .catch(10),
  page: z
    .string()
    .regex(/^[1-9]\d*$/u)
    .transform(Number)
    .pipe(z.number().int().positive())
    .catch(1),
});

export interface AppsManagementProps {
  presentation: AppsManagementPresentation;
}

export function AppsManagement({ presentation }: AppsManagementProps) {
  const feature = useAppsFeature();
  const navigation = useNavigation();
  const tApp = useI18n("app");
  const params = new URLSearchParams(navigation.search);
  const searchParams = searchParamsSchema.parse({
    search: params.get("search") ?? undefined,
    pageSize: params.get("pageSize") ?? undefined,
    page: params.get("page") ?? undefined,
  });
  const [deleted, setDeleted] = useState(false);
  const [deleteError, setDeleteError] = useState<{ error: unknown } | null>(null);
  const enabled = feature.principal.kind === "authenticated" && feature.canManageAll;
  const apps = useQuery(feature.query.app.getPaginated.queryOptions({ input: searchParams, enabled, retry: false }));
  const totalPages = enabled && apps.data ? Math.ceil(apps.data.totalCount / searchParams.pageSize) : 0;
  const { page, pageSize, search } = searchParams;
  const { replace } = navigation;
  useEffect(() => {
    if (!enabled || !apps.data) return;
    let target = page;
    if (totalPages > 0 && page > totalPages) target = totalPages;
    if (apps.data.totalCount === 0) target = 1;
    if (target === page) return;
    const next = new URLSearchParams({ page: String(target) });
    if (search) next.set("search", search);
    if (pageSize !== 10) next.set("pageSize", String(pageSize));
    replace(`/manage/apps?${next.toString()}`);
  }, [enabled, apps.data, totalPages, page, pageSize, search, replace]);

  if (feature.principal.kind === "anonymous" || !feature.canAccess) return <AppsAccessNotice action="browse" />;
  let feedback;
  if (enabled && apps.isError) {
    feedback = (
      <AppsRequestError
        error={apps.error}
        retry={() => {
          void apps.refetch();
        }}
      />
    );
  } else if (enabled && apps.isPending) {
    feedback = (
      <Stack aria-busy="true">
        <Skeleton height={80} />
        <Skeleton height={80} />
        <Skeleton height={80} />
      </Stack>
    );
  }
  return (
    <Stack>
      {feature.readOnly && <Alert>{feature.unavailable.readOnly}</Alert>}
      {deleted && (
        <Alert color="green">
          <output>{tApp("page.delete.notification.success.message")}</output>
        </Alert>
      )}
      {deleteError && <AppsRequestError error={deleteError.error} />}
      {enabled && apps.data && feedback}
      <SourceAppsManagement
        presentation={presentation}
        apps={enabled ? (apps.data?.items ?? []) : []}
        totalPages={totalPages}
        search={search}
        canManageAll={feature.canManageAll}
        canCreate={feature.canCreate}
        readOnly={feature.readOnly}
        feedback={feedback}
        renderDeleteAction={(app) =>
          feature.canDelete && (
            <AppDeleteButton
              app={app}
              onDeleted={() => {
                setDeleteError(null);
                setDeleted(true);
              }}
              onError={(error) => {
                setDeleted(false);
                setDeleteError({ error });
              }}
            />
          )
        }
      />
    </Stack>
  );
}

export interface AppEditorProps {
  id: string;
  form: SourceAppFormComponent | null;
  breadcrumb?: ReactNode;
  onSaved: () => void;
}

export function AppEditor({ id, form, breadcrumb, onSaved }: AppEditorProps) {
  const feature = useAppsFeature();
  const tApp = useI18n("app");
  const t = useI18n("common");
  const queryClient = useQueryClient();
  const options = feature.query.app.byId.queryOptions({
    input: { id },
    enabled: feature.principal.kind === "authenticated" && feature.canManageAll,
    retry: false,
    notifyOnChangeProps: "all",
  });
  const app = useQuery(options);
  const lookupQuery = queryClient.getQueryCache().find<ManagedApp>({ queryKey: options.queryKey, exact: true });
  const lookupState = lookupQuery?.state;
  if (feature.principal.kind === "anonymous" || !feature.canManageAll) return <AppsAccessNotice action="edit" />;
  return (
    <>
      {breadcrumb}
      <Container>
        <Stack>
          <Title>{tApp("page.edit.title")}</Title>
          {app.isError && (
            <AppsRequestError
              error={app.error}
              retry={() => {
                void app.refetch();
              }}
            />
          )}
          {lookupQuery && lookupState?.data ? (
            <AppForm
              key={lookupState.data.id}
              form={form}
              mode="edit"
              app={lookupState.data}
              lookupVersion={{ owner: lookupQuery, version: lookupState.dataUpdateCount }}
              onSaved={onSaved}
            />
          ) : app.isPending ? (
            <Skeleton height={360} />
          ) : null}
          {!lookupState?.data && (
            <Button variant="default" component={Link} href="/manage/apps">
              {t("action.backToOverview")}
            </Button>
          )}
        </Stack>
      </Container>
    </>
  );
}

export function AppDeleteButton({
  app,
  onDeleted,
  onError,
}: {
  app: ManagedApp;
  onDeleted: () => void;
  onError: (error: unknown) => void;
}) {
  const feature = useAppsFeature();
  const queryClient = useQueryClient();
  const deletion = useMutation({
    ...feature.query.app.delete.mutationOptions(),
    retry: false,
    mutationFn: async (input: { id: string }) => {
      if (!feature.canDelete || feature.readOnly || feature.principal.kind === "anonymous") {
        throw new Error("App deletion is unavailable");
      }
      return feature.client.app.delete(input);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: feature.queryKey });
      onDeleted();
    },
    onError,
  });
  return (
    <SourceAppDeleteButton
      app={app}
      onConfirm={() => deletion.mutateAsync({ id: app.id })}
      loading={deletion.isPending}
      disabled={feature.readOnly || !feature.canDelete || feature.principal.kind === "anonymous"}
    />
  );
}
