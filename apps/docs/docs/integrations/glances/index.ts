import { IntegrationDefinition } from '@site/src/types';

export const glancesIntegration: IntegrationDefinition = {
  name: 'Glances',
  description: 'Glances is a cross-platform system monitoring tool.',
  iconUrl: {
    light: 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/glances.svg',
    dark: 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/glances-light.svg',
  },
  path: '../../integrations/glances',
};
