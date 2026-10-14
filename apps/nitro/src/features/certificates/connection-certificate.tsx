import { Alert, Anchor, Button, Card, DEFAULT_THEME, Stack, Text } from "@mantine/core";
import { IconAlertTriangle, IconExclamationCircle, IconRepeat } from "@tabler/icons-react";
import { useState } from "react";

import { createId } from "@homarr/common/id";

import type { CertificateConnectionError, CertificateUiScope } from "./contracts";
import { canInspectCertificates } from "./contracts";
import { ConfirmCertificateAction } from "./confirm-action";
import { certificateChain, CertificateDetailsCard } from "./details";
import { CertificateMutationFeedback, CertificateWriteUnavailable, useCertificateMutation } from "./mutation";
import { CertificateUploadForm } from "./upload-form";

export interface CertificateErrorDetailsProps {
  readonly scope: CertificateUiScope;
  readonly error: CertificateConnectionError;
  readonly url: string;
  readonly attemptKey: string;
  readonly onRetry: () => void;
  readonly onTrustChanged: () => void | Promise<void>;
}

function certificateDocumentationTags(scope: CertificateUiScope) {
  return {
    docsLink: () => (
      <Anchor
        href="https://homarr.dev/docs/management/certificates#obtaining-certificates"
        target="_blank"
        rel="noreferrer noopener"
      >
        {scope.t("common.here")}
      </Anchor>
    ),
  };
}

function CertificateErrorContent(props: CertificateErrorDetailsProps) {
  const { scope, error } = props;
  const [showRetryButton, setShowRetryButton] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const mutation = useCertificateMutation(scope, props.attemptKey);
  const chain = certificateChain(error.data.certificate);
  const rootCertificate = chain.at(-1) ?? error.data.certificate;
  const hostnameMismatch = error.data.reason === "hostnameMismatch";
  const untrusted = error.data.reason === "untrusted";
  const prefix = "integration.testConnection.error.certificate";

  async function trust() {
    const client = scope.client;
    if (!client) return false;
    const success = await mutation.run(
      async (signal) => {
        const { hostname } = new URL(props.url);
        if (hostnameMismatch) {
          await client.certificates.trustHostnameMismatch(
            { hostname, certificate: error.data.certificate.pem },
            { signal },
          );
          return;
        }
        const formData = new FormData();
        formData.append(
          "file",
          new File([rootCertificate.pem], `${hostname}-${createId()}.crt`, {
            type: "application/x-x509-ca-cert",
          }),
        );
        await client.certificates.addCertificate(formData, { signal });
      },
      `${prefix}.${hostnameMismatch ? "hostnameMismatch" : "selfSigned"}.notification`,
      props.onTrustChanged,
    );
    if (success) setShowRetryButton(true);
    return success;
  }

  return (
    <>
      <Text size="md">{scope.t(`${prefix}.description.${error.data.reason}`)}</Text>
      <CertificateDetailsCard scope={scope} certificate={rootCertificate} />
      {hostnameMismatch && (
        <Alert
          icon={<IconAlertTriangle size={16} />}
          color="yellow"
          title={scope.t(`${prefix}.alert.hostnameMismatch.title`)}
        >
          {scope.t(`${prefix}.alert.hostnameMismatch.message`)}
        </Alert>
      )}
      {!rootCertificate.isSelfSigned && untrusted && (
        <Alert icon={<IconExclamationCircle size={16} />} color="red" title={scope.t(`${prefix}.alert.extract.title`)}>
          {scope.rich(`${prefix}.alert.extract.message`, certificateDocumentationTags(scope))}
        </Alert>
      )}
      {(untrusted || hostnameMismatch) && <CertificateWriteUnavailable scope={scope} />}
      <CertificateMutationFeedback feedback={mutation.feedback} />
      {showRetryButton && (
        <Button
          type="button"
          variant="default"
          fullWidth
          leftSection={<IconRepeat size={16} color={DEFAULT_THEME.colors.blue[6]} stroke={1.5} />}
          onClick={props.onRetry}
        >
          {scope.t(`${prefix}.action.retry.label`)}
        </Button>
      )}
      {((untrusted && rootCertificate.isSelfSigned) || hostnameMismatch) && (
        <ConfirmCertificateAction
          label={scope.t(`${prefix}.action.trust.label`)}
          confirmLabel={scope.t(`${prefix}.${hostnameMismatch ? "hostnameMismatch" : "selfSigned"}.confirm.title`)}
          fullWidth
          pending={mutation.pending}
          disabled={mutation.blocked}
          onConfirm={trust}
        />
      )}
      {untrusted && !rootCertificate.isSelfSigned && (
        <Stack gap="sm">
          {!showUploadForm && (
            <Button type="button" variant="default" fullWidth onClick={() => setShowUploadForm(true)}>
              {scope.t(`${prefix}.action.upload.label`)}
            </Button>
          )}
          {showUploadForm && (
            <Card withBorder>
              <CertificateUploadForm
                scope={scope}
                embedded
                revision={props.attemptKey}
                onCancel={() => setShowUploadForm(false)}
                onSuccess={props.onTrustChanged}
                onComplete={() => {
                  setShowRetryButton(true);
                  setShowUploadForm(false);
                }}
              />
            </Card>
          )}
        </Stack>
      )}
    </>
  );
}

export function CertificateErrorDetails(props: CertificateErrorDetailsProps) {
  const { scope, error } = props;
  if (scope.signal.aborted) return null;
  if (!canInspectCertificates(scope)) {
    return (
      <>
        <Text size="md">
          {scope.t(`integration.testConnection.error.certificate.description.${error.data.reason}`)}
        </Text>
        <Alert
          icon={<IconAlertTriangle size={16} />}
          color="yellow"
          title={scope.t("integration.testConnection.error.certificate.alert.permission.title")}
        >
          {scope.t("integration.testConnection.error.certificate.alert.permission.message")}
        </Alert>
      </>
    );
  }
  return (
    <CertificateErrorContent
      key={`${scope.authorityKey}:${props.attemptKey}:${props.url}:${error.data.reason}:${error.data.certificate.pem}`}
      {...props}
    />
  );
}
