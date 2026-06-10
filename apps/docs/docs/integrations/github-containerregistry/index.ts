import { IntegrationDefinition } from '@site/src/types';

export const gitHubContainerRegistryIntegration: IntegrationDefinition = {
  name: 'GitHub Container Registry',
  description: 'GitHub Container Registry is a platform for hosting and managing packages.',
  iconUrl: {
    light: 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/github.svg',
    dark: 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/github-light.svg',
  },
  path: '../../integrations/github-packages',
};
