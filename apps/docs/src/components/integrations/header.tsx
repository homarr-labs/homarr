import { IntegrationDefinition } from '@site/src/types';
import { DocsHeader } from '../ui/header';
import { useColorMode } from '@docusaurus/theme-common';

interface IntegrationHeaderProps {
  integration: IntegrationDefinition;
  categories: string[];
}

export const IntegrationHeader = (props: IntegrationHeaderProps) => {
  const { isDarkTheme } = useColorMode();

  return (
    <DocsHeader
      title={props.integration.name}
      description={props.integration.description}
      icon={
        <img src={getIntegrationIconUrl(props.integration, isDarkTheme)} width={48} height={48} />
      }
      categories={props.categories}
    />
  );
};

export const getIntegrationIconUrl = (
  integration: IntegrationDefinition,
  isDarkTheme: boolean
): string =>
  typeof integration.iconUrl === 'string'
    ? integration.iconUrl
    : isDarkTheme
      ? integration.iconUrl.dark
      : integration.iconUrl.light;
