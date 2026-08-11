import { AppWidget } from "./widgets/app-widget";
import { ClockWidget } from "./widgets/clock-widget";
import { AssistantProviderWidget } from "./widgets/assistant-provider-widget";
import { WeatherWidget } from "./widgets/weather-widget";
import { StockWidget } from "./widgets/stock-widget";
import { EntityStateWidget } from "./widgets/entity-state-widget";

export const HeroCards = () => {
  return (
    <div className="argos-ignore hero-cards flex flex-wrap max-w-[504px] gap-y-4 gap-x-3 text-gray-700 dark:text-gray-300">
      <StockWidget />
      <AppWidget />
      <AppWidget className="hidden 3xl:block" />
      <WeatherWidget />
      <AssistantProviderWidget />
      <EntityStateWidget />
      <AppWidget />

      <ClockWidget />
    </div>
  );
};
