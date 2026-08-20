import type { WidgetOptionType } from "../options";
import { WidgetAnchorNoteInput } from "./widget-anchor-note-input";
import { WidgetAppInput } from "./widget-app-input";
import { WidgetCustomWidgetSelectInput } from "./widget-custom-widget-select-input";
import { WidgetCustomWidgetConfigurationInput } from "./widget-custom-widget-configuration-input";
import { WidgetDateTimeEventListInput } from "./widget-date-time-event-list-input";
import { WidgetDynamicSelectInput } from "./widget-dynamic-select-input";
import { WidgetDynamicMultiSelectInput } from "./widget-dynamic-multiselect-input";
import { WidgetLocationInput } from "./widget-location-input";
import { WidgetMultiTextInput } from "./widget-multi-text-input";
import { WidgetMultiReleasesRepositoriesInput } from "./widget-multiReleasesRepositories-input";
import { WidgetMultiSelectInput } from "./widget-multiselect-input";
import { WidgetNumberInput } from "./widget-number-input";
import { WidgetSelectInput } from "./widget-select-input";
import { WidgetSliderInput } from "./widget-slider-input";
import { WidgetSortedItemListInput } from "./widget-sortable-item-list-input";
import { WidgetSwitchInput } from "./widget-switch-input";
import { WidgetTextInput } from "./widget-text-input";
import { WidgetTimezoneListInput } from "./widget-timezone-list-input";
import { WidgetUmamiEventInput } from "./widget-umami-event-input";
import { WidgetUmamiEventNamesInput } from "./widget-umami-event-names-input";
import { WidgetUmamiWebsiteInput } from "./widget-umami-website-input";
import { WidgetIntegrationSelectInput } from "./widget-integration-select-input";
import { WidgetIntegrationMultiSelectInput } from "./widget-integration-multi-select-input";
import { WidgetInternalInput } from "./widget-internal-input";

const mapping = {
  internal: WidgetInternalInput,
  anchorNote: WidgetAnchorNoteInput,
  text: WidgetTextInput,
  dateTimeEventList: WidgetDateTimeEventListInput,
  timezoneList: WidgetTimezoneListInput,
  location: WidgetLocationInput,
  multiSelect: WidgetMultiSelectInput,
  multiText: WidgetMultiTextInput,
  number: WidgetNumberInput,
  select: WidgetSelectInput,
  slider: WidgetSliderInput,
  switch: WidgetSwitchInput,
  app: WidgetAppInput,
  sortableItemList: WidgetSortedItemListInput,
  multiReleasesRepositories: WidgetMultiReleasesRepositoriesInput,
  dynamicSelect: WidgetDynamicSelectInput,
  dynamicMultiSelect: WidgetDynamicMultiSelectInput,
  umamiEventName: WidgetUmamiEventInput,
  umamiEventNames: WidgetUmamiEventNamesInput,
  umamiWebsite: WidgetUmamiWebsiteInput,
  customWidgetSelect: WidgetCustomWidgetSelectInput,
  customWidgetConfiguration: WidgetCustomWidgetConfigurationInput,
  integrationSelect: WidgetIntegrationSelectInput,
  integrationMultiSelect: WidgetIntegrationMultiSelectInput,
} satisfies Record<WidgetOptionType, unknown>;

export const getInputForType = <TType extends WidgetOptionType>(type: TType) => {
  return mapping[type];
};
