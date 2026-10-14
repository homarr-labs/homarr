import { Modal } from "@mantine/core";
import { useState } from "react";

import { CertificateDetailsView, PemContentView } from "../../source-ui/certificates";
import type { CertificateDetails, CertificateUiScope } from "./contracts";
import { canInspectCertificates } from "./contracts";

export interface PemContentModalProps {
  readonly scope: CertificateUiScope;
  readonly content: string;
  readonly opened: boolean;
  readonly onClose: () => void;
}

export function PemContentModal(props: PemContentModalProps) {
  const { scope } = props;
  if (!canInspectCertificates(scope)) return null;
  return (
    <Modal
      opened={props.opened}
      onClose={props.onClose}
      size="lg"
      title={scope.t("integration.testConnection.error.certificate.details.content.title")}
      closeButtonProps={{ "aria-label": scope.t("common.action.close") }}
    >
      <PemContentView content={props.content} closeLabel={scope.t("common.action.close")} onClose={props.onClose} />
    </Modal>
  );
}

export interface CertificateDetailsCardProps {
  readonly scope: CertificateUiScope;
  readonly certificate: CertificateDetails;
}

function CertificateDetailsContent({ scope, certificate }: CertificateDetailsCardProps) {
  const [opened, setOpened] = useState(false);
  const format = new Intl.DateTimeFormat(scope.locale, { dateStyle: "full", timeStyle: "long" });
  const prefix = "integration.testConnection.error.certificate.details";
  return (
    <>
      <CertificateDetailsView
        subject={certificate.subject}
        issuer={certificate.issuer}
        validFrom={format.format(certificate.validFrom)}
        validTo={format.format(certificate.validTo)}
        serialNumber={certificate.serialNumber}
        fingerprint={certificate.fingerprint}
        copy={{
          title: scope.t(`${prefix}.title`),
          description: scope.t(`${prefix}.description`),
          contentAction: scope.t(`${prefix}.content.action`),
          subject: scope.t("certificate.field.subject.label"),
          issuer: scope.t("certificate.field.issuer.label"),
          validFrom: scope.t("certificate.field.validFrom.label"),
          validTo: scope.t("certificate.field.validTo.label"),
          serialNumber: scope.t("certificate.field.serialNumber.label"),
          fingerprint: scope.t("certificate.field.fingerprint.label"),
        }}
        onOpenPem={() => setOpened(true)}
      />
      <PemContentModal scope={scope} opened={opened} content={certificate.pem} onClose={() => setOpened(false)} />
    </>
  );
}

export function CertificateDetailsCard(props: CertificateDetailsCardProps) {
  if (!canInspectCertificates(props.scope)) return null;
  return <CertificateDetailsContent key={`${props.scope.authorityKey}:${props.certificate.pem}`} {...props} />;
}

export function certificateChain(certificate: CertificateDetails): readonly CertificateDetails[] {
  const chain: CertificateDetails[] = [];
  const visited = new Set<CertificateDetails>();
  let current: CertificateDetails | undefined = certificate;
  while (current && !visited.has(current)) {
    visited.add(current);
    chain.push(current);
    current = current.issuerCertificate;
  }
  return chain;
}
