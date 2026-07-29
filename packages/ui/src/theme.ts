import { createTheme, rem } from "@mantine/core";

import { modalComponent } from "./theme/modal";

export const theme = createTheme({
  primaryColor: "red",
  autoContrast: true,
  respectReducedMotion: true,
  cursorType: "pointer",

  fontFamily: "Inter, system-ui, -apple-system, sans-serif",
  fontFamilyMonospace: "ui-monospace, 'Cascadia Code', 'Fira Code', monospace",

  headings: {
    fontFamily: "Inter, system-ui, -apple-system, sans-serif",
    fontWeight: "600",
    sizes: {
      h1: { fontSize: rem(36), lineHeight: "1.1", fontWeight: "700" },
      h2: { fontSize: rem(24), lineHeight: "1.2", fontWeight: "700" },
      h3: { fontSize: rem(20), lineHeight: "1.3", fontWeight: "600" },
      h4: { fontSize: rem(16), lineHeight: "1.4", fontWeight: "600" },
      h5: { fontSize: rem(14), lineHeight: "1.5", fontWeight: "600" },
      h6: { fontSize: rem(12), lineHeight: "1.5", fontWeight: "600" },
    },
  },

  fontSizes: {
    xs: rem(12),
    sm: rem(14),
    md: rem(16),
    lg: rem(18),
    xl: rem(20),
  },

  spacing: {
    xs: rem(10),
    sm: rem(12),
    md: rem(16),
    lg: rem(20),
    xl: rem(32),
  },

  radius: {
    xs: rem(4),
    sm: rem(4),
    md: rem(8),
    lg: rem(12),
    xl: rem(16),
  },
  defaultRadius: "md",

  shadows: {
    xs: "0 1px 2px rgba(0, 0, 0, 0.04)",
    sm: "0 1px 3px rgba(0, 0, 0, 0.06)",
    md: "0 2px 8px rgba(0, 0, 0, 0.08)",
    lg: "0 4px 12px rgba(0, 0, 0, 0.10)",
    xl: "0 8px 24px rgba(0, 0, 0, 0.12)",
  },

  components: {
    Card: {
      defaultProps: {
        withBorder: true,
        radius: "lg",
      },
    },
    Paper: {
      defaultProps: {
        withBorder: true,
        radius: "md",
      },
    },
    Button: {
      defaultProps: {
        radius: "md",
      },
    },
    ActionIcon: {
      defaultProps: {
        radius: "md",
      },
    },
    Tooltip: {
      defaultProps: {
        openDelay: 300,
      },
    },
    Menu: {
      defaultProps: {
        withArrow: true,
      },
    },
    NavLink: {
      defaultProps: {
        style: { borderRadius: 5 },
      },
    },
    LoadingOverlay: {
      defaultProps: {
        zIndex: 1000,
        overlayProps: { radius: "sm", blur: 2 },
      },
    },
    Modal: modalComponent,
  },
});
