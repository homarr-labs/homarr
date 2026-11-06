"use client";

import { addInPlaceActions, useAddInPlaceStep } from "./store";

interface DimLayerProps {
  anchorRect: DOMRect | null;
}

export const DimLayer = ({ anchorRect }: DimLayerProps) => {
  const step = useAddInPlaceStep();
  if (step === "idle") return null;

  const dimmed = step !== "pick";

  return (
    <>
      <div
        data-add-in-place-blocker=""
        style={{ position: "fixed", inset: 0, zIndex: 250 }}
        onPointerDown={() => {
          if (step === "pick") addInPlaceActions.cancel();
        }}
      />
      {dimmed && anchorRect && (
        <div
          aria-hidden="true"
          style={{
            position: "fixed",
            left: anchorRect.left,
            top: anchorRect.top,
            width: anchorRect.width,
            height: anchorRect.height,
            zIndex: 250,
            pointerEvents: "none",
            borderRadius: "var(--mantine-radius-md)",
            boxShadow: "0 0 0 100vmax color-mix(in srgb, #000 55%, transparent)",
          }}
        />
      )}
    </>
  );
};
