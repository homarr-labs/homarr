import clsx from 'clsx';
import { CSSProperties, ReactNode } from 'react';
import { AppWidget } from './widgets/app-widget';
import { WidgetCard } from './widgets/card';
import { ClockWidget } from './widgets/clock-widget';
import { DownloadsWidget } from './widgets/downloads-widget';
import { WeatherWidget } from './widgets/weather-widget';
import { StockWidget } from './widgets/stock-widget';
import { EntityStateWidget } from './widgets/entity-state-widget';

export const HeroCards = () => {
  return (
    <div className="argos-ignore hero-cards flex flex-wrap max-w-[504px] gap-y-4 gap-x-3 text-gray-700 dark:text-gray-300">
      <StockWidget />
      <AppWidget />
      <AppWidget className="hidden 3xl:block" />
      <WeatherWidget />
      <DownloadsWidget />
      <EntityStateWidget />
      <AppWidget />

      <ClockWidget />
    </div>
  );
};
