import type { SettingsFeatureClient, InstanceSettings, UserPreferences, PreferencePatch } from "./client";
import {
  instanceSettingsGroups,
  instanceSettingsSchema,
  preferenceSettingsFields,
  preferenceSettingsSchema,
} from "./schema";
import type { InstanceSettingsValues, PreferenceSettingsValues } from "./schema";

export interface SettingsSaveResult<Values, Snapshot = unknown> {
  readonly value: Values;
  readonly draftValue?: Values;
  readonly errors: readonly unknown[];
  readonly snapshot?: Snapshot;
}

export const toInstanceSettingsValues = (settings: InstanceSettings) => instanceSettingsSchema.parse(settings);
export const toPreferenceSettingsValues = (preferences: UserPreferences) =>
  preferenceSettingsSchema.parse(
    Object.fromEntries(preferenceSettingsFields.map((field) => [field, preferences[field]])),
  );

export async function readInstanceSettings(client: SettingsFeatureClient, signal?: AbortSignal) {
  const [settings, searchEngines] = await Promise.all([
    client.serverSettings.getAll(undefined, { signal }),
    client.searchEngine.getSelectable({ withIntegrations: false }, { signal }),
  ]);
  return { settings, searchEngines };
}

export async function readPreferenceSettings(client: SettingsFeatureClient, userId: string, signal?: AbortSignal) {
  const [preferences, searchEngines] = await Promise.all([
    client.user.getPreferences({ userId }, { signal }),
    client.searchEngine.getSelectable({ withIntegrations: true }, { signal }),
  ]);
  return { preferences, searchEngines };
}

export async function saveInstanceSettings(
  client: SettingsFeatureClient,
  values: InstanceSettingsValues,
  baseline: InstanceSettingsValues,
): Promise<SettingsSaveResult<InstanceSettingsValues, InstanceSettings>> {
  const parsed = instanceSettingsSchema.parse(values);
  const groups = instanceSettingsGroups.filter(
    (group) => JSON.stringify(parsed[group]) !== JSON.stringify(baseline[group]),
  );
  if (groups.length === 0) return { value: baseline, errors: [] };
  const results = await Promise.allSettled(
    groups.map((settingsKey) => client.serverSettings.saveSettings({ settingsKey, value: parsed[settingsKey] })),
  );
  const errors = results.flatMap((result) => (result.status === "rejected" ? [result.reason as unknown] : []));
  const settings = await client.serverSettings.getAll(undefined);
  const canonical = toInstanceSettingsValues(settings);
  const draftValue = { ...canonical };
  groups.forEach((group, index) => {
    if (results[index]?.status === "rejected") Object.assign(draftValue, { [group]: parsed[group] });
  });
  return { value: canonical, draftValue, errors, snapshot: settings };
}

export async function savePreferenceSettings(
  client: SettingsFeatureClient,
  userId: string,
  values: PreferenceSettingsValues,
  baseline: PreferenceSettingsValues,
): Promise<SettingsSaveResult<PreferenceSettingsValues, UserPreferences>> {
  const parsed = preferenceSettingsSchema.parse(values);
  const patch: PreferencePatch = { userId };
  for (const key of preferenceSettingsFields) {
    if (JSON.stringify(parsed[key]) !== JSON.stringify(baseline[key])) Object.assign(patch, { [key]: parsed[key] });
  }
  if (Object.keys(patch).length === 1) return { value: baseline, errors: [] };
  const preferences = await client.user.updatePreferences(patch);
  return { value: toPreferenceSettingsValues(preferences), errors: [], snapshot: preferences };
}
