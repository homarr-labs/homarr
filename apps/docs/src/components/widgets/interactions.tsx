import { IconArrowsMaximize, IconLayoutGrid, IconMouse2 } from "@tabler/icons-react";

const advancedInteraction = {
  icon: IconArrowsMaximize,
  title: "Advanced view",
  description:
    "On supported widgets, hold Shift while hovering for about 500 ms, press Shift + Enter, or choose Open advanced view from the widget menu. It is unavailable in edit mode.",
} as const;

const standardInteractions = [
  {
    icon: IconMouse2,
    title: "Widget actions",
    description:
      "When signed in, outside edit mode, and with Enable right click on widgets enabled, right-click for live query status, refresh, settings, quick options, and supported actions. App tiles are excluded.",
  },
  {
    icon: IconLayoutGrid,
    title: "Adaptive detail",
    description:
      "Resize a widget to tune its density. Compact views keep primary status visible, then reveal details and controls as space or intent allows.",
  },
] as const;

export const WidgetInteractionGuide = ({ advancedView = true }: { advancedView?: boolean }) => {
  const interactions = advancedView ? [advancedInteraction, ...standardInteractions] : standardInteractions;

  return (
    <details className="group my-6 overflow-hidden rounded-xl border border-solid border-[#e5e7eb] bg-slate-50/70 dark:border-[#333] dark:bg-gray-900/40">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 font-semibold marker:hidden">
        <span>Power-user controls</span>
        <span className="text-xs font-normal text-[#696969] group-open:hidden dark:text-[#999]">Show controls</span>
        <span className="hidden text-xs font-normal text-[#696969] group-open:inline dark:text-[#999]">
          Hide controls
        </span>
      </summary>
      <div
        className={`grid gap-3 border-0 border-t border-solid border-[#e5e7eb] p-4 md:grid-cols-2 ${advancedView ? "xl:grid-cols-4" : "xl:grid-cols-3"} dark:border-[#333]`}
      >
        {interactions.map(({ icon: Icon, title, description }) => (
          <div key={title} className="rounded-lg bg-white p-3 shadow-sm dark:bg-gray-950">
            <Icon aria-hidden size={20} stroke={1.5} className="mb-2 stroke-red-500" />
            <div className="font-semibold">{title}</div>
            <p className="mb-0 mt-1 text-sm text-[#696969] dark:text-[#999]">{description}</p>
          </div>
        ))}
      </div>
      {advancedView && (
        <p className="m-0 px-4 pb-4 text-xs text-[#696969] dark:text-[#999]">
          Advanced view reuses the widget&apos;s live data and cache. Preview dims the rest of the board; the manual
          view traps focus and locks background scrolling. On touch devices, use the widget menu where your browser
          exposes it; compact-only widgets adapt in place instead.
        </p>
      )}
    </details>
  );
};
