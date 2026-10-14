import { useEffect, useMemo, useRef, useState } from "react";
import { Badge, Button, Group, Image, LoadingOverlay, Stack, Text } from "@mantine/core";
import type { MRT_ColumnDef, MRT_Row } from "mantine-react-table";
import { MRT_Table } from "mantine-react-table";

import { createModal } from "@homarr/modals";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";
import { useTranslatedMantineReactTable } from "@homarr/ui/hooks";

export interface MediaRequestTarget {
  integrationId: string;
  mediaId: number;
  mediaType: "movie" | "tv";
}

export interface MediaRequestInformation {
  id: number;
  overview: string;
  posterPath: string;
  requestedSeasons?: number[];
  seasons?: Season[];
}

export interface MediaRequestInput extends MediaRequestTarget {
  seasons: number[];
}

export type MediaRequestOutcome =
  | { kind: "idle" }
  | { kind: "unknown"; error: unknown }
  | { kind: "confirmed"; input: MediaRequestInput; result: unknown }
  | { kind: "reconcileheld"; input: MediaRequestInput; result: unknown; error: unknown }
  | { kind: "settled"; input: MediaRequestInput; result: unknown };

export interface RequestMediaModalProps extends MediaRequestTarget {
  data?: MediaRequestInformation;
  isPendingQuery: boolean;
  isPendingMutation: boolean;
  isCurrent: boolean;
  requestMedia?: (input: MediaRequestInput) => Promise<unknown>;
  onRequested: (target: MediaRequestTarget) => Promise<void>;
  isCurrentOwner: () => boolean;
  outcomeLabels: { unknown: string; reconcileheld: string };
}

export interface RequestMediaContentProps {
  innerProps: RequestMediaModalProps;
  actions: { closeModal: () => void };
}

export const RequestMediaContent = ({ actions, innerProps }: RequestMediaContentProps) => {
  const { data, isPendingQuery, isPendingMutation } = innerProps;
  const submitting = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const owner = useRef({ active: false });
  const outcomeRef = useRef<MediaRequestOutcome>({ kind: "idle" });
  const [outcome, setOutcome] = useState<MediaRequestOutcome>(outcomeRef.current);
  const retryReconciliation = useRef<(() => Promise<void>) | null>(null);
  useEffect(() => {
    const lease = { active: true };
    owner.current = lease;
    return () => {
      lease.active = false;
    };
  }, []);
  const publishOutcome = (next: MediaRequestOutcome) => {
    outcomeRef.current = next;
    if (owner.current.active) setOutcome(next);
  };
  const isPending = isPendingQuery || isPendingMutation || isSubmitting;
  const t = useI18n();
  const requestedSeasons = useMemo(() => new Set(data?.requestedSeasons ?? []), [data?.requestedSeasons]);

  const columns = useMemo<MRT_ColumnDef<Season>[]>(
    () => [
      {
        accessorKey: "name",
        header: t("search.engine.media.request.modal.table.header.season"),
      },
      {
        accessorKey: "episodeCount",
        header: t("search.engine.media.request.modal.table.header.episodes"),
      },
      {
        id: "status",
        header: t("search.engine.media.request.modal.table.header.status"),
        Cell: ({ row }) =>
          requestedSeasons.has(row.original.seasonNumber) ? (
            <Badge size="xs" color="violet" variant="light">
              {t("search.engine.media.request.modal.table.status.requested")}
            </Badge>
          ) : null,
      },
    ],
    [requestedSeasons, t],
  );

  const table = useTranslatedMantineReactTable({
    columns,
    data: data?.seasons ?? [],
    getRowId: (row) => String(row.seasonNumber),
    enableColumnActions: false,
    enableColumnFilters: false,
    enablePagination: false,
    enableSorting: false,
    enableSelectAll: true,
    enableRowSelection: (row: MRT_Row<Season>) => !requestedSeasons.has(row.original.seasonNumber),
    mantineTableProps: {
      highlightOnHover: false,
      striped: "odd",
      withColumnBorders: true,
      withRowBorders: true,
      withTableBorder: true,
    },
    initialState: {
      density: "xs",
    },
  });

  const selectedSeasons = table
    .getSelectedRowModel()
    .rows.filter((row) => !requestedSeasons.has(row.original.seasonNumber))
    .map((row) => row.original.seasonNumber);
  const anySelected = selectedSeasons.length > 0;

  const handleMutate = async () => {
    const lease = owner.current;
    const isCurrent = () => lease.active && innerProps.isCurrentOwner();
    if (
      !innerProps.requestMedia ||
      !innerProps.isCurrent ||
      !isCurrent() ||
      outcomeRef.current.kind !== "idle" ||
      isPending ||
      submitting.current ||
      (innerProps.mediaType === "tv" && !anySelected)
    )
      return;
    const target = {
      integrationId: innerProps.integrationId,
      mediaId: innerProps.mediaId,
      mediaType: innerProps.mediaType,
    };
    submitting.current = true;
    setIsSubmitting(true);
    const input = { ...target, seasons: selectedSeasons };
    let result: unknown;
    try {
      result = await innerProps.requestMedia(input);
    } catch (error) {
      publishOutcome({ kind: "unknown", error });
      submitting.current = false;
      if (lease.active) setIsSubmitting(false);
      if (isCurrent()) showErrorNotification({ message: innerProps.outcomeLabels.unknown });
      return;
    }
    publishOutcome({ kind: "confirmed", input, result });
    const reconcile = async () => {
      try {
        await innerProps.onRequested(target);
      } catch (error) {
        publishOutcome({ kind: "reconcileheld", input, result, error });
        if (isCurrent()) showErrorNotification({ message: innerProps.outcomeLabels.reconcileheld });
        throw error;
      } finally {
        submitting.current = false;
        if (lease.active) setIsSubmitting(false);
      }
      publishOutcome({ kind: "settled", input, result });
      retryReconciliation.current = null;
      if (!isCurrent()) return;
      showSuccessNotification({ message: t("common.notification.create.success") });
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
      {innerProps.mediaType === "tv" && <MRT_Table table={table} />}
      <Group justify="end">
        <Button
          onClick={() => {
            owner.current.active = false;
            actions.closeModal();
          }}
          variant="light"
        >
          {t("common.action.cancel")}
        </Button>
        <Button
          onClick={() => {
            void handleMutate().catch(() => {});
          }}
          disabled={
            !innerProps.requestMedia ||
            !innerProps.isCurrent ||
            outcome.kind !== "idle" ||
            isPending ||
            (!anySelected && innerProps.mediaType === "tv")
          }
        >
          {t("search.engine.media.request.modal.button.send")}
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
  );
};

export const RequestMediaModal = createModal<RequestMediaModalProps>(RequestMediaContent).withOptions({
  size: "xl",
});

export interface Season {
  id: number;
  seasonNumber: number;
  name: string;
  episodeCount: number;
}
