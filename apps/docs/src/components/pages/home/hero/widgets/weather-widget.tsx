import { IconCloud, IconCloudRain, IconSun } from "@tabler/icons-react";
import { CommonWidgetProps, WidgetCard } from "./card";
import clsx from "clsx";

export const WeatherWidget = ({ className }: CommonWidgetProps) => {
  return (
    <WidgetCard width={1} className={clsx("gap-2", className)}>
      <div className="flex gap-2 justify-center items-center">
        <IconSun size={22} />
        <div className="flex flex-col leading-none">
          <span className="text-xl font-bold">18.4°C</span>
          <span className="text-xs text-muted-foreground">Paris</span>
        </div>
      </div>
      <div className="flex justify-evenly items-center w-full">
        <div className="flex flex-col items-center text-xs">
          <span>Mon</span>
          <IconSun size={16} />
          <span>21°</span>
        </div>
        <div className="flex flex-col items-center text-xs">
          <span>Tue</span>
          <IconCloud size={16} />
          <span>19°</span>
        </div>
        <div className="flex flex-col items-center text-xs">
          <span>Wed</span>
          <IconCloudRain size={16} />
          <span>16°</span>
        </div>
      </div>
    </WidgetCard>
  );
};
