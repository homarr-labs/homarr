"use client";

import { createModal } from "@homarr/modals";

import { DockerTable } from "~/app/[locale]/manage/tools/docker/docker-table";

export const DockerQuickAccessModal = createModal<void>(() => <DockerTable />).withOptions({
  defaultTitle: (t) => t("docker.title"),
  size: 1400,
});
