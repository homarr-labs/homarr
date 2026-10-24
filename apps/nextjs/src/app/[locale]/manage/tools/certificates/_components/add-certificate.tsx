"use client";

import type { PropsWithChildren } from "react";
import { Button, Card, Collapse, Group, Stack, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";

import { revalidatePathActionAsync } from "@homarr/common/client";
import { useI18n } from "@homarr/translation/client";
import { Link } from "@homarr/ui";

import { ManagePageHeader } from "~/components/manage/manage-page-layout";
import { CertificateUploadForm } from "./certificate-upload-form";

export const CertificatesPageContent = ({ children }: PropsWithChildren) => {
  const [opened, { close, toggle }] = useDisclosure(false);
  const t = useI18n("certificate");

  return (
    <Stack>
      <ManagePageHeader
        title={t("page.list.title")}
        primaryAction={
          <Group>
            <Button variant="default" component={Link} href="/manage/tools/certificates/hostnames">
              {t("page.list.toHostnames")}
            </Button>
            <Button onClick={toggle} aria-expanded={opened}>
              {t("action.create.label")}
            </Button>
          </Group>
        }
      />
      <Text>{t("page.list.description")}</Text>
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
      {children}
    </Stack>
  );
};

export { CertificateUploadForm };
