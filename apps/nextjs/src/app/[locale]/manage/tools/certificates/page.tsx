import { X509Certificate } from "node:crypto";
import { notFound } from "next/navigation";
import { Card, Group, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { IconCertificate, IconCertificateOff } from "@tabler/icons-react";
import dayjs from "dayjs";

import { auth } from "@homarr/auth/next";
import { loadCustomRootCertificatesAsync } from "@homarr/certificates/server";
import { getMantineColor } from "@homarr/common";
import type { SupportedLanguage } from "@homarr/translation";
import { getI18n } from "@homarr/translation/server";

import { DynamicBreadcrumb } from "~/components/navigation/dynamic-breadcrumb";
import { NoResults } from "~/components/no-results";
import { AddCertificateButton } from "./_components/add-certificate";
import { RemoveCertificate } from "./_components/remove-certificate";

interface CertificatesPageProps {
  params: Promise<{
    locale: SupportedLanguage;
  }>;
}

export default async function CertificatesPage({ params }: CertificatesPageProps) {
  const session = await auth();
  if (!session?.user.permissions.includes("admin")) {
    notFound();
  }

  const { locale } = await params;
  const t = await getI18n();
  const certificates = await loadCustomRootCertificatesAsync();
  const x509Certificates = certificates
    .map((cert) => ({
      ...cert,
      x509: new X509Certificate(cert.content),
    }))
    .sort((certA, certB) => certA.x509.validToDate.getTime() - certB.x509.validToDate.getTime());

  return (
    <>
      <DynamicBreadcrumb />

      <Stack>
        <Group justify="space-between">
          <Stack gap={4}>
            <Title>{t("certificate.page.list.title")}</Title>
            <Text>{t("certificate.page.list.description")}</Text>
          </Stack>

          <AddCertificateButton />
        </Group>

        {x509Certificates.length === 0 && (
          <NoResults icon={IconCertificateOff} title={t("certificate.page.list.noResults.title")} />
        )}

        <SimpleGrid cols={{ sm: 1, lg: 2, xl: 3 }} spacing="lg">
          {x509Certificates.map((cert) => (
            <Card key={cert.x509.fingerprint} withBorder>
              <Group wrap="nowrap">
                <IconCertificate color={getMantineColor(iconColor(cert.x509.validToDate), 6)} size={32} stroke={1.5} />
                <Stack flex={1} gap="xs">
                  <Group justify="space-between">
                    <Text fw={500}>{cert.x509.subject}</Text>
                    <Text c="gray.6" ta="end" size="sm">
                      {cert.fileName}
                    </Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm" c="gray.6" title={cert.x509.validToDate.toISOString()}>
                      {t("certificate.page.list.expires", {
                        when: new Intl.RelativeTimeFormat(locale).format(
                          dayjs(cert.x509.validToDate).diff(dayjs(), "days"),
                          "days",
                        ),
                      })}
                    </Text>
                    <RemoveCertificate fileName={cert.fileName} />
                  </Group>
                </Stack>
              </Group>
            </Card>
          ))}
        </SimpleGrid>
      </Stack>
    </>
  );
}

const iconColor = (validTo: Date) => {
  const daysUntilInvalid = dayjs(validTo).diff(new Date(), "days");
  if (daysUntilInvalid < 1) return "red";
  if (daysUntilInvalid < 7) return "orange";
  if (daysUntilInvalid < 30) return "yellow";
  return "green";
};
