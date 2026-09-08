import { Stack } from "@mantine/core";

import type { RouterOutputs } from "@homarr/api";
import type { UseFormReturnType } from "@homarr/form";

import type { Board } from "../../_types";
import { ColorSettingsContent } from "./_appereance";
import { BackgroundSettingsContent } from "./_background";
import { LayoutPreview } from "./_layout-preview";
import type { FormValues } from "./_settings-form";
import classes from "./_settings-form.module.css";

export const AppearancePlayground = ({
  board,
  form,
  apps,
  selectedLayoutId,
}: {
  board: Board;
  form: UseFormReturnType<FormValues>;
  apps: RouterOutputs["app"]["byIds"];
  selectedLayoutId: string | null;
}) => {
  const layout =
    form.values.layouts.find((candidate) => candidate.id === selectedLayoutId) ??
    form.values.layouts.find((candidate) => candidate.role === "base");
  const sourceLayout =
    board.layouts.find((candidate) => candidate.id === layout?.id) ??
    board.layouts.find((candidate) => candidate.role === "base");

  return (
    <div className={classes.appearance}>
      <Stack gap="lg">
        <ColorSettingsContent form={form} />
        <BackgroundSettingsContent form={form} />
      </Stack>
      {layout && sourceLayout && (
        <div className={classes.appearancePreview}>
          <LayoutPreview
            board={board}
            layout={layout}
            layouts={form.values.layouts}
            sourceLayout={sourceLayout}
            apps={apps}
            settings={form.values}
          />
        </div>
      )}
    </div>
  );
};
