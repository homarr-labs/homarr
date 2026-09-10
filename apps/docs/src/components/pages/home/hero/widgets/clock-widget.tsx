import clsx from "clsx";

import { CommonWidgetProps, WidgetCard } from "./card";

export const ClockWidget = ({ className }: CommonWidgetProps) => {
  return (
    <WidgetCard width={1} className={clsx("text-center gap-2", className)}>
      <span className="text-xl font-bold">14:33</span>
      <span className="text-xs">Sun, Sep. 06</span>
    </WidgetCard>
  );
};
