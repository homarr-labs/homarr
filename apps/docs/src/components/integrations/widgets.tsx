import { WidgetDefinition } from '@site/src/types';
import { IconExternalLink, TablerIcon } from '@tabler/icons-react';

interface IntegrationCapabilitesProps {
  items: (
    | {
        widget: WidgetDefinition;
        note?: string;
      }
    | {
        capability: {
          icon: TablerIcon;
          name: string;
          description: string;
          path: string;
        };
        note?: string;
      }
  )[];
}

export const IntegrationCapabilites = ({ items }: IntegrationCapabilitesProps) => {
  return (
    <div className="flex flex-col gap-4 mt-4 w-full">
      <div className="flex flex-col gap-2">
        {items.map((item) => {
          const capability = 'widget' in item ? item.widget : item.capability;

          return (
            <div
              key={capability.name}
              className="flex gap-6 rounded-xl border border-solid dark:border-[#333] border-[#e5e7eb] p-4 shadow-sm w-full items-center justify-between"
            >
              <div className="flex gap-6 items-center">
                <div className="w-10 h-10 flex justify-center items-center bg-red-500 bg-opacity-10 rounded-md">
                  <capability.icon size={24} stroke={1.5} className="stroke-red-500" />
                </div>

                <div className="flex flex-col gap-0">
                  <span className="text-base font-bold">{capability.name}</span>
                  <span className="text-sm dark:text-[#999999] text-[#696969]">
                    {capability.description}
                  </span>
                  {item.note && <span className="text-xs text-yellow-500 mt-1">{item.note}</span>}
                </div>
              </div>

              <a
                href={capability.path}
                className="border border-solid border-[#e5e7eb] dark:border-[#333] p-2 py-1 rounded-md gap-2 flex justify-center items-center hover:no-underline hover:bg-slate-100 dark:hover:bg-gray-800"
              >
                <IconExternalLink
                  size={16}
                  stroke={1.5}
                  className="dark:stroke-white stroke-black"
                />
                <span className="dark:text-white text-black font-medium text-sm">Details</span>
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
};
