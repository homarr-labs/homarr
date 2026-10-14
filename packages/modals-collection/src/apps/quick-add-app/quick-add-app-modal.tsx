import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { Button, Stack, Text } from "@mantine/core";
import { AppForm } from "@homarr/forms-collection";
import type {
  AppCreateOutcome,
  AppCreateOutcomeLabels,
  AppFormProps,
  AppFormValues,
  CreatedApp,
} from "@homarr/forms-collection";
import { createModal, modalSizeForm } from "@homarr/modals";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";
import type { TranslationFunction } from "@homarr/translation";

export interface QuickAddAppModalProps {
  onClose: (createdApp: Omit<CreatedApp, "appId">) => void;
  createApp?: (values: AppFormValues) => Promise<CreatedApp>;
  onCreated: (app: CreatedApp) => Promise<void>;
  isPending: boolean;
  iconPickerProps: AppFormProps["iconPickerProps"];
  isCurrentOwner: () => boolean;
  onDirtyChange: AppFormProps["onDirtyChange"];
  captureSubmissionOwner: AppFormProps["captureSubmissionOwner"];
  outcomeLabels: AppCreateOutcomeLabels;
}

export interface QuickAddAppContentProps {
  innerProps: QuickAddAppModalProps;
  actions: { closeModal: () => void };
}

export const QuickAddAppContent = ({ actions, innerProps }: QuickAddAppContentProps) => {
  const tScoped = useI18n("app.page.create.notification");
  const tCommon = useI18n("common");
  const owner = useRef({ active: false });
  const outcomeRef = useRef<AppCreateOutcome>({ kind: "idle" });
  const [outcome, setOutcome] = useState<AppCreateOutcome>(outcomeRef.current);
  const submitting = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const retryReconciliation = useRef<(() => Promise<void>) | null>(null);
  const submissionOwner = useRef<ReturnType<AppFormProps["captureSubmissionOwner"]> | null>(null);
  const { captureSubmissionOwner, isCurrentOwner, onDirtyChange } = innerProps;
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
  const handleSubmit = async (values: AppFormValues) => {
    const lease = owner.current;
    const captured = submissionOwner.current;
    const isCurrent = () => lease.active && captured !== null && captured.isCurrent();
    if (!innerProps.createApp || !isCurrent() || submitting.current || outcomeRef.current.kind !== "idle")
      throw new Error("App creation unavailable");
    submitting.current = true;
    setIsSubmitting(true);
    let app: CreatedApp;
    try {
      app = await innerProps.createApp(values);
    } catch (error) {
      publishOutcome({ kind: "unknown", error });
      submitting.current = false;
      if (lease.active) setIsSubmitting(false);
      if (isCurrent()) showErrorNotification({ message: innerProps.outcomeLabels.unknown });
      throw error;
    }
    publishOutcome({ kind: "confirmed", app });
    const reconcile = async () => {
      try {
        await innerProps.onCreated(app);
      } catch (error) {
        publishOutcome({ kind: "reconcileheld", app, error });
        if (isCurrent()) showErrorNotification({ message: innerProps.outcomeLabels.reconcileheld });
        throw error;
      } finally {
        submitting.current = false;
        if (lease.active) setIsSubmitting(false);
      }
      publishOutcome({ kind: "settled", app });
      retryReconciliation.current = null;
      if (!isCurrent()) return;
      showSuccessNotification({
        title: tCommon("notification.create.success"),
        message: tScoped("success.message"),
      });
      if (isCurrent()) innerProps.onClose(app);
      if (isCurrent()) actions.closeModal();
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
          submitAndCreateAnother: undefined,
        }}
        showBackToOverview={false}
        handleSubmit={handleSubmit}
        isPending={innerProps.isPending || isSubmitting}
        disabled={!innerProps.createApp || outcome.kind !== "idle"}
        isCurrentOwner={innerProps.isCurrentOwner}
        onDirtyChange={onDirtyChange}
        captureSubmissionOwner={captureOwner}
        iconPickerProps={innerProps.iconPickerProps}
      />
      {(outcome.kind === "unknown" || outcome.kind === "reconcileheld") && (
        <Text component="output" aria-live="polite">
          {innerProps.outcomeLabels[outcome.kind]}
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

export const QuickAddAppModal = createModal<QuickAddAppModalProps>(QuickAddAppContent).withOptions({
  defaultTitle(t: TranslationFunction) {
    return t("app.action.create.title");
  },
  size: modalSizeForm,
});
