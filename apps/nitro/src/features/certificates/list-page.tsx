import type { ReactNode } from "react";
import { Alert, Button, Card, Collapse, Skeleton, Stack } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";

import { CertificatesManagementView } from "../../source-ui/certificates";
import type { CertificateListItemViewProps } from "../../source-ui/certificates";
import type { CertificateListEntry, CertificateReadView, CertificateUiScope } from "./contracts";
import { canInspectCertificates } from "./contracts";
import { CertificateWriteUnavailable } from "./mutation";
import { RemoveCertificate } from "./remove-actions";
import { CertificateUploadForm } from "./upload-form";

export function CertificateReadStatus({ kind }: { readonly kind: "loading" | "unavailable" | "failed" }) {
  if (kind === "loading") return <Skeleton height={120} aria-label="Loading certificates" />;
  let message = "Certificate list access is not bound in this runtime.";
  let color = "yellow";
  if (kind === "failed") {
    message = "Certificate data could not be loaded.";
    color = "red";
  }
  return (
    <Alert color={color} role="alert">
      {message}
    </Alert>
  );
}

export interface AddCertificateSectionProps {
  readonly scope: CertificateUiScope;
  readonly revision: string;
  readonly onChanged: () => void | Promise<void>;
}

export function AddCertificateSection(props: AddCertificateSectionProps) {
  const [opened, { close, toggle }] = useDisclosure(false);
  if (!canInspectCertificates(props.scope)) return null;
  return (
    <Stack gap="sm">
      <Button type="button" variant="default" onClick={toggle} aria-expanded={opened}>
        {props.scope.t("certificate.action.create.label")}
      </Button>
      <Collapse expanded={opened}>
        <Card withBorder>
          <CertificateUploadForm
            scope={props.scope}
            revision={props.revision}
            onCancel={close}
            onSuccess={props.onChanged}
            onComplete={close}
          />
        </Card>
      </Collapse>
    </Stack>
  );
}

export interface CertificatesPageProps {
  readonly scope: CertificateUiScope;
  readonly view: CertificateReadView<CertificateListEntry>;
  readonly breadcrumb?: ReactNode;
  readonly now: number;
  readonly daysUntilExpiration: (validTo: Date, now: number) => number;
  readonly onChanged: () => void | Promise<void>;
  readonly onHostnames: () => void;
}

function expirationColor(days: number) {
  if (days < 1) return "red";
  if (days < 7) return "orange";
  if (days < 30) return "yellow";
  return "green";
}

export function CertificatesPage(props: CertificatesPageProps) {
  const { scope, view } = props;
  if (!canInspectCertificates(scope)) return <CertificateReadStatus kind="unavailable" />;
  if (view.kind !== "ready") return <CertificateReadStatus kind={view.kind} />;
  if (view.authorityKey !== scope.authorityKey) return <CertificateReadStatus kind="unavailable" />;
  const entries = view.entries.toSorted((left, right) => {
    if (left.kind === "invalid") return -1;
    if (right.kind === "invalid") return 1;
    return left.certificate.validTo.getTime() - right.certificate.validTo.getTime();
  });
  const items = entries.map((entry): CertificateListItemViewProps => {
    const removeAction = (
      <RemoveCertificate
        key={`${scope.authorityKey}:${view.revision}:${entry.fileName}`}
        scope={scope}
        revision={view.revision}
        fileName={entry.fileName}
        onChanged={props.onChanged}
      />
    );
    if (entry.kind === "invalid") {
      return {
        fileName: entry.fileName,
        title: scope.t("certificate.page.list.invalid.title"),
        invalid: true,
        expirationColor: "red",
        description: scope.t("certificate.page.list.invalid.description"),
        removeAction,
      };
    }
    const days = props.daysUntilExpiration(entry.certificate.validTo, props.now);
    return {
      fileName: entry.fileName,
      title: entry.certificate.subject,
      invalid: false,
      expirationColor: expirationColor(days),
      description: scope.t("certificate.page.list.expires", {
        when: new Intl.RelativeTimeFormat(scope.locale).format(days, "days"),
      }),
      validTo: entry.certificate.validTo.toISOString(),
      removeAction,
    };
  });
  return (
    <Stack>
      <CertificateWriteUnavailable scope={scope} />
      <CertificatesManagementView
        breadcrumb={props.breadcrumb}
        title={scope.t("certificate.page.list.title")}
        description={scope.t("certificate.page.list.description")}
        hostnamesLabel={scope.t("certificate.page.list.toHostnames")}
        onHostnames={props.onHostnames}
        addSection={
          <AddCertificateSection
            key={`${scope.authorityKey}:${view.revision}`}
            scope={scope}
            revision={view.revision}
            onChanged={props.onChanged}
          />
        }
        emptyTitle={scope.t("certificate.page.list.noResults.title")}
        entries={items}
      />
    </Stack>
  );
}
