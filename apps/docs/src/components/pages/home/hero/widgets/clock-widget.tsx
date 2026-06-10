import dayjs from 'dayjs';
import { CommonWidgetProps, WidgetCard } from './card';
import clsx from 'clsx';

export const ClockWidget = ({ className }: CommonWidgetProps) => {
  return (
    <WidgetCard width={1} className={clsx('text-center gap-2', className)}>
      <span className={'font-bold text-xl'}>{dayjs().format('HH:mm')}</span>
      <span className="text-xs">{dayjs().format('dd, MMM. DD')}</span>
    </WidgetCard>
  );
};
