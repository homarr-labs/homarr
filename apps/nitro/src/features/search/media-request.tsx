import { Alert, Anchor, Badge, Button, Checkbox, Group, Skeleton, Stack, Text } from "@mantine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLayoutEffect, useRef, useState } from "react";

import type { MediaResult } from "./client";
import type { SearchRuntime, SearchSession } from "./contracts";
import { searchQueryKey } from "./contracts";

export function MediaRequestContent({
  runtime,
  session,
  result,
  onBack,
  isIntentCurrent,
}: {
  runtime: SearchRuntime;
  session: SearchSession;
  result: MediaResult;
  onBack(): void;
  isIntentCurrent(): boolean;
}) {
  const nativeIntegration = runtime.client.integration;
  const [seasons, setSeasons] = useState<number[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [refreshFailed, setRefreshFailed] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  const backControl = useRef<HTMLButtonElement>(null);
  const queryClient = useQueryClient();
  const input = {
    integrationId: result.integration.id,
    mediaId: result.id,
    mediaType: result.type === "tv" ? ("tv" as const) : ("movie" as const),
  };
  const authority = runtime.authority.mediaRequest;
  const blocked =
    !session.isCurrent() ||
    !session.authenticated ||
    !result.integration.permissions.hasInteractAccess ||
    result.type === "person" ||
    (result.type === "movie" && result.inLibrary);
  const options = useQuery({
    queryKey: searchQueryKey(session.scope, "integration.getMediaRequestOptions", input),
    queryFn: ({ signal }) => nativeIntegration.getMediaRequestOptions(input, { signal }),
    enabled: !blocked && authority.kind === "ready",
    retry: false,
    refetchOnWindowFocus: false,
  });
  useLayoutEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      controller.current?.abort();
    };
  }, []);
  useLayoutEffect(() => {
    if (!mounted.current || !isIntentCurrent() || !session.isCurrent()) return;
    if (backControl.current && !backControl.current.disabled) backControl.current.focus();
  }, [isIntentCurrent, session.isCurrent]);
  const request = useMutation({
    mutationFn: async () => {
      if (
        !session.isCurrent() ||
        authority.kind !== "ready" ||
        !result.integration.permissions.hasInteractAccess ||
        result.type === "person" ||
        (result.type === "movie" && result.inLibrary)
      )
        throw new Error("Media request is not available");
      const selectedSeasons = seasons.filter((season) => !options.data?.requestedSeasons.includes(season));
      if (result.type === "tv" && selectedSeasons.length === 0) throw new Error("Select an unrequested season");
      const active = new AbortController();
      controller.current = active;
      await nativeIntegration.requestMedia(
        { ...input, seasons: result.type === "tv" ? selectedSeasons : [] },
        { signal: active.signal },
      );
      if (!mounted.current || !session.isCurrent()) return;
      setSubmitted(true);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: searchQueryKey(session.scope, "integration.searchMediaRequests"),
        }),
        queryClient.invalidateQueries({
          queryKey: searchQueryKey(session.scope, "integration.searchInIntegration"),
        }),
        queryClient.invalidateQueries({
          queryKey: searchQueryKey(session.scope, "integration.getMediaRequestOptions", input),
        }),
      ]).catch(() => {
        if (mounted.current && session.isCurrent()) setRefreshFailed(true);
      });
    },
    retry: false,
  });
  const href = runtime.helpers.getSafeApplicationUrl(result.link);
  const availableSeasons = options.data && "seasons" in options.data ? options.data.seasons : [];
  const requested = new Set(options.data?.requestedSeasons ?? []);
  return (
    <Stack
      onKeyDown={(event) => {
        if (event.key === "Escape" && !event.nativeEvent.isComposing && !request.isPending && isIntentCurrent()) {
          event.preventDefault();
          event.stopPropagation();
          onBack();
        }
      }}
    >
      <Group justify="space-between">
        <Text fw={600}>{result.name}</Text>
        <Button ref={backControl} variant="subtle" disabled={request.isPending} onClick={onBack}>
          Back to results
        </Button>
      </Group>
      {result.text && <Text>{result.text}</Text>}
      {result.availability && <Badge>{result.availability}</Badge>}
      {href && (
        <Anchor
          href={href}
          target={(session.openSearchInNewTab ?? true) ? "_blank" : undefined}
          rel="noopener noreferrer"
          onClick={(event) => {
            if (!session.isCurrent()) event.preventDefault();
          }}
        >
          Open in {result.integration.name}
        </Anchor>
      )}
      {authority.kind === "held" && <Alert title="Media requests are unavailable">{authority.reason}</Alert>}
      {blocked && (
        <Alert title="Request unavailable">
          {result.type === "movie" && result.inLibrary
            ? "This movie is already in the library."
            : "You do not have permission to request this media in the current session."}
        </Alert>
      )}
      {options.isLoading && <Skeleton height={80} />}
      {options.isError && (
        <Alert color="red" title="Could not load request options">
          <Button
            variant="light"
            disabled={blocked || authority.kind !== "ready"}
            onClick={() => {
              if (session.isCurrent() && authority.kind === "ready") void options.refetch();
            }}
          >
            Retry options
          </Button>
        </Alert>
      )}
      {result.type === "tv" && options.isSuccess && (
        <Stack gap="xs">
          {availableSeasons.length === 0 && <Text>No seasons are available to request.</Text>}
          {availableSeasons.map((season) => (
            <Checkbox
              key={season.id}
              label={`${season.name} (${season.episodeCount} episodes)${requested.has(season.seasonNumber) ? ", already requested" : ""}`}
              disabled={requested.has(season.seasonNumber) || request.isPending || submitted}
              checked={seasons.includes(season.seasonNumber)}
              onChange={(event) => {
                const checked = event.currentTarget.checked;
                setSeasons((current) =>
                  checked
                    ? [...current, season.seasonNumber]
                    : current.filter((value) => value !== season.seasonNumber),
                );
              }}
            />
          ))}
        </Stack>
      )}
      {request.isError && (
        <Alert color="red" title="Request outcome could not be confirmed">
          Refresh the integration and check whether the request exists before submitting again.
          <Button
            variant="subtle"
            disabled={blocked || authority.kind !== "ready"}
            onClick={() => {
              if (session.isCurrent() && authority.kind === "ready") void options.refetch();
            }}
          >
            Refresh request options
          </Button>
        </Alert>
      )}
      {submitted && (
        <Alert color="green" title="Request submitted">
          The integration accepted this request.
        </Alert>
      )}
      {refreshFailed && (
        <Alert title="Results need refreshing">
          The request was accepted, but cached results could not be refreshed.
        </Alert>
      )}
      <Button
        loading={request.isPending}
        disabled={
          blocked ||
          authority.kind !== "ready" ||
          !options.isSuccess ||
          submitted ||
          request.isError ||
          (result.type === "tv" && !seasons.some((season) => !requested.has(season)))
        }
        onClick={() => request.mutate()}
      >
        Send media request
      </Button>
    </Stack>
  );
}
