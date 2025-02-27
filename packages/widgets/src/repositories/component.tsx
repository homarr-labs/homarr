"use client";

import { Grid, Stack, Text } from "@mantine/core";

import { useRequiredBoard } from "@homarr/boards/context";
import { MaskedOrNormalImage } from "@homarr/ui";

// import { clientApi } from "@homarr/api/client";

import type { WidgetComponentProps } from "../definition";
import classes from "./component.module.scss";

export default function RepositoriesWidget({ options }: WidgetComponentProps<"repositories">) {
  const board = useRequiredBoard();
  // const [feedEntries] = clientApi.widget.rssFeed.getFeeds.useSuspenseQuery(
  //   {
  //     urls: options.feedUrls,
  //     maximumAmountPosts: typeof options.maximumAmountPosts === "number" ? options.maximumAmountPosts : 100,
  //   },
  //   {
  //     refetchOnMount: false,
  //     refetchOnWindowFocus: false,
  //     refetchOnReconnect: false,
  //     retry: false,
  //   },
  // );

  return (
    <Stack>
      <Text p="sm">title.repositories</Text>
      <Stack gap={2}>
        {options.repositories.map((repository) => (
          <Grid
            key={`${repository.provider.name}.${repository.identifier}`}
            className={classes.card}
            p="xs"
            gutter="xs"
          >
            <Grid.Col span="content">
              <MaskedOrNormalImage
                imageUrl={repository.iconUrl ?? repository.provider.iconUrl}
                hasColor={board.iconColor !== null}
                style={{
                  height: "2em",
                  width: "2em",
                }}
              />
            </Grid.Col>
            <Grid.Col span="auto">
              <Text>{repository.identifier}</Text>
            </Grid.Col>
            <Grid.Col span="content">{repository.latestRelease ?? "Not Found"}</Grid.Col>
          </Grid>
        ))}
      </Stack>
    </Stack>
  );
}
