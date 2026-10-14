"use client";

import { useCallback, useImperativeHandle, useLayoutEffect, useRef, useState } from "react";
import { Alert, Button, Center, Loader, Stack, Text } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import type { RouterOutputs } from "@homarr/api";
import { useSession } from "@homarr/auth/client";
import type { AppFormHandle, AppFormValues } from "@homarr/forms-collection";
import { AppForm } from "@homarr/forms-collection";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";
import { appManageSchema } from "@homarr/validation/app";
import {
  captureLegacyWidgetSession,
  isLegacyWidgetSessionCurrent,
  useLegacyWidgetIconResources,
} from "../_inputs/widget-app-input";

export interface EmbeddedAppOperationOwner {
  isCurrent: () => boolean;
}

export interface EmbeddedAppEditFormHandle {
  submitIfDirty: (owner: EmbeddedAppOperationOwner) => Promise<boolean>;
}

interface EmbeddedAppEditFormProps {
  appId: string;
  handleRef: React.Ref<EmbeddedAppEditFormHandle>;
  capturePresentationOwner: () => EmbeddedAppOperationOwner;
}

type App = RouterOutputs["app"]["byId"];
interface AppBaseline {
  app: App;
  fields: string;
}
interface AppWriteObservation {
  appId: string;
  baseline: App;
  session: ReturnType<typeof captureLegacyWidgetSession>;
}
type SaveOutcome =
  | { kind: "idle" }
  | { kind: "unknown"; values: AppFormValues; source: AppWriteObservation; error: unknown }
  | {
      kind: "confirmed" | "reconcileheld" | "settled";
      values: AppFormValues;
      source: AppWriteObservation;
      result: void;
      read: App | null;
      formBaseline: AppBaseline;
      error: unknown;
    };

const matchesSubmittedApp = (left: AppFormValues, right: AppFormValues) =>
  left.name === right.name &&
  left.description === right.description &&
  left.iconUrl === right.iconUrl &&
  left.href === right.href &&
  left.pingUrl === right.pingUrl;

const getAppBaselineIdentity = (app: App) =>
  JSON.stringify([app.id, app.name, app.description, app.iconUrl, app.href, app.pingUrl]);

export const EmbeddedAppEditForm = ({ appId, handleRef, capturePresentationOwner }: EmbeddedAppEditFormProps) => {
  const tCommon = useI18n("common");
  const tAppEdit = useI18n("app.page.edit");
  const tAppSelect = useI18n("app.action.select");
  const tItemApp = useI18n("item.edit.app");
  const utils = clientApi.useUtils();
  const session = useSession();
  const appFormRef = useRef<AppFormHandle>(null);
  const query = clientApi.app.byId.useQuery({ id: appId }, { retry: false, refetchOnWindowFocus: false });
  const { data: app, isPending: isLoadingApp, isError } = query;
  const mutation = clientApi.app.update.useMutation({ retry: false });
  const [baseline, setBaseline] = useState<AppBaseline | null>(null);
  const [dirty, setDirty] = useState(false);
  const [readError, setReadError] = useState<unknown>(null);
  const dirtyObservation = useRef(false);
  const [outcome, setOutcome] = useState<SaveOutcome>({ kind: "idle" });
  const outcomeRef = useRef<SaveOutcome>({ kind: "idle" });
  const mount = useRef<{ active: boolean } | null>(null);
  const owner = useRef<{
    active: boolean;
    appId: string;
    session: ReturnType<typeof captureLegacyWidgetSession>;
    presentation: EmbeddedAppOperationOwner;
  } | null>(null);
  const currentAppDataRef = useRef<{ app: App; fields: string; owner: NonNullable<typeof owner.current> } | null>(null);
  const iconResourcesRef = useRef<ReturnType<typeof useLegacyWidgetIconResources> | null>(null);
  const isIconWorkHeld = useCallback(() => {
    const resources = iconResourcesRef.current;
    return resources === null || resources.upload?.isPending === true;
  }, []);
  const unacknowledgedIntent = useRef<{
    values: AppFormValues;
    baseline: AppBaseline;
    owner: NonNullable<typeof owner.current>;
  } | null>(null);
  const operation = useRef<{
    active: boolean;
    parent: EmbeddedAppOperationOwner;
    baseline: AppBaseline;
    baselineFields: string;
    owner: NonNullable<typeof owner.current>;
    submitted: AppFormValues | null;
  } | null>(null);
  const host = useRef({ appId, session, query, mutation, utils, baseline, capturePresentationOwner });
  useLayoutEffect(() => {
    const lease = { active: true };
    mount.current = lease;
    return () => {
      lease.active = false;
      if (owner.current) owner.current.active = false;
      if (operation.current) operation.current.active = false;
      currentAppDataRef.current = null;
      iconResourcesRef.current = null;
    };
  }, []);
  useLayoutEffect(() => {
    host.current = { appId, session, query, mutation, utils, baseline, capturePresentationOwner };
    iconResourcesRef.current = iconPickerProps;
    const admitted = owner.current;
    if (admitted) {
      if (
        admitted.appId !== appId ||
        !isLegacyWidgetSessionCurrent(admitted.session, session) ||
        !admitted.presentation.isCurrent() ||
        session.data?.user.permissions.includes("app-modify-all") !== true ||
        (query.isSuccess && query.data.id !== appId) ||
        (query.isError && (query.error.data?.code === "NOT_FOUND" || query.error.data?.code === "FORBIDDEN"))
      )
        admitted.active = false;
    } else if (
      session.status === "authenticated" &&
      session.data.user.permissions.includes("app-modify-all") &&
      query.isSuccess &&
      query.data.id === appId
    ) {
      const presentation = capturePresentationOwner();
      if (presentation.isCurrent()) {
        const admitted = { active: true, appId, session: captureLegacyWidgetSession(session.data), presentation };
        const initial = { app: query.data, fields: getAppBaselineIdentity(query.data) };
        owner.current = admitted;
        currentAppDataRef.current = { ...initial, owner: admitted };
        setBaseline(initial);
      }
    }
    const pending = operation.current;
    if (
      pending &&
      (!pending.owner.active ||
        pending.baseline !== baseline ||
        !baseline ||
        pending.baselineFields !== getAppBaselineIdentity(baseline.app) ||
        !pending.parent.isCurrent())
    )
      pending.active = false;
    const known = outcomeRef.current;
    if (
      !pending &&
      !unacknowledgedIntent.current &&
      !isIconWorkHeld() &&
      !dirty &&
      appFormRef.current?.isDirty() === false &&
      admitted?.active &&
      query.isSuccess &&
      !query.isFetching &&
      query.data.id === appId &&
      baseline &&
      (known.kind === "idle" || known.kind === "settled") &&
      getAppBaselineIdentity(query.data) !== baseline.fields
    ) {
      const next = { app: query.data, fields: getAppBaselineIdentity(query.data) };
      currentAppDataRef.current = { ...next, owner: admitted };
      if (
        known.kind === "settled" &&
        known.formBaseline === baseline &&
        known.read &&
        matchesSubmittedApp(known.read, appManageSchema.parse(known.values)) &&
        getAppBaselineIdentity(known.read) === next.fields
      ) {
        const advanced: SaveOutcome = { ...known, formBaseline: next };
        outcomeRef.current = advanced;
        setOutcome(advanced);
      }
      setBaseline(next);
    }
  });
  const isCurrentOwner = useCallback(() => {
    const admitted = owner.current;
    const current = host.current;
    const valid =
      mount.current?.active === true &&
      admitted !== null &&
      admitted.active &&
      admitted.appId === current.appId &&
      admitted.presentation.isCurrent() &&
      isLegacyWidgetSessionCurrent(admitted.session, current.session) &&
      current.session.data?.user.permissions.includes("app-modify-all") === true;
    if (!valid && admitted) admitted.active = false;
    return valid;
  }, []);
  const captureSubmissionOwner = useCallback(() => {
    const pending = operation.current;
    return {
      isCurrent: () =>
        pending !== null &&
        pending.active &&
        operation.current === pending &&
        pending.baseline === host.current.baseline &&
        host.current.baseline !== null &&
        pending.baselineFields === getAppBaselineIdentity(host.current.baseline.app) &&
        pending.owner === owner.current &&
        pending.parent.isCurrent() &&
        isCurrentOwner(),
    };
  }, [isCurrentOwner]);
  const onDirtyChange = useCallback(
    (value: boolean) => {
      if (!isCurrentOwner()) return;
      dirtyObservation.current = value;
      setDirty(value);
    },
    [isCurrentOwner],
  );
  const publishOutcome = useCallback((value: SaveOutcome) => {
    outcomeRef.current = value;
    if (mount.current?.active) setOutcome(value);
  }, []);
  const reconcile = useCallback(
    async (origin: EmbeddedAppOperationOwner, saved: SaveOutcome) => {
      const requireOwner = () => {
        if (!origin.isCurrent() || !isCurrentOwner()) throw new Error("App save owner retired");
        if (
          saved.kind !== "idle" &&
          (saved.source.appId !== host.current.appId ||
            !isLegacyWidgetSessionCurrent(saved.source.session, host.current.session))
        )
          throw new Error("App save association retired");
      };
      try {
        requireOwner();
        await host.current.utils.app.invalidate(undefined, undefined, { throwOnError: true });
        requireOwner();
        const result = await host.current.query.refetch({ throwOnError: true });
        requireOwner();
        if (!result.isSuccess || result.data.id !== host.current.appId) throw new Error("App refresh unavailable");
        const admitted = owner.current;
        if (!admitted || !admitted.active) throw new Error("App read owner retired");
        currentAppDataRef.current = { app: result.data, fields: getAppBaselineIdentity(result.data), owner: admitted };
        setReadError(null);
        if (saved.kind !== "idle" && saved.kind !== "unknown")
          publishOutcome({ ...saved, kind: "settled", read: result.data, error: null });
        return result.data;
      } catch (error) {
        if (origin.isCurrent() && isCurrentOwner()) setReadError(error);
        if (saved.kind !== "idle" && saved.kind !== "unknown")
          publishOutcome({ ...saved, kind: "reconcileheld", error });
        if (origin.isCurrent() && isCurrentOwner())
          showErrorNotification({
            message:
              saved.kind === "idle"
                ? "The current app data could not be refreshed."
                : saved.kind === "unknown"
                  ? "The update outcome remains unknown and refresh failed. Do not submit the update again."
                  : "The app was saved, but refresh failed. Retry refresh, not the saved update.",
          });
        throw error;
      }
    },
    [isCurrentOwner, publishOutcome],
  );
  const iconBaseline = baseline;
  const isCurrentIconOwner = useCallback(() => {
    const current = host.current.baseline;
    return (
      current !== null &&
      current === iconBaseline &&
      current.fields === getAppBaselineIdentity(current.app) &&
      isCurrentOwner()
    );
  }, [iconBaseline, isCurrentOwner]);
  const iconPickerProps = useLegacyWidgetIconResources(isCurrentIconOwner, baseline?.app.iconUrl);
  const handleSubmit = useCallback(
    async (values: AppFormValues) => {
      const origin = captureSubmissionOwner();
      const pending = operation.current;
      if (!pending || !origin.isCurrent() || isIconWorkHeld()) throw new Error("App save owner unavailable");
      const prior = outcomeRef.current;
      if (prior.kind === "unknown") throw new Error("App update outcome is unknown");
      pending.submitted = { ...values };
      unacknowledgedIntent.current = { values: pending.submitted, baseline: pending.baseline, owner: pending.owner };
      const normalized = appManageSchema.parse(values);
      if (
        prior.kind !== "idle" &&
        (prior.kind !== "settled" ||
          (prior.formBaseline === pending.baseline && matchesSubmittedApp(prior.values, values)))
      ) {
        const read = await reconcile(origin, prior);
        if (!origin.isCurrent()) throw new Error("App save owner retired");
        if (!matchesSubmittedApp(prior.values, values) || !matchesSubmittedApp(read, normalized)) {
          const error = new Error("Current app values remain unacknowledged");
          setReadError(error);
          throw error;
        }
        if (isIconWorkHeld()) throw new Error("App icon work pending");
        return;
      }
      const current = host.current;
      const expected = currentAppDataRef.current;
      if (expected?.owner === pending.owner && matchesSubmittedApp(expected.app, normalized)) {
        const read = await reconcile(origin, { kind: "idle" });
        if (!origin.isCurrent()) throw new Error("App save owner retired");
        if (!matchesSubmittedApp(read, normalized)) {
          const error = new Error("Current app data changed before acknowledgement");
          setReadError(error);
          throw error;
        }
        if (isIconWorkHeld()) throw new Error("App icon work pending");
        return;
      }
      if (!current.query.isSuccess || current.query.isFetching || current.query.data.id !== current.appId) {
        const error = new Error("App baseline read unavailable");
        setReadError(error);
        throw error;
      }
      if (
        !expected ||
        expected.owner !== pending.owner ||
        expected.fields !== getAppBaselineIdentity(expected.app) ||
        expected.fields !== getAppBaselineIdentity(current.query.data)
      ) {
        const error = new Error("App baseline changed before submission");
        setReadError(error);
        throw error;
      }
      const source = {
        appId: current.appId,
        baseline: expected.app,
        session: captureLegacyWidgetSession(current.session.data),
      };
      let result: void;
      try {
        result = await current.mutation.mutateAsync({ id: current.appId, ...normalized });
      } catch (error) {
        publishOutcome({ kind: "unknown", values: { ...values }, source, error });
        if (origin.isCurrent())
          showErrorNotification({
            message: "The update outcome could not be confirmed. Refresh and check before submitting again.",
          });
        throw error;
      }
      const saved: SaveOutcome = {
        kind: "confirmed",
        values: { ...values },
        source,
        result,
        read: null,
        formBaseline: pending.baseline,
        error: null,
      };
      publishOutcome(saved);
      const read = await reconcile(origin, saved);
      if (!origin.isCurrent()) throw new Error("App save owner retired");
      if (!matchesSubmittedApp(read, normalized)) {
        const error = new Error("Saved app values no longer match current app data");
        setReadError(error);
        throw error;
      }
      if (isIconWorkHeld()) throw new Error("App icon work pending");
      if (origin.isCurrent())
        showSuccessNotification({
          title: tCommon("notification.update.success"),
          message: tAppEdit("notification.success.message"),
        });
    },
    [captureSubmissionOwner, isIconWorkHeld, publishOutcome, reconcile, tAppEdit, tCommon],
  );

  useImperativeHandle(
    handleRef,
    () => ({
      submitIfDirty: async (parent) => {
        const admitted = owner.current;
        const current = host.current;
        if (
          !parent.isCurrent() ||
          !isCurrentOwner() ||
          !admitted ||
          !current.baseline ||
          !appFormRef.current ||
          isIconWorkHeld() ||
          operation.current?.active
        )
          return false;
        const pending: NonNullable<typeof operation.current> = {
          active: true,
          parent,
          baseline: current.baseline,
          baselineFields: current.baseline.fields,
          owner: admitted,
          submitted: null,
        };
        operation.current = pending;
        try {
          if (outcomeRef.current.kind === "unknown") {
            await reconcile(captureSubmissionOwner(), outcomeRef.current);
            return false;
          }
          if (
            outcomeRef.current.kind === "idle" &&
            !unacknowledgedIntent.current &&
            !appFormRef.current.isDirty() &&
            !dirtyObservation.current
          ) {
            const data = currentAppDataRef.current;
            return (
              captureSubmissionOwner().isCurrent() &&
              host.current.query.isSuccess &&
              !host.current.query.isFetching &&
              data !== null &&
              data.owner === admitted &&
              data.fields === current.baseline.fields &&
              data.fields === getAppBaselineIdentity(host.current.query.data) &&
              !isIconWorkHeld()
            );
          }
          const submitted = await appFormRef.current.submit();
          const intent = unacknowledgedIntent.current;
          if (
            submitted &&
            captureSubmissionOwner().isCurrent() &&
            pending.submitted &&
            intent?.values === pending.submitted &&
            intent.baseline === pending.baseline &&
            intent.owner === pending.owner
          )
            unacknowledgedIntent.current = null;
          return (
            submitted &&
            captureSubmissionOwner().isCurrent() &&
            appFormRef.current !== null &&
            !isIconWorkHeld() &&
            !appFormRef.current.isDirty()
          );
        } catch {
          return false;
        } finally {
          pending.active = false;
          if (operation.current === pending) operation.current = null;
        }
      },
    }),
    [captureSubmissionOwner, isCurrentOwner, isIconWorkHeld, reconcile],
  );

  if (isLoadingApp) {
    return (
      <Center py="xl">
        <Loader />
      </Center>
    );
  }

  if ((isError || !app) && !baseline) {
    return (
      <Stack align="center" gap="md" py="xl">
        <Text c="dimmed">{tAppSelect("notFound")}</Text>
        <Button
          variant="light"
          onClick={async () => {
            const origin = host.current.capturePresentationOwner();
            if (!origin.isCurrent()) return;
            try {
              await host.current.query.refetch({ throwOnError: true });
            } catch (error) {
              if (origin.isCurrent())
                showErrorNotification({
                  message: error instanceof Error ? error.message : "App refresh failed",
                });
            }
          }}
        >
          {tCommon("action.tryAgain")}
        </Button>
      </Stack>
    );
  }

  return (
    <Stack>
      <Alert icon={<IconInfoCircle size="var(--mantine-font-size-md)" />} color="blue" variant="light">
        {tItemApp("propagationNotice")}
      </Alert>
      {baseline && (
        <AppForm
          key={baseline.fields}
          formRef={appFormRef}
          hideButtons
          showBackToOverview={false}
          buttonLabels={{ submit: "" }}
          initialValues={baseline.app}
          handleSubmit={handleSubmit}
          isPending={mutation.isPending || iconPickerProps.upload?.isPending === true}
          disabled={!isCurrentOwner() || outcome.kind === "unknown"}
          iconPickerProps={iconPickerProps}
          isCurrentOwner={isCurrentOwner}
          onDirtyChange={onDirtyChange}
          captureSubmissionOwner={captureSubmissionOwner}
        />
      )}
      {query.isError && baseline && (
        <Text component="output" aria-live="polite">
          {query.error.message}
        </Text>
      )}
      {readError instanceof Error && (
        <Text component="output" aria-live="polite">
          {readError.message}
        </Text>
      )}
      {(outcome.kind === "unknown" || outcome.kind === "reconcileheld") && (
        <Text component="output" aria-live="polite">
          {outcome.kind === "unknown"
            ? "The update outcome could not be confirmed. Refresh and check before submitting again."
            : "The app was saved, but refresh failed. Retry refresh, not the saved update."}
        </Text>
      )}
    </Stack>
  );
};
