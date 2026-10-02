import clsx from "clsx";
import { useEffect, useState } from "react";

import { CommonWidgetProps, WidgetCard } from "./card";

export const ClockWidget = ({ className }: CommonWidgetProps) => {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const update = () => setNow(new Date());
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <WidgetCard width={1} className={clsx("text-center gap-2", className)}>
      <span className="text-xl font-bold tabular-nums">
        {now?.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false }) ?? "--:--"}
      </span>
      <span className="text-xs">
        {now?.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "2-digit" }) ?? "\u00a0"}
      </span>
    </WidgetCard>
  );
};
