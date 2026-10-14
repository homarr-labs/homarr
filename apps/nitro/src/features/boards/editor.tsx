import type { Dispatch } from "react";
import { useEffect, useLayoutEffect, useReducer, useRef, useState } from "react";
import {
  Alert,
  Button,
  ColorInput,
  Group,
  Modal,
  NumberInput,
  Select,
  Stack,
  Switch,
  TagsInput,
  Text,
  TextInput,
  Title,
} from "@mantine/core";

import type {
  Board,
  BoardContainer,
  BoardDomainResources,
  BoardItem,
  BoardLayout,
  BoardWidgetEditorComposition,
  BoardWidgetEditorUpstreamCapture,
  GridPlacement,
} from "./contracts";
import { boardDraftPersistenceHold, boardHref, boardWidgetCompositionHold, getBoardAccess } from "./contracts";
import type { BoardCanvasProps } from "./canvas";
import { BoardCanvas } from "./canvas";
import type { BoardDraftAction } from "./draft";
import {
  addBoardContainer,
  applyBoardItem,
  boardDraftReducer,
  createBoardDraft,
  placeBoardElement,
  removeBoardContainer,
  selectBoardLayout,
  validateBoardDraft,
} from "./draft";
import { BoardError } from "./errors";
import { BoardLayoutEditor } from "./layout-editor";
import classes from "./boards.module.css";
import { registerBoardUnloadGuard } from "../../source-ui/boards/unload-guard";

export interface BoardEditorProps extends Omit<BoardCanvasProps, "layout" | "editing" | "onUpdate" | "onEditElement"> {
  viewportWidth: number;
  initialLayoutId?: string | null;
  initialEditing?: boolean;
  widgetEditorComposition?: BoardWidgetEditorComposition;
  onNavigate?: (href: string) => void;
  onDirtyChange?: (dirty: boolean) => void;
  routerOwnsHistoryGuard?: boolean;
}

export function BoardEditor(props: BoardEditorProps) {
  return <ScopedBoardEditor key={`${props.identity.resourceKey}:${props.board.id}`} {...props} />;
}

interface WidgetEditorSession {
  active: boolean;
  readonly generation: number;
  readonly editGeneration: number;
  readonly baseline: Board;
  readonly item: BoardItem | null;
  readonly itemId: string;
  readonly composition: BoardWidgetEditorComposition;
  readonly upstreamOwner: BoardWidgetEditorUpstreamCapture;
}

function retireWidgetEditorSession(owner: { current: WidgetEditorSession | null }) {
  if (owner.current) owner.current.active = false;
  owner.current = null;
}

function ScopedBoardEditor(props: BoardEditorProps) {
  const [draft, dispatch] = useReducer(boardDraftReducer, props.board, createBoardDraft);
  const [editing, setEditing] = useState(props.initialEditing ?? false);
  const [layoutOverride, setLayoutOverride] = useState(props.initialLayoutId ?? null);
  const [selected, setSelected] = useState<Pick<GridPlacement, "id" | "type"> | null>(null);
  const [widgetEditor, setWidgetEditor] = useState<WidgetEditorSession | null>(null);
  const [discarding, setDiscarding] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const [layoutsOpen, setLayoutsOpen] = useState(false);
  const access = getBoardAccess(props.board, props.identity);
  const canEdit = access.modify || props.syntheticPreview === true;
  const dirty = draft.board !== draft.initial;
  const conflict = dirty && draft.initial !== props.board;
  const editGeneration = useRef(0);
  const widgetGeneration = useRef(0);
  const mounted = useRef(false);
  const activeWidgetEditor = useRef<WidgetEditorSession | null>(null);
  const current = useRef({ props, editing, baseline: draft.initial });
  const dirtyRef = useRef(dirty);
  const { onDirtyChange } = props;
  dirtyRef.current = dirty;
  useEffect(
    () =>
      registerBoardUnloadGuard({
        isDirty: () => dirtyRef.current,
        confirmNavigation: (href) => {
          setPendingNavigation(href);
          retireWidgetEditorSession(activeWidgetEditor);
          setWidgetEditor(null);
          setDiscarding(true);
        },
        guardHistory: !props.routerOwnsHistoryGuard,
      }),
    [props.routerOwnsHistoryGuard],
  );
  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);
  useLayoutEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      retireWidgetEditorSession(activeWidgetEditor);
    };
  }, []);
  useLayoutEffect(() => {
    current.current = { props, editing, baseline: draft.initial };
    const session = activeWidgetEditor.current;
    if (
      !editing ||
      !canEdit ||
      !session ||
      !session.active ||
      session.baseline !== draft.initial ||
      session.composition !== props.widgetEditorComposition ||
      !session.composition.upstreamOwner.isCurrentOwner() ||
      !session.upstreamOwner.request.isCurrent() ||
      !session.upstreamOwner.query.isCurrent() ||
      !session.upstreamOwner.authority.isCurrent() ||
      !session.upstreamOwner.presentation.isCurrent()
    ) {
      retireWidgetEditorSession(activeWidgetEditor);
      setWidgetEditor(null);
    }
  }, [props, editing, canEdit, draft.initial]);
  useLayoutEffect(() => {
    setSelected(null);
    return () => {
      retireWidgetEditorSession(activeWidgetEditor);
    };
  }, [draft.initial]);
  if (!dirty && draft.initial !== props.board) dispatch({ type: "reload", board: props.board });
  const generation = editGeneration.current;
  const canUpdate = () => {
    const context = current.current;
    return (
      mounted.current &&
      context.editing &&
      editGeneration.current === generation &&
      context.baseline === draft.initial &&
      (getBoardAccess(context.props.board, context.props.identity).modify || context.props.syntheticPreview === true)
    );
  };
  const closeWidgetEditor = () => {
    retireWidgetEditorSession(activeWidgetEditor);
    setWidgetEditor(null);
  };
  const requestDiscard = () => {
    closeWidgetEditor();
    setDiscarding(true);
  };
  const finishEditing = () => {
    editGeneration.current++;
    closeWidgetEditor();
    setSelected(null);
    setEditing(false);
  };
  const openWidgetEditor = (item: BoardItem | null) => {
    if (!canUpdate()) return;
    try {
      const composition = props.widgetEditorComposition;
      if (!composition || !composition.upstreamOwner.isCurrentOwner()) return;
      const upstreamOwner = composition.upstreamOwner.captureChangeOwner();
      if (
        !upstreamOwner.request.isCurrent() ||
        !upstreamOwner.query.isCurrent() ||
        !upstreamOwner.authority.isCurrent() ||
        !upstreamOwner.presentation.isCurrent()
      )
        return;
      if (!item && typeof props.resources.common.createId !== "function")
        throw new Error("The source item ID generator has not been composed into this workspace.");
      const itemId = item?.id ?? props.resources.common.createId();
      if (!item && [...draft.board.items, ...draft.board.sections].some(({ id }) => id === itemId))
        throw new Error("The source item ID generator returned an ID already used by this board.");
      const session: WidgetEditorSession = {
        active: true,
        generation: widgetGeneration.current + 1,
        editGeneration: generation,
        baseline: draft.initial,
        item,
        itemId,
        composition,
        upstreamOwner,
      };
      if (
        !canUpdate() ||
        !composition.upstreamOwner.isCurrentOwner() ||
        !upstreamOwner.request.isCurrent() ||
        !upstreamOwner.query.isCurrent() ||
        !upstreamOwner.authority.isCurrent() ||
        !upstreamOwner.presentation.isCurrent()
      )
        return;
      retireWidgetEditorSession(activeWidgetEditor);
      widgetGeneration.current = session.generation;
      activeWidgetEditor.current = session;
      setWidgetEditor(session);
    } catch (error) {
      dispatch({ type: "error", error: error instanceof Error ? error : new Error("Item creation is unavailable.") });
    }
  };
  const isCurrentWidgetEditor = (session: WidgetEditorSession) => {
    const context = current.current;
    const isCurrent =
      session.active &&
      activeWidgetEditor.current === session &&
      widgetGeneration.current === session.generation &&
      editGeneration.current === session.editGeneration &&
      context.baseline === session.baseline &&
      context.props.widgetEditorComposition === session.composition &&
      (!session.item || session.item.id === session.itemId) &&
      session.composition.upstreamOwner.isCurrentOwner() &&
      session.upstreamOwner.request.isCurrent() &&
      session.upstreamOwner.query.isCurrent() &&
      session.upstreamOwner.authority.isCurrent() &&
      session.upstreamOwner.presentation.isCurrent() &&
      canUpdate();
    if (!isCurrent) session.active = false;
    return isCurrent;
  };
  const captureWidgetEditorOwner = (session: WidgetEditorSession) => {
    if (!isCurrentWidgetEditor(session)) return { isCurrent: () => false };
    return { isCurrent: () => isCurrentWidgetEditor(session) };
  };
  let layout: BoardLayout;
  try {
    validateBoardDraft(draft.board, props.resources);
    layout = selectBoardLayout(draft.board, props.viewportWidth, layoutOverride);
  } catch (error) {
    return <BoardError error={error} />;
  }
  const onUpdate = (update: (board: Board) => Board) => {
    if (!canUpdate()) return;
    dispatch({
      type: "apply",
      update: (board) => (canUpdate() ? validateBoardDraft(update(board), current.current.props.resources) : board),
    });
  };
  const section =
    selected?.type === "section"
      ? draft.board.sections.find(
          (candidate): candidate is BoardContainer => candidate.id === selected.id && candidate.kind === "container",
        )
      : undefined;
  const item = selected?.type === "item" ? draft.board.items.find(({ id }) => id === selected.id) : undefined;
  const selectedLayout = (section ?? item)?.layouts.find((candidate) => candidate.layoutId === layout.id);
  let logicalSelected: ElementEditorProps["selected"] | null = null;
  if (selected && selectedLayout) {
    logicalSelected = {
      placement: {
        id: selected.id,
        type: selected.type,
        x: selectedLayout.xOffset,
        y: selectedLayout.yOffset,
        w: selectedLayout.width,
        h: selectedLayout.height,
      },
      sectionId: "parentSectionId" in selectedLayout ? selectedLayout.parentSectionId : selectedLayout.sectionId,
    };
  }
  const onDiscard = () => {
    dispatch({ type: "reload", board: props.board });
    finishEditing();
    setDiscarding(false);
    setSelected(null);
    setLayoutsOpen(false);
    setPendingNavigation(null);
    if (pendingNavigation) {
      dirtyRef.current = false;
      props.onDirtyChange?.(false);
      if (props.onNavigate) props.onNavigate(pendingNavigation);
      else window.location.assign(pendingNavigation);
    }
  };
  return (
    <Stack gap="md">
      <Group className={classes.toolbar} justify="space-between" align="center">
        <Title order={1} size="h3">
          {draft.board.pageTitle || draft.board.name}
        </Title>
        <Group gap="xs">
          <Select
            aria-label="Responsive board layout"
            w={180}
            value={layoutOverride ?? "auto"}
            data={[
              { value: "auto", label: "Automatic layout" },
              ...draft.board.layouts.map((value) => ({ value: value.id, label: value.name })),
            ]}
            onChange={(value) => {
              setLayoutOverride(value === "auto" ? null : value);
              setSelected(null);
            }}
          />
          {canEdit && !editing && (
            <Button
              variant="default"
              onClick={() => {
                editGeneration.current++;
                setEditing(true);
              }}
            >
              Edit board
            </Button>
          )}
          {canEdit && editing && (
            <>
              <Button
                variant="default"
                onClick={() => openWidgetEditor(null)}
                disabled={!props.widgetEditorComposition || typeof props.resources.common.createId !== "function"}
                title={
                  !props.widgetEditorComposition
                    ? boardWidgetCompositionHold.reason
                    : typeof props.resources.common.createId !== "function"
                      ? "Source item ID generator composition is pending"
                      : undefined
                }
              >
                Add item
              </Button>
              <Button
                variant="default"
                onClick={() => {
                  const id = props.resources.common.createId();
                  onUpdate((board) => addBoardContainer(board, props.resources, id));
                }}
              >
                Add container
              </Button>
              <Button variant="default" onClick={() => setLayoutsOpen((value) => !value)}>
                Edit layouts
              </Button>
              <Button variant="default" disabled={draft.past.length === 0} onClick={() => dispatch({ type: "undo" })}>
                Undo change
              </Button>
              <Button variant="default" disabled={draft.future.length === 0} onClick={() => dispatch({ type: "redo" })}>
                Redo change
              </Button>
              <Button variant="default" onClick={() => (dirty ? requestDiscard() : finishEditing())}>
                Finish editing
              </Button>
            </>
          )}
        </Group>
      </Group>
      {draft.error && <BoardError error={draft.error} />}
      {props.syntheticPreview && (
        <Alert color="yellow" title="Synthetic feedback preview">
          <Text size="sm">
            This is disposable display data, not an authenticated board. Editing changes only this nonpersistent local
            draft.
          </Text>
        </Alert>
      )}
      {conflict && (
        <Alert color="yellow" title="Board changed since editing began">
          <Stack gap="xs">
            <Text size="sm">
              Your draft retains its captured baseline. Reloading discards local changes and adopts the latest board.
            </Text>
            <Button variant="default" onClick={requestDiscard}>
              Reload latest board
            </Button>
          </Stack>
        </Alert>
      )}
      {editing && (
        <Alert color="yellow" title="Local board draft">
          <Text size="sm">
            Changes stay in this workspace. {boardDraftPersistenceHold.reason}. Leaving this page loses unsaved changes.
          </Text>
        </Alert>
      )}
      {layoutsOpen && editing && canEdit && (
        <BoardLayoutEditor
          board={draft.board}
          resources={props.resources}
          selectedLayoutId={layout.id}
          onSelect={setLayoutOverride}
          onUpdate={onUpdate}
        />
      )}
      <BoardCanvas
        {...props}
        board={draft.board}
        layout={layout}
        editing={editing && canEdit}
        onUpdate={onUpdate}
        onEditElement={({ id, type }) => setSelected({ id, type })}
      />
      {dirty && (
        <Group className={classes.toolbar} justify="space-between">
          <Text component="output" size="sm">
            Unsaved board changes
          </Text>
          <Group>
            <Button variant="default" onClick={requestDiscard}>
              Discard changes
            </Button>
            <Button disabled title={boardDraftPersistenceHold.reason}>
              Save changes
            </Button>
          </Group>
        </Group>
      )}
      {logicalSelected && editing && canEdit && (
        <ElementEditor
          key={`${layout.id}:${logicalSelected.placement.id}`}
          board={draft.board}
          resources={props.resources}
          layoutId={layout.id}
          selected={logicalSelected}
          section={section}
          item={item}
          dispatch={dispatch}
          error={draft.error}
          onUpdate={onUpdate}
          onClose={() => setSelected(null)}
          onEditWidget={
            props.widgetEditorComposition &&
            item &&
            (item.kind !== "customApi" || props.identity.permissions.includes("admin"))
              ? () => {
                  setSelected(null);
                  openWidgetEditor(item);
                }
              : undefined
          }
        />
      )}
      <Modal
        opened={discarding}
        onClose={() => {
          setDiscarding(false);
          setPendingNavigation(null);
        }}
        title="Discard board changes?"
        transitionProps={{ duration: 0 }}
      >
        <Stack>
          <Text>
            Discard all local item, container, and layout changes and reload the latest received board snapshot.
          </Text>
          <Group justify="flex-end">
            <Button
              variant="default"
              onClick={() => {
                setDiscarding(false);
                setPendingNavigation(null);
              }}
            >
              Keep editing
            </Button>
            <Button color="red" onClick={onDiscard}>
              Discard changes
            </Button>
          </Group>
        </Stack>
      </Modal>
      {widgetEditor &&
        editing &&
        canEdit &&
        props.widgetEditorComposition?.renderWidgetEditor({
          board: draft.board,
          item: widgetEditor.item,
          itemId: widgetEditor.itemId,
          upstreamOwner: widgetEditor.upstreamOwner,
          isCurrentOwner: () => isCurrentWidgetEditor(widgetEditor),
          captureChangeOwner: () => captureWidgetEditorOwner(widgetEditor),
          canConfigureCustomWidgets: props.identity.permissions.includes("admin"),
          error: draft.error,
          onCancel: () => {
            if (activeWidgetEditor.current === widgetEditor) closeWidgetEditor();
          },
          onApply: (nextItem) => {
            const isActive = () => isCurrentWidgetEditor(widgetEditor);
            if (!isActive()) return;
            onUpdate((board) => {
              if (!isActive()) return board;
              const previous = board.items.find(({ id }) => id === widgetEditor.itemId);
              if (nextItem.id !== widgetEditor.itemId)
                throw new Error("The widget editor must use the board owner's reserved item ID.");
              if (widgetEditor.item && !previous)
                throw new Error("This editor can only update its captured board item.");
              if (!widgetEditor.item && (previous || board.sections.some(({ id }) => id === widgetEditor.itemId)))
                throw new Error("The reserved item ID is already in use. Reopen the item editor.");
              if (
                !current.current.props.identity.permissions.includes("admin") &&
                ((nextItem.kind === "customApi" &&
                  (!previous || previous.kind !== "customApi" || previous.options !== nextItem.options)) ||
                  (previous?.kind === "customApi" && nextItem.kind !== "customApi"))
              )
                throw new Error("Only administrators can add or configure Custom Widgets.");
              return applyBoardItem(board, { ...nextItem, id: widgetEditor.itemId }, current.current.props.resources);
            });
          },
        })}
      {!editing && access.modify && (
        <Button component="a" href={`${boardHref(draft.board.name)}/settings`} variant="subtle" w="fit-content">
          Open board settings
        </Button>
      )}
    </Stack>
  );
}

interface ElementEditorProps {
  board: Board;
  resources: BoardDomainResources;
  layoutId: string;
  selected: { placement: GridPlacement; sectionId: string };
  section: BoardContainer | undefined;
  item: BoardItem | undefined;
  dispatch: Dispatch<BoardDraftAction>;
  error: Error | null;
  onUpdate: (update: (board: Board) => Board) => void;
  onClose: () => void;
  onEditWidget?: () => void;
}

function ElementEditor(props: ElementEditorProps) {
  const [initialSelection] = useState(props.selected);
  const [placement, setPlacement] = useState(props.selected.placement);
  const [destinationId, setDestinationId] = useState(props.selected.sectionId);
  const [options, setOptions] = useState(props.section?.options);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const title = props.item?.advancedOptions.title || props.section?.options.title || props.item?.kind || "Container";
  const patchNumber = (key: "x" | "y" | "w" | "h", value: string | number) => {
    if (typeof value === "number" && Number.isInteger(value))
      setPlacement((previous) => ({ ...previous, [key]: value }));
  };
  return (
    <Modal opened onClose={props.onClose} title={`Edit ${title}`} size="lg" transitionProps={{ duration: 0 }}>
      <Stack>
        {props.error && <BoardError error={props.error} />}
        <Select
          label="Destination section"
          value={destinationId}
          onChange={(value) => {
            if (value) setDestinationId(value);
          }}
          data={props.board.sections
            .filter(({ id }) => id !== placement.id)
            .map((section) => ({
              value: section.id,
              label:
                section.kind === "empty"
                  ? `${props.resources.definitions.getRootSectionLane(section.xOffset)} canvas`
                  : section.options.title || `Container ${section.id}`,
            }))}
          searchable
        />
        <Group grow>
          <NumberInput
            label="Column"
            value={placement.x}
            min={0}
            max={32767}
            allowDecimal={false}
            onChange={(value) => patchNumber("x", value)}
          />
          <NumberInput
            label="Row"
            value={placement.y}
            min={0}
            max={32767}
            allowDecimal={false}
            onChange={(value) => patchNumber("y", value)}
          />
        </Group>
        <Group grow>
          <NumberInput
            label="Width"
            value={placement.w}
            min={1}
            max={24}
            allowDecimal={false}
            onChange={(value) => patchNumber("w", value)}
          />
          <NumberInput
            label="Height"
            value={placement.h}
            min={1}
            max={32767}
            allowDecimal={false}
            onChange={(value) => patchNumber("h", value)}
          />
        </Group>
        {options && (
          <>
            <TextInput
              label="Container title"
              value={options.title}
              maxLength={64}
              onChange={(event) => setOptions({ ...options, title: event.currentTarget.value })}
            />
            <Switch
              label="Show label"
              checked={options.showLabel}
              onChange={(event) => setOptions({ ...options, showLabel: event.currentTarget.checked })}
            />
            <Switch
              label="Allow collapsing"
              checked={options.collapsible}
              onChange={(event) => setOptions({ ...options, collapsible: event.currentTarget.checked })}
            />
            <Switch
              label="Show open all apps action"
              checked={options.showOpenAll}
              onChange={(event) => setOptions({ ...options, showOpenAll: event.currentTarget.checked })}
            />
            <Switch
              label="Scroll inside container"
              checked={options.scrollable}
              onChange={(event) => setOptions({ ...options, scrollable: event.currentTarget.checked })}
            />
            <TagsInput
              label="Custom CSS classes"
              value={options.customCssClasses}
              onChange={(customCssClasses) => setOptions({ ...options, customCssClasses })}
            />
            <ColorInput
              label="Container border color"
              value={options.borderColor}
              onChange={(borderColor) => setOptions({ ...options, borderColor })}
              format="hex"
            />
          </>
        )}
        {props.item && (
          <Button variant="default" onClick={props.onEditWidget} disabled={!props.onEditWidget}>
            Edit widget options
          </Button>
        )}
        <Group justify="space-between">
          <Button color="red" variant="subtle" onClick={() => setConfirmRemove((value) => !value)}>
            {confirmRemove ? "Cancel removal" : props.section ? "Remove container" : "Remove item"}
          </Button>
          <Group>
            <Button variant="default" onClick={props.onClose}>
              Cancel edit
            </Button>
            <Button
              onClick={() =>
                props.onUpdate((board) => {
                  const withOptions = options
                    ? {
                        ...board,
                        sections: board.sections.map((section) =>
                          section.id === placement.id && section.kind === "container"
                            ? {
                                ...section,
                                options: props.resources.schemas.containerSectionOptionsSchema.parse(options),
                              }
                            : section,
                        ),
                      }
                    : board;
                  const geometryChanged =
                    destinationId !== initialSelection.sectionId ||
                    placement.x !== initialSelection.placement.x ||
                    placement.y !== initialSelection.placement.y ||
                    placement.w !== initialSelection.placement.w ||
                    placement.h !== initialSelection.placement.h;
                  if (!geometryChanged) return withOptions;
                  return placeBoardElement(withOptions, props.layoutId, destinationId, placement, props.resources);
                })
              }
            >
              Apply to draft
            </Button>
          </Group>
        </Group>
        {confirmRemove && (
          <Alert color="red" title={props.section ? "Remove container only" : "Remove item from all layouts"}>
            <Stack>
              <Text size="sm">
                {props.section
                  ? "Contained apps, widgets, and sections will move to the parent in every layout. Their options and IDs are preserved."
                  : "This removes the item from the local draft in every responsive layout."}
              </Text>
              <Button
                color="red"
                onClick={() => {
                  props.onUpdate((board) =>
                    props.section
                      ? removeBoardContainer(board, placement.id, props.resources)
                      : { ...board, items: board.items.filter(({ id }) => id !== placement.id) },
                  );
                  setConfirmRemove(false);
                }}
              >
                Confirm removal
              </Button>
            </Stack>
          </Alert>
        )}
      </Stack>
    </Modal>
  );
}
