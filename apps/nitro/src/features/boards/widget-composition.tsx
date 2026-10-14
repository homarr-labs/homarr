import type { ComponentProps } from "react";

import type {
  BoardWidgetEditorChangeOwner,
  BoardWidgetEditorComposition,
  BoardWidgetEditorInput,
  BoardWidgetEditorUpstreamCapture,
  BoardWidgetEditorUpstreamOwner,
} from "./contracts";
import { AddWidget } from "../widgets-editor/add-widget";
import type { WidgetEditorProps } from "../widgets-editor/widget-editor";
import { WidgetEditor } from "../widgets-editor/widget-editor";

export interface RequiredBoardWidgetEditorOwner extends BoardWidgetEditorChangeOwner {
  readonly requestLifetime: BoardWidgetEditorUpstreamCapture;
  readonly reservedItemId: string;
}

export type BoardOwnedWidgetEditorProps = WidgetEditorProps & RequiredBoardWidgetEditorOwner;
export type BoardOwnedAddWidgetProps = ComponentProps<typeof AddWidget> & RequiredBoardWidgetEditorOwner;

export type BoardWidgetEditorRequest =
  | {
      kind: "configure";
      editor: Omit<BoardOwnedWidgetEditorProps, keyof RequiredBoardWidgetEditorOwner | "itemId"> & {
        itemId: string;
      };
    }
  | {
      kind: "create";
      editor: Omit<BoardOwnedAddWidgetProps, keyof RequiredBoardWidgetEditorOwner>;
    };

export function createBoardWidgetEditorComposition(props: {
  upstreamOwner: BoardWidgetEditorUpstreamOwner;
  getRequest(input: BoardWidgetEditorInput): BoardWidgetEditorRequest;
}): BoardWidgetEditorComposition {
  return {
    upstreamOwner: props.upstreamOwner,
    renderWidgetEditor: (input) => {
      if (!input.isCurrentOwner()) return null;
      return <BoardWidgetComposition input={input} request={props.getRequest(input)} />;
    },
  };
}

export function BoardWidgetComposition(props: { input: BoardWidgetEditorInput; request: BoardWidgetEditorRequest }) {
  const { input, request } = props;
  if (!input.isCurrentOwner() || request.editor.boardId !== input.board.id) return null;
  const owner: RequiredBoardWidgetEditorOwner = {
    isCurrentOwner: input.isCurrentOwner,
    captureChangeOwner: input.captureChangeOwner,
    requestLifetime: input.upstreamOwner,
    reservedItemId: input.itemId,
  };
  const onClose = () => {
    if (!input.isCurrentOwner()) return;
    input.onCancel();
    request.editor.onClose();
  };
  if (request.kind === "configure") {
    if (!input.item || request.editor.itemId !== input.itemId || request.editor.kind !== input.item.kind) return null;
    const editor: BoardOwnedWidgetEditorProps = { ...request.editor, ...owner, onClose };
    return <WidgetEditor {...editor} />;
  }
  if (input.item) return null;
  const editor: BoardOwnedAddWidgetProps = { ...request.editor, ...owner, onClose };
  return <AddWidget {...editor} />;
}
