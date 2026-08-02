import { IconRobot } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const { definition, componentLoader } = createWidgetDefinition("assistant", {
  icon: IconRobot,
  createOptions() {
    return optionsBuilder.from(
      (factory) => ({
        conversationMode: factory.select({
          options: (["current", "pinned"] as const).map((value) => ({
            value,
            label: (t) => t(`widget.assistant.option.conversationMode.option.${value}`),
          })),
          defaultValue: "current",
          withDescription: true,
        }),
        conversation: factory.dynamicSelect({
          withDescription: true,
          useOptions(query) {
            const { data: threads = [], isPending, isError } = clientApi.assistant.listThreads.useQuery();
            const normalizedQuery = query.trim().toLocaleLowerCase();
            return {
              isPending,
              isError,
              options: threads
                .filter((thread) => {
                  if (normalizedQuery.length === 0) return true;
                  return (thread.title ?? "").toLocaleLowerCase().includes(normalizedQuery);
                })
                .map((thread) => ({
                  value: thread.id,
                  label: thread.title?.trim() || thread.id,
                })),
            };
          },
        }),
      }),
      {
        conversation: {
          shouldHide: (options) => options.conversationMode !== "pinned",
        },
      },
    );
  },
}).withDynamicImport(() => import("./component"));

export { AssistantWidgetRendererProvider } from "./context";
