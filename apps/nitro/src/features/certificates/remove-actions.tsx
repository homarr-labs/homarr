import { Stack } from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";

import { InlineConfirmActionIcon } from "../../source-ui/certificates";
import type { CertificateUiScope } from "./contracts";
import { canInspectCertificates } from "./contracts";
import { CertificateMutationFeedback, useCertificateMutation } from "./mutation";

export interface RemoveCertificateProps {
  readonly scope: CertificateUiScope;
  readonly fileName: string;
  readonly revision: string;
  readonly onChanged: () => void | Promise<void>;
}

export function RemoveCertificate(props: RemoveCertificateProps) {
  const { scope } = props;
  const mutation = useCertificateMutation(scope, `${props.revision}:${props.fileName}`);
  if (!canInspectCertificates(scope)) return null;
  return (
    <Stack gap="xs">
      <InlineConfirmActionIcon
        aria-label={scope.t("certificate.action.remove.label")}
        confirmLabel={scope.t("common.action.confirm")}
        confirmationAriaLabel={scope.t("common.action.confirm")}
        color="red"
        variant="subtle"
        disabled={mutation.blocked}
        loading={mutation.pending}
        onConfirm={async () => {
          const client = scope.client;
          if (!client) return;
          await mutation.run(
            (signal) => client.certificates.removeCertificate({ fileName: props.fileName }, { signal }),
            "certificate.action.remove.notification",
            props.onChanged,
          );
        }}
      >
        <IconTrash color="red" size={16} />
      </InlineConfirmActionIcon>
      <CertificateMutationFeedback feedback={mutation.feedback} />
    </Stack>
  );
}

export interface RemoveHostnameProps {
  readonly scope: CertificateUiScope;
  readonly hostname: string;
  readonly thumbprint: string;
  readonly revision: string;
  readonly onChanged: () => void | Promise<void>;
}

export function RemoveHostnameActionIcon(props: RemoveHostnameProps) {
  const { scope } = props;
  const mutation = useCertificateMutation(scope, `${props.revision}:${props.hostname}:${props.thumbprint}`);
  if (!canInspectCertificates(scope)) return null;
  return (
    <Stack gap="xs">
      <InlineConfirmActionIcon
        aria-label={scope.t("certificate.action.removeHostname.label")}
        confirmLabel={scope.t("common.action.confirm")}
        confirmationAriaLabel={scope.t("common.action.confirm")}
        color="red"
        variant="subtle"
        disabled={mutation.blocked}
        loading={mutation.pending}
        onConfirm={async () => {
          const client = scope.client;
          if (!client) return;
          await mutation.run(
            (signal) =>
              client.certificates.removeTrustedHostname(
                { hostname: props.hostname, thumbprint: props.thumbprint },
                { signal },
              ),
            "certificate.action.removeHostname.notification",
            props.onChanged,
          );
        }}
      >
        <IconTrash color="red" size={16} stroke={1.5} />
      </InlineConfirmActionIcon>
      <CertificateMutationFeedback feedback={mutation.feedback} />
    </Stack>
  );
}
