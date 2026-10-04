"use client";

import { Button, Card, Collapse, Stack } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";

import { revalidatePathActionAsync } from "@homarr/common/client";
import { useI18n } from "@homarr/translation/client";

import { CertificateUploadForm } from "./certificate-upload-form";

export const AddCertificateSection = () => {
  const [opened, { close, toggle }] = useDisclosure(false);
  const t = useI18n("certificate");

  return (
    <Stack gap="sm">
      <Button onClick={toggle} variant="default" aria-expanded={opened}>
        {t("action.create.label")}
      </Button>
      <Collapse expanded={opened}>
        <Card withBorder>
          <CertificateUploadForm
            onCancel={close}
            onSuccess={async () => {
              await revalidatePathActionAsync("/manage/tools/certificates");
              close();
            }}
          />
        </Card>
      </Collapse>
    </Stack>
  );
};

export { CertificateUploadForm };
