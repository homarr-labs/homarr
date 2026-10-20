"use client";

import { WidgetIntegrationSelect } from "@homarr/widgets/widget-integration-select";

import { clientApi } from "@homarr/api/client";

interface SearchEngineIntegrationSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
}

export default function SearchEngineIntegrationSelect({ value, onChange }: SearchEngineIntegrationSelectProps) {
  const [integrations] = clientApi.integration.allThatSupportSearch.useSuspenseQuery();

  return (
    <WidgetIntegrationSelect
      label="Integration"
      data={integrations}
      canSelectMultiple={false}
      onChange={onChange}
      value={value}
      withAsterisk
    />
  );
}
