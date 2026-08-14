interface ReleasePresentationItem {
  error?: unknown;
  isNewRelease?: boolean;
  isStaleRelease?: boolean;
}

interface ReleasePresentationOptions {
  displayMode?: "compact" | "advanced";
  showOnlyHighlighted: boolean;
  topReleases: number | string;
}

export const selectReleaseRepositoriesForDisplay = <T extends ReleasePresentationItem>(
  repositories: readonly T[],
  options: ReleasePresentationOptions,
): T[] => {
  const visibleRepositories =
    options.displayMode === "advanced" || !options.showOnlyHighlighted
      ? [...repositories]
      : repositories.filter(
          (repository) =>
            repository.error !== undefined || repository.isNewRelease === true || repository.isStaleRelease === true,
        );

  if (options.displayMode === "advanced" || typeof options.topReleases === "string" || options.topReleases <= 0) {
    return visibleRepositories;
  }

  return visibleRepositories.slice(0, options.topReleases);
};
