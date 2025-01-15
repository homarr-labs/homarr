import { X509Certificate } from "node:crypto";
import { Card, Group, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { IconCertificate } from "@tabler/icons-react";
import dayjs from "dayjs";

import { loadCustomRootCertificatesAsync } from "@homarr/certificates/server";

import { AddCertificateButton } from "./_components/add-certificate";
import { RemoveCertificate } from "./_components/remove-certificate";

export default async function CertificatesPage() {
  const certificates = await loadCustomRootCertificatesAsync();
  const x509Certificates = certificates
    .map((cert) => ({
      ...cert,
      x509: new X509Certificate(cert.content),
    }))
    .sort((certA, certB) => certA.x509.validToDate.getTime() - certB.x509.validToDate.getTime());

  return (
    <>
      {/*<DynamicBreadcrumb />*/}

      <Stack>
        <Group justify="space-between">
          <Stack gap={4}>
            <Title>Trusted certificates</Title>
            <Text>The below certificates are used to request integrations or apps.</Text>
          </Stack>

          <AddCertificateButton />
        </Group>

        <SimpleGrid cols={{ sm: 1, lg: 2, xl: 3 }} spacing="lg">
          {x509Certificates.map((cert) => (
            <Card key={cert.x509.fingerprint} withBorder>
              <Group wrap="nowrap">
                <IconCertificate color={iconColor(cert.x509.validToDate)} size={32} stroke={1.5} />
                <Stack flex={1} gap="xs">
                  <Group justify="space-between">
                    <Text fw={500}>{cert.x509.subject}</Text>
                    <Text c="gray.6" ta="end" size="sm">
                      {cert.fileName}
                    </Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm" c="gray.6" title={cert.x509.validToDate.toISOString()}>
                      Expires {dayjs(cert.x509.validToDate).locale("en").fromNow()}
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
