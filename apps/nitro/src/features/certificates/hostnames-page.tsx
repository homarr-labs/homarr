import type { ReactNode } from "react";
import { Stack } from "@mantine/core";

import { TrustedHostnamesManagementView } from "../../source-ui/certificates";
import type { CertificateReadView, CertificateUiScope, TrustedHostnameEntry } from "./contracts";
import { canInspectCertificates } from "./contracts";
import { CertificateReadStatus } from "./list-page";
import { CertificateWriteUnavailable } from "./mutation";
import { RemoveHostnameActionIcon } from "./remove-actions";

export interface TrustedHostnamesPageProps {
  readonly scope: CertificateUiScope;
  readonly view: CertificateReadView<TrustedHostnameEntry>;
  readonly breadcrumb?: ReactNode;
  readonly onChanged: () => void | Promise<void>;
  readonly onCertificates: () => void;
}

export function TrustedHostnamesPage(props: TrustedHostnamesPageProps) {
  const { scope, view } = props;
  if (!canInspectCertificates(scope)) return <CertificateReadStatus kind="unavailable" />;
  if (view.kind !== "ready") return <CertificateReadStatus kind={view.kind} />;
  if (view.authorityKey !== scope.authorityKey) return <CertificateReadStatus kind="unavailable" />;
  return (
    <Stack>
      <CertificateWriteUnavailable scope={scope} />
      <TrustedHostnamesManagementView
        breadcrumb={props.breadcrumb}
        title={scope.t("certificate.page.hostnames.title")}
        description={scope.t("certificate.page.hostnames.description")}
        certificatesLabel={scope.t("certificate.page.hostnames.toCertificates")}
        onCertificates={props.onCertificates}
        emptyTitle={scope.t("certificate.page.hostnames.noResults.title")}
        columns={{
          hostname: scope.t("certificate.field.hostname.label"),
          subject: scope.t("certificate.field.subject.label"),
          fingerprint: scope.t("certificate.field.fingerprint.label"),
        }}
        entries={view.entries.map((entry) => ({
          ...entry,
          removeAction: (
            <RemoveHostnameActionIcon
              key={`${scope.authorityKey}:${view.revision}:${entry.hostname}:${entry.thumbprint}`}
              scope={scope}
              revision={view.revision}
              hostname={entry.hostname}
              thumbprint={entry.thumbprint}
              onChanged={props.onChanged}
            />
          ),
        }))}
      />
    </Stack>
  );
}
