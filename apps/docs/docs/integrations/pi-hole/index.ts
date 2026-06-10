import { IntegrationDefinition } from '@site/src/types';

export const piHoleIntegration: IntegrationDefinition = {
  name: 'Pi-hole',
  description:
    'Pi-hole is a network-wide ad blocker that acts as a DNS sinkhole, blocking unwanted content and improving your browsing experience.',
  iconUrl: 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/pi-hole.svg',
  path: '../../integrations/pi-hole',
};
