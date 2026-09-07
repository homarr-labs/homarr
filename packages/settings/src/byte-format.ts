"use client";

import { useMemo } from "react";

import { formatByteRate, formatBytes, formatBytesPair } from "@homarr/common";

import { useSettings } from "./context";

export const useByteFormatter = () => {
  const { byteUnitSystem } = useSettings();

  return useMemo(
    () => ({
      formatBytes: (bytes: number) => formatBytes(bytes, { unit: byteUnitSystem }),
      formatBytesPair: (used: number, total: number) => formatBytesPair(used, total, { unit: byteUnitSystem }),
      formatByteRate: (bytes: number) => formatByteRate(bytes, { unit: byteUnitSystem }),
    }),
    [byteUnitSystem],
  );
};
