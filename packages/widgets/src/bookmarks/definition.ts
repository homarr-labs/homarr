import { optionsBuilder } from "../options";

export const serverDefinition = {
  createOptions() {
    return optionsBuilder.from((factory) => ({
      title: factory.text(),
      layout: factory.select({
        options: (["grid", "gridHorizontal", "row", "column"] as const).map((value) => ({
          value,
          label: (t: (s: string) => string) => t(`widget.bookmarks.option.layout.option.${value}.label`),
        })),
        defaultValue: "column" as const,
      }),
      hideTitle: factory.switch({ defaultValue: false }),
      hideIcon: factory.switch({ defaultValue: false }),
      hideHostname: factory.switch({ defaultValue: false }),
      openNewTab: factory.switch({ defaultValue: true }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      items: factory.sortableItemList<any, string>({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ItemComponent: null as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        AddButton: null as any,
        uniqueIdentifier: (item: { id: string }) => item.id,
        useData: () => ({ data: undefined, isLoading: false, error: null }),
      }),
    }));
  },
};
