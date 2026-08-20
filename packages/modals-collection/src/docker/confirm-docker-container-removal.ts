"use client";

import { useCallback } from "react";

import { useConfirmModal } from "@homarr/modals";
import { useI18n } from "@homarr/translation/client";

interface DockerContainerName {
  name: string;
}

export const createDockerRemovalConfirmation = (
  containers: DockerContainerName[],
  t: ReturnType<typeof useI18n<"docker.action.remove">>,
  confirmLabel: string,
  onConfirm: () => void | Promise<void>,
) => ({
  title: t("confirmation.title", { count: String(containers.length) }),
  children: t("confirmation.message", {
    count: String(containers.length),
    names: containers.map(({ name }) => name).join(", "),
  }),
  confirmProps: { children: confirmLabel, color: "red.9" },
  onConfirm,
});

export const useDockerContainerRemovalConfirmation = () => {
  const t = useI18n("docker.action.remove");
  const commonT = useI18n("common.action");
  const { openConfirmModal } = useConfirmModal();

  return useCallback(
    (containers: DockerContainerName[], onConfirm: () => void | Promise<void>) => {
      openConfirmModal(createDockerRemovalConfirmation(containers, t, commonT("remove"), onConfirm));
    },
    [commonT, openConfirmModal, t],
  );
};
