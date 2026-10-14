import type { JSX } from "react";
import { useEffect, useRef, useState } from "react";
import { FileButton } from "@mantine/core";

import type { MaybePromise } from "@homarr/common/types";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";
import { supportedMediaUploadFormats } from "@homarr/validation/media";

export interface UploadMediaProps {
  children: (props: {
    onClick: () => void;
    loading: boolean;
    disabled: boolean;
    outcome: UploadMediaOutcome["kind"];
    retryReconciliation: (() => Promise<void>) | null;
  }) => JSX.Element;
  multiple?: boolean;
  onSettled?: () => MaybePromise<void>;
  onSuccess?: (media: { id: string; url: string }[]) => MaybePromise<void>;
  upload?: (formData: FormData) => Promise<string[]>;
  isPending?: boolean;
  isCurrentOwner: () => boolean;
  outcomeLabels: { unknown: string; reconcileheld: string };
}

export type UploadMediaOutcome =
  | { kind: "idle" }
  | { kind: "unknown"; error: unknown }
  | { kind: "confirmed"; mediaIds: string[] }
  | { kind: "reconcileheld"; mediaIds: string[]; error: unknown }
  | { kind: "settled"; mediaIds: string[] };

export const UploadMedia = ({
  children,
  onSettled,
  onSuccess,
  upload,
  isPending = false,
  multiple = false,
  isCurrentOwner,
  outcomeLabels,
}: UploadMediaProps) => {
  const t = useI18n();
  const submitting = useRef(false);
  const [isUploading, setIsUploading] = useState(false);
  const owner = useRef({ active: false });
  const outcomeRef = useRef<UploadMediaOutcome>({ kind: "idle" });
  const [outcome, setOutcome] = useState<UploadMediaOutcome>(outcomeRef.current);
  const retryReconciliation = useRef<(() => Promise<void>) | null>(null);
  useEffect(() => {
    const lease = { active: true };
    owner.current = lease;
    return () => {
      lease.active = false;
    };
  }, []);
  const publishOutcome = (next: UploadMediaOutcome) => {
    outcomeRef.current = next;
    if (owner.current.active) setOutcome(next);
  };

  const handleFileUploadAsync = async (files: File[] | File | null) => {
    const lease = owner.current;
    const isCurrent = () => lease.active && isCurrentOwner();
    if (
      !upload ||
      !isCurrent() ||
      outcomeRef.current.kind !== "idle" ||
      submitting.current ||
      isPending ||
      !files ||
      (Array.isArray(files) && files.length === 0)
    )
      return;
    const filesArray: File[] = Array.isArray(files) ? files : [files];
    const formData = new FormData();
    filesArray.forEach((file) => formData.append("files", file));
    submitting.current = true;
    setIsUploading(true);
    let mediaIds: string[];
    try {
      mediaIds = await upload(formData);
    } catch (error) {
      publishOutcome({ kind: "unknown", error });
      try {
        await onSettled?.();
      } finally {
        submitting.current = false;
        if (lease.active) setIsUploading(false);
        if (isCurrent()) showErrorNotification({ message: outcomeLabels.unknown });
      }
      return;
    }
    publishOutcome({ kind: "confirmed", mediaIds });
    const reconcile = async () => {
      try {
        try {
          await onSettled?.();
        } catch (error) {
          publishOutcome({ kind: "reconcileheld", mediaIds, error });
          if (isCurrent()) showErrorNotification({ message: outcomeLabels.reconcileheld });
          throw error;
        }
        retryReconciliation.current = null;
        publishOutcome({ kind: "settled", mediaIds });
        if (!isCurrent()) return;
        try {
          await onSuccess?.(mediaIds.map((id) => ({ id, url: `/api/user-medias/${id}` })));
        } catch (error) {
          publishOutcome({ kind: "reconcileheld", mediaIds, error });
          if (isCurrent()) showErrorNotification({ message: outcomeLabels.reconcileheld });
          throw error;
        }
        if (isCurrent()) {
          showSuccessNotification({ message: t("media.action.upload.notification.success.message") });
          publishOutcome({ kind: "idle" });
        }
      } finally {
        submitting.current = false;
        if (lease.active) setIsUploading(false);
      }
    };
    retryReconciliation.current = async () => {
      if (!isCurrent() || submitting.current || outcomeRef.current.kind !== "reconcileheld") return;
      submitting.current = true;
      setIsUploading(true);
      await reconcile();
    };
    await reconcile();
  };

  return (
    <FileButton
      disabled={!upload || isPending || isUploading || outcome.kind !== "idle"}
      onChange={(files) => {
        void handleFileUploadAsync(files).catch(() => {});
      }}
      accept={supportedMediaUploadFormats.join(",")}
      multiple={multiple}
    >
      {({ onClick }) =>
        children({
          onClick,
          loading: isPending || isUploading,
          disabled: !upload || isPending || isUploading || outcome.kind !== "idle",
          outcome: outcome.kind,
          retryReconciliation: outcome.kind === "reconcileheld" ? retryReconciliation.current : null,
        })
      }
    </FileButton>
  );
};
