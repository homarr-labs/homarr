import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Alert, Container, Stack, Title } from "@mantine/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { QueryClient, QueryKey } from "@tanstack/react-query";
import type { z } from "zod";

import { useI18n } from "@homarr/translation/standalone/client";
import { appManageSchema } from "@homarr/validation/app";

import type { SourceAppFormComponent, SourceAppFormHandle, SourceAppFormProps } from "../../source-ui/apps/contracts";
import { useAppsFeature } from "./context";
import type { ManagedApp, NativeAppClient } from "./context";
import { AppsAccessNotice, AppsRequestError } from "./feedback";

type CreatedApp = Awaited<ReturnType<NativeAppClient["create"]>>;
export type AppFormProps = {
  form: SourceAppFormComponent | null;
  buttonLabels?: SourceAppFormProps["buttonLabels"];
  showBackToOverview?: boolean;
  onPendingChange?: (pending: boolean) => void;
} & (
  | {
      mode: "create";
      createAnother?: boolean;
      onCreated?: (app: CreatedApp) => void;
      onSaved: (app: CreatedApp) => void;
    }
  | {
      mode: "edit";
      app: ManagedApp;
      lookupVersion: { owner: object; version: number };
      onSaved: () => void;
    }
);

type AppSaveResult = { kind: "created"; app: CreatedApp } | { kind: "updated" };

interface AppSubmissionOrigin {
  owner: object;
  queryKey: QueryKey;
  queryClient: QueryClient;
  isCurrent: () => boolean;
}

export function AppForm(props: AppFormProps) {
  const feature = useAppsFeature();
  const t = useI18n("common");
  const tApp = useI18n("app");
  const queryClient = useQueryClient();
  const formRef = useRef<SourceAppFormHandle>(null);
  const pending = useRef<object | null>(null);
  const mountedOwner = useRef<{ binding: object } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [baseline, setBaseline] = useState({
    app: props.mode === "edit" ? props.app : undefined,
    lookupVersion: props.mode === "edit" ? props.lookupVersion : null,
    mount: 0,
  });
  const permitted =
    feature.principal.kind === "authenticated" && (props.mode === "create" ? feature.canCreate : feature.canManageAll);
  const disabled = !permitted || feature.readOnly || props.form === null;
  const scope = JSON.stringify(
    feature.principal.kind === "authenticated"
      ? [feature.principal.userId, feature.principal.authorityRevision]
      : ["anonymous"],
  );
  const appId = props.mode === "edit" ? props.app.id : null;
  const sourceOwner = useMemo(
    () => ({
      scope,
      client: feature.client.app,
      queryClient,
      disabled,
      form: props.form,
      mode: props.mode,
      appId,
      mount: baseline.mount,
    }),
    [scope, feature.client.app, queryClient, disabled, props.form, props.mode, appId, baseline.mount],
  );
  const captureSubmissionOwner = useCallback(() => {
    const owner = mountedOwner.current;
    return {
      owner,
      isCurrent: () => owner !== null && mountedOwner.current === owner && owner.binding === sourceOwner && !disabled,
    };
  }, [sourceOwner, disabled]);
  const mutation = useMutation({
    mutationKey:
      props.mode === "create" ? feature.query.app.create.mutationKey() : feature.query.app.update.mutationKey(),
    retry: false,
    mutationFn: async ({
      values,
      origin,
    }: {
      values: z.output<typeof appManageSchema>;
      origin: AppSubmissionOrigin;
    }): Promise<AppSaveResult> => {
      if (!origin.isCurrent()) throw new Error("App mutation is unavailable");
      const normalized = appManageSchema.parse(values);
      if (props.mode === "create") return { kind: "created", app: await feature.client.app.create(normalized) };
      await feature.client.app.update({ id: props.app.id, ...normalized });
      return { kind: "updated" };
    },
    onSuccess: async (_, { origin }) => {
      await origin.queryClient.invalidateQueries({ queryKey: origin.queryKey });
      if (origin.isCurrent()) setSaved(true);
    },
  });
  const isPending = mutation.isPending || submitting;
  const resetMutation = mutation.reset;
  useLayoutEffect(() => {
    const owner = { binding: sourceOwner };
    mountedOwner.current = owner;
    setSaved(false);
    setSubmitting(false);
    resetMutation();
    return () => {
      if (mountedOwner.current === owner) mountedOwner.current = null;
    };
  }, [sourceOwner, resetMutation]);
  const onDirtyChange = useCallback(
    (nextDirty: boolean) => {
      if (mountedOwner.current?.binding === sourceOwner) setDirty(nextDirty);
    },
    [sourceOwner],
  );
  const onPendingChange = props.onPendingChange;
  useEffect(() => {
    if (captureSubmissionOwner().isCurrent()) onPendingChange?.(isPending);
  }, [onPendingChange, isPending, captureSubmissionOwner]);
  const incomingApp = props.mode === "edit" ? props.app : undefined;
  const lookupOwner = props.mode === "edit" ? props.lookupVersion.owner : null;
  const lookupVersion = props.mode === "edit" ? props.lookupVersion.version : null;
  useEffect(() => {
    if (mountedOwner.current?.binding !== sourceOwner || !incomingApp || dirty || isPending) return;
    if (pending.current === mountedOwner.current) return;
    if (!formRef.current || formRef.current.isDirty()) return;
    if (baseline.lookupVersion?.owner === lookupOwner && baseline.lookupVersion?.version === lookupVersion) return;
    if (!lookupOwner || lookupVersion === null) return;
    setBaseline((current) => ({
      app: incomingApp,
      lookupVersion: { owner: lookupOwner, version: lookupVersion },
      mount: current.mount + 1,
    }));
  }, [sourceOwner, incomingApp, dirty, isPending, lookupOwner, lookupVersion, baseline.lookupVersion]);
  if (!permitted) return <AppsAccessNotice action={props.mode} />;
  const SharedForm = props.form;
  if (!SharedForm)
    return (
      <Alert>
        <output>{feature.unavailable.sharedForm}</output>
      </Alert>
    );
  const app = baseline.app;
  let initialValues;
  if (app) {
    initialValues = {
      name: app.name,
      description: app.description ?? "",
      iconUrl: app.iconUrl,
      href: app.href ?? "",
      pingUrl: app.pingUrl ?? "",
    };
  }
  let buttonLabels = props.buttonLabels;
  if (!buttonLabels) {
    buttonLabels = { submit: t(props.mode === "create" ? "action.create" : "action.save") };
    if (props.mode === "create" && props.createAnother) buttonLabels.submitAndCreateAnother = t("action.createAnother");
  }
  return (
    <Stack>
      {feature.readOnly && <Alert>{feature.unavailable.readOnly}</Alert>}
      {mutation.isError && <AppsRequestError error={mutation.error} />}
      {saved && (
        <Alert color="green">
          <output>{tApp(`page.${props.mode}.notification.success.message`)}</output>
        </Alert>
      )}
      <fieldset disabled={disabled || isPending} style={{ border: 0, margin: 0, padding: 0, minWidth: 0 }}>
        <SharedForm
          key={baseline.mount}
          formRef={formRef}
          buttonLabels={buttonLabels}
          showBackToOverview={props.showBackToOverview ?? true}
          initialValues={initialValues}
          isPending={isPending}
          onDirtyChange={onDirtyChange}
          captureSubmissionOwner={captureSubmissionOwner}
          handleSubmit={async (values, finish, afterSuccess) => {
            const submission = captureSubmissionOwner();
            if (
              !submission.owner ||
              pending.current === submission.owner ||
              !submission.isCurrent() ||
              !formRef.current
            )
              throw new Error("App mutation is unavailable");
            const origin: AppSubmissionOrigin = {
              owner: submission.owner,
              queryKey: feature.queryKey,
              queryClient,
              isCurrent: submission.isCurrent,
            };
            pending.current = origin.owner;
            setSubmitting(true);
            setSaved(false);
            try {
              const result = await mutation.mutateAsync({ values, origin });
              if (!origin.isCurrent()) throw new Error("App form submission owner retired");
              if (props.mode === "create" && result.kind === "created") props.onCreated?.(result.app);
              if (!origin.isCurrent()) throw new Error("App form submission owner retired");
              afterSuccess?.();
              if (!origin.isCurrent()) throw new Error("App form submission owner retired");
              if (!finish) return;
              if (props.mode === "create" && result.kind === "created") props.onSaved(result.app);
              if (props.mode === "edit" && result.kind === "updated") props.onSaved();
            } finally {
              if (pending.current === origin.owner) pending.current = null;
              if (origin.isCurrent()) setSubmitting(false);
            }
          }}
        />
      </fieldset>
    </Stack>
  );
}

export function AppNewPage({
  form,
  breadcrumb,
  onSaved,
}: {
  form: SourceAppFormComponent | null;
  breadcrumb?: ReactNode;
  onSaved: (app: CreatedApp) => void;
}) {
  const t = useI18n("app");
  return (
    <>
      {breadcrumb}
      <Container>
        <Stack>
          <Title>{t("page.create.title")}</Title>
          <AppForm form={form} mode="create" createAnother onSaved={onSaved} />
        </Stack>
      </Container>
    </>
  );
}
