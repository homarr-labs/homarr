"use client";

import { InputWrapper, Slider } from "@mantine/core";
import type { SliderProps } from "@mantine/core";
import { useWindowEvent } from "@mantine/hooks";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { useEffect, useRef } from "react";

import type { CommonWidgetInputProps } from "./common";
import { useWidgetInputTranslation } from "./common";
import { useFormContext } from "./form";
import type { CapturedStaticWidgetInputOwner } from "./static-owner";
import { useStaticWidgetInputOwner } from "./static-owner";

type StaticInputGesture<TArgs extends unknown[]> =
  | {
      type: "pointer";
      owner: CapturedStaticWidgetInputOwner;
      onChange: (...args: TArgs) => unknown;
      ending: boolean;
    }
  | {
      type: "keyboard";
      owner: CapturedStaticWidgetInputOwner;
      onChange: (...args: TArgs) => unknown;
      keys: Set<string>;
    }
  | {
      type: "direct";
      owner: CapturedStaticWidgetInputOwner;
      onChange: (...args: TArgs) => unknown;
    }
  | { type: "consumed" };

export const useStaticWidgetInputGesture = <TArgs extends unknown[]>(
  owner: CapturedStaticWidgetInputOwner,
  onChange: (...args: TArgs) => unknown,
  keys: readonly string[],
  drainPointerFrame: boolean,
  allowDirectChanges: boolean,
  requireSynchronousKeyboardDispatch = false,
) => {
  const gesture = useRef<StaticInputGesture<TArgs> | null>(null);
  const keyboardDispatch = useRef<{
    event: KeyboardEvent;
    operation: Extract<StaticInputGesture<TArgs>, { type: "keyboard" }>;
  } | null>(null);
  const frames = useRef(new Set<number>());
  const cancel = () => {
    gesture.current = { type: "consumed" };
    keyboardDispatch.current = null;
  };
  const startPointer = () => {
    const operation = gesture.current;
    if (operation?.type === "pointer" && !operation.ending) return;
    if (operation?.type === "keyboard") return;
    gesture.current = { type: "pointer", owner, onChange, ending: false };
  };
  const endPointer = () => {
    const operation = gesture.current;
    if (operation?.type !== "pointer" || operation.ending) return;
    operation.ending = true;
    if (!drainPointerFrame) {
      cancel();
      return;
    }
    const frame = requestAnimationFrame(() => {
      frames.current.delete(frame);
      if (gesture.current === operation) cancel();
    });
    frames.current.add(frame);
  };
  const enterKeyDispatch = (
    event: ReactKeyboardEvent,
    operation: Extract<StaticInputGesture<TArgs>, { type: "keyboard" }>,
  ) => {
    if (!requireSynchronousKeyboardDispatch) return;
    const dispatch = { event: event.nativeEvent, operation };
    keyboardDispatch.current = dispatch;
    queueMicrotask(() => {
      if (keyboardDispatch.current === dispatch) keyboardDispatch.current = null;
    });
  };
  const endKeyDispatch = (event: ReactKeyboardEvent) => {
    if (keyboardDispatch.current?.event === event.nativeEvent) keyboardDispatch.current = null;
  };
  const startKey = (event: ReactKeyboardEvent) => {
    if (!keys.includes(event.key)) return;
    const operation = gesture.current;
    if (operation?.type === "keyboard") {
      operation.keys.add(event.key);
      enterKeyDispatch(event, operation);
      return;
    }
    if (operation?.type === "pointer" && !operation.ending) return;
    if (event.repeat) {
      cancel();
      return;
    }
    const keyboard = {
      type: "keyboard",
      owner,
      onChange,
      keys: new Set([event.key]),
    } satisfies StaticInputGesture<TArgs>;
    gesture.current = keyboard;
    enterKeyDispatch(event, keyboard);
  };
  const endKey = (event: KeyboardEvent) => {
    const operation = gesture.current;
    if (operation?.type !== "keyboard") return;
    operation.keys.delete(event.key);
    if (operation.keys.size === 0) cancel();
  };
  const startDirect = () => {
    const operation = gesture.current;
    if (operation?.type === "pointer" || operation?.type === "keyboard") return;
    gesture.current = { type: "direct", owner, onChange };
  };

  useWindowEvent("pointerup", endPointer, true);
  useWindowEvent("mouseup", endPointer, true);
  useWindowEvent("touchend", endPointer, true);
  useWindowEvent("keyup", endKey, true);
  useWindowEvent("pointercancel", cancel, true);
  useWindowEvent("touchcancel", cancel, true);
  useWindowEvent("blur", cancel);
  useEffect(
    () => () => {
      gesture.current = { type: "consumed" };
      keyboardDispatch.current = null;
      for (const frame of frames.current) cancelAnimationFrame(frame);
      frames.current.clear();
    },
    [],
  );

  return {
    startPointer,
    endPointer,
    startKey,
    endKeyDispatch,
    startDirect,
    cancel,
    onChange: (...args: TArgs) => {
      if (!owner.isCurrent()) return;
      const operation = gesture.current;
      if (!operation) {
        if (allowDirectChanges) return onChange(...args);
        return;
      }
      if (operation.type === "consumed" || !operation.owner.isCurrent()) return;
      if (
        requireSynchronousKeyboardDispatch &&
        operation.type === "keyboard" &&
        keyboardDispatch.current?.operation !== operation
      )
        return;
      return operation.onChange(...args);
    },
  };
};

const sliderKeys = ["ArrowUp", "ArrowRight", "ArrowDown", "ArrowLeft", "Home", "End"];

export const WidgetSliderInput = ({ property, kind, options }: CommonWidgetInputProps<"slider">) => {
  const t = useWidgetInputTranslation(kind, property);
  const form = useFormContext();
  const owner = useStaticWidgetInputOwner(kind, property);
  const { onChange, onFocus, onBlur, ...inputProps } = form.getInputProps(`options.${property}`);
  const gesture = useStaticWidgetInputGesture(
    owner,
    (...args: Parameters<NonNullable<SliderProps["onChange"]>>) => {
      if (!owner.isCurrent()) return;
      return onChange(...args);
    },
    sliderKeys,
    true,
    false,
    true,
  );

  return (
    <InputWrapper
      label={t("label")}
      description={options.withDescription ? t("description") : undefined}
      inputWrapperOrder={["label", "input", "description", "error"]}
      onMouseDownCapture={gesture.startPointer}
      onTouchStartCapture={gesture.startPointer}
      onKeyDownCapture={gesture.startKey}
      onKeyDown={gesture.endKeyDispatch}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) gesture.cancel();
      }}
    >
      <Slider
        min={options.validate.minValue ?? undefined}
        max={options.validate.maxValue ?? undefined}
        step={options.step}
        {...inputProps}
        onChange={gesture.onChange}
        onFocus={(...args: Parameters<NonNullable<SliderProps["onFocus"]>>) => {
          if (!owner.isCurrent()) return;
          return onFocus?.(...args);
        }}
        onBlur={(...args: Parameters<NonNullable<SliderProps["onBlur"]>>) => {
          if (!owner.isCurrent()) return;
          return onBlur?.(...args);
        }}
      />
    </InputWrapper>
  );
};
