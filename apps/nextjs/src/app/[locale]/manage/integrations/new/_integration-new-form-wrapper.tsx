"use client";

import { useRouter } from "next/navigation";

import type { IntegrationKind } from "@homarr/definitions";

import { NewIntegrationForm } from "./_integration-new-form";

interface IntegrationNewFormWrapperProps {
  kind: IntegrationKind;
  initialUrl?: string;
  initialName?: string;
}

export const IntegrationNewFormWrapper = ({ kind, initialUrl, initialName }: IntegrationNewFormWrapperProps) => {
  const router = useRouter();

  return (
    <NewIntegrationForm
      kind={kind}
      initialUrl={initialUrl}
      initialName={initialName}
      onSuccess={() => router.push("/manage/integrations")}
    />
  );
};
