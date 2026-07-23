export const releasesQuerySuccessfulStaleTimeMs = 4 * 60 * 60 * 1000;

interface QueryWithData {
  state: {
    data: unknown;
  };
}

export const getReleasesQueryStaleTimeMs = ({ state }: QueryWithData) => {
  if (!Array.isArray(state.data) || state.data.length === 0) return 0;

  const allRepositoriesSucceeded = state.data.every(
    (result) => typeof result === "object" && result !== null && "success" in result && result.success === true,
  );

  return allRepositoriesSucceeded ? releasesQuerySuccessfulStaleTimeMs : 0;
};
