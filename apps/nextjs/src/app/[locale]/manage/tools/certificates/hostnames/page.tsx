import { X509Certificate } from "node:crypto";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Button,
  Group,
  Stack,
  Table,
  TableTbody,
  TableTd,
  TableTh,
  TableThead,
  TableTr,
  Text,
  Title,
} from "@mantine/core";
import { IconCertificateOff } from "@tabler/icons-react";

import { auth } from "@homarr/auth/next";
import { getTrustedCertificateHostnamesAsync } from "@homarr/certificates/server";
import { getI18n } from "@homarr/translation/server";

import { DynamicBreadcrumb } from "~/components/navigation/dynamic-breadcrumb";
import { NoResults } from "~/components/no-results";
import { RemoveHostnameActionIcon } from "./_components/remove-hostname";

export default async function TrustedHostnamesPage() {
  const session = await auth();
  if (!session?.user.permissions.includes("admin")) {
    notFound();
  }

  const t = await getI18n();

  const trustedHostnames = await getTrustedCertificateHostnamesAsync().then((hostnames) => {
    return hostnames.map((hostname) => {
      let subject: string | null;
      try {
        subject = new X509Certificate(hostname.certificate).subject;
      } catch {
        subject = null;
      }
      return {
        ...hostname,
        subject,
      };
    });
  });

  return (
    <>
      <DynamicBreadcrumb />

      <Stack>
        <Group justify="space-between">
          <Stack gap={4}>
            <Title>Trusted certificate hostnames</Title>
            <Text>
              Some certificates did not allow the specific domain Homarr uses to request them, because of this all
              trusted hostnames with their certificate thumbprints are used to bypass this restrictions.
            </Text>
          </Stack>

          <Button variant="default" component={Link} href="/manage/tools/certificates">
            Certificates
          </Button>
        </Group>

        {trustedHostnames.length === 0 && (
          <NoResults icon={IconCertificateOff} title="There are no trusted hostnames yet" />
        )}

        {trustedHostnames.length >= 1 && (
          <Table>
            <TableThead>
              <TableTr>
                <TableTh>Hostname</TableTh>
                <TableTh>Subject</TableTh>
                <TableTh>Fingerprint</TableTh>
                <TableTh></TableTh>
              </TableTr>
            </TableThead>
            <TableTbody>
              {trustedHostnames.map(({ hostname, subject, thumbprint }) => (
                <TableTr key={`${hostname}-${thumbprint}`}>
                  <TableTd>{hostname}</TableTd>
                  <TableTd>{subject}</TableTd>
                  <TableTd>{thumbprint}</TableTd>
                  <TableTd>
                    <Group justify="end">
                      <RemoveHostnameActionIcon hostname={hostname} thumbprint={thumbprint} />
                    </Group>
                  </TableTd>
                </TableTr>
              ))}
            </TableTbody>
          </Table>
        )}
      </Stack>
    </>
  );
}
