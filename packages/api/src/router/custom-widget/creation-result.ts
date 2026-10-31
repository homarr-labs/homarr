export const getCreatedCustomWidgetResult = (id: string, targetBoardId?: string) => ({
  id,
  managementPath: `/manage/custom-widgets/edit/${id}`,
  nextAction: {
    type: "place-custom-widget" as const,
    widgetKind: "customApi" as const,
    options: { definitionId: id },
    ...(targetBoardId ? { targetBoardId } : {}),
    whenTargetIsKnown:
      "The definition is saved but unplaced. Use an available placement tool with the requested board, widgetKind, and exact options, or add it in the Homarr board editor. Claim placement only after it succeeds.",
    whenTargetIsUnknown:
      "The definition is saved but unplaced. If the user requested saving unplaced, finish without asking again. Otherwise ask whether and where to place it using an available placement tool or the Homarr board editor. Never recreate it for placement.",
  },
});
