"use client";

import { useMemo, useState } from "react";
import {
  Anchor,
  Button,
  Card,
  Checkbox,
  Fieldset,
  Grid,
  GridCol,
  Group,
  PasswordInput,
  rem,
  Stack,
  Switch,
  Text,
} from "@mantine/core";
import { Dropzone, MIME_TYPES } from "@mantine/dropzone";
import { useListState } from "@mantine/hooks";
import { IconFileZip, IconPencil, IconUpload, IconX } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { objectKeys } from "@homarr/common";
import { useZodForm } from "@homarr/form";
import type { OldmarrConfig } from "@homarr/old-schema";
import { SelectWithDescription } from "@homarr/ui";
import type { OldmarrImportConfiguration } from "@homarr/validation";
import { oldmarrImportConfigurationSchema, z } from "@homarr/validation";

import { prepareMultipleImports } from "../../../../../../../../../packages/old-import/src/prepare/multiple";
import { OldmarrBookmarkDefinition } from "../../../../../../../../../packages/old-import/src/widgets/definitions/bookmark";
import classes from "../../../init.module.css";

interface SelectedBoard {
  id: string;
  sm: boolean;
  md: boolean;
  lg: boolean;
}

export const ImportBoards = () => {
  const [file, setFile] = useState<File | null>(null);
  const form = useZodForm(
    oldmarrImportConfigurationSchema
      .omit({ name: true, screenSize: true })
      .extend({ integrationDownloadToken: z.string() }),
    {
      initialValues: {
        distinctAppsByHref: true,
        onlyImportApps: false,
        sidebarBehaviour: "last-section",
        integrationDownloadToken: "",
      },
    },
  );

  const [data, setData] = useState<OldmarrConfig[] | null>(null);

  const { mutateAsync, isPending } = clientApi.board.analyseOldmarrConfigs.useMutation();
  const [selectedBoards, selectedBoardActions] = useListState<SelectedBoard>([]);

  const handleFileSelectionAsync = async (file: File | null) => {
    setFile(file);
    if (!file) {
      setData(null);
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    await mutateAsync(formData, {
      onSuccess(data) {
        // TODO: Check that names are distinct
        setData(data);
        selectedBoardActions.setState(
          data.map((board) => ({ id: board.configProperties.name, sm: false, md: false, lg: false })),
        );
      },
    });
  };

  if (file === null || isPending) {
    return (
      <GridCol span={12}>
        <Card className={classes.card} w="100%">
          <Dropzone
            loading={isPending && Boolean(file)}
            onDrop={async (files) => {
              const firstFile = files[0];
              if (firstFile) {
                await handleFileSelectionAsync(firstFile);
              }
            }}
            onReject={(files) => console.log("rejected files", files)}
            maxSize={5 * 1024 ** 2}
            accept={[MIME_TYPES.zip]}
          >
            <Group justify="center" gap="xl" mih={220} style={{ pointerEvents: "none" }}>
              <Dropzone.Accept>
                <IconUpload
                  style={{ width: rem(52), height: rem(52), color: "var(--mantine-color-blue-6)" }}
                  stroke={1.5}
                />
              </Dropzone.Accept>
              <Dropzone.Reject>
                <IconX style={{ width: rem(52), height: rem(52), color: "var(--mantine-color-red-6)" }} stroke={1.5} />
              </Dropzone.Reject>
              <Dropzone.Idle>
                <IconFileZip
                  style={{ width: rem(52), height: rem(52), color: "var(--mantine-color-dimmed)" }}
                  stroke={1.5}
                />
              </Dropzone.Idle>

              <div>
                <Text size="xl" inline>
                  Drag the zip file here or click to browse
                </Text>
                <Text size="sm" c="dimmed" inline mt={7}>
                  The uploaded zip will be processed and you'll be able to select what you want to import
                </Text>
              </div>
            </Group>
          </Dropzone>
        </Card>
      </GridCol>
    );
  }

  return (
    <>
      <GridCol span={12}>
        <Card className={classes.card} w="100%">
          <Stack>
            <Group justify="space-between" align="center">
              <Text fw={500}>{file.name}</Text>
              <Button
                variant="subtle"
                color="gray"
                onClick={() => void handleFileSelectionAsync(null)}
                rightSection={<IconPencil size={20} stroke={1.5} />}
              >
                Change file
              </Button>
            </Group>
          </Stack>
        </Card>
      </GridCol>
      <GridCol span={12}>
        <Card className={classes.card} w="100%">
          <Stack>
            <Stack gap={0}>
              <Text fw={500}>Import settings</Text>
              <Text size="sm" c="gray.6">
                Configure the import behavior
              </Text>
            </Stack>

            <Fieldset legend="Apps" bg="transparent">
              <Grid>
                <GridCol span={{ base: 12, sm: 6 }}>
                  <Switch
                    label="Avoid duplicates"
                    description="Ignore apps where an app with the same properties already exists"
                    {...form.getInputProps("distinctAppsByHref", { type: "checkbox" })}
                  />
                </GridCol>
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <Switch
                    label="Only import apps"
                    description="Only adds the apps, boards will be skipped"
                    {...form.getInputProps("onlyImportApps", { type: "checkbox" })}
                  />
                </Grid.Col>
              </Grid>
            </Fieldset>

            <SelectWithDescription
              withAsterisk
              label="Sidebar behaviour"
              description="Sidebars were removed in 1.0, you can select what should happen with the items inside them."
              data={[
                {
                  value: "last-section",
                  label: "Last section",
                  description: "Sidebar will be displayed below the last section",
                },
                /*{
              value: "remove-items",
              label: tOldImport("form.sidebarBehavior.option.removeItems.label"),
              description: tOldImport("form.sidebarBehavior.option.removeItems.description"),
            },*/
              ]}
              {...form.getInputProps("sidebarBehaviour")}
            />

            <PasswordInput
              withAsterisk
              styles={{ wrapper: { "--input-bg": "transparent" } }}
              label="Integration download token"
              {...form.getInputProps("integrationDownloadToken")}
            />
          </Stack>
        </Card>
      </GridCol>
      <GridCol span={12}>
        <SelectedBoardsCard data={data ?? []} selectedBoardState={[selectedBoards, selectedBoardActions]} />
      </GridCol>
      <GridCol span={12}>
        <Card className={classes.card} w="100%">
          <Stack>
            <Stack gap={0}>
              <Text fw={500}>Import summary</Text>
              <Text size="sm" c="gray.6">
                In the below summary you can see what will be imported
              </Text>
            </Stack>

            <Summary data={data ?? []} selectedBoards={selectedBoards} configuration={form.values} />

            <Button fullWidth>Confirm import and continue</Button>
          </Stack>
        </Card>
      </GridCol>
    </>
  );
};

interface SummaryProps {
  data: OldmarrConfig[];
  selectedBoards: SelectedBoard[];
  configuration: Omit<OldmarrImportConfiguration, "name" | "screenSize">;
}

const Summary = ({ data, selectedBoards, configuration }: SummaryProps) => {
  const summary = useMemo(() => {
    const imports = selectedBoards
      .map((selected) => {
        const old = data.find((board) => board.configProperties.name === selected.id);
        if (!old) {
          return [];
        }

        const screenSizes = objectKeys(selected).filter((key) => key !== "id");

        return screenSizes
          .filter((screenSize) => selected[screenSize])
          .map((screenSize) => ({
            configuration: { name: `${old.configProperties.name}-${screenSize}`, screenSize },
            old: structuredClone(old), // Creates a deep copy without references
          }));
      })
      .flatMap((entry) => entry);

    const preparedImports = prepareMultipleImports(imports, configuration);
    const appsWithDuplicates =
      imports.flatMap((entry) => entry.old.apps).length +
      imports
        .flatMap((entry) => entry.old.widgets)
        .filter((widget) => widget.type === "bookmark")
        .reduce((acc, widget) => acc + (widget.properties as OldmarrBookmarkDefinition["options"]).items.length, 0);

    return {
      apps: preparedImports.apps.length,
      boards: preparedImports.boards.length,
      appsWithDuplicates,
    };
  }, [data, selectedBoards, configuration]);

  return (
    <Stack gap="xs">
      <Card withBorder bg="transparent">
        <Group justify="space-between" align="center">
          <Text size="sm" fw={500}>
            Boards
          </Text>

          <Text size="sm">{summary.boards}</Text>
        </Group>
      </Card>

      <Card withBorder bg="transparent">
        <Stack gap={4}>
          <Group justify="space-between" align="center">
            <Text size="sm" fw={500}>
              Apps
            </Text>

            <Text size="sm">{summary.apps}</Text>
          </Group>
          <Text size="xs" c="gray.6">
            This will remove {summary.appsWithDuplicates - summary.apps} duplicates.
          </Text>
        </Stack>
      </Card>
      <Card withBorder bg="transparent">
        <Group justify="space-between" align="center">
          <Text size="sm" fw={500}>
            Integrations
          </Text>

          <Text size="sm">12</Text>
        </Group>
      </Card>
    </Stack>
  );
};

interface SelectedBoardCardProps {
  data: OldmarrConfig[];
  selectedBoardState: ReturnType<typeof useListState<SelectedBoard>>;
}

const SelectedBoardsCard = ({ data, selectedBoardState }: SelectedBoardCardProps) => {
  const [selectedBoards, { applyWhere, apply }] = selectedBoardState;
  const allSelected = useMemo(
    () => selectedBoards.every((board) => board.lg && board.md && board.sm),
    [selectedBoards],
  );

  return (
    <Card className={classes.card} w="100%">
      <Stack>
        <Stack gap={0}>
          <Text fw={500}>Found {data.length} boards</Text>
          <Group justify="space-between">
            <Text size="sm" c="gray.6">
              Choose all boards with there size you want to import.
            </Text>
            {allSelected ? (
              <Anchor
                component="button"
                size="sm"
                onClick={() => apply((item) => ({ ...item, sm: false, md: false, lg: false }))}
              >
                Unselect all
              </Anchor>
            ) : (
              <Anchor
                component="button"
                size="sm"
                onClick={() => apply((item) => ({ ...item, sm: true, md: true, lg: true }))}
              >
                Select all
              </Anchor>
            )}
          </Group>
        </Stack>

        {data.map((board) => {
          const selectedBoard = selectedBoards.find((selected) => selected.id === board.configProperties.name);

          if (!selectedBoard) {
            return null;
          }

          const all = selectedBoard.lg && selectedBoard.md && selectedBoard.sm;

          return (
            <Card withBorder bg="transparent">
              <Group justify="space-between" align="center">
                <Group>
                  <Checkbox
                    checked={all}
                    indeterminate={!all && (selectedBoard.lg || selectedBoard.md || selectedBoard.sm)}
                    onChange={(event) =>
                      applyWhere(
                        (item) => item.id === selectedBoard.id,
                        (item) => ({
                          ...item,
                          sm: event.target.checked,
                          md: event.target.checked,
                          lg: event.target.checked,
                        }),
                      )
                    }
                  />
                  <Text size="sm" fw={500}>
                    {board.configProperties.name.toUpperCase()}
                  </Text>
                </Group>

                <Group>
                  <Checkbox
                    checked={selectedBoard.sm}
                    onChange={(event) =>
                      applyWhere(
                        (item) => item.id === selectedBoard.id,
                        (item) => ({ ...item, sm: event.target.checked }),
                      )
                    }
                    value="sm"
                    label="Small"
                  />
                  <Checkbox
                    checked={selectedBoard.md}
                    onChange={(event) =>
                      applyWhere(
                        (item) => item.id === selectedBoard.id,
                        (item) => ({ ...item, md: event.target.checked }),
                      )
                    }
                    value="md"
                    label="Medium"
                  />
                  <Checkbox
                    checked={selectedBoard.lg}
                    onChange={(event) =>
                      applyWhere(
                        (item) => item.id === selectedBoard.id,
                        (item) => ({ ...item, lg: event.target.checked }),
                      )
                    }
                    value="lg"
                    label="Large"
                  />
                </Group>
              </Group>
            </Card>
          );
        })}
      </Stack>
    </Card>
  );
};
