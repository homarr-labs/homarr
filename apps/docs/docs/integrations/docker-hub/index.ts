import { IntegrationDefinition } from '@site/src/types';

export const dockerHubIntegration: IntegrationDefinition = {
  name: 'Docker Hub',
  description:
    'Docker Hub is a cloud-based registry service for sharing and managing Docker images.',
  iconUrl: 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/docker.svg',
  path: '../../integrations/docker-hub',
};
