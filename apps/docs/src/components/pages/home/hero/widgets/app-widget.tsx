import { supportedIntegrations } from "@site/src/constants/supported-integrations";
import { CommonWidgetProps, WidgetCard } from "./card";
import clsx from "clsx";

interface AppWidgetProps extends CommonWidgetProps {
  name: string;
  label?: string;
}

export const AppWidget = ({ name, label, className }: AppWidgetProps) => {
  const app = supportedIntegrations.find((integration) => integration.name === name);
  if (!app) return null;

  return (
    <WidgetCard width={1} className={clsx("app-card text-center", className)}>
      <span className={"text-sm font-bold"}>{label ?? app.name}</span>
      <img src={app.iconUrl} className="aspect-square scale-[0.6]" alt={`${label ?? app.name} icon`} />
      <div className="absolute bottom-3 right-3 rounded-full bg-green-500 w-2 h-2" aria-hidden="true" />
    </WidgetCard>
  );
};
