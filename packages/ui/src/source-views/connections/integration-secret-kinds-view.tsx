"use client";

import { SegmentedControl } from "@mantine/core";

import type { IntegrationSecretKindsViewProps } from "./contracts";

export const IntegrationSecretKindsView = ({ data, defaultValue, onChange }: IntegrationSecretKindsViewProps) => (
  <SegmentedControl fullWidth data={data} defaultValue={defaultValue} onChange={onChange}></SegmentedControl>
);
