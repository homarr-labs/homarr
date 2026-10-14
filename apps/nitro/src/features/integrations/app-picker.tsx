import { useState } from "react";
import {
  Avatar,
  Button,
  Checkbox,
  Collapse,
  Group,
  Modal,
  Paper,
  ScrollArea,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import { useMutation, useQuery } from "@tanstack/react-query";

import { appManageSchema } from "@homarr/validation/app";
import { zodErrorMap } from "@homarr/validation/form/i18n";
import { useI18n } from "@homarr/translation/standalone/client";

import type { IntegrationFeatureClient, SelectableApp } from "./client";
import { IntegrationLoadError, IntegrationLoading } from "./feedback";
import {
  useIntegrationAction,
  useIntegrationFeature,
  useIntegrationQueryKey,
  useInvalidateIntegrations,
} from "./provider";
import { IntegrationActionHold } from "../../source-ui/integrations";
import { useIntegrationRequestGeneration } from "./request-generation";
import classes from "./integrations.module.css";

interface IntegrationAppPickerProps {
  opened: boolean;
  onClose: () => void;
  onSelect: (app: SelectableApp) => void;
}

export function IntegrationAppPicker(props: IntegrationAppPickerProps) {
  if (!props.opened) return null;
  return <IntegrationAppPickerContent {...props} />;
}

function IntegrationAppPickerContent({ opened, onClose, onSelect }: IntegrationAppPickerProps) {
  const t = useI18n();
  const { client, principal, readOnly, notify } = useIntegrationFeature();
  const availability = useIntegrationAction("appCreate");
  const held = availability.state === "held";
  const requests = useIntegrationRequestGeneration();
  const key = useIntegrationQueryKey();
  const invalidate = useInvalidateIntegrations("apps");
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [href, setHref] = useState("");
  const [iconUrl, setIconUrl] = useState(
    "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/homarr.svg",
  );
  const [description, setDescription] = useState("");
  const [pingUrl, setPingUrl] = useState("");
  const [differentPingUrl, setDifferentPingUrl] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const apps = useQuery({
    queryKey: [...key, "apps", "selectable"],
    queryFn: ({ signal }) => client.app.selectable(undefined, { signal }),
    enabled: opened && principal.kind === "authenticated",
    retry: false,
  });
  const canCreate = principal.kind === "authenticated" && principal.user.permissions.includes("app-create");
  const create = useMutation({
    mutationFn: ({ input }: { input: Parameters<IntegrationFeatureClient["app"]["create"]>[0]; generation: number }) =>
      client.app.create(input),
    retry: false,
    onSuccess: (app, { generation }) => {
      void invalidate();
      if (!requests.isCurrent(generation)) return;
      onSelect(app);
      if (requests.isCurrent(generation)) onClose();
    },
    onError: (_, { generation }) => {
      if (!requests.isCurrent(generation)) return;
      notify({
        color: "red",
        title: t("common.notification.create.error"),
        message: t("app.page.create.notification.error.message"),
      });
    },
  });
  const filtered = (apps.data ?? [])
    .filter((app) =>
      [app.name, app.href ?? ""].some((value) => value.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())),
    )
    .toSorted((left, right) => left.name.localeCompare(right.name));

  return (
    <Modal
      opened={opened}
      onClose={() => {
        if (!create.isPending) {
          requests.invalidate();
          onClose();
        }
      }}
      title={t("integration.page.edit.app.action.select")}
      size="xl"
      transitionProps={{ duration: 0 }}
    >
      {creating ? (
        <Stack>
          <IntegrationActionHold availability={availability} />
          <Button
            variant="subtle"
            disabled={create.isPending}
            onClick={() => {
              requests.invalidate();
              setCreating(false);
            }}
          >
            {t("app.action.select.backToApps")}
          </Button>
          <TextInput
            label={t("common.field.name")}
            withAsterisk
            value={name}
            error={errors.name}
            disabled={create.isPending}
            onChange={(event) => setName(event.currentTarget.value)}
          />
          <TextInput
            label="URL"
            value={href}
            error={errors.href}
            disabled={create.isPending}
            onChange={(event) => setHref(event.currentTarget.value)}
          />
          <TextInput
            label={t("common.iconPicker.label")}
            withAsterisk
            value={iconUrl}
            error={errors.iconUrl}
            disabled={create.isPending}
            onChange={(event) => setIconUrl(event.currentTarget.value)}
          />
          <Textarea
            label={t("app.field.description.label")}
            value={description}
            error={errors.description}
            disabled={create.isPending}
            onChange={(event) => setDescription(event.currentTarget.value)}
          />
          <Checkbox
            label={t("app.field.useDifferentUrlForPing.checkbox.label")}
            description={t("app.field.useDifferentUrlForPing.checkbox.description")}
            checked={differentPingUrl}
            disabled={create.isPending}
            onChange={(event) => {
              setDifferentPingUrl(event.currentTarget.checked);
              if (!event.currentTarget.checked) setPingUrl("");
            }}
          />
          <Collapse expanded={differentPingUrl}>
            <TextInput
              aria-label={t("app.field.useDifferentUrlForPing.checkbox.label")}
              value={pingUrl}
              error={errors.pingUrl}
              disabled={create.isPending}
              onChange={(event) => setPingUrl(event.currentTarget.value)}
            />
          </Collapse>
          <Button
            loading={create.isPending}
            disabled={!canCreate || readOnly || held}
            onClick={() => {
              if (!canCreate || readOnly || held || create.isPending) return;
              const parsed = appManageSchema.safeParse(
                { name, href, iconUrl, description, pingUrl },
                { error: zodErrorMap(t) },
              );
              if (!parsed.success) {
                setErrors(
                  Object.fromEntries(parsed.error.issues.map((issue) => [issue.path.join("."), issue.message])),
                );
                return;
              }
              setErrors({});
              create.mutate({ input: parsed.data, generation: requests.begin() });
            }}
          >
            {t("app.action.select.createAndAdd")}
          </Button>
        </Stack>
      ) : apps.isPending ? (
        <IntegrationLoading />
      ) : apps.isError ? (
        <IntegrationLoadError retry={() => void apps.refetch()} />
      ) : (
        <Stack>
          {canCreate && <IntegrationActionHold availability={availability} />}
          <TextInput
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
            placeholder={`${t("app.action.select.search")}...`}
            aria-label={t("app.action.select.search")}
            data-autofocus
            onKeyDown={(event) => {
              if (event.key === "Enter" && filtered.length === 1 && filtered[0]) {
                onSelect(filtered[0]);
                onClose();
              }
            }}
          />
          <ScrollArea.Autosize mah="70vh">
            <SimpleGrid cols={{ base: 1, xs: 2, sm: 3, md: 4, lg: 5 }} spacing="sm" p={4}>
              {canCreate && (
                <Paper
                  component="button"
                  type="button"
                  withBorder
                  p="sm"
                  radius="md"
                  className={classes.catalogItem}
                  disabled={readOnly || held}
                  onClick={() => setCreating(true)}
                >
                  <Text fw={600}>{t("app.action.create.title")}</Text>
                  <Text size="sm" c="dimmed">
                    {t("app.action.create.description")}
                  </Text>
                </Paper>
              )}
              {filtered.map((app) => (
                <Paper
                  component="button"
                  type="button"
                  key={app.id}
                  withBorder
                  p="sm"
                  radius="md"
                  className={classes.catalogItem}
                  onClick={() => {
                    onSelect(app);
                    onClose();
                  }}
                >
                  <Group wrap="nowrap">
                    <Avatar src={app.iconUrl} size="sm" radius="sm" />
                    <Stack gap={0} miw={0}>
                      <Text fw={600}>{app.name}</Text>
                      <Text size="xs" c="dimmed" lineClamp={1}>
                        {app.href}
                      </Text>
                    </Stack>
                  </Group>
                </Paper>
              ))}
            </SimpleGrid>
          </ScrollArea.Autosize>
          {filtered.length === 0 && (
            <Text c="dimmed" ta="center">
              {t("app.action.select.noResults")}
            </Text>
          )}
        </Stack>
      )}
    </Modal>
  );
}
