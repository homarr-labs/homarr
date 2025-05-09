import { ActionIcon, Alert, Anchor, Button, Card, CopyButton, Group, SimpleGrid, Stack, Text } from "@mantine/core";
import { IconAlertTriangle, IconCheck, IconCopy, IconExclamationCircle } from "@tabler/icons-react";

import type { AnyMappedTestConnectionError, MappedCertificate } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { useSession } from "@homarr/auth/client";
import { getMantineColor } from "@homarr/common";
import { createId } from "@homarr/db/client";
import { createModal, useConfirmModal, useModalAction } from "@homarr/modals";
import { AddCertificateModal } from "@homarr/modals-collection";
import { useCurrentLocale, useI18n } from "@homarr/translation/client";

interface CertificateErrorDetailsProps {
  error: Extract<AnyMappedTestConnectionError, { type: "certificate" }>;
  url: string;
}

export const CertificateErrorDetails = ({ error, url }: CertificateErrorDetailsProps) => {
  const t = useI18n();
  const { data: session } = useSession();
  const isAdmin = session?.user.permissions.includes("admin") ?? false;

  const { openModal: openUploadModal } = useModalAction(AddCertificateModal);
  const { openConfirmModal } = useConfirmModal();
  const { mutateAsync: trustHostnameAsync } = clientApi.certificates.trustHostnameMismatch.useMutation();
  const { mutateAsync: addCertificateAsync } = clientApi.certificates.addCertificate.useMutation();

  const handleTrustHostname = () => {
    const { hostname } = new URL(url);
    openConfirmModal({
      title: "Trust hostname mismatch",
      children: "Are you sure you want to trust this hostname mismatch?",
      // eslint-disable-next-line no-restricted-syntax
      async onConfirm() {
        await trustHostnameAsync({
          hostname,
          thumbprint: error.data.certificate.fingerprint,
        });
      },
    });
  };

  const handleTrustSelfSigned = () => {
    const { hostname } = new URL(url);
    openConfirmModal({
      title: "Trust self signed certificate",
      children: "Are you sure you want to trust this self signed certificate?",
      // eslint-disable-next-line no-restricted-syntax
      async onConfirm() {
        const formData = new FormData();
        formData.append(
          "file",
          new File([error.data.certificate.pem], `${hostname}-${createId()}.crt`, {
            type: "application/x-x509-ca-cert",
          }),
        );
        await addCertificateAsync(formData);
      },
    });
  };

  const description = (
    <Text size="md">{t(`integration.testConnection.error.certificate.description.${error.data.reason}`)}</Text>
  );

  if (!isAdmin) {
    return (
      <>
        {description}
        <NotEnoughPermissionsAlert />
      </>
    );
  }

  return (
    <>
      {description}

      <CertificateDetailsCard certificate={error.data.certificate} />

      {error.data.reason === "hostnameMismatch" && <HostnameMismatchAlert />}

      {!error.data.certificate.isSelfSigned && error.data.reason === "untrusted" && <CertificateExtractAlert />}

      <Group>
        {(error.data.reason === "untrusted" && error.data.certificate.isSelfSigned) ||
        error.data.reason === "hostnameMismatch" ? (
          <Button
            variant="default"
            fullWidth
            onClick={error.data.reason === "hostnameMismatch" ? handleTrustHostname : handleTrustSelfSigned}
          >
            Trust certificate
          </Button>
        ) : null}
        {error.data.reason === "untrusted" && !error.data.certificate.isSelfSigned ? (
          <Button variant="default" fullWidth onClick={() => openUploadModal({})}>
            Upload certificate
          </Button>
        ) : null}
      </Group>
    </>
  );
};

const NotEnoughPermissionsAlert = () => {
  return (
    <Alert icon={<IconAlertTriangle size={16} />} title="Not enough permissions" color="yellow">
      You are not allowed to trust or upload certificates. Please contact your administrator to upload the necessary
      root certificate.
    </Alert>
  );
};

const HostnameMismatchAlert = () => {
  return (
    <Alert icon={<IconAlertTriangle size={16} />} title="Hostname mismatch" color="yellow">
      The hostname in the certificate does not match the hostname you are connecting to. This could indicate a security
      risk, but you can still choose to trust this certificate.
    </Alert>
  );
};

const CertificateExtractAlert = () => {
  return (
    <Alert icon={<IconExclamationCircle size={16} />} title="CA certificate extraction failed" color="red">
      Only self signed certificates without a chain can be fetched automatically. If you are using a self signed
      certificate, please make sure to upload the CA certificate manually. You can find instructions on how to do this
      here
    </Alert>
  );
};

interface CertificateDetailsProps {
  certificate: MappedCertificate;
}

export const CertificateDetailsCard = ({ certificate }: CertificateDetailsProps) => {
  const { openModal } = useModalAction(PemContentModal);
  const locale = useCurrentLocale();

  return (
    <Card withBorder>
      <Text fw={500}>Details</Text>
      <Group justify="space-between">
        <Text size="sm" c="dimmed">
          Review the certificate information before deciding to trust it
        </Text>
        <Anchor
          size="sm"
          ta="start"
          component="button"
          type="button"
          onClick={() => openModal({ content: certificate.pem })}
        >
          Show content
        </Anchor>
      </Group>

      <SimpleGrid cols={{ base: 1, md: 2 }} mt="md">
        <Stack gap={0}>
          <Text size="xs" c="dimmed">
            Subject
          </Text>
          <Text size="sm">{certificate.subject}</Text>
        </Stack>
        <Stack gap={0}>
          <Text size="xs" c="dimmed">
            Issuer
          </Text>
          <Text size="sm">{certificate.issuer}</Text>
        </Stack>
        <Stack gap={0}>
          <Text size="xs" c="dimmed">
            Valid From
          </Text>
          <Text size="sm">
            {new Intl.DateTimeFormat(locale, {
              dateStyle: "full",
              timeStyle: "long",
            }).format(certificate.validFrom)}
          </Text>
        </Stack>
        <Stack gap={0}>
          <Text size="xs" c="dimmed">
            Valid To
          </Text>
          <Text size="sm">
            {new Intl.DateTimeFormat(locale, {
              dateStyle: "full",
              timeStyle: "long",
            }).format(certificate.validTo)}
          </Text>
        </Stack>
        <Stack gap={0}>
          <Text size="xs" c="dimmed">
            Serial Number
          </Text>
          <Text size="sm">{certificate.serialNumber}</Text>
        </Stack>
      </SimpleGrid>

      <SimpleGrid cols={1} mt="md">
        <Stack gap={0}>
          <Text size="xs" c="dimmed">
            Fingerprint
          </Text>
          <Text size="sm">{certificate.fingerprint}</Text>
        </Stack>
      </SimpleGrid>
    </Card>
  );
};

const PemContentModal = createModal<{ content: string }>(({ actions, innerProps }) => {
  return (
    <Stack>
      <Card w="100%" pos="relative" bg="dark.6" fz="xs" p="sm">
        <pre
          style={{
            whiteSpace: "pre-wrap",
            wordWrap: "break-word",
          }}
        >
          {innerProps.content}
        </pre>
        <CopyButton value={innerProps.content}>
          {({ copy, copied }) => (
            <ActionIcon onClick={copy} pos="absolute" top={8} right={8} variant="default">
              {copied ? (
                <IconCheck size={16} stroke={1.5} color={getMantineColor("green", 6)} />
              ) : (
                <IconCopy size={16} stroke={1.5} />
              )}
            </ActionIcon>
          )}
        </CopyButton>
      </Card>

      <Button variant="light" color="gray" onClick={actions.closeModal}>
        Close
      </Button>
    </Stack>
  );
}).withOptions({
  defaultTitle: "PEM Certificate",
  size: "lg",
});
