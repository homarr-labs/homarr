import { useLayoutEffect, useRef, useState } from "react";
import { Alert } from "@mantine/core";

import { buildDockerServiceUrlCandidates } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/standalone/client";
import { appHrefSchema } from "@homarr/validation/app";

import { DockerAddAppsView } from "../../source-ui/docker";
import type { DockerViewContainer } from "../../source-ui/docker";

export interface DockerAppContainer extends DockerViewContainer {
  host: string;
  ports: Parameters<typeof buildDockerServiceUrlCandidates>[0]["ports"];
}

export interface DockerAppCreationInput {
  name: string;
  iconUrl: string | null;
  description: null;
  href: string | null;
  pingUrl: null;
}

export interface DockerAddAppsDialogProps {
  selectedContainers: DockerAppContainer[];
  initialUrls?: (string | null)[];
  canCreate: boolean;
  readOnly: boolean;
  unavailableReason?: string;
  onClose: () => void;
  onCreate?: (apps: DockerAppCreationInput[]) => Promise<void>;
  onFeedback?: (feedback: { kind: "success" | "error"; title: string; message: string }) => void;
  isCurrentOwner?: () => boolean;
}

export function DockerAddAppsDialog(props: DockerAddAppsDialogProps) {
  const t = useI18n();
  const [urls, setUrls] = useState(() =>
    props.selectedContainers.map((container, index) => {
      const initialUrl = props.initialUrls?.[index];
      if (initialUrl !== undefined) return initialUrl ?? "";
      const candidates = buildDockerServiceUrlCandidates({
        containerName: container.name,
        endpointHost: container.host,
        ports: container.ports,
      }).filter(({ url }) => url.length > 0);
      return candidates.find(({ scopes }) => scopes.includes("browser"))?.url ?? candidates[0]?.url ?? "";
    }),
  );
  const [errors, setErrors] = useState<(string | undefined)[]>([]);
  const [state, setState] = useState<"idle" | "pending" | "error">("idle");
  const submitting = useRef(false);
  const owner = useRef({ active: false });
  useLayoutEffect(() => {
    const lease = { active: true };
    owner.current = lease;
    return () => {
      lease.active = false;
    };
  }, []);
  let unavailableReason = props.unavailableReason;
  if (!props.canCreate) unavailableReason = "Creating apps requires current app-creation permission.";
  if (props.readOnly) unavailableReason = "App creation is read-only.";
  if (!props.onCreate) unavailableReason = "The app-creation backend and confirmed refresh binding are unavailable.";
  if (!props.onFeedback) unavailableReason = "The app-creation notification binding is unavailable.";
  if (!props.isCurrentOwner) unavailableReason = "The current dialog owner binding is unavailable.";
  const submit = async () => {
    const lease = owner.current;
    const isCurrent = () => lease.active && owner.current === lease && props.isCurrentOwner?.() === true;
    if (
      submitting.current ||
      unavailableReason ||
      !isCurrent() ||
      !props.onCreate ||
      !props.onFeedback ||
      !props.selectedContainers.length
    )
      return;
    const parsed = urls.map((url) => appHrefSchema.safeParse(url));
    setErrors(parsed.map((result) => (result.success ? undefined : result.error.issues[0]?.message)));
    if (parsed.length !== props.selectedContainers.length || parsed.some((result) => !result.success)) return;
    const apps: DockerAppCreationInput[] = [];
    for (const [index, container] of props.selectedContainers.entries()) {
      const result = parsed[index];
      if (!result?.success) return;
      apps.push({
        name: container.name,
        iconUrl: container.iconUrl,
        description: null,
        href: result.data,
        pingUrl: null,
      });
    }
    submitting.current = true;
    setState("pending");
    try {
      await props.onCreate(apps);
    } catch {
      submitting.current = false;
      if (!isCurrent()) return;
      setState("error");
      if (!isCurrent()) return;
      props.onFeedback({
        kind: "error",
        title: t("docker.action.addToHomarr.notification.error.title"),
        message: t("docker.action.addToHomarr.notification.error.message"),
      });
      return;
    }
    submitting.current = false;
    if (!isCurrent()) return;
    setState("idle");
    if (!isCurrent()) return;
    props.onFeedback({
      kind: "success",
      title: t("docker.action.addToHomarr.notification.success.title"),
      message: t("docker.action.addToHomarr.notification.success.message"),
    });
    if (isCurrent()) props.onClose();
  };
  return (
    <DockerAddAppsView
      opened
      title={t("docker.action.addToHomarr.modal.title")}
      containers={props.selectedContainers}
      urls={urls}
      errors={errors}
      pending={state === "pending"}
      unavailableReason={unavailableReason}
      feedback={
        state === "error" && (
          <Alert color="red" title={t("docker.action.addToHomarr.notification.error.title")}>
            {t("docker.action.addToHomarr.notification.error.message")}
          </Alert>
        )
      }
      cancelLabel={t("common.action.cancel")}
      addLabel={t("common.action.add")}
      onUrlChange={(index, url) =>
        setUrls((current) => current.map((value, position) => (position === index ? url : value)))
      }
      onClose={() => {
        if (state !== "pending" && owner.current.active) props.onClose();
      }}
      onSubmit={() => void submit()}
    />
  );
}
