import { useColorMode } from '@docusaurus/theme-common';
import { IntegrationDefinition } from '@site/src/types';
import { IconExternalLink } from '@tabler/icons-react';
import { getIntegrationIconUrl } from '../integrations/header';

interface WidgetIntegrationsProps {
  items: {
    integration: IntegrationDefinition;
    note?: string;
  }[];
}

export const WidgetIntegrations = ({ items }: WidgetIntegrationsProps) => {
  const { isDarkTheme } = useColorMode();

  return (
    <div className="flex flex-col gap-4 mt-4 w-full">
      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <div
            key={item.integration.name}
            className="flex gap-6 rounded-xl border border-solid dark:border-[#333] border-[#e5e7eb] p-4 shadow-sm w-full items-center justify-between"
          >
            <div className="flex gap-6 items-center">
              <img
                width={40}
                height={40}
                src={getIntegrationIconUrl(item.integration, isDarkTheme)}
                alt={`${item.integration.name} icon`}
                className="w-10 h-10"
              />

              <div className="flex flex-col gap-0">
                <span className="text-base font-bold">{item.integration.name}</span>
                <span className="text-sm dark:text-[#999999] text-[#696969]">
                  {item.integration.description}
                </span>
                {item.note && <span className="text-xs text-yellow-500 mt-1">{item.note}</span>}
              </div>
            </div>

            <a
              href={item.integration.path}
              className="border border-solid border-[#e5e7eb] dark:border-[#333] p-2 py-1 rounded-md gap-2 flex justify-center items-center hover:no-underline hover:bg-slate-100 dark:hover:bg-gray-800"
            >
              <IconExternalLink size={16} stroke={1.5} className="dark:stroke-white stroke-black" />
              <span className="dark:text-white text-black font-medium text-sm">Details</span>
            </a>
          </div>
        ))}
      </div>
    </div>
  );
};
