import { supportedIntegrations } from '@site/src/constants/supported-integrations';
import { CommonWidgetProps, WidgetCard } from './card';
import { getRndInteger } from '@site/src/tools/math';
import clsx from 'clsx';

export const AppWidget = ({ className }: CommonWidgetProps) => {
  const randomApp = supportedIntegrations[getRndInteger(0, supportedIntegrations.length - 1)];

  return (
    <WidgetCard width={1} className={clsx('text-center', className)}>
      <span className={'text-sm font-bold'}>{randomApp.name}</span>
      <img
        src={randomApp.iconUrl}
        className="aspect-square scale-[0.6] transition-transform"
        alt={`${randomApp.name} Icon`}
      />
      <div className="absolute bottom-3 right-3 rounded-full bg-green-500 w-2 h-2"></div>
    </WidgetCard>
  );
};
