import { useLocalStorage } from "@mantine/hooks";

import { clientApi } from "@homarr/api/client";
import { useSession } from "@homarr/auth/client";

import { getUsableWidgetQueryData } from "../../common/query-state";
import type { WidgetComponentProps } from "../../definition";
import { NativeClusterHealthView } from "../native-view-cluster";
import { getClusterAccordionDefault, getClusterVisibleSections } from "./accordion-state";

export const ClusterHealthMonitoring = ({
  integrationId,
  boardId,
  itemId,
  options,
  width,
  displayMode,
}: WidgetComponentProps<"healthMonitoring"> & { integrationId: string }) => {
  const healthQuery = clientApi.widget.healthMonitoring.getClusterHealthStatus.useQuery({ integrationId });
  const healthData = getUsableWidgetQueryData(healthQuery);
  const visibleSections = getClusterVisibleSections(displayMode, options.visibleClusterSections);
  const accordionScope = `${displayMode}:${visibleSections.join(",")}`;
  const accordionDefault = getClusterAccordionDefault(displayMode, visibleSections);
  const { data: session } = useSession();
  const [accordionValues, setAccordionValues] = useLocalStorage<Record<string, string[]>>({
    key: `homarr-${session?.user.id ?? "anonymous"}-${boardId ?? "preview"}-${itemId}-${integrationId}-health-accordion`,
    defaultValue: {},
  });
  const savedValue = accordionValues?.[accordionScope];
  let accordionValue = accordionDefault;
  if (Array.isArray(savedValue)) {
    accordionValue = savedValue.filter((value) => visibleSections.some((section) => section === value));
  }

  return (
    <NativeClusterHealthView
      options={options}
      width={width}
      displayMode={displayMode}
      healthData={healthData}
      accordionValue={accordionValue}
      onAccordionChange={(value) => setAccordionValues((current) => ({ ...current, [accordionScope]: value }))}
    />
  );
};
