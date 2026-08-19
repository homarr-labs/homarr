import type { IntegrationKind, WidgetKind } from "@homarr/definitions";
import { nativeFeatureCapabilities, widgetKinds } from "@homarr/definitions";

export interface BoardRecipeRecommendation {
  widgetKind: WidgetKind;
  integrationKind: IntegrationKind;
  isNewlyAvailable: boolean;
  score: number;
}

export const getBoardRecipeDismissalKey = (boardId: string, integrationKind: IntegrationKind) =>
  `homarr-board-recipes-${boardId}-${integrationKind}`;

interface BoardRecipeRecommendationInput {
  configuredIntegrationKinds: readonly IntegrationKind[];
  existingItemKinds: readonly WidgetKind[];
  preferredIntegrationKind?: IntegrationKind;
  limit?: number;
}

/**
 * Suggests missing widgets that can use an existing connection. The newly
 * connected service ranks first, followed by specific capabilities with fewer
 * unrelated provider matches. Inputs and outputs are deduplicated so this can
 * remain a small, explainable client-side recommendation layer.
 */
export const getBoardRecipeRecommendations = ({
  configuredIntegrationKinds,
  existingItemKinds,
  preferredIntegrationKind,
  limit = 3,
}: BoardRecipeRecommendationInput): BoardRecipeRecommendation[] => {
  const availableKinds = new Set(configuredIntegrationKinds);
  const existingKinds = new Set(existingItemKinds);

  return widgetKinds
    .filter((widgetKind) => !existingKinds.has(widgetKind))
    .flatMap((widgetKind) => {
      const capability = nativeFeatureCapabilities[widgetKind as keyof typeof nativeFeatureCapabilities];
      if (!capability) return [];

      const matches = capability.integrations.filter((integrationKind) => availableKinds.has(integrationKind));
      if (matches.length === 0) return [];

      const preferredMatch = preferredIntegrationKind && matches.includes(preferredIntegrationKind);
      const integrationKind = preferredMatch ? preferredIntegrationKind : matches[0];
      if (!integrationKind) return [];

      return [
        {
          widgetKind,
          integrationKind,
          isNewlyAvailable: Boolean(preferredMatch),
          score: (preferredMatch ? 1_000 : 0) + matches.length * 10 - capability.integrations.length,
        },
      ];
    })
    .sort((left, right) => right.score - left.score || left.widgetKind.localeCompare(right.widgetKind))
    .slice(0, Math.max(0, limit));
};
