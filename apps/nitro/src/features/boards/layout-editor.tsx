import { useState } from "react";
import { Alert, Badge, Button, Fieldset, Group, NumberInput, Stack, Text, TextInput } from "@mantine/core";

import type { Board, BoardDomainResources, BoardLayout } from "./contracts";
import { projectDraftLayout, validateBoardDraft } from "./draft";
import { useBoardSnapshotDraft } from "./snapshot-draft";
import classes from "./boards.module.css";

interface BoardLayoutEditorProps {
  board: Board;
  resources: BoardDomainResources;
  selectedLayoutId: string;
  onSelect: (layoutId: string) => void;
  onUpdate: (update: (board: Board) => Board) => void;
}

export function BoardLayoutEditor(props: BoardLayoutEditorProps) {
  const base = props.board.layouts.find(({ role }) => role === "base");
  const used = new Set(props.board.layouts.map(({ breakpoint }) => breakpoint));
  let nextBreakpoint = (base?.breakpoint ?? 767) + 1;
  while (used.has(nextBreakpoint) && nextBreakpoint <= 32767) nextBreakpoint++;
  const roleOrder = { base: 0, custom: 1, mobile: 2 };
  return (
    <Stack>
      <Group justify="space-between">
        <Text fw={500}>Responsive layouts</Text>
        <Button
          variant="default"
          disabled={!base || nextBreakpoint > 32767}
          onClick={() => {
            if (!base) return;
            const target: BoardLayout = {
              ...base,
              id: props.resources.common.createId(),
              name: "Custom",
              role: "custom",
              breakpoint: nextBreakpoint,
              resizeSource: null,
            };
            props.onUpdate((board) => projectDraftLayout(board, base, target, props.resources));
          }}
        >
          Add custom layout
        </Button>
      </Group>
      <Alert color="yellow">
        Layout resizing and reset update the local draft only. Mobile and Base roles are protected.
      </Alert>
      {props.board.layouts
        .toSorted((a, b) => roleOrder[a.role] - roleOrder[b.role])
        .map((layout) => (
          <LayoutFields key={layout.id} {...props} layout={layout} />
        ))}
    </Stack>
  );
}

function equalLayoutFields(left: BoardLayout, right: BoardLayout) {
  return (
    left.name === right.name &&
    left.breakpoint === right.breakpoint &&
    left.columnCount === right.columnCount &&
    left.leftGutterColumnCount === right.leftGutterColumnCount &&
    left.rightGutterColumnCount === right.rightGutterColumnCount
  );
}

function LayoutFields(props: BoardLayoutEditorProps & { layout: BoardLayout }) {
  const draft = useBoardSnapshotDraft(props.layout, equalLayoutFields);
  const { value } = draft;
  const [confirmReset, setConfirmReset] = useState(false);
  const setNumber = (
    key: "columnCount" | "breakpoint" | "leftGutterColumnCount" | "rightGutterColumnCount",
    input: string | number,
  ) => {
    if (typeof input !== "number" || !Number.isInteger(input)) return;
    draft.update((previous) => {
      if (key !== "columnCount") return { ...previous, [key]: input };
      const left = Math.min(previous.leftGutterColumnCount, Math.max(0, input - 1));
      const right = Math.min(previous.rightGutterColumnCount, Math.max(0, input - left - 1));
      return { ...previous, columnCount: input, leftGutterColumnCount: left, rightGutterColumnCount: right };
    });
  };
  return (
    <Fieldset
      legend={
        <Group gap="xs">
          <Text>{props.layout.name}</Text>
          <Badge variant="default">{props.layout.role}</Badge>
        </Group>
      }
    >
      <Stack>
        {draft.conflict && (
          <Alert color="yellow" title="Layout changed while fields were being edited">
            <Stack gap="xs">
              <Text size="sm">
                Undo, redo, or another draft update changed this layout. Local fields are retained but cannot be applied
                until you reload the current layout.
              </Text>
              <Button
                variant="default"
                onClick={() => {
                  draft.reload();
                  setConfirmReset(false);
                }}
              >
                Discard local fields and reload current layout
              </Button>
            </Stack>
          </Alert>
        )}
        <div className={classes.settingColumns}>
          <TextInput
            label="Layout name"
            value={value.name}
            maxLength={32}
            onChange={(event) => {
              const name = event.currentTarget.value;
              draft.update((previous) => ({ ...previous, name }));
            }}
          />
          <NumberInput
            label="Columns"
            value={value.columnCount}
            min={1}
            max={24}
            allowDecimal={false}
            onChange={(input) => setNumber("columnCount", input)}
          />
          <NumberInput
            label="Minimum viewport width"
            value={value.breakpoint}
            min={props.layout.role === "mobile" ? 0 : 1}
            max={32767}
            disabled={props.layout.role === "mobile"}
            allowDecimal={false}
            onChange={(input) => setNumber("breakpoint", input)}
          />
          {props.layout.role !== "mobile" && (
            <>
              <NumberInput
                label="Left sidebar columns"
                value={value.leftGutterColumnCount}
                min={0}
                max={3}
                allowDecimal={false}
                onChange={(input) => setNumber("leftGutterColumnCount", input)}
              />
              <NumberInput
                label="Right sidebar columns"
                value={value.rightGutterColumnCount}
                min={0}
                max={3}
                allowDecimal={false}
                onChange={(input) => setNumber("rightGutterColumnCount", input)}
              />
            </>
          )}
        </div>
        <Group justify="space-between">
          <Group>
            <Button
              variant="default"
              onClick={() => props.onSelect(props.layout.id)}
              disabled={props.selectedLayoutId === props.layout.id}
            >
              Preview layout
            </Button>
            {props.layout.role !== "base" && (
              <Button variant="default" onClick={() => setConfirmReset((current) => !current)}>
                {confirmReset ? "Cancel reset" : "Reset from Base"}
              </Button>
            )}
            {props.layout.role === "custom" && (
              <Button
                variant="subtle"
                color="red"
                onClick={() =>
                  props.onUpdate((board) =>
                    validateBoardDraft(
                      {
                        ...board,
                        layouts: board.layouts.filter(({ id }) => id !== props.layout.id),
                        items: board.items.map((item) => ({
                          ...item,
                          layouts: item.layouts.filter(({ layoutId }) => layoutId !== props.layout.id),
                        })),
                        sections: board.sections.map((section) =>
                          section.kind === "empty"
                            ? section
                            : {
                                ...section,
                                layouts: section.layouts.filter(({ layoutId }) => layoutId !== props.layout.id),
                              },
                        ),
                      },
                      props.resources,
                    ),
                  )
                }
              >
                Remove custom layout
              </Button>
            )}
          </Group>
          <Button
            disabled={draft.conflict}
            onClick={() => {
              if (draft.conflict) return;
              const newRootIds = { left: props.resources.common.createId(), right: props.resources.common.createId() };
              props.onUpdate((board) => {
                const source = board.layouts.find(({ id }) => id === props.layout.id);
                if (!source) throw new Error("Layout not found.");
                if (source !== props.layout)
                  throw new Error("The layout changed. Reload its fields before applying them.");
                const roots = (["left", "right"] as const)
                  .filter(
                    (lane) =>
                      props.resources.definitions.getBoardLaneColumnCount(value, lane) > 0 &&
                      !board.sections.some(
                        (section) =>
                          section.kind === "empty" &&
                          props.resources.definitions.getRootSectionLane(section.xOffset) === lane,
                      ),
                  )
                  .map((lane) => ({
                    id: newRootIds[lane],
                    kind: "empty" as const,
                    xOffset: props.resources.definitions.rootSectionOffsets[lane],
                    yOffset: 0,
                  }));
                return projectDraftLayout(
                  { ...board, sections: [...board.sections, ...roots] },
                  source,
                  value,
                  props.resources,
                );
              });
            }}
          >
            Apply layout to draft
          </Button>
        </Group>
        {confirmReset && (
          <Alert color="red" title="Reset this layout?">
            <Stack>
              <Text size="sm">
                Replace this layout's item and container placements with a responsive projection of Base. Keep its name,
                breakpoint, and sidebar settings.
              </Text>
              <Button
                color="red"
                disabled={draft.conflict}
                onClick={() => {
                  if (draft.conflict) return;
                  props.onUpdate((board) => {
                    const base = board.layouts.find(({ role }) => role === "base");
                    if (!base) throw new Error("Base layout repair is required.");
                    const target = board.layouts.find(({ id }) => id === props.layout.id);
                    if (target !== props.layout)
                      throw new Error("The layout changed. Reload its fields before resetting it.");
                    return projectDraftLayout(board, base, target, props.resources);
                  });
                  setConfirmReset(false);
                }}
              >
                Reset layout in draft
              </Button>
            </Stack>
          </Alert>
        )}
      </Stack>
    </Fieldset>
  );
}
