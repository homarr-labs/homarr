import type { MantineTheme, MantineThemeComponent, ModalProps } from "@mantine/core";

export const modalSizeSelect = "xxl";
export const modalSizeForm = "lg";

const fixedModalSizes = new Set([modalSizeSelect, modalSizeForm]);

const modalWidth = "min(var(--modal-size), calc(100vw - 2 * var(--mantine-spacing-md)))";

export const modalComponent: MantineThemeComponent = {
  vars: (_theme: MantineTheme, props: Partial<ModalProps>) => {
    if (props.size === modalSizeSelect) {
      return { root: { "--modal-size": "75rem" } };
    }
    return { root: {} };
  },
  styles: (_theme: MantineTheme, props: Partial<ModalProps>) => {
    const isFixedSize = typeof props.size === "string" && fixedModalSizes.has(props.size);
    if (!isFixedSize) {
      return {};
    }

    return {
      content: {
        width: modalWidth,
        minWidth: modalWidth,
      },
      body: {
        width: "100%",
      },
    };
  },
};
