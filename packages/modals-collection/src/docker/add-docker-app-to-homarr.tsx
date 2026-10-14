import { useEffect, useRef, useState } from "react";
import { Avatar, Button, Group, List, LoadingOverlay, Stack, Text, TextInput } from "@mantine/core";
import { z } from "zod/v4";

import { buildDockerServiceUrlCandidates } from "@homarr/definitions";
import type { DockerServicePort } from "@homarr/definitions";
import { useZodForm } from "@homarr/form";
import { createModal } from "@homarr/modals";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";
import type { TranslationFunction } from "@homarr/translation";
import { appHrefSchema } from "@homarr/validation/app";
import type { appCreateManySchema } from "@homarr/validation/app";

export interface DockerAppContainer {
  id: string;
  name: string;
  iconUrl: string | null;
  host: string;
  ports: DockerServicePort[] | undefined;
}

export type DockerAppCreateOutcome =
  | { kind: "idle" }
  | { kind: "unknown"; error: unknown }
  | { kind: "confirmed"; apps: z.infer<typeof appCreateManySchema> }
  | { kind: "reconcileheld"; apps: z.infer<typeof appCreateManySchema>; error: unknown }
  | { kind: "settled"; apps: z.infer<typeof appCreateManySchema> };

export interface AddDockerAppToHomarrProps {
  selectedContainers: DockerAppContainer[];
  initialUrls?: (string | null)[];
  createMany?: (apps: z.infer<typeof appCreateManySchema>) => Promise<void>;
  onCreated: () => Promise<void>;
  isPending: boolean;
  isCurrentOwner: () => boolean;
  outcomeLabels: { unknown: string; reconcileheld: string };
}

const formSchema = z.object({
  containerUrls: z.array(appHrefSchema),
});

export interface AddDockerAppToHomarrContentProps {
  innerProps: AddDockerAppToHomarrProps;
  actions: { closeModal: () => void };
}

export const AddDockerAppToHomarrContent = ({ actions, innerProps }: AddDockerAppToHomarrContentProps) => {
  const t = useI18n();
  const submitting = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const owner = useRef({ active: false });
  const outcomeRef = useRef<DockerAppCreateOutcome>({ kind: "idle" });
  const [outcome, setOutcome] = useState<DockerAppCreateOutcome>(outcomeRef.current);
  const retryReconciliation = useRef<(() => Promise<void>) | null>(null);
  useEffect(() => {
    const lease = { active: true };
    owner.current = lease;
    return () => {
      lease.active = false;
    };
  }, []);
  const publishOutcome = (next: DockerAppCreateOutcome) => {
    outcomeRef.current = next;
    if (owner.current.active) setOutcome(next);
  };
  const form = useZodForm(formSchema, {
    initialValues: {
      containerUrls: innerProps.selectedContainers.map((container, index) => {
        const initialUrl = innerProps.initialUrls?.[index];
        if (initialUrl !== undefined) return initialUrl;

        const candidates = buildDockerServiceUrlCandidates({
          containerName: container.name,
          endpointHost: container.host,
          ports: container.ports,
        }).filter(({ url }) => url.length > 0);

        return candidates.find(({ scopes }) => scopes.includes("browser"))?.url ?? candidates[0]?.url ?? null;
      }),
    },
  });
  const isPending = innerProps.isPending || isSubmitting;
  const handleSubmit = async ({ containerUrls }: z.infer<typeof formSchema>) => {
    const lease = owner.current;
    const isCurrent = () => lease.active && innerProps.isCurrentOwner();
    if (!innerProps.createMany || !isCurrent() || outcomeRef.current.kind !== "idle" || isPending || submitting.current)
      return;
    submitting.current = true;
    setIsSubmitting(true);
    const apps = innerProps.selectedContainers.map((container, index) => ({
      name: container.name,
      iconUrl: container.iconUrl,
      description: null,
      href: containerUrls[index] || null,
      pingUrl: null,
    }));
    try {
      await innerProps.createMany(apps);
    } catch (error) {
      publishOutcome({ kind: "unknown", error });
      submitting.current = false;
      if (lease.active) setIsSubmitting(false);
      if (isCurrent()) showErrorNotification({ message: innerProps.outcomeLabels.unknown });
      return;
    }
    publishOutcome({ kind: "confirmed", apps });
    const reconcile = async () => {
      try {
        await innerProps.onCreated();
      } catch (error) {
        publishOutcome({ kind: "reconcileheld", apps, error });
        if (isCurrent()) showErrorNotification({ message: innerProps.outcomeLabels.reconcileheld });
        throw error;
      } finally {
        submitting.current = false;
        if (lease.active) setIsSubmitting(false);
      }
      publishOutcome({ kind: "settled", apps });
      retryReconciliation.current = null;
      if (!isCurrent()) return;
      showSuccessNotification({
        title: t("docker.action.addToHomarr.notification.success.title"),
        message: t("docker.action.addToHomarr.notification.success.message"),
      });
      if (isCurrent()) actions.closeModal();
    };
    retryReconciliation.current = async () => {
      if (!isCurrent() || submitting.current || outcomeRef.current.kind !== "reconcileheld") return;
      submitting.current = true;
      setIsSubmitting(true);
      await reconcile();
    };
    await reconcile();
  };
  return (
    <form
      onSubmit={form.onSubmit((values) => {
        void handleSubmit(values).catch(() => {});
      })}
    >
      <LoadingOverlay visible={isPending} />
      <Stack>
        <List spacing={"xs"}>
          {innerProps.selectedContainers.map((container, index) => {
            const inputProps = form.getInputProps(`containerUrls.${index}`);
            return (
              <List.Item
                styles={{ itemWrapper: { width: "100%" }, itemLabel: { flex: 1 } }}
                icon={
                  <Avatar
                    variant="outline"
                    radius={container.iconUrl ? "sm" : "md"}
                    size={30}
                    styles={{ image: { objectFit: "contain" } }}
                    src={container.iconUrl}
                  >
                    {container.name.at(0)?.toUpperCase()}
                  </Avatar>
                }
                key={container.id}
              >
                <Group justify="space-between" wrap={"nowrap"}>
                  <Text lineClamp={1}>{container.name}</Text>
                  <TextInput {...inputProps} value={inputProps.value ?? ""} />
                </Group>
              </List.Item>
            );
          })}
        </List>
        <Group justify="end">
          <Button
            onClick={() => {
              owner.current.active = false;
              actions.closeModal();
            }}
            variant="light"
            px={"xl"}
          >
            {t("common.action.cancel")}
          </Button>
          <Button
            type="submit"
            px={"xl"}
            loading={isPending}
            disabled={!innerProps.createMany || outcome.kind !== "idle"}
          >
            {t("common.action.add")}
          </Button>
        </Group>
        {(outcome.kind === "unknown" || outcome.kind === "reconcileheld") && (
          <Text component="output" aria-live="polite">
            {innerProps.outcomeLabels[outcome.kind]}
          </Text>
        )}
        {outcome.kind === "reconcileheld" && (
          <Button
            variant="default"
            loading={isSubmitting}
            onClick={() => {
              void retryReconciliation.current?.().catch(() => {});
            }}
          >
            {t("common.action.tryAgain")}
          </Button>
        )}
      </Stack>
    </form>
  );
};

export const AddDockerAppToHomarrModal = createModal<AddDockerAppToHomarrProps>(
  AddDockerAppToHomarrContent,
).withOptions({
  defaultTitle(t: TranslationFunction) {
    return t("docker.action.addToHomarr.modal.title");
  },
  size: "lg",
});
