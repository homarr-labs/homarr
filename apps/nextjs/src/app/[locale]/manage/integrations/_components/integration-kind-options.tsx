"use client";

import type { IntegrationKind } from "@homarr/definitions";

import type { SabnzbdOptionsModel } from "./integration-kind-options.types";
import { SabnzbdOptions } from "./sabnzbd-options";

interface IntegrationKindOptionsProps {
  kind: IntegrationKind;
  sabNzbdOptions: SabnzbdOptionsModel;
  onSabnzbdOptionsChange: (value: SabnzbdOptionsModel) => void;
}

export const IntegrationKindOptions = ({
  kind,
  sabNzbdOptions,
  onSabnzbdOptionsChange,
}: IntegrationKindOptionsProps) => {
  if (kind !== "sabNzbd") {
    return null;
  }

  return <SabnzbdOptions value={sabNzbdOptions} onChange={onSabnzbdOptionsChange} />;
};
