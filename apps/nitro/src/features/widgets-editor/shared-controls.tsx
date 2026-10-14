import { useCallback, useLayoutEffect, useRef, useState } from "react";

import {
  WidgetDateTimeEventListInput,
  WidgetInternalInput,
  WidgetMultiSelectInput,
  WidgetMultiTextInput,
  WidgetNumberInput,
  WidgetSelectInput,
  WidgetSliderInput,
  WidgetSwitchInput,
  WidgetTextInput,
  WidgetTimezoneListInput,
} from "@homarr/widgets/inputs/static";

import type {
  EditorOption,
  EditorState,
  EditorStaticOption,
  SpecializedOptionProps,
  WidgetDefinition,
  WidgetEditorChangeOwner,
  WidgetEditorClient,
  WidgetEditorOwnership,
  WidgetEditorQueryUtils,
  WidgetKind,
} from "./contracts";

type WidgetInputBinding = {
  boardId: string;
  client: WidgetEditorClient;
  queryUtils: WidgetEditorQueryUtils;
} & (
  | {
      type: "editor";
      itemId: string | undefined;
      widgetKind: WidgetKind;
      definition: WidgetDefinition;
      baseline: EditorState;
      sectionId: string | undefined;
    }
  | {
      type: "picker";
      sectionId: string | null;
      columnCount: number | null;
    }
);

interface WidgetInputActivation extends WidgetEditorChangeOwner {
  active: boolean;
  binding: WidgetInputBinding;
  hostOwner: WidgetEditorChangeOwner;
}

interface WidgetInputAdmission extends WidgetEditorOwnership {
  binding: WidgetInputBinding;
  canChange(): boolean;
}

const deniedInputOwner: WidgetEditorChangeOwner = { isCurrent: () => false };

function hasSameInputBinding(left: WidgetInputBinding, right: WidgetInputBinding) {
  if (left.boardId !== right.boardId || left.client !== right.client || left.queryUtils !== right.queryUtils)
    return false;
  if (left.type === "picker" && right.type === "picker")
    return left.sectionId === right.sectionId && left.columnCount === right.columnCount;
  if (left.type === "editor" && right.type === "editor")
    return (
      left.itemId === right.itemId &&
      left.widgetKind === right.widgetKind &&
      left.definition === right.definition &&
      left.baseline === right.baseline &&
      left.sectionId === right.sectionId
    );
  return false;
}

export function useWidgetInputActivation(admission: WidgetInputAdmission) {
  const current = useRef<WidgetInputAdmission | null>(null);
  const active = useRef<WidgetInputActivation | null>(null);
  const [published, setPublished] = useState<WidgetInputActivation | null>(null);
  const retire = useCallback(() => {
    const lease = active.current;
    if (!lease) return;
    lease.active = false;
    active.current = null;
  }, []);

  useLayoutEffect(() => {
    current.current = admission;
    if (active.current && !active.current.isCurrent()) retire();
    if (active.current || !admission.canChange() || !admission.isCurrentOwner()) return;
    const hostOwner = admission.captureChangeOwner();
    if (!hostOwner.isCurrent() || !admission.canChange() || !admission.isCurrentOwner()) return;
    const lease: WidgetInputActivation = {
      active: true,
      binding: admission.binding,
      hostOwner,
      isCurrent: () => {
        const live = current.current;
        const admitted =
          lease.active &&
          active.current === lease &&
          live !== null &&
          hasSameInputBinding(lease.binding, live.binding) &&
          lease.hostOwner.isCurrent() &&
          live.isCurrentOwner() &&
          live.canChange();
        if (!admitted) {
          lease.active = false;
          if (active.current === lease) active.current = null;
        }
        return admitted;
      },
    };
    active.current = lease;
    setPublished(lease);
  });

  useLayoutEffect(
    () => () => {
      retire();
      current.current = null;
    },
    [retire],
  );

  let owner: WidgetEditorChangeOwner = deniedInputOwner;
  if (published && hasSameInputBinding(published.binding, admission.binding) && admission.canChange())
    owner = published;
  let hostOwner: WidgetEditorChangeOwner = deniedInputOwner;
  if (owner === published && published) hostOwner = published.hostOwner;
  return { owner, hostOwner, retire };
}

export function supportsSharedOption(type: EditorOption["type"]): type is EditorStaticOption["type"] {
  return [
    "internal",
    "text",
    "switch",
    "number",
    "slider",
    "select",
    "multiSelect",
    "multiText",
    "timezoneList",
    "dateTimeEventList",
  ].includes(type);
}

export function isSharedOption(option: EditorOption): option is EditorStaticOption {
  return supportsSharedOption(option.type);
}

export function isSharedOptionHeld(type: EditorOption["type"]) {
  return supportsSharedOption(type) && type !== "internal";
}

export function SharedWidgetOption(
  props: Pick<SpecializedOptionProps, "property" | "kind" | "initialOptions" | "itemId" | "boardId"> & {
    option: EditorStaticOption;
  },
) {
  const { option, ...common } = props;
  switch (option.type) {
    case "internal":
      return <WidgetInternalInput {...common} options={option} />;
    case "text":
      return <WidgetTextInput {...common} options={option} />;
    case "switch":
      return <WidgetSwitchInput {...common} options={option} />;
    case "number":
      return <WidgetNumberInput {...common} options={option} />;
    case "slider":
      return <WidgetSliderInput {...common} options={option} />;
    case "select":
      return <WidgetSelectInput {...common} options={option} />;
    case "multiSelect":
      return <WidgetMultiSelectInput {...common} options={option} />;
    case "multiText":
      return <WidgetMultiTextInput {...common} options={option} />;
    case "timezoneList":
      return <WidgetTimezoneListInput {...common} options={option} />;
    case "dateTimeEventList":
      return <WidgetDateTimeEventListInput {...common} options={option} />;
  }
}
