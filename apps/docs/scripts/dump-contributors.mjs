import { z } from 'zod';
import fs from 'fs/promises';

const sources = {
  crowdin: [
    { projectId: 534422, tokenName: 'HOMARR_CROWDIN_TOKEN' },
    { projectId: 742587, tokenName: 'HOMARR_LABS_CROWDIN_TOKEN' },
  ],
  github: [
    { repository: 'homarr', slug: 'ajnart' },
    { repository: 'homarr', slug: 'homarr-labs' },
  ],
};

const schema = z.object({
  GITHUB_TOKEN: z.string().nonempty(),
  HOMARR_CROWDIN_TOKEN: z.string().nonempty(),
  HOMARR_LABS_CROWDIN_TOKEN: z.string().nonempty(),
});

const env = schema.parse(process.env);

const fetchGithubContributors = async (slug, repository) => {
  const url = `https://api.github.com/repos/${slug}/${repository}/contributors?per_page=999`;
  const options = {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  };

  const response = await fetch(url, options);
  const data = await response.json();

  const dataSchema = z.array(
    z.object({
      login: z.string(),
      avatar_url: z.string().url(),
      contributions: z.number(),
    })
  );

  return dataSchema.parse(data);
};

const fetchCrowdinMembers = async (projectId, tokenName) => {
  const url = `https://crowdin.com/api/v2/projects/${projectId}/members`;
  const options = {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${env[tokenName]}`,
    },
  };

  const response = await fetch(url, options);
  const data = await response.json();

  const dataSchema = z.object({
    data: z.array(
      z.object({
        data: z.object({
          username: z.string(),
          avatarUrl: z.string().url(),
        }),
      })
    ),
  });

  const contributionsData = dataSchema.parse(data);

  return contributionsData.data.flatMap((data) => data.data);
};

const distinctBy = (callback) => (value, index, self) => {
  return self.findIndex((item) => callback(item) == callback(value)) === index;
};

const githubContributors = [];
const crowdinContributors = [];

for (const { repository, slug } of sources.github) {
  githubContributors.push(...(await fetchGithubContributors(slug, repository)));
}
const distinctGithubContributors = githubContributors
  .filter(distinctBy((contributor) => contributor.login))
  .sort((a, b) => b.contributions - a.contributions)
  .map(({ contributions, ...props }) => props)
  .filter((contributor) => !contributor.login.includes('[bot]'));
await fs.writeFile('./static/data/contributions.json', JSON.stringify(distinctGithubContributors));

for (const { projectId, tokenName } of sources.crowdin) {
  crowdinContributors.push(...(await fetchCrowdinMembers(projectId, tokenName)));
}
const distinctCrowdinContributors = crowdinContributors.filter(
  distinctBy((contributor) => contributor.username)
);
await fs.writeFile(
  './static/data/translation-contributions.json',
  JSON.stringify(distinctCrowdinContributors)
);
