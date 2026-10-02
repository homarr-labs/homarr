"use client";

import { useEffect, useState } from "react";

type Contributor = {
  login: string;
  avatar_url: string;
};

// do not add any real users here
const blacklistedUsernames = ["deepsource-autofix[bot]", "deepsource-io[bot]", "renovate[bot]", "dependabot[bot]"];

export const CodeContributorList = () => {
  const [contributors, setContributors] = useState<Contributor[]>([]);

  useEffect(() => {
    fetch("/data/contributions.json").then(async (response) => {
      const data = await response.json();
      setContributors(data.filter((contributor: Contributor) => !blacklistedUsernames.includes(contributor.login)));
    });
  }, []);

  return (
    <div className={"flex flex-wrap gap-3 argos-ignore"}>
      {contributors.map((contributor: Contributor) => (
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
