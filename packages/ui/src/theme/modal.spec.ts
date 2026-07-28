import { getDefaultZIndex } from "@mantine/core";
import { describe, expect, test } from "vitest";

import { theme } from "../theme";
import { appShellHeaderZIndex, managedModalZIndex, modalZIndex } from "./layers";
import { modalComponent } from "./modal";

describe("application layers", () => {
  test("keeps dialogs above the fixed header and managed dialogs above regular dialogs", () => {
    expect(appShellHeaderZIndex).toBe(getDefaultZIndex("modal") + 1);
    expect(modalZIndex).toBe(appShellHeaderZIndex + 1);
    expect(managedModalZIndex).toBe(modalZIndex + 1);
    expect(modalComponent.defaultProps).toMatchObject({ zIndex: modalZIndex });
    expect(theme.components?.Drawer?.defaultProps).toMatchObject({ zIndex: modalZIndex });
  });
});
