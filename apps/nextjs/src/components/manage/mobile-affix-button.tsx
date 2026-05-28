import { forwardRef } from "react";
import type { ButtonProps } from "@mantine/core";
import { Affix, Button, createPolymorphicComponent } from "@mantine/core";

import { MANAGE_ACTION_BUTTON_MIN_WIDTH, MANAGE_AFFIX_POSITION } from "./manage-page.constants";

type MobileAffixButtonProps = Omit<ButtonProps, "visibleFrom" | "hiddenFrom">;

export const MobileAffixButton = createPolymorphicComponent<"button", MobileAffixButtonProps>(
  forwardRef<HTMLButtonElement, MobileAffixButtonProps>((props, ref) => (
    <>
      <Button ref={ref} visibleFrom="md" miw={MANAGE_ACTION_BUTTON_MIN_WIDTH} {...props} />
      <Affix hiddenFrom="md" position={MANAGE_AFFIX_POSITION}>
        <Button ref={ref} {...props} />
      </Affix>
    </>
  )),
);
