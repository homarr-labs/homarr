import type { HermesTheme } from "./theme";

export type LayoutMode = "micro" | "mini" | "strip" | "tall" | "standard" | "showcase";

export interface DetailsLayout {
  columns: number;
  maxSections: number;
  itemLimit: number;
}

export interface HermesTypographyScale {
  title: number;
  meta: number;
  status: number;
  metricLabel: number;
  metricValue: number;
  metricDetail: number;
  footer: number;
  badge: number;
}

export interface DetailsTypographyScale {
  panelWidth: number;
  heading: number;
  item: number;
  auxiliary: number;
  icon: number;
  indicator: number;
  rowGap: number;
}

export const DETAILS_SECTION_GAP = 10;

export function scaleHermesTypography(typography: HermesTypographyScale, scale: number): HermesTypographyScale {
  if (scale === 1) return typography;

  const scaled = (value: number) => Math.round(value * scale * 10) / 10;

  return {
    title: scaled(typography.title),
    meta: scaled(typography.meta),
    status: scaled(typography.status),
    metricLabel: scaled(typography.metricLabel),
    metricValue: scaled(typography.metricValue),
    metricDetail: scaled(typography.metricDetail),
    footer: scaled(typography.footer),
    badge: scaled(typography.badge),
  };
}

export function getLayoutMode(width: number, height: number): LayoutMode {
  const aspectRatio = width / Math.max(height, 1);

  if (height < 190) {
    if (aspectRatio < 1.45) return "micro";
    if (aspectRatio < 2.65) return "mini";
    return "strip";
  }

  // A logical W1 tile can be wider than 150px on a large board. Preserve its
  // square and portrait layouts until the container is wide enough for W2.
  if (width < 220) {
    if (aspectRatio < 0.75) return "tall";
    if (aspectRatio < 1.45) return "micro";
  }
  if (width >= 380 && height >= 190) return "showcase";
  return "standard";
}

export function getDetailsLayout(
  width: number,
  height: number,
  mode: LayoutMode = getLayoutMode(width, height),
): DetailsLayout | null {
  if ((mode !== "standard" && mode !== "showcase") || width < 260) return null;

  const availableHeight = height - (mode === "showcase" ? 198 : 170);
  const columns = width >= 720 ? 4 : width >= 380 ? 2 : 1;
  const minimumSectionHeight = 112;
  const availableGridRows = Math.floor(
    (availableHeight + DETAILS_SECTION_GAP) / (minimumSectionHeight + DETAILS_SECTION_GAP),
  );
  if (availableGridRows < 1) return null;

  const maxSections = Math.min(4, columns * availableGridRows);
  const renderedGridRows = Math.ceil(maxSections / columns);
  const sectionHeight = Math.floor(
    (availableHeight - DETAILS_SECTION_GAP * Math.max(0, renderedGridRows - 1)) / renderedGridRows,
  );
  const typography = getDetailsTypography(width, columns);
  const itemLimit = getDetailItemLimit(sectionHeight, typography);

  return { columns, maxSections, itemLimit };
}

export function getDetailItemLimit(sectionHeight: number, typography: DetailsTypographyScale) {
  // Paper border + padding, the heading row, and the divider with its margins.
  // The external-link icon gives narrow headings a 16px minimum line box.
  const panelChromeHeight = 18 + Math.max(Math.ceil(typography.heading * 1.2), typography.icon + 4) + 9;
  const rowHeight = Math.ceil(typography.item * 1.3);
  const listHeight = Math.max(0, sectionHeight - panelChromeHeight);

  return Math.max(1, Math.floor((listHeight + typography.rowGap) / (rowHeight + typography.rowGap)));
}

export function getTypographyScale(
  width: number,
  height: number,
  mode: LayoutMode = getLayoutMode(width, height),
): HermesTypographyScale {
  switch (mode) {
    case "micro":
      return withResponsiveMetrics(width, height, mode, {
        title: 10,
        meta: 9,
        status: 9,
        metricLabel: 8,
        metricValue: 10.5,
        metricDetail: 8.5,
        footer: 9,
        badge: 8,
      });
    case "mini":
      return withResponsiveMetrics(width, height, mode, {
        title: 11.5,
        meta: 9.5,
        status: 9,
        metricLabel: 9,
        metricValue: 11.5,
        metricDetail: 9,
        footer: 9,
        badge: 8.5,
      });
    case "strip":
      return withResponsiveMetrics(
        width,
        height,
        mode,
        createFluidTypography(width, 340, 800, {
          title: [12, 14],
          meta: [10, 12],
          status: [9, 11],
          metricLabel: [9, 11],
          metricValue: [12, 15],
          metricDetail: [9, 11],
          footer: [9, 11],
          badge: [9, 10],
        }),
      );
    case "tall":
      return withResponsiveMetrics(width, height, mode, {
        title: 10.5,
        meta: 9,
        status: 9,
        metricLabel: 9,
        metricValue: 11,
        metricDetail: 9,
        footer: 9,
        badge: 8.5,
      });
    case "standard":
      return withResponsiveMetrics(
        width,
        height,
        mode,
        createFluidTypography(width, 200, 380, {
          title: [12.5, 15],
          meta: [10, 12],
          status: [9.5, 11],
          metricLabel: [10, 12],
          metricValue: [12, 14],
          metricDetail: [10, 11.5],
          footer: [10, 11],
          badge: [9, 10],
        }),
      );
    case "showcase":
      return withResponsiveMetrics(
        width,
        height,
        mode,
        createFluidTypography(width, 380, 900, {
          title: [16, 18],
          meta: [11, 13],
          status: [10, 12],
          metricLabel: [12, 13],
          metricValue: [14, 16],
          metricDetail: [11, 12],
          footer: [11, 12],
          badge: [9, 11],
        }),
      );
  }
}

export function getDetailsTypography(width: number, columns: number): DetailsTypographyScale {
  const safeColumns = Math.max(columns, 1);
  const panelWidth = Math.max(0, (width - 16 - (safeColumns - 1) * 8) / safeColumns);
  const item = getFluidValue(panelWidth, 170, 360, 11, 14);

  return {
    panelWidth,
    heading: Math.max(10.5, item - 0.5),
    item,
    auxiliary: Math.max(10, item - 1),
    icon: Math.round(item + 1),
    indicator: item >= 13 ? 7 : 6,
    rowGap: item >= 13 ? 4 : 3,
  };
}

export function getMetricColumns(mode: LayoutMode, width: number) {
  switch (mode) {
    case "micro":
      return 2;
    case "mini":
      return 3;
    case "strip":
      return width >= 450 ? 6 : 3;
    case "tall":
      return 1;
    case "showcase":
      return 4;
    case "standard":
      return width >= 260 ? 4 : 2;
  }
}

export function getVisibleMetricIds(mode: LayoutMode, hasUpdate: boolean) {
  const metricIds = [
    "version",
    ...(hasUpdate ? ["update"] : []),
    "jobs",
    "skills",
    "platforms",
    "toolsets",
    "agents",
    "sessions",
  ];

  switch (mode) {
    case "micro":
      return metricIds.slice(0, 4);
    case "mini":
      return metricIds.slice(0, 6);
    case "strip":
      return metricIds.slice(0, 6);
    case "tall":
    case "standard":
    case "showcase":
      return metricIds;
  }
}

export function getContentGap(mode: LayoutMode) {
  switch (mode) {
    case "micro":
    case "mini":
    case "strip":
    case "tall":
      return 3;
    case "standard":
      return 5;
    case "showcase":
      return 8;
  }
}

export function getMetricSpacing(mode: LayoutMode) {
  return mode === "showcase" ? 6 : mode === "standard" ? 4 : 2;
}

export function getLogoSize(mode: LayoutMode) {
  switch (mode) {
    case "micro":
      return 14;
    case "mini":
    case "strip":
    case "tall":
      return 16;
    case "standard":
      return 22;
    case "showcase":
      return 28;
  }
}

export function getCompactVersionValue(version: string, isDense: boolean, isMicro: boolean) {
  if (!isDense) return version;

  const segments = version.replace(/^v/, "").split(".");
  if (segments.length >= 2 && segments[0] && segments[1]) {
    if (isMicro && segments[0].length === 4) {
      return `v${segments[0].slice(2)}.${segments[1]}`;
    }

    return `v${segments[0]}.${segments[1]}`;
  }

  return version;
}

export function getCardStyle(theme: HermesTheme, brandTheme: boolean) {
  const baseStyle = {
    "--hermes-agent-font-sans": theme.fontSans,
    "--hermes-agent-font-mono": theme.fontMono,
    fontFamily: theme.fontSans,
    overflow: "hidden",
  };

  if (!brandTheme) {
    return baseStyle;
  }

  return {
    ...baseStyle,
    background: `radial-gradient(circle at top right, ${theme.glow}, transparent 42%), ${theme.background}`,
    border: `1px solid ${theme.borderStrong}`,
    borderRadius: theme.radius,
    boxShadow: `inset 0 1px 0 ${theme.border}, 0 0 20px ${theme.glow}`,
    color: theme.textPrimary,
  };
}

export function getContentStyle(mode: LayoutMode, theme: HermesTheme) {
  const baseStyle = {
    "--hermes-agent-font-sans": theme.fontSans,
    "--hermes-agent-font-mono": theme.fontMono,
    fontFamily: theme.fontSans,
    overflow: "hidden",
  };

  if (mode === "standard" || mode === "showcase") {
    return baseStyle;
  }

  return {
    ...baseStyle,
    background: theme.surface,
    borderLeft: `2px solid ${theme.borderStrong}`,
    borderRadius: theme.radius,
    boxShadow: `inset 0 0 0 1px ${theme.border}`,
    ...(mode === "micro" || mode === "mini" || mode === "strip" ? { padding: 3 } : { paddingLeft: 3 }),
  };
}

function withResponsiveMetrics(
  width: number,
  height: number,
  mode: LayoutMode,
  typography: HermesTypographyScale,
): HermesTypographyScale {
  const columns = getMetricColumns(mode, width);
  const horizontalPadding = mode === "standard" || mode === "showcase" ? 20 : 6;
  const cellWidth = Math.max(
    0,
    (width - horizontalPadding - getMetricSpacing(mode) * Math.max(0, columns - 1)) / columns,
  );

  const metricTypography = (() => {
    switch (mode) {
      case "micro":
        return {
          metricLabel: getFluidValue(height, 100, 170, 8, 11),
          metricValue: Math.max(getFluidValue(cellWidth, 45, 75, 10, 11), getFluidValue(height, 100, 170, 10, 15)),
          metricDetail: getFluidValue(height, 100, 170, 8.5, 11),
        };
      case "mini":
        return {
          metricLabel: Math.max(getFluidValue(cellWidth, 65, 115, 8.5, 10), getFluidValue(height, 100, 170, 8.5, 12)),
          metricValue: Math.max(getFluidValue(cellWidth, 65, 115, 10.5, 13), getFluidValue(height, 100, 170, 10.5, 17)),
          metricDetail: Math.max(
            getFluidValue(cellWidth, 65, 115, 8.5, 10),
            getFluidValue(height, 100, 170, 8.5, 11.5),
          ),
        };
      case "strip":
        return {
          metricLabel: Math.max(getFluidValue(cellWidth, 75, 130, 9, 12.5), getFluidValue(height, 100, 170, 9.5, 13)),
          metricValue: Math.max(getFluidValue(cellWidth, 75, 130, 12, 16), getFluidValue(height, 100, 170, 13.5, 18)),
          metricDetail: Math.max(getFluidValue(cellWidth, 75, 130, 9, 11.5), getFluidValue(height, 100, 170, 9, 11.5)),
        };
      case "tall":
        return {
          metricLabel: getFluidValue(height, 220, 500, 8.5, 12),
          metricValue: getFluidValue(height, 220, 500, 10.5, 16),
          metricDetail: getFluidValue(height, 220, 500, 8.5, 11.5),
        };
      case "standard":
        return {
          metricLabel: getFluidValue(cellWidth, 80, 170, 9, 12),
          metricValue: getFluidValue(cellWidth, 80, 170, 11.5, 15),
          metricDetail: getFluidValue(cellWidth, 80, 170, 9, 11.5),
        };
      case "showcase":
        return {
          metricLabel: getFluidValue(cellWidth, 100, 190, 10.5, 13),
          metricValue: getFluidValue(cellWidth, 100, 190, 13.5, 16),
          metricDetail: getFluidValue(cellWidth, 100, 190, 10, 12),
        };
    }
  })();

  const chromeTypography = (() => {
    switch (mode) {
      case "micro":
        return {
          title: Math.max(typography.title, getFluidValue(height, 100, 170, 10, 13)),
          status: Math.max(typography.status, getFluidValue(height, 100, 170, 9, 11)),
        };
      case "mini":
        return {
          title: Math.max(typography.title, getFluidValue(height, 100, 170, 11.5, 15)),
          status: Math.max(typography.status, getFluidValue(height, 100, 170, 9, 11)),
        };
      case "strip":
        return {
          title: Math.max(typography.title, getFluidValue(height, 100, 170, 12, 17)),
          status: Math.max(typography.status, getFluidValue(height, 100, 170, 9, 12)),
        };
      case "tall":
        return {
          title: Math.max(typography.title, getFluidValue(height, 220, 500, 10.5, 14)),
          status: Math.max(typography.status, getFluidValue(height, 220, 500, 9, 11)),
        };
      case "standard":
      case "showcase":
        return {};
    }
  })();

  return { ...typography, ...chromeTypography, ...metricTypography };
}

type FluidTypographyRanges = Record<keyof HermesTypographyScale, readonly [number, number]>;

function createFluidTypography(
  width: number,
  minimumWidth: number,
  maximumWidth: number,
  ranges: FluidTypographyRanges,
): HermesTypographyScale {
  const scale = ([minimum, maximum]: readonly [number, number]) =>
    getFluidValue(width, minimumWidth, maximumWidth, minimum, maximum);

  return {
    title: scale(ranges.title),
    meta: scale(ranges.meta),
    status: scale(ranges.status),
    metricLabel: scale(ranges.metricLabel),
    metricValue: scale(ranges.metricValue),
    metricDetail: scale(ranges.metricDetail),
    footer: scale(ranges.footer),
    badge: scale(ranges.badge),
  };
}

function getFluidValue(
  value: number,
  minimumValue: number,
  maximumValue: number,
  minimumResult: number,
  maximumResult: number,
) {
  const progress = Math.min(1, Math.max(0, (value - minimumValue) / (maximumValue - minimumValue)));
  return Math.round((minimumResult + (maximumResult - minimumResult) * progress) * 2) / 2;
}
