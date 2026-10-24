export const releaseLayouts = ["comfortable", "compact"] as const;
export type ReleaseLayout = (typeof releaseLayouts)[number];

export const releaseSummaryModes = ["detailed", "count", "hidden"] as const;
export type ReleaseSummaryMode = (typeof releaseSummaryModes)[number];

export const releaseSectionKeys = ["new", "attention", "upToDate", "quiet"] as const;
export type ReleaseSectionKey = (typeof releaseSectionKeys)[number];

export const newReleaseWithinOptions = ["never", "1d", "3d", "1w", "2w", "1M", "3M"] as const;
export const staleReleaseWithinOptions = ["never", "1M", "3M", "6M", "1y", "2y"] as const;
