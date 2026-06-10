import { useColorMode } from '@docusaurus/theme-common';
import { CommonWidgetProps, WidgetCard } from './card';
import clsx from 'clsx';

export const EntityStateWidget = ({ className }: CommonWidgetProps) => {
  const colorMode = useColorMode();

  return (
    <WidgetCard
      width={1}
      className={clsx('text-center', className)}
      onClick={() => colorMode.setColorMode(colorMode.isDarkTheme ? 'light' : 'dark')}
    >
      <span className={'text-sm font-bold'}>Lights</span>
      <span className="text-sm">{colorMode.isDarkTheme ? 'OFF' : 'ON'}</span>
    </WidgetCard>
  );
};
