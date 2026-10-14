"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { Button, Stack, Text } from "@mantine/core";

import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";

import { AppForm } from "./_form";
import type { AppFormProps, AppFormValues } from "./_form";

export interface CreatedApp extends AppFormValues {
  id: string;
  appId: string;
}

export type AppCreateOutcome =
  | { kind: "idle" }
  | { kind: "unknown"; error: unknown }
  | { kind: "confirmed"; app: CreatedApp }
  | { kind: "reconcileheld"; app: CreatedApp; error: unknown }
  | { kind: "settled"; app: CreatedApp };

export interface AppCreateOutcomeLabels {
  unknown: string;
  reconcileheld: string;
}

export interface AppNewFormProps {
  showCreateAnother: boolean;
  showBackToOverview: boolean;
  createApp?: (values: AppFormValues) => Promise<CreatedApp>;
  onCreated: (app: CreatedApp) => Promise<void>;
  navigate: (href: string) => Promise<void>;
  isPending: boolean;
  iconPickerProps: AppFormProps["iconPickerProps"];
  isCurrentOwner: () => boolean;
  onDirtyChange: AppFormProps["onDirtyChange"];
  captureSubmissionOwner: AppFormProps["captureSubmissionOwner"];
  outcomeLabels: AppCreateOutcomeLabels;
}

export const AppNewForm = ({
  showCreateAnother,
  showBackToOverview,
  createApp,
  onCreated,
  navigate,
  isPending,
  iconPickerProps,
  isCurrentOwner,
  onDirtyChange,
  captureSubmissionOwner,
  outcomeLabels,
}: AppNewFormProps) => {
  const tScoped = useI18n("app.page.create.notification");
  const tCommon = useI18n("common");
  const owner = useRef({ active: false });
  const outcomeRef = useRef<AppCreateOutcome>({ kind: "idle" });
  const [outcome, setOutcome] = useState<AppCreateOutcome>(outcomeRef.current);
  const submitting = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const retryReconciliation = useRef<(() => Promise<void>) | null>(null);
  const submissionOwner = useRef<ReturnType<AppFormProps["captureSubmissionOwner"]> | null>(null);
  useLayoutEffect(() => {
    const lease = { active: true };
    owner.current = lease;
    return () => {
      lease.active = false;
    };
  }, [captureSubmissionOwner, isCurrentOwner, onDirtyChange]);
  const captureOwner = useCallback(() => {
    const lease = owner.current;
    const captured = captureSubmissionOwner();
    const origin = { isCurrent: () => lease.active && captured.isCurrent() && isCurrentOwner() };
    submissionOwner.current = origin;
    return origin;
  }, [captureSubmissionOwner, isCurrentOwner]);

  const publishOutcome = (next: AppCreateOutcome) => {
    outcomeRef.current = next;
    if (owner.current.active) setOutcome(next);
  };

  const handleSubmit = async (values: AppFormValues, redirect: boolean, afterSuccess?: () => void) => {
    const lease = owner.current;
    const captured = submissionOwner.current;
    const isCurrent = () => lease.active && captured !== null && captured.isCurrent();
    if (!createApp || !isCurrent() || submitting.current || outcomeRef.current.kind !== "idle")
      throw new Error("App creation unavailable");
    submitting.current = true;
    setIsSubmitting(true);
    let app: CreatedApp;
    try {
      app = await createApp(values);
    } catch (error) {
      publishOutcome({ kind: "unknown", error });
      submitting.current = false;
      if (lease.active) setIsSubmitting(false);
      if (isCurrent()) showErrorNotification({ message: outcomeLabels.unknown });
      throw error;
    }
    publishOutcome({ kind: "confirmed", app });
    let reconciled = false;
    let navigated = false;
    const reconcile = async () => {
      try {
        if (!reconciled) {
          await onCreated(app);
          reconciled = true;
        }
        if (redirect && isCurrent() && !navigated) {
          await navigate("/manage/apps");
          navigated = true;
        }
      } catch (error) {
        publishOutcome({ kind: "reconcileheld", app, error });
        if (isCurrent()) showErrorNotification({ message: outcomeLabels.reconcileheld });
        throw error;
      } finally {
        submitting.current = false;
        if (lease.active) setIsSubmitting(false);
      }
      publishOutcome({ kind: "settled", app });
      retryReconciliation.current = null;
      if (isCurrent()) {
        showSuccessNotification({
          title: tCommon("notification.create.success"),
          message: tScoped("success.message"),
        });
        if (isCurrent()) afterSuccess?.();
        if (!redirect && isCurrent()) {
          publishOutcome({ kind: "idle" });
        }
      }
    };
    retryReconciliation.current = async () => {
      if (!isCurrent() || submitting.current || outcomeRef.current.kind !== "reconcileheld") return;
      submitting.current = true;
      setIsSubmitting(true);
      await reconcile();
    };
    await reconcile();
  };

  return (
    <Stack>
      <AppForm
        buttonLabels={{
          submit: tCommon("action.create"),
          submitAndCreateAnother: showCreateAnother ? tCommon("action.createAnother") : undefined,
        }}
        showBackToOverview={showBackToOverview}
        handleSubmit={handleSubmit}
        isPending={isPending || isSubmitting}
        disabled={!createApp || outcome.kind !== "idle"}
        isCurrentOwner={isCurrentOwner}
        onDirtyChange={onDirtyChange}
        captureSubmissionOwner={captureOwner}
        iconPickerProps={iconPickerProps}
      />
      {(outcome.kind === "unknown" || outcome.kind === "reconcileheld") && (
        <Text component="output" aria-live="polite">
          {outcomeLabels[outcome.kind]}
        </Text>
      )}
      {outcome.kind === "reconcileheld" && (
        <Button
          variant="default"
          loading={isSubmitting}
          onClick={() => {
            void retryReconciliation.current?.().catch(() => {});
          }}
        >
          {tCommon("action.tryAgain")}
        </Button>
      )}
    </Stack>
  );
};
