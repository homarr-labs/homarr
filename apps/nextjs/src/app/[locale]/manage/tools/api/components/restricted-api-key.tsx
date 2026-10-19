"use client";

import { useState } from "react";
import { Alert, Button, Group, Modal, MultiSelect, Select, Stack, Text, Textarea, TextInput } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";

import { clientApi } from "@homarr/api/client";
import { createId } from "@homarr/common";
import { getIntegrationHttpUnavailableReason } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/client";
import { createRestrictedApiKeySchema } from "@homarr/validation/api-key";

interface EndpointDraft {
  id: string;
  integrationId: string;
  methods: string[];
  path: string;
  query: { id: string; name: string; values: string }[];
}

const createEndpoint = (): EndpointDraft => ({
  id: createId(),
  integrationId: "",
  methods: ["GET"],
  path: "",
  query: [],
});

export const RestrictedApiKey = ({
  disabled,
  onCreated,
}: {
  disabled: boolean;
  onCreated: (apiKey: string) => void;
}) => {
  const t = useI18n("management.page.tool.api.tab.apiKey.restrictedKey");
  const [opened, { open, close }] = useDisclosure(false);
  const [endpoints, setEndpoints] = useState<EndpointDraft[]>([]);
  const [invalid, setInvalid] = useState(false);
  const integrations = clientApi.integration.all.useQuery(undefined, { enabled: opened });
  const create = clientApi.apiKeys.createRestricted.useMutation({
    onSuccess(data) {
      onCreated(data.apiKey);
      close();
    },
  });
  const change = (id: string, patch: Partial<EndpointDraft>) => {
    setEndpoints((current) =>
      current.map((endpoint) => {
        if (endpoint.id === id) return { ...endpoint, ...patch };
        return endpoint;
      }),
    );
    setInvalid(false);
  };
  const options = (integrations.data ?? [])
    .filter(
      (integration) => integration.permissions.hasFullAccess && !getIntegrationHttpUnavailableReason(integration.kind),
    )
    .map(({ id, name, kind }) => ({ value: id, label: `${name} (${kind})` }));
  const submit = () => {
    const input = createRestrictedApiKeySchema.safeParse({
      endpoints: endpoints.map(({ integrationId, methods, path, query }) => ({
        integrationId,
        methods,
        path,
        query: query.map(({ name, values }) => ({ name, values: values.split("\n") })),
      })),
    });
    if (!input.success) {
      setInvalid(true);
      return;
    }
    create.mutate(input.data);
  };

  return (
    <>
      <Button
        variant="default"
        disabled={disabled}
        onClick={() => {
          setEndpoints([createEndpoint()]);
          setInvalid(false);
          create.reset();
          open();
        }}
      >
        {t("create")}
      </Button>
      <Modal
        opened={opened}
        onClose={() => {
          if (!create.isPending) close();
        }}
        title={t("title")}
        size="lg"
        closeOnEscape={!create.isPending}
        closeOnClickOutside={!create.isPending}
        withCloseButton={!create.isPending}
      >
        <Stack>
          <Alert color="yellow">{t("description")}</Alert>
          <Text size="sm">{t("binding")}</Text>
          {integrations.isError && <Alert color="red">{t("loadError")}</Alert>}
          {endpoints.map((endpoint, index) => (
            <Stack
              key={endpoint.id}
              gap="sm"
              p="sm"
              style={{
                border: "1px solid var(--mantine-color-default-border)",
                borderRadius: "var(--mantine-radius-default)",
              }}
            >
              <Group justify="space-between">
                <Text fw={500}>{t("endpoint", { number: index + 1 })}</Text>
                <Button
                  variant="subtle"
                  color="red"
                  disabled={endpoints.length === 1 || create.isPending}
                  onClick={() => setEndpoints((current) => current.filter(({ id }) => id !== endpoint.id))}
                >
                  {t("remove")}
                </Button>
              </Group>
              <Select
                label={t("integration")}
                data={options}
                value={endpoint.integrationId}
                searchable
                disabled={create.isPending}
                onChange={(value) => change(endpoint.id, { integrationId: value ?? "" })}
                required
              />
              <MultiSelect
                label={t("methods")}
                data={["GET", "HEAD"]}
                value={endpoint.methods}
                disabled={create.isPending}
                onChange={(methods) => change(endpoint.id, { methods })}
                required
              />
              <TextInput
                label={t("path")}
                description={t("pathHint")}
                placeholder="/api/v1/status"
                value={endpoint.path}
                maxLength={1024}
                disabled={create.isPending}
                onChange={(event) => change(endpoint.id, { path: event.currentTarget.value })}
                required
              />
              <Text size="sm">{t("queryHint")}</Text>
              {endpoint.query.map((parameter) => (
                <Stack key={parameter.id} gap="xs">
                  <TextInput
                    label={t("queryName")}
                    value={parameter.name}
                    maxLength={64}
                    disabled={create.isPending}
                    onChange={(event) => {
                      const name = event.currentTarget.value;
                      change(endpoint.id, {
                        query: endpoint.query.map((entry) => {
                          if (entry.id === parameter.id) return { ...entry, name };
                          return entry;
                        }),
                      });
                    }}
                    required
                  />
                  <Textarea
                    label={t("queryValues")}
                    value={parameter.values}
                    autosize
                    minRows={2}
                    maxRows={6}
                    maxLength={8223}
                    disabled={create.isPending}
                    onChange={(event) => {
                      const values = event.currentTarget.value;
                      change(endpoint.id, {
                        query: endpoint.query.map((entry) => {
                          if (entry.id === parameter.id) return { ...entry, values };
                          return entry;
                        }),
                      });
                    }}
                  />
                  <Button
                    variant="subtle"
                    color="red"
                    disabled={create.isPending}
                    onClick={() =>
                      change(endpoint.id, { query: endpoint.query.filter(({ id }) => id !== parameter.id) })
                    }
                  >
                    {t("removeParameter")}
                  </Button>
                </Stack>
              ))}
              <Button
                variant="default"
                disabled={endpoint.query.length >= 16 || create.isPending}
                onClick={() =>
                  change(endpoint.id, { query: [...endpoint.query, { id: createId(), name: "", values: "" }] })
                }
              >
                {t("addParameter")}
              </Button>
            </Stack>
          ))}
          <Button
            variant="default"
            disabled={endpoints.length >= 32 || create.isPending}
            onClick={() => setEndpoints((current) => [...current, createEndpoint()])}
          >
            {t("addEndpoint")}
          </Button>
          {invalid && (
            <Alert color="red" role="alert">
              {t("invalid")}
            </Alert>
          )}
          {create.isError && (
            <Alert color="red" role="alert">
              {t("createError")}
            </Alert>
          )}
          <Button
            onClick={submit}
            loading={create.isPending}
            disabled={integrations.isPending || integrations.isError || options.length === 0}
          >
            {t("create")}
          </Button>
        </Stack>
      </Modal>
    </>
  );
};
