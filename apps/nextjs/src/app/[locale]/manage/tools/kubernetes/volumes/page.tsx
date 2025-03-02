import { notFound } from "next/navigation";
import { Stack, Title } from "@mantine/core";

import { api } from "@homarr/api/server";
import { auth } from "@homarr/auth/next";
import { env } from "@homarr/docker/env";

import { VolumesTable } from "~/app/[locale]/manage/tools/kubernetes/volumes/volumes-table";
import { DynamicBreadcrumb } from "~/components/navigation/dynamic-breadcrumb";

export default async function ConfigMapsPage() {
  const session = await auth();
  if (!(session?.user.permissions.includes("admin") && env.ENABLE_KUBERNETES)) {
    notFound();
  }

  const volumes = await api.kubernetes.volumes.getVolumes();
  return (
    <>
      <DynamicBreadcrumb />
      <Stack>
        <Title order={1}>Volumes</Title>
        <VolumesTable initialVolumes={volumes} />
      </Stack>
    </>
  );
}
