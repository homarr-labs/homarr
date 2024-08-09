"use client";

import type {WidgetComponentProps} from "../definition";
import {clientApi} from "@homarr/api/client";
import type {UsenetQueueItem} from "@homarr/integrations";
import {Stack} from "@mantine/core";
import {useListState} from "@mantine/hooks";
import {useMemo} from "react";

export default function VideoWidget({integrationIds, serverData}: WidgetComponentProps<"usenet-downloads">) {
  const [currentQueueItems, currentQueueItemsHandlers] = useListState<{
    integrationId: string;
    queue: UsenetQueueItem[]
  }>(
    serverData?.initialData.queue ?? [],
  );

  const {mutate: mutateResumeQueue} = clientApi.widget.usenetDownloads.resume.useMutation();
  const {mutate: mutatePauseQueue} = clientApi.widget.usenetDownloads.pause.useMutation();

  clientApi.widget.usenetDownloads.subscribeToQueue.useSubscription({
    integrationIds
  }, {
    onData: (data) => {
      currentQueueItemsHandlers.applyWhere(
        (pair) => pair.integrationId === data.integrationId,
        (pair) => {
          return {
            ...pair,
            queue: data.data,
          };
        },
      );
    }
  });

  // Only render the flat list of queue items when the currentQueueItems change
  // Otherwise it will always create a new array reference and cause the table to re-render
  const flatQueueItems = useMemo(() => currentQueueItems.flatMap((pair) => pair.queue), [currentQueueItems]);

  return <Stack>
    <span>{JSON.stringify(flatQueueItems)}</span>
    <button onClick={() => mutateResumeQueue({
      integrationIds
    })}>Resume
    </button>
    <button onClick={() => mutatePauseQueue({
      integrationIds
    })}>Pause
    </button>
  </Stack>
}