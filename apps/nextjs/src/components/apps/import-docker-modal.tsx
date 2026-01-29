"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Avatar,
  Button,
  Checkbox,
  Dialog,
  Group,
  Loader,
  ScrollArea,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";

import { clientApi as api } from "@homarr/api/client";

// Helper: Clean container name
const guessCandidateUrl = (containerName: string) => {
  let slug = containerName.toLowerCase();
  slug = slug.replace(/[_]/g, "-");
  const noiseWords = [
    "development",
    "dev",
    "prod",
    "production",
    "docker",
    "compose",
    "stack",
    "server",
    "service",
    "daemon",
    "container",
    "app",
    "official",
    "homarr",
    "labs",
    "desktop",
    "extension",
  ];
  noiseWords.forEach((word) => {
    slug = slug.replace(new RegExp(`\\b${word}\\b`, "g"), "");
  });
  slug = slug.replace(/[-]?\d+$/, "");
  slug = slug.replace(/-+/g, "-").replace(/^-|-$/g, "");

  if (!slug || slug.length < 2) return null;
  return `https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/${slug}.png`;
};

// Helper: Validate icon
const getValidatedIcon = (containerName: string): Promise<string> => {
  return new Promise((resolve) => {
    const candidate = guessCandidateUrl(containerName);
    const fallback = "https://cdn.simpleicons.org/docker";
    if (!candidate) {
      resolve(fallback);
      return;
    }
    const img = new Image();
    img.onload = () => resolve(candidate);
    img.onerror = () => resolve(fallback);
    img.src = candidate;
  });
};

interface ImportDockerModalProps {
  opened: boolean;
  onClose: () => void;
}

export const ImportDockerModal = ({ opened, onClose }: ImportDockerModalProps) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [schemes, setSchemes] = useState<Record<string, "http" | "https">>({});
  const [isImporting, setIsImporting] = useState(false);

  // Validation State
  const [customHost, setCustomHost] = useState("localhost");
  const [hostError, setHostError] = useState<string | null>(null);

  const utils = api.useUtils();
  const router = useRouter();
  const createApp = api.app.create.useMutation();

  const {
    data: candidates,
    isLoading,
    error,
  } = api.docker.getCandidates.useQuery(undefined, {
    enabled: opened,
  });

  // Validator Function
  const handleHostChange = (value: string) => {
    setCustomHost(value);

    if (value.trim() === "") {
      setHostError(null);
      return;
    }

    const validHostRegex =
      /^([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9])(\.([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]))*$/;

    if (value.includes("://")) {
      setHostError("Do not include 'http://' or 'https://'. Just the IP or Hostname.");
    } else if (value.includes(":")) {
      setHostError("Do not include the port (e.g. :3000).");
    } else if (!validHostRegex.test(value)) {
      setHostError("Invalid format. Use IP (192.168.1.1) or Hostname (server.local).");
    } else {
      setHostError(null);
    }
  };

  const handleImport = async () => {
    if (!candidates || hostError) return;
    setIsImporting(true);

    const appsToImport = candidates.filter((c) => selectedIds.includes(c.id));

    await Promise.all(
      appsToImport.map(async (c) => {
        const validIconUrl = c.icon || (await getValidatedIcon(c.name));
        const scheme = schemes[c.id] || "http";

        let finalUrl = c.url.replace(/^https?:\/\//, `${scheme}://`);

        if (customHost && finalUrl.includes("localhost")) {
          finalUrl = finalUrl.replace("localhost", customHost);
        }

        return createApp.mutateAsync({
          name: c.name,
          iconUrl: validIconUrl,
          href: finalUrl,
          description: "Imported from Docker",
          pingUrl: "",
        });
      }),
    );

    notifications.show({
      title: "Import Successful",
      message: `Imported ${appsToImport.length} apps`,
      color: "green",
    });

    router.refresh();
    await utils.app.invalidate();

    setIsImporting(false);
    onClose();
    setSelectedIds([]);
    setSchemes({});
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  return (
    <Dialog
      opened={opened}
      withCloseButton
      onClose={onClose}
      size="xl"
      radius="md"
      shadow="xl"
      position={{ bottom: 20, right: 20 }}
    >
      <Stack gap="sm" mb="md">
        <Text fw={700} size="lg">
          Import from Docker
        </Text>

        <TextInput
          label="Host IP / Domain"
          placeholder="e.g. 192.168.1.50"
          value={customHost}
          onChange={(e) => handleHostChange(e.currentTarget.value)}
          description="Replaces 'localhost' in the final app URL."
          error={hostError}
        />
      </Stack>

      <ScrollArea h={500} type="always" offsetScrollbars className="pr-2 mb-4">
        {isLoading ? (
          <Group justify="center" p="xl">
            <Loader />
          </Group>
        ) : error ? (
          <Text c="red" size="sm" ta="center">
            Error: {error.message}
          </Text>
        ) : candidates?.length === 0 ? (
          <Text ta="center" c="dimmed" py="xl">
            No running containers found.
          </Text>
        ) : (
          <Stack gap="xs">
            {candidates?.map((container) => {
              const previewUrl =
                container.icon || guessCandidateUrl(container.name) || "https://cdn.simpleicons.org/docker";
              const isSelected = selectedIds.includes(container.id);
              const currentScheme = schemes[container.id] || "http";

              const displayUrl = container.url
                .replace(/^https?:\/\//, `${currentScheme}://`)
                .replace("localhost", customHost || "localhost");

              return (
                <Group
                  key={container.id}
                  wrap="nowrap"
                  align="center"
                  p="xs"
                  className={`rounded-md border transition-colors ${
                    isSelected
                      ? "bg-blue-500/10 border-blue-500"
                      : "hover:bg-gray-100 dark:hover:bg-zinc-800 border-transparent"
                  }`}
                >
                  <Checkbox
                    checked={isSelected}
                    onChange={() => toggleSelection(container.id)}
                    style={{ cursor: "pointer" }}
                  />

                  <Avatar
                    src={previewUrl}
                    radius="md"
                    size="md"
                    color="blue"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "https://cdn.simpleicons.org/docker";
                    }}
                  >
                    {container.name.charAt(0)}
                  </Avatar>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Group gap="xs" wrap="nowrap">
                      <Text fw={600} truncate>
                        {container.name}
                      </Text>
                    </Group>
                    <Text size="xs" c="dimmed" truncate>
                      {displayUrl}
                    </Text>
                  </div>

                  <SegmentedControl
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()} // Also prevent Enter/Space from bubbling
                    size="xs"
                    data={[
                      { label: "HTTP", value: "http" },
                      { label: "HTTPS", value: "https" },
                    ]}
                    value={currentScheme}
                    onChange={(value) =>
                      setSchemes((prev) => ({
                        ...prev,
                        [container.id]: value as "http" | "https",
                      }))
                    }
                  />
                </Group>
              );
            })}
          </Stack>
        )}
      </ScrollArea>

      <Group justify="flex-end">
        <Button variant="subtle" onClick={onClose} color="gray">
          Cancel
        </Button>
        <Button onClick={handleImport} loading={isImporting} disabled={selectedIds.length === 0 || Boolean(hostError)}>
          Import {selectedIds.length > 0 ? `(${selectedIds.length})` : ""}
        </Button>
      </Group>
    </Dialog>
  );
};
