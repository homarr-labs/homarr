import contributions from "@site/public/data/contributions.json";

// do not add any real users here
const blacklistedUsernames = ["deepsource-autofix[bot]", "deepsource-io[bot]", "renovate[bot]", "dependabot[bot]"];
const contributors = contributions.filter((contributor) => !blacklistedUsernames.includes(contributor.login));

export const CodeContributorList = () => {
  return (
    <div className={"flex flex-wrap gap-3 argos-ignore"}>
      {contributors.map((contributor) => (
        <div key={contributor.login} className={"flex flex-col items-center w-24"}>
          <img
            className={"mb-2 aspect-square h-24 w-24 rounded"}
            src={contributor.avatar_url}
            alt={""}
            loading="lazy"
            decoding="async"
          />
          <h6 className={"truncate text-nowrap max-w-full"}>{contributor.login}</h6>
        </div>
      ))}
    </div>
  );
};
