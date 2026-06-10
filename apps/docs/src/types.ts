import { TablerIcon } from '@tabler/icons-react';
import { ReactNode } from 'react';

export interface IntegrationDefinition {
  name: string;
  description: string;
  iconUrl:
    | string
    | {
        light: string;
        dark: string;
      };
  path: string;
}

export interface WidgetConfigurationItem {
  name: ReactNode;
  description: ReactNode;
  values:
    | string
    | { type: 'boolean' }
    | { type: 'string' }
    | { type: 'select'; options: string[] }
    | { type: 'object'; name: string; configuration: WidgetConfiguration }
    | { type: 'array'; name: string; configuration: WidgetConfiguration };
  defaultValue: string;
}

export interface WidgetConfiguration {
  items: WidgetConfigurationItem[];
}

export interface WidgetDefinition {
  icon: TablerIcon;
  name: string;
  description: string;
  path: string;
  configuration?: WidgetConfiguration;
}
