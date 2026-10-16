import crowdinContributors from "../../../../static-data/translators.json";
import githubContributors from "../../../../static-data/contributors.json";
import openCollectiveContributors from "../../../../static-data/opencollective-contributors.json";

export const getCrowdinContributors = () => Response.json(crowdinContributors);
export const getGithubContributors = () => Response.json(githubContributors);
export const getOpenCollectiveContributors = () => Response.json(openCollectiveContributors);
