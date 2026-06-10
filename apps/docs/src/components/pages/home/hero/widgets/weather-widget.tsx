import { IconCloud, IconWind, IconArrowUpRight, IconArrowDownRight } from '@tabler/icons-react';
import { CommonWidgetProps, WidgetCard } from './card';
import clsx from 'clsx';

export const WeatherWidget = ({ className }: CommonWidgetProps) => {
  return (
    <WidgetCard width={1} className={clsx('gap-2', className)}>
      <div className="flex gap-2 justify-center items-center">
        <IconCloud size={20} />
        <span className="text-xl font-bold">10.8°C</span>
      </div>
      <div className="flex gap-2 justify-center items-center">
        <IconWind size={14} />
        <span className="text-sm">5 km/h</span>
      </div>
      <div className="flex gap-1 justify-center items-center">
        <div className="flex justify-center items-center">
          <IconArrowUpRight size={14} />
          <span className="text-sm">13.5°C</span>
        </div>
        <div className="flex justify-center items-center">
          <IconArrowDownRight size={14} />
          <span className="text-sm">6.4°C</span>
        </div>
      </div>
    </WidgetCard>
  );
};
