"use client";

import { useEffect, useRef, useState } from "react";

import type { RouterOutputs } from "@homarr/api";
import { clientApi, fetchApi } from "@homarr/api/client";
import { validateCustomWidgetOptions } from "@homarr/custom-widgets/core";
import { useI18n } from "@homarr/translation/client";

export type WidgetCollection = RouterOutputs["customWidget"]["package"]["collection"];
export type CollectionConfiguration = Record<string, Record<string, unknown>>;

export function useCollectionPlacement(collection: WidgetCollection) {
  const t = useI18n("customWidget.package.collections");
  const utils = clientApi.useUtils();
  const stopRequested = useRef(false);
  const running = useRef(false);
  const [busy, setBusy] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<Record<string, { text: string; failed?: boolean }>>({});
  const [completedBoard, setCompletedBoard] = useState<string | null>(null);
  useEffect(
    () => () => {
      stopRequested.current = true;
    },
    [],
  );

  const run = async (
    board: { id: string; name: string },
    selected: string[],
    bindings: Record<string, string>,
    configuration: CollectionConfiguration,
  ) => {
    if (running.current) return;
    setError("");
    setStatus({});
    setCompletedBoard(null);
    const entries = collection.entries.filter((entry) => selected.includes(entry.id));
    for (const entry of entries) {
      if (!entry.manifest) {
        setError(t("needsRepair", { name: entry.name }));
        return;
      }
      const issue = validateCustomWidgetOptions(
        entry.optionDefinitions,
        configuration[entry.id] ?? entry.configuration,
      )[0];
      if (issue) {
        setError(entry.name + ": " + issue.message);
        return;
      }
    }
    stopRequested.current = false;
    running.current = true;
    setStopping(false);
    setBusy(true);
    let added = false;
    try {
      await fetchApi.customWidget.package.setCollectionBindings.mutate({ importId: collection.importId, bindings });
      for (const entry of entries) {
        if (stopRequested.current) break;
        const report = (text: string, failed = false) =>
          setStatus((current) => ({ ...current, [entry.id]: { text, failed } }));
        try {
          report(t("activating"));
          await fetchApi.customWidget.package.activate.mutate({
            id: entry.id,
            trusted: true,
            expectedDraftDigest: entry.draftDigest,
          });
          const installation = await fetchApi.customWidget.package.get.query({ id: entry.id });
          // A response may have been lost after a successful previous add. Reading the installed
          // placements makes a user's retry reuse that tile instead of duplicating it.
          if (installation.placements.some((placement) => placement.boardId === board.id)) {
            report(t("alreadyPlaced"));
            added = true;
            continue;
          }
          report(t("adding"));
          await fetchApi.board.addItem.mutate({
            boardId: board.id,
            kind: "customApi",
            integrationIds: [],
            options: {
              definitionId: entry.id,
              configuration: configuration[entry.id] ?? entry.configuration,
              configurationVersion: entry.manifest?.configurationVersion ?? 1,
              connectionBindings: {},
              refreshInterval: 30,
            },
          });
          report(t("added"));
          added = true;
        } catch (cause) {
          report(cause instanceof Error ? cause.message : String(cause), true);
        }
      }
      if (added) setCompletedBoard(board.name);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      running.current = false;
      setBusy(false);
      setStopping(false);
      await Promise.allSettled([
        utils.customWidget.package.collection.invalidate({ importId: collection.importId }),
        utils.customWidget.package.collections.invalidate(),
        utils.customWidget.package.list.invalidate(),
      ]);
    }
  };
  return {
    run,
    busy,
    stopping,
    error,
    status,
    completedBoard,
    stop() {
      stopRequested.current = true;
      setStopping(true);
    },
  };
}
