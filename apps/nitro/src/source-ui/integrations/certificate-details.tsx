import { useState } from "react";
import { Modal } from "@mantine/core";

import { CertificateDetailsView, PemContentView } from "@homarr/ui/source-views/connections";
import type { CertificateDetailsViewProps } from "@homarr/ui/source-views/connections";

export interface IntegrationCertificateDetailsProps extends Omit<CertificateDetailsViewProps, "onOpenPem"> {
  pem: string;
  contentTitle: string;
  closeLabel: string;
}

export function IntegrationCertificateDetails({
  pem,
  contentTitle,
  closeLabel,
  ...props
}: IntegrationCertificateDetailsProps) {
  const [opened, setOpened] = useState(false);
  return (
    <>
      <CertificateDetailsView {...props} onOpenPem={() => setOpened(true)} />
      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title={contentTitle}
        size="lg"
        transitionProps={{ duration: 0 }}
      >
        <PemContentView content={pem} closeLabel={closeLabel} onClose={() => setOpened(false)} />
      </Modal>
    </>
  );
}
