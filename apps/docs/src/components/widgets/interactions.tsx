import { IconArrowsMaximize, IconLayoutGrid, IconMouse2, IconRefresh } from "@tabler/icons-react";

const advancedInteraction = {
  icon: IconArrowsMaximize,
  title: "Advanced view",
  description:
    "Supported widgets explicitly opt into advanced view. Focus a widget and press Shift + Enter, hold Shift while hovering for about 500 ms, or choose Open advanced view from its menu. It is unavailable in edit mode and remains compact-only on widgets that do not opt in.",
} as const;

const standardInteractions = [
  {
    icon: IconMouse2,
    title: "Widget actions",
    description:
      "Signed-in users can open the widget context menu outside edit mode when Enable right click on widgets is enabled. App tiles are excluded. Settings, quick options, and integration actions appear or enable only when the widget and your board or integration permissions allow them.",
  },
  {
    icon: IconLayoutGrid,
    title: "Adaptive detail",
    description:
      "Resize a widget to tune its density. Compact layouts hide lower-priority details and controls as space shrinks; compact-only widgets adapt in place instead of opening a separate advanced view.",
  },
  {
    icon: IconRefresh,
    title: "Data status",
    description:
      "Widgets distinguish initial loading, successful empty results, terminal errors, stale cached data, and partial integration failures as applicable. Initial loads use a loading state, empty results use an empty state, and terminal failures can offer retry; retained data can stay visible with a stale warning, while healthy integrations can remain visible when another source fails. The shared menu reports Loading while matching active queries fetch, Idle when none are active, Error when any match is in error, otherwise Success with the latest data age when available. Refresh refetches only active queries owned by that widget and view and is disabled while they fetch.",
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
      <div className="grid gap-3 border-0 border-t border-solid border-[#e5e7eb] p-4 md:grid-cols-2 xl:grid-cols-4 dark:border-[#333]">
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
          Advanced view reuses existing data where possible; some widgets request additional or denser data. Hold Shift
          while hovering a supported widget for a temporary preview; it opens after about 500 ms and closes when Shift
          is released, the pointer leaves, or the window loses focus. For a persistent view, focus the widget and press
          Shift + Enter or use Open advanced view from its menu. Manual view closes with Escape after nested menus or
          popovers handle their own Escape, its close button, or the backdrop; it restores focus, traps focus, and locks
          background scrolling. Shift + wheel scrolls a scrollable advanced panel when it can consume the event. On
          touch devices, use the widget menu when available; compact-only widgets adapt in place instead.
        </p>
      )}
    </details>
  );
};
