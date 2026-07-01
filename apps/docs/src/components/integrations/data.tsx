import { IntegrationDefinition } from "@site/src/types";
import { IconDatabase } from "@tabler/icons-react";

interface IntegrationDataProps {
  integration: IntegrationDefinition;
}

export const IntegrationData = ({ integration }: IntegrationDataProps) => {
  if (!integration.data) {
    return null;
  }

  return (
    <div className="flex gap-2 items-start p-4 rounded-md border border-solid border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 mb-4">
      <IconDatabase size={20} stroke={1.5} className="shrink-0 mt-0.5 text-blue-500" />
      <p className="!mb-0 text-sm">{integration.data}</p>
    </div>
  );
};
