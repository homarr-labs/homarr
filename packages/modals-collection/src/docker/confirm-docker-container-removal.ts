"use client";

import { useCallback } from "react";

import { useConfirmModal } from "@homarr/modals";
import { useScopedI18n } from "@homarr/translation/client";

interface DockerContainerName {
  name: string;
}

export const createDockerRemovalConfirmation = (
  containers: DockerContainerName[],
  t: ReturnType<typeof useScopedI18n<"docker.action.remove">>,
  onConfirm: () => void | Promise<void>,
) => ({
  title: t("confirmation.title", { count: String(containers.length) }),
  children: t("confirmation.message", {
    count: String(containers.length),
    names: containers.map(({ name }) => name).join(", "),
  }),
  confirmProps: { children: t("label"), color: "red.9" },
  onConfirm,
});

export const useDockerContainerRemovalConfirmation = () => {
  const t = useScopedI18n("docker.action.remove");
  const { openConfirmModal } = useConfirmModal();

  return useCallback(
    (containers: DockerContainerName[], onConfirm: () => void | Promise<void>) => {
      openConfirmModal(createDockerRemovalConfirmation(containers, t, onConfirm));
    },
    [openConfirmModal, t],
  );
};
