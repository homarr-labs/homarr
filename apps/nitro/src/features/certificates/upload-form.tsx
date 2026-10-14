import { Fieldset, Stack } from "@mantine/core";
import { useState } from "react";
import { z } from "zod/v4";

import { checkCertificateFile } from "@homarr/validation/certificates";

import { CertificateUploadView } from "../../source-ui/certificates";
import type { CertificateUiScope } from "./contracts";
import { canInspectCertificates } from "./contracts";
import { CertificateMutationFeedback, CertificateWriteUnavailable, useCertificateMutation } from "./mutation";

export interface CertificateUploadFormProps {
  readonly scope: CertificateUiScope;
  readonly embedded?: boolean;
  readonly revision: string;
  readonly onSuccess: () => void | Promise<void>;
  readonly onComplete?: () => void;
  readonly onCancel?: () => void;
}

const certificateFileSchema = z.file().check(checkCertificateFile);

function certificateFileError(file: File | null, scope: CertificateUiScope): string | undefined {
  const result = certificateFileSchema.safeParse(file);
  if (result.success) return undefined;
  const issue = result.error.issues[0];
  if (issue?.code === "custom") {
    const i18n: unknown = issue.params?.i18n;
    if (typeof i18n === "object" && i18n !== null && "key" in i18n && typeof i18n.key === "string") {
      const values: Record<string, string | number> = {};
      if ("params" in i18n && typeof i18n.params === "object" && i18n.params !== null) {
        for (const [key, value] of Object.entries(i18n.params)) {
          if (typeof value === "string" || typeof value === "number") values[key] = value;
        }
      }
      return scope.t(`common.zod.errors.custom.${i18n.key}`, values);
    }
  }
  return scope.t("common.zod.errors.default");
}

function CertificateUploadContent(props: CertificateUploadFormProps) {
  const { scope } = props;
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string>();
  const mutation = useCertificateMutation(scope, props.revision);
  if (!canInspectCertificates(scope)) return null;

  function reset() {
    setFile(null);
    setError(undefined);
  }

  async function submit() {
    if (mutation.pending || mutation.blocked) return;
    const validationError = certificateFileError(file, scope);
    setError(validationError);
    const client = scope.client;
    if (validationError || !file || !client) return;
    const formData = new FormData();
    formData.set("file", file);
    const success = await mutation.run(
      (signal) => client.certificates.addCertificate(formData, { signal }),
      "certificate.action.create.notification",
      async () => {
        reset();
        await props.onSuccess();
      },
    );
    if (success) props.onComplete?.();
  }

  let cancel: (() => void) | undefined;
  if (props.onCancel) {
    cancel = () => {
      reset();
      props.onCancel?.();
    };
  }

  const writeDisabled = mutation.pending || mutation.blocked;
  const fileInputProps = {
    value: file,
    error,
    name: "file",
    disabled: writeDisabled,
    onChange: (value: File | null) => {
      setFile(value);
      setError(undefined);
    },
  };

  return (
    <Stack>
      <CertificateWriteUnavailable scope={scope} />
      <Fieldset
        variant="unstyled"
        p={0}
        m={0}
        ref={(fieldset) => {
          const buttons = fieldset?.querySelectorAll<HTMLButtonElement>("button");
          if (!buttons) return;
          const submissionButton = buttons.item(buttons.length - 1);
          if (submissionButton) submissionButton.disabled = writeDisabled;
        }}
      >
        <CertificateUploadView
          embedded={props.embedded}
          fileInputProps={fileInputProps}
          pending={mutation.pending}
          copy={{
            label: scope.t("certificate.action.create.label"),
            cancel: scope.t("common.action.cancel"),
            add: scope.t("common.action.add"),
          }}
          onCancel={cancel}
          onSubmit={submit}
        />
      </Fieldset>
      <CertificateMutationFeedback feedback={mutation.feedback} />
    </Stack>
  );
}

export function CertificateUploadForm(props: CertificateUploadFormProps) {
  if (!canInspectCertificates(props.scope)) return null;
  return <CertificateUploadContent key={`${props.scope.authorityKey}:${props.revision}`} {...props} />;
}
