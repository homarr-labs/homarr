"use client";

import { useRouter } from "next/navigation";

import type { RouterOutputs } from "@homarr/api";
import type { IntegrationKind } from "@homarr/definitions";

import { NewIntegrationForm } from "./_integration-new-form";

interface IntegrationNewFormWrapperProps {
  selectableApps: RouterOutputs["app"]["selectable"];
  kind: IntegrationKind;
  initialUrl?: string;
  initialName?: string;
}

export const IntegrationNewFormWrapper = ({
  kind,
  initialUrl,
  initialName,
  selectableApps,
}: IntegrationNewFormWrapperProps) => {
  const router = useRouter();

  return (
    <NewIntegrationForm
      kind={kind}
      initialUrl={initialUrl}
      initialName={initialName}
      selectableApps={selectableApps}
      onSuccess={() => router.push("/manage/integrations")}
    />
  );
};
