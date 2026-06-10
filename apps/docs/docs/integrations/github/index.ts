import { IntegrationDefinition } from '@site/src/types';

export const githubIntegration: IntegrationDefinition = {
  name: 'GitHub',
  description: 'GitHub is a web-based platform for version control and collaboration.',
  iconUrl: {
    light: 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/github.svg',
    dark: 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/github-light.svg',
  },
  path: '../../integrations/github',
};
