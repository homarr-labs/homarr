import { IconHeartbeat } from "@tabler/icons-react";
import { useFormContext } from "../_inputs/form";
import { clientApi } from "@homarr/api/client";
import type { UptimeKumaCheck } from "@homarr/integrations/types";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";
import { UptimeKumaAddButton } from "./add-button";

export const { definition, componentLoader } = createWidgetDefinition("uptimeKuma", {
  icon: IconHeartbeat,
  createOptions() {
    return optionsBuilder.from((factory) => ({
      checkIds: factory.sortableItemList<
        import("@homarr/integrations/types").UptimeKumaCheck,
        number
      >({
        ItemComponent: ({ item, handle: Handle, removeItem, rootAttributes }) => {
          return (
            <div {...rootAttributes} tabIndex={0}>
              <Handle />
              <span style={{ marginLeft: 8 }}>{item.name}</span>
              <button style={{ marginLeft: 'auto' }} onClick={removeItem}>×</button>
            </div>
          );
        },
        AddButton: UptimeKumaAddButton,
        uniqueIdentifier: (item) => item.id,
        useData: (ids) => {
          const form = useFormContext<{options: Record<string, unknown>; integrationIds: string[]}>();
          const integrationIds: string[] = form?.values?.integrationIds ?? [];
          const { data, error, isLoading } = clientApi.widget.uptimeKuma.checks.useQuery({ integrationIds });
          const allChecks = data?.flatMap((r) => r.checks) ?? [];
          return {
            data: allChecks,
            error,
            isLoading,
          };
        },
      }),
    }, {
      checkIds: {
        shouldHide(_, integrationKinds) {
          // we require at least one uptimeKuma integration to populate the list
          return integrationKinds.length === 0;
        },
      },
    });
  },
  supportedIntegrations: ["uptimeKuma" as const],
}).withDynamicImport(() => import("./component"));
