import { useCallback, useMemo, useState } from "react";
import { Button, Group, Image, LoadingOverlay, Stack, Text } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { createModal } from "@homarr/modals";
import { showSuccessNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";
import { createRetryableLazyContent } from "@homarr/ui/lazy-content";

const RequestMediaSeasonsTable = createRetryableLazyContent(() =>
  import("./request-media-seasons-table").then((module) => module.RequestMediaSeasonsTable),
);

interface RequestMediaModalProps {
  integrationId: string;
  mediaId: number;
  mediaType: "movie" | "tv";
}

export const RequestMediaModal = createModal<RequestMediaModalProps>(({ actions, innerProps }) => {
  const utils = clientApi.useUtils();
  const { data, isPending: isPendingQuery } = clientApi.integration.getMediaRequestOptions.useQuery({
    integrationId: innerProps.integrationId,
    mediaId: innerProps.mediaId,
    mediaType: innerProps.mediaType,
  });

  const { mutate, isPending: isPendingMutation } = clientApi.integration.requestMedia.useMutation({
    onSuccess() {
      void utils.widget.mediaRequests.invalidate();
      void utils.integration.searchMediaRequests.invalidate();
      void utils.integration.getMediaRequestOptions.invalidate({
        integrationId: innerProps.integrationId,
        mediaId: innerProps.mediaId,
        mediaType: innerProps.mediaType,
      });
      actions.closeModal();
      showSuccessNotification({
        message: t("common.notification.create.success"),
      });
    },
  });

  const isPending = isPendingQuery || isPendingMutation;
  const t = useI18n();
  const requestedSeasons = useMemo(() => new Set(data?.requestedSeasons ?? []), [data?.requestedSeasons]);
  const [selectedSeasons, setSelectedSeasons] = useState<number[]>([]);
  const handleMutate = useCallback(() => {
    mutate({
      integrationId: innerProps.integrationId,
      mediaId: innerProps.mediaId,
      mediaType: innerProps.mediaType,
      seasons: selectedSeasons,
    });
  }, [innerProps.integrationId, innerProps.mediaId, innerProps.mediaType, mutate, selectedSeasons]);

  return (
    <Stack>
      <LoadingOverlay visible={isPending} />
      {data && (
        <Group wrap="nowrap" align="start">
          <Image src={`https://image.tmdb.org/t/p/w600_and_h900_bestv2${data.posterPath}`} alt="poster" w={100} />
          <Text c="dimmed" style={{ flex: "1" }}>
            {data.overview}
          </Text>
        </Group>
      )}
      {innerProps.mediaType === "tv" && data && "seasons" in data && (
        <RequestMediaSeasonsTable
          seasons={data.seasons}
          requestedSeasons={requestedSeasons}
          onSelectionChange={setSelectedSeasons}
        />
      )}
      <Group justify="end">
        <Button onClick={actions.closeModal} variant="light">
          {t("common.action.cancel")}
        </Button>
        <Button onClick={handleMutate} disabled={selectedSeasons.length === 0 && innerProps.mediaType === "tv"}>
          {t("search.engine.media.request.modal.button.send")}
        </Button>
      </Group>
    </Stack>
  );
}).withOptions({
  size: "xl",
});
