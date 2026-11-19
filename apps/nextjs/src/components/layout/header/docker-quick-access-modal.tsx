"use client";

import dynamic from "next/dynamic";

import { createModal } from "@homarr/modals";

const DockerTable = dynamic(() =>
  import("~/app/[locale]/manage/tools/docker/docker-table").then((module) => module.DockerTable),
);

export const DockerQuickAccessModal = createModal<void>(() => <DockerTable />).withOptions({
  defaultTitle: (t) => t("docker.title"),
  size: 1400,
});
