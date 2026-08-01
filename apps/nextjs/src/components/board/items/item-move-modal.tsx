import { useCallback, useMemo } from "react";
import { Grid, NumberInput, Select, Stack } from "@mantine/core";
import { z } from "zod/v4";

import { useCurrentLayout, useRequiredBoard } from "@homarr/boards/context";
import { getRootSectionLane } from "@homarr/definitions";
import { useZodForm } from "@homarr/form";
import { createModal, ModalFormFooter, modalSizeForm, useModalAction } from "@homarr/modals";
import { useI18n } from "@homarr/translation/client";

import type { Board, ContainerSectionItem, SectionItem } from "~/app/[locale]/boards/_types";
import { getBoardLaneColumnCount, getLayoutRowCount } from "../layout";
import { resolvePinnedGridCollisions } from "../sections/grid/dnd";
import type { CommitSectionGridInput, SectionGridPlacement } from "../sections/grid/use-grid-layout-actions";
import { useGridLayoutActions } from "../sections/grid/use-grid-layout-actions";

export type MovableEntry = Pick<
  SectionItem | ContainerSectionItem,
  "id" | "type" | "width" | "height" | "xOffset" | "yOffset"
>;

export interface OpenItemMoveModalInput {
  entry: MovableEntry;
  sourceSectionId: string;
}

interface InnerProps extends OpenItemMoveModalInput {
  board: Board;
  currentLayoutId: string;
  commitSectionGrids: (snapshots: readonly CommitSectionGridInput[]) => void;
}

interface MoveTarget {
  id: string;
  label: string;
  columnCount: number;
  maxRowCount: number | null;
}

interface MoveTargetLabels {
  canvas: string;
  container: string;
  leftRail: string;
  rightRail: string;
  numbered: (name: string, index: number) => string;
  located: (name: string, location: string, index: number) => string;
}

type MoveTargetCandidate = Omit<MoveTarget, "label"> & {
  name: string;
  location?: string;
};

export const ItemMoveModal = createModal<InnerProps>(({ actions, innerProps }) => {
  const t = useI18n();
  const { board, commitSectionGrids, currentLayoutId, entry, sourceSectionId } = innerProps;
  const minimumSize = useMemo(
    () => getEntryMinimumSize(board, currentLayoutId, entry),
    [board, currentLayoutId, entry],
  );
  const targets = useMemo(
    () =>
      getMoveTargets(board, currentLayoutId, entry, {
        canvas: t("board.landmark.canvas"),
        container: t("section.container.action.create"),
        leftRail: t("board.landmark.leftRail"),
        rightRail: t("board.landmark.rightRail"),
        numbered: (name, index) => t("item.moveResize.target.numbered", { name, index: String(index) }),
        located: (name, location, index) =>
          t("item.moveResize.target.located", {
            name,
            location,
            index: String(index),
          }),
      }),
    [board, currentLayoutId, entry, t],
  );
  const targetById = useMemo(() => new Map(targets.map((target) => [target.id, target])), [targets]);
  const initialTarget = targetById.get(sourceSectionId) ?? targets[0];

  if (!initialTarget) {
    throw new Error("No valid dashboard section is available for this item");
  }

  const form = useZodForm(
    z.object({
      sectionId: z.string().min(1),
      xOffset: z.number().int().min(0).max(32767),
      yOffset: z.number().int().min(0).max(32767),
      width: z.number().int().min(1).max(32767),
      height: z.number().int().min(1).max(32767),
    }),
    {
      initialValues: {
        sectionId: initialTarget.id,
        xOffset: entry.xOffset,
        yOffset: entry.yOffset,
        width: entry.width,
        height: entry.height,
      },
    },
  );
  const selectedTarget = targetById.get(form.values.sectionId) ?? initialTarget;

  const handleSubmit = useCallback(
    (values: { sectionId: string; xOffset: number; yOffset: number; width: number; height: number }) => {
      const target = targetById.get(values.sectionId);
      if (!target) return;

      const width = Math.max(minimumSize.width, Math.min(values.width, target.columnCount));
      const height = Math.max(minimumSize.height, values.height);
      const nextPlacement: SectionGridPlacement = {
        id: entry.id,
        type: entry.type,
        x: Math.min(values.xOffset, target.columnCount - width),
        y: values.yOffset,
        w: width,
        h: height,
      };
      const targetPlacements = getSectionPlacements(board, currentLayoutId, target.id).filter(
        (placement) => placement.id !== entry.id,
      );
      const resolvedTarget = resolvePinnedGridCollisions(
        [...targetPlacements, nextPlacement],
        nextPlacement,
        target.columnCount,
      );
      if (target.maxRowCount !== null && getLayoutRowCount(resolvedTarget) > target.maxRowCount) {
        form.setFieldError("height", t("item.moveResize.keyboard.boundary"));
        return;
      }

      const snapshots =
        sourceSectionId === target.id
          ? [{ layoutId: currentLayoutId, sectionId: target.id, placements: resolvedTarget }]
          : [
              {
                layoutId: currentLayoutId,
                sectionId: sourceSectionId,
                placements: getSectionPlacements(board, currentLayoutId, sourceSectionId).filter(
                  (placement) => placement.id !== entry.id,
                ),
              },
              { layoutId: currentLayoutId, sectionId: target.id, placements: resolvedTarget },
            ];

      commitSectionGrids(snapshots);
      actions.closeModal();
      focusMovedEntry(entry.id, target.id);
    },
    [actions, board, commitSectionGrids, currentLayoutId, entry, form, minimumSize, sourceSectionId, t, targetById],
  );

  return (
    <form onSubmit={form.onSubmit(handleSubmit, console.error)}>
      <Stack>
        <Select
          data={targets.map((target) => ({ value: target.id, label: target.label }))}
          label={t("item.moveResize.field.section.label")}
          data-autofocus
          allowDeselect={false}
          searchable
          {...form.getInputProps("sectionId")}
        />
        <Grid>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <NumberInput
              label={t("item.moveResize.field.xOffset.label")}
              min={0}
              max={selectedTarget.columnCount - 1}
              {...form.getInputProps("xOffset")}
            />
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 6 }}>
            <NumberInput
              label={t("item.moveResize.field.yOffset.label")}
              min={0}
              max={selectedTarget.maxRowCount === null ? undefined : selectedTarget.maxRowCount - 1}
              {...form.getInputProps("yOffset")}
            />
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 6 }}>
            <NumberInput
              label={t("item.moveResize.field.width.label")}
              min={minimumSize.width}
              max={selectedTarget.columnCount - Math.min(form.values.xOffset, selectedTarget.columnCount - 1)}
              {...form.getInputProps("width")}
            />
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 6 }}>
            <NumberInput
              label={t("item.moveResize.field.height.label")}
              min={minimumSize.height}
              max={
                selectedTarget.maxRowCount === null
                  ? undefined
                  : selectedTarget.maxRowCount - Math.min(form.values.yOffset, selectedTarget.maxRowCount - 1)
              }
              {...form.getInputProps("height")}
            />
          </Grid.Col>
        </Grid>
        <ModalFormFooter onCancel={actions.closeModal} />
      </Stack>
    </form>
  );
}).withOptions({
  defaultTitle(t) {
    return t("item.moveResize.title");
  },
  size: modalSizeForm,
});

export const useOpenItemMoveModal = () => {
  const board = useRequiredBoard();
  const currentLayoutId = useCurrentLayout();
  const { commitSectionGrids } = useGridLayoutActions();
  const { openModal } = useModalAction(ItemMoveModal);

  return useCallback(
    (input: OpenItemMoveModalInput) => {
      openModal({
        ...input,
        board,
        currentLayoutId,
        commitSectionGrids,
      });
    },
    [board, commitSectionGrids, currentLayoutId, openModal],
  );
};

export const getMoveTargets = (
  board: Board,
  layoutId: string,
  entry: MovableEntry,
  labels: MoveTargetLabels,
): MoveTarget[] => {
  const minimum = getEntryMinimumSize(board, layoutId, entry);

  const candidates = board.sections.flatMap((section): MoveTargetCandidate[] => {
    if (section.kind === "empty") {
      const columnCount = getSectionColumnCount(board, layoutId, section.id);
      const lane = getRootSectionLane(section.xOffset);
      if (columnCount === 0) return [];
      return minimum.width <= columnCount
        ? [
            {
              id: section.id,
              name: lane === "left" ? labels.leftRail : lane === "right" ? labels.rightRail : labels.canvas,
              columnCount,
              maxRowCount: getSectionMaxRowCount(board, layoutId, section.id),
            },
          ]
        : [];
    }

    const layout = section.layouts.find((candidate) => candidate.layoutId === layoutId);
    if (!layout) return [];
    if (
      (entry.type === "section" && isSameOrDescendant(board, layoutId, section.id, entry.id)) ||
      minimum.width > layout.width ||
      minimum.height > layout.height
    ) {
      return [];
    }

    return [
      {
        id: section.id,
        name: section.options.title || labels.container,
        columnCount: layout.width,
        maxRowCount: layout.height,
      },
    ];
  });

  return candidates.map(({ name, location, ...target }, index) => ({
    ...target,
    label: location ? labels.located(name, location, index + 1) : labels.numbered(name, index + 1),
  }));
};

const getSectionPlacements = (board: Board, layoutId: string, sectionId: string): SectionGridPlacement[] => [
  ...board.items.flatMap((item) => {
    const layout = item.layouts.find((candidate) => candidate.layoutId === layoutId);
    return layout?.sectionId === sectionId
      ? [
          {
            id: item.id,
            type: "item" as const,
            x: layout.xOffset,
            y: layout.yOffset,
            w: layout.width,
            h: layout.height,
          },
        ]
      : [];
  }),
  ...board.sections.flatMap((section) => {
    if (section.kind !== "container") return [];
    const layout = section.layouts.find((candidate) => candidate.layoutId === layoutId);
    return layout?.parentSectionId === sectionId
      ? [
          {
            id: section.id,
            type: "section" as const,
            x: layout.xOffset,
            y: layout.yOffset,
            w: layout.width,
            h: layout.height,
          },
        ]
      : [];
  }),
];

const getSectionColumnCount = (board: Board, layoutId: string, sectionId: string) => {
  const layout = board.layouts.find((candidate) => candidate.id === layoutId);
  if (!layout) throw new Error(`Layout "${layoutId}" was not found`);
  const section = board.sections.find((candidate) => candidate.id === sectionId);
  if (!section) throw new Error(`Section "${sectionId}" was not found`);

  if (section.kind === "container") {
    const sectionLayout = section.layouts.find((candidate) => candidate.layoutId === layoutId);
    if (!sectionLayout) throw new Error(`Section "${sectionId}" has no current layout`);
    return sectionLayout.width;
  }
  return getBoardLaneColumnCount(layout, getRootSectionLane(section.xOffset));
};

const getSectionMaxRowCount = (board: Board, layoutId: string, sectionId: string) => {
  const section = board.sections.find((candidate) => candidate.id === sectionId);
  if (!section) return null;
  if (section.kind === "container") {
    return section.layouts.find((candidate) => candidate.layoutId === layoutId)?.height ?? null;
  }
  return null;
};

const getEntryMinimumSize = (board: Board, layoutId: string, entry: MovableEntry) => {
  if (entry.type === "item") return { width: 1, height: 1 };
  const children = getSectionPlacements(board, layoutId, entry.id);
  return {
    width: Math.max(1, ...children.map((child) => child.x + child.w)),
    height: Math.max(1, ...children.map((child) => child.y + child.h)),
  };
};

const isSameOrDescendant = (board: Board, layoutId: string, candidateId: string, ancestorId: string) => {
  let current: string | undefined = candidateId;
  const visited = new Set<string>();
  while (current && !visited.has(current)) {
    if (current === ancestorId) return true;
    visited.add(current);
    const section = board.sections.find((candidate) => candidate.id === current && candidate.kind === "container");
    if (!section || section.kind !== "container") return false;
    current = section.layouts.find((layout) => layout.layoutId === layoutId)?.parentSectionId;
  }
  return false;
};

const focusMovedEntry = (entryId: string, sectionId: string) => {
  let attempts = 0;
  const tryFocus = () => {
    const section = Array.from(document.querySelectorAll<HTMLElement>("[data-grid-section-id]")).find(
      (candidate) => candidate.dataset.gridSectionId === sectionId,
    );
    const entry = Array.from(section?.querySelectorAll<HTMLElement>(":scope > [data-grid-item-id]") ?? []).find(
      (candidate) => candidate.dataset.gridItemId === entryId,
    );
    const editorEntry = entry?.querySelector<HTMLElement>("[data-editor-grid-entry]");
    if (editorEntry) {
      editorEntry.focus();
      return;
    }

    attempts += 1;
    if (attempts < 10) requestAnimationFrame(tryFocus);
  };

  requestAnimationFrame(tryFocus);
};
