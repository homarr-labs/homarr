import { useState } from "react";
import { Accordion, Alert, Anchor, Button, Fieldset, FileInput, Group, Stack, Text } from "@mantine/core";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod/v4";

import { createId } from "@homarr/common/id";
import { getSafeApplicationUrl } from "@homarr/common/url";
import { createDocumentationLink } from "@homarr/definitions";
import { checkCertificateFile } from "@homarr/validation/certificates";
import { zodErrorMap } from "@homarr/validation/form/i18n";
import { useCurrentLocale, useI18n } from "@homarr/translation/standalone/client";

import type { Certificate, CertificateConnectionError, ConnectionError } from "./client";
import { useIntegrationAction, useIntegrationFeature } from "./provider";
import { IntegrationActionHolds, IntegrationCertificateDetails } from "../../source-ui/integrations";
import { useIntegrationRequestGeneration } from "./request-generation";
import classes from "./integrations.module.css";

export function IntegrationConnectionError({ error, url }: { error: ConnectionError; url: string }) {
  const t = useI18n();
  const causes: NonNullable<ConnectionError["cause"]>[] = [];
  let cause = error.cause;
  while (cause) {
    causes.push(cause);
    cause = cause.cause;
  }
  const responseUrl = error.type === "statusCode" ? getSafeApplicationUrl(error.data.url) : null;

  return (
    <Alert color="red" title={t(`integration.testConnection.error.${error.type}.title`)} role="alert">
      <Stack>
        {error.type === "request" ? (
          <Text>
            {t(`integration.testConnection.error.request.description.${error.data.type}.${error.data.reason}` as never)}
          </Text>
        ) : error.type === "statusCode" ? (
          <Text>
            {t.rich(
              error.data.reason === "other"
                ? "integration.testConnection.error.statusCode.otherDescription"
                : "integration.testConnection.error.statusCode.description",
              {
                statusCode: String(error.data.statusCode),
                reason:
                  error.data.reason === "other"
                    ? ""
                    : t(`integration.testConnection.error.statusCode.reason.${error.data.reason}`),
                url: () =>
                  responseUrl ? (
                    <Anchor href={responseUrl} target="_blank" rel="noopener noreferrer">
                      {error.data.url}
                    </Anchor>
                  ) : (
                    <Text component="span">{error.data.url}</Text>
                  ),
              },
            )}
          </Text>
        ) : error.type === "certificate" ? (
          <CertificateErrorDetails error={error} url={url} />
        ) : (
          <Text>{t(`integration.testConnection.error.${error.type}.description`)}</Text>
        )}
        {error.cause && (
          <Accordion variant="contained">
            <Accordion.Item value="cause">
              <Accordion.Control>{t("integration.testConnection.error.common.cause.title")}</Accordion.Control>
              <Accordion.Panel>
                <pre
                  className={classes.cause}
                >{`${error.name}: ${error.message}\n${causes.map((entry) => `caused by ${entry.name}${entry.message ? `: ${entry.message}` : ""} ${entry.metadata.map((item) => `${item.key}=${item.value}`).join(" ")}`).join("\n")}`}</pre>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>
        )}
      </Stack>
    </Alert>
  );
}

function CertificateErrorDetails({ error, url }: { error: CertificateConnectionError; url: string }) {
  let hostname: string | null = null;
  try {
    hostname = new URL(url).hostname || null;
  } catch {
    hostname = null;
  }
  return (
    <CertificateErrorDetailsContent
      key={JSON.stringify([hostname, error.data.reason, error.data.certificate])}
      error={error}
      hostname={hostname}
    />
  );
}

function CertificateErrorDetailsContent({
  error,
  hostname,
}: {
  error: CertificateConnectionError;
  hostname: string | null;
}) {
  const t = useI18n();
  const { client, principal, readOnly, notify } = useIntegrationFeature();
  const trustAvailability = useIntegrationAction("trust");
  const uploadAvailability = useIntegrationAction("uploadCertificate");
  const trustHeld = trustAvailability.state === "held";
  const uploadHeld = uploadAvailability.state === "held";
  const requests = useIntegrationRequestGeneration();
  const [confirmed, setConfirmed] = useState(false);
  const [readyToRetry, setReadyToRetry] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string>();
  const isAdmin = principal.kind === "authenticated" && principal.user.permissions.includes("admin");
  let root = error.data.certificate;
  while (root.issuerCertificate) root = root.issuerCertificate;
  const reason = error.data.reason;
  const notificationPrefix = reason === "hostnameMismatch" ? "hostnameMismatch" : "selfSigned";
  const trust = useMutation({
    mutationFn: async ({
      hostname: testedHostname,
      certificate,
      hostnameMismatch,
    }: {
      hostname: string;
      certificate: string;
      hostnameMismatch: boolean;
      generation: number;
    }) => {
      if (!isAdmin || readOnly || trustHeld) throw new Error("Certificate action unavailable");
      if (hostnameMismatch) {
        await client.certificates.trustHostnameMismatch({ hostname: testedHostname, certificate });
      } else {
        const data = new FormData();
        data.set(
          "file",
          new File([certificate], `${testedHostname}-${createId()}.crt`, { type: "application/x-x509-ca-cert" }),
        );
        await client.certificates.addCertificate(data);
      }
    },
    retry: false,
    onSuccess: (_, { generation }) => {
      if (!requests.isCurrent(generation)) return;
      setReadyToRetry(true);
      setConfirmed(false);
      notify({
        color: "green",
        title: t(`integration.testConnection.error.certificate.${notificationPrefix}.notification.success.title`),
        message: t(`integration.testConnection.error.certificate.${notificationPrefix}.notification.success.message`),
      });
    },
    onError: (_, { generation }) => {
      if (!requests.isCurrent(generation)) return;
      notify({
        color: "red",
        title: t(`integration.testConnection.error.certificate.${notificationPrefix}.notification.error.title`),
        message: t(`integration.testConnection.error.certificate.${notificationPrefix}.notification.error.message`),
      });
    },
  });
  const upload = useMutation({
    mutationFn: async ({ certificate }: { certificate: File; generation: number }) => {
      if (!isAdmin || readOnly || uploadHeld) throw new Error("Certificate action unavailable");
      const data = new FormData();
      data.set("file", certificate);
      await client.certificates.addCertificate(data);
    },
    retry: false,
    onSuccess: (_, { generation }) => {
      if (!requests.isCurrent(generation)) return;
      setReadyToRetry(true);
      setUploading(false);
      setFile(null);
      notify({
        color: "green",
        title: t("certificate.action.create.notification.success.title"),
        message: t("certificate.action.create.notification.success.message"),
      });
    },
    onError: (_, { generation }) => {
      if (!requests.isCurrent(generation)) return;
      notify({
        color: "red",
        title: t("certificate.action.create.notification.error.title"),
        message: t("certificate.action.create.notification.error.message"),
      });
    },
  });
  const canTrust = reason === "hostnameMismatch" || (reason === "untrusted" && root.isSelfSigned);

  return (
    <Stack>
      <Text>{t(`integration.testConnection.error.certificate.description.${reason}`)}</Text>
      {!isAdmin ? (
        <Alert color="yellow" title={t("integration.testConnection.error.certificate.alert.permission.title")}>
          {t("integration.testConnection.error.certificate.alert.permission.message")}
        </Alert>
      ) : (
        <>
          <CertificateDetails certificate={root} />
          <IntegrationActionHolds availability={[trustAvailability, uploadAvailability]} />
          {reason === "hostnameMismatch" && (
            <Alert
              color="yellow"
              title={t("integration.testConnection.error.certificate.alert.hostnameMismatch.title")}
            >
              {t("integration.testConnection.error.certificate.alert.hostnameMismatch.message")}
            </Alert>
          )}
          {!root.isSelfSigned && reason === "untrusted" && (
            <Alert color="red" title={t("integration.testConnection.error.certificate.alert.extract.title")}>
              {t.rich("integration.testConnection.error.certificate.alert.extract.message", {
                docsLink: () => (
                  <Anchor
                    href={createDocumentationLink("/docs/management/certificates", "#obtaining-certificates")}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t("common.here")}
                  </Anchor>
                ),
              })}
            </Alert>
          )}
          {readyToRetry && (
            <Button type="submit" variant="default" fullWidth>
              {t("integration.testConnection.error.certificate.action.retry.label")}
            </Button>
          )}
          {canTrust && (
            <Group grow>
              <Button
                type="button"
                variant="default"
                disabled={readOnly || trustHeld || !hostname || upload.isPending}
                loading={trust.isPending}
                onClick={() => {
                  if (!hostname || readOnly || trustHeld || trust.isPending || upload.isPending) return;
                  if (!confirmed) {
                    setConfirmed(true);
                    return;
                  }
                  trust.mutate({
                    hostname,
                    certificate: reason === "hostnameMismatch" ? error.data.certificate.pem : root.pem,
                    hostnameMismatch: reason === "hostnameMismatch",
                    generation: requests.begin(),
                  });
                }}
              >
                {t(
                  confirmed
                    ? `integration.testConnection.error.certificate.${notificationPrefix}.confirm.title`
                    : "integration.testConnection.error.certificate.action.trust.label",
                )}
              </Button>
              {confirmed && (
                <Button
                  type="button"
                  variant="subtle"
                  disabled={trust.isPending}
                  onClick={() => {
                    requests.invalidate();
                    setConfirmed(false);
                  }}
                >
                  {t("common.action.cancel")}
                </Button>
              )}
            </Group>
          )}
          {reason === "untrusted" &&
            !root.isSelfSigned &&
            (!uploading ? (
              <Button
                type="button"
                variant="default"
                disabled={readOnly || uploadHeld}
                onClick={() => setUploading(true)}
              >
                {t("integration.testConnection.error.certificate.action.upload.label")}
              </Button>
            ) : (
              <Fieldset>
                <Stack>
                  <FileInput
                    label={t("certificate.action.create.label")}
                    value={file}
                    disabled={upload.isPending || readOnly}
                    error={fileError}
                    onChange={(value) => {
                      setFile(value);
                      setFileError(undefined);
                    }}
                  />
                  <Group justify="end">
                    <Button
                      type="button"
                      variant="subtle"
                      disabled={upload.isPending}
                      onClick={() => {
                        requests.invalidate();
                        setUploading(false);
                        setFile(null);
                      }}
                    >
                      {t("common.action.cancel")}
                    </Button>
                    <Button
                      type="button"
                      loading={upload.isPending}
                      disabled={readOnly || uploadHeld}
                      onClick={() => {
                        const validation = z
                          .file()
                          .check(checkCertificateFile)
                          .safeParse(file, { error: zodErrorMap(t) });
                        if (!validation.success) {
                          setFileError(validation.error.issues[0]?.message ?? t("common.error"));
                          return;
                        }
                        if (readOnly || uploadHeld || upload.isPending || trust.isPending) return;
                        upload.mutate({ certificate: validation.data, generation: requests.begin() });
                      }}
                    >
                      {t("common.action.add")}
                    </Button>
                  </Group>
                </Stack>
              </Fieldset>
            ))}
        </>
      )}
    </Stack>
  );
}

function CertificateDetails({ certificate }: { certificate: Certificate }) {
  const t = useI18n();
  const locale = useCurrentLocale();
  return (
    <IntegrationCertificateDetails
      subject={certificate.subject}
      issuer={certificate.issuer}
      validFrom={new Intl.DateTimeFormat(locale, { dateStyle: "full", timeStyle: "long" }).format(
        new Date(certificate.validFrom),
      )}
      validTo={new Intl.DateTimeFormat(locale, { dateStyle: "full", timeStyle: "long" }).format(
        new Date(certificate.validTo),
      )}
      serialNumber={certificate.serialNumber}
      fingerprint={certificate.fingerprint}
      pem={certificate.pem}
      contentTitle={t("integration.testConnection.error.certificate.details.content.title")}
      closeLabel={t("common.action.close")}
      copy={{
        title: t("integration.testConnection.error.certificate.details.title"),
        description: t("integration.testConnection.error.certificate.details.description"),
        contentAction: t("integration.testConnection.error.certificate.details.content.action"),
        subject: t("certificate.field.subject.label"),
        issuer: t("certificate.field.issuer.label"),
        validFrom: t("certificate.field.validFrom.label"),
        validTo: t("certificate.field.validTo.label"),
        serialNumber: t("certificate.field.serialNumber.label"),
        fingerprint: t("certificate.field.fingerprint.label"),
      }}
    />
  );
}
