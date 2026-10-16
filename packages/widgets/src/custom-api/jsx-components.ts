import type { ComponentType } from "react";

import { createCustomJsxBindings, createCustomJsxComponents } from "@homarr/custom-widgets/jsx";
import { ResourceAvatar, ResourceBackgroundImage, ResourceImage } from "@homarr/ui";

import { SafeTablerIcon } from "./jsx-icon-adapter";

// Labels are replaced by the localized runtime adapter in the renderer. These
// fallbacks are used only in isolated component-map tests.
export const createCustomWidgetComponents = (copyLabels: { copy: string; copied: string }) =>
  createCustomJsxComponents({
    TablerIcon: SafeTablerIcon as ComponentType<never>,
    Image: ResourceImage,
    Avatar: ResourceAvatar,
    BackgroundImage: ResourceBackgroundImage,
    copyLabels,
  });

export const SAFE_BINDINGS = createCustomJsxBindings;
