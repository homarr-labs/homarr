"use client";

import { Divider, Grid, Group, Stack, Text } from "@mantine/core";
import { useFormatter } from "next-intl";

import { clientApi } from "@homarr/api/client";
import { useRequiredBoard } from "@homarr/boards/context";
import { useScopedI18n } from "@homarr/translation/client";
import { MaskedOrNormalImage } from "@homarr/ui";

import type { WidgetComponentProps } from "../definition";
import classes from "./component.module.scss";

export default function ReleasesWidget({ options }: WidgetComponentProps<"releases">) {
  const t = useScopedI18n("widget.releases");
  const formatter = useFormatter();
  const board = useRequiredBoard();

  const [results] = clientApi.widget.releases.getLatest.useSuspenseQuery(
    {
      releases: options.releases.map((release) => ({
        providerName: release.provider.name,
        identifier: release.identifier,
        versionRegex: release.versionRegex,
      })),
    },
    {
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: false,
    },
  );

  for (const { data } of results) {
    if (data === undefined) continue;

    const release = options.releases.find((release) => release.identifier === data.identifier);

    if (release === undefined) continue;

    release.latestRelease = data.tag;
    release.latestReleaseDate = data.lastUpdated;
  }

  return (
    <Stack>
      <Stack gap={2}>
        {options.releases.map((release) => (
          <Stack key={`${release.provider.name}.${release.identifier}`} gap={5}>
            <Grid columns={2} p="xs" gutter="xs" align="center">
              <Grid.Col span="content">
                <MaskedOrNormalImage
                  imageUrl={release.iconUrl ?? release.provider.iconUrl}
                  hasColor={board.iconColor !== null}
                  style={{
                    height: "1.7em",
                    width: "1.7em",
                  }}
                />
              </Grid.Col>
              <Grid.Col span="auto">
                <Grid className={classes.card} p={0} gutter="xs">
                  <Grid.Col span={8} p={0}>
                    <Text truncate="end" size="sm">
                      {release.identifier}
                    </Text>
                  </Grid.Col>
                  <Grid.Col span={4} p={0}>
                    <Text
                      size="sm"
                      fw={700}
                      c="primaryColor"
                      style={{
                        textAlign: "right",
                      }}
                    >
                      {release.latestRelease ?? t("not-found")}
                    </Text>
                  </Grid.Col>
                  <Grid.Col span={8} p={0}>
                    <Group gap={5}>
                      <MaskedOrNormalImage
                        imageUrl={release.provider.iconUrl}
                        color="dimmed"
                        hasColor={true}
                        style={{
                          height: "0.8em",
                          width: "0.8em",
                        }}
                      />
                      <Text c="dimmed" size="xs">
                        {release.provider.name}
                      </Text>
                    </Group>
                  </Grid.Col>
                  <Grid.Col span={4} p={0}>
                    <Text
                      size="sm"
                      style={{
                        textAlign: "right",
                      }}
                    >
                      {release.latestReleaseDate &&
                        formatter.relativeTime(release.latestReleaseDate, {
                          style: "narrow",
                        })}
                    </Text>
                  </Grid.Col>
                </Grid>
              </Grid.Col>
            </Grid>
            <Divider />
          </Stack>
        ))}
      </Stack>
    </Stack>
  );
}
