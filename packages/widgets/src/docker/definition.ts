import { optionsBuilder } from "../options";

const columnsList = ["name", "state", "cpuUsage", "memoryUsage"] as const;

export const serverDefinition = {
  createOptions() {
    return optionsBuilder.from(
      (factory) => ({
        enableRowSorting: factory.switch({ defaultValue: false }),
        defaultSort: factory.select({
          defaultValue: "name" as const,
          options: columnsList.map((value) => ({
            value,
            label: (t: (s: string) => string) => t(`widget.dockerContainers.option.defaultSort.option.${value}`),
          })),
        }),
        descendingDefaultSort: factory.switch({ defaultValue: false }),
      }),
      {
        defaultSort: { shouldHide: (options) => !options.enableRowSorting },
        descendingDefaultSort: { shouldHide: (options) => !options.enableRowSorting },
      },
    );
  },
};
