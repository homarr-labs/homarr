import { useParams } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type {
  MRT_ColumnFiltersState,
  MRT_ColumnOrderState,
  MRT_ColumnPinningState,
  MRT_ColumnSizingState,
  MRT_DensityState,
  MRT_PaginationState,
  MRT_RowData,
  MRT_SortingState,
  MRT_TableOptions,
  MRT_VisibilityState,
} from "mantine-react-table";
import { useMantineReactTable } from "mantine-react-table";

import type { SupportedLanguage } from "@homarr/translation";
import { localeConfigurations } from "@homarr/translation";

type PersistedMrtState = {
  v: 1;
  columnVisibility?: MRT_VisibilityState;
  columnOrder?: MRT_ColumnOrderState;
  columnSizing?: MRT_ColumnSizingState;
  columnPinning?: MRT_ColumnPinningState;
  density?: MRT_DensityState;
  pagination?: MRT_PaginationState;
  sorting?: MRT_SortingState;
  globalFilter?: string;
  columnFilters?: MRT_ColumnFiltersState;
};

const storagePrefix = "homarr:mrt";

type PreferenceKey = Exclude<keyof PersistedMrtState, "v">;

const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

const applyUpdater = <T,>(updater: T | ((prev: T) => T), prev: T): T => {
  if (typeof updater === "function") {
    return (updater as (prev: T) => T)(prev);
  }
  return updater;
};

const pickInitial = <T,>(persistedValue: T | undefined, initialValue: T | undefined, fallback: T): T => {
  if (persistedValue !== undefined) return persistedValue;
  if (initialValue !== undefined) return initialValue;
  return fallback;
};

type PreferencesState = Required<Omit<PersistedMrtState, "v">>;

type PreferencesAction =
  | { type: "hydrate"; values: Partial<PreferencesState> }
  | { type: "set"; key: keyof PreferencesState; value: PreferencesState[keyof PreferencesState] };

const preferencesReducer = (state: PreferencesState, action: PreferencesAction): PreferencesState => {
  if (action.type === "hydrate") {
    return { ...state, ...action.values };
  }
  return { ...state, [action.key]: action.value } as PreferencesState;
};

const readPersistedMrtState = (key: string): PersistedMrtState | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    if (!("v" in parsed) || (parsed as { v?: unknown }).v !== 1) return null;
    return parsed as PersistedMrtState;
  } catch {
    return null;
  }
};

const writePersistedMrtState = (key: string, state: PersistedMrtState) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(state));
  } catch {
    // ignore because it's not critical
  }
};

export const useTranslatedMantineReactTable = <TData extends MRT_RowData>(
  args: { id: string } & Omit<MRT_TableOptions<TData>, "localization">,
) => {
  const { id, ...tableOptions } = args;
  const { locale } = useParams<{ locale: SupportedLanguage }>();
  const { data: mantineReactTable } = useQuery({
    queryKey: ["mantine-react-table-locale", locale],
    // eslint-disable-next-line no-restricted-syntax
    queryFn: async () => {
      return await localeConfigurations[locale].importMrtLocalization();
    },
    staleTime: Number.POSITIVE_INFINITY,
  });

  const storageKey = useMemo(() => `${storagePrefix}:${id}`, [id]);
  const persistedRef = useRef<PersistedMrtState>({ v: 1 });
  const [isHydrated, setIsHydrated] = useState(false);

  const callerState = (tableOptions.state ?? {}) as Record<string, unknown>;
  const isControlled = (key: PreferenceKey) => callerState[key] !== undefined;

  const managed = {
    columnVisibility: !isControlled("columnVisibility"),
    columnOrder: !isControlled("columnOrder"),
    columnSizing: !isControlled("columnSizing"),
    columnPinning: !isControlled("columnPinning"),
    density: !isControlled("density"),
    pagination: !isControlled("pagination"),
    sorting: !isControlled("sorting"),
    globalFilter: !isControlled("globalFilter"),
    columnFilters: !isControlled("columnFilters"),
  };

  const [preferences, dispatch] = useReducer(
    preferencesReducer,
    tableOptions.initialState,
    (initialState): PreferencesState => ({
      columnVisibility: pickInitial(undefined, initialState?.columnVisibility, {}),
      columnOrder: pickInitial(undefined, initialState?.columnOrder, []),
      columnSizing: pickInitial(undefined, initialState?.columnSizing, {}),
      columnPinning: pickInitial(undefined, initialState?.columnPinning, { left: [], right: [] }),
      density: pickInitial(undefined, initialState?.density, "md"),
      pagination: pickInitial(undefined, initialState?.pagination, { pageIndex: 0, pageSize: 10 }),
      sorting: pickInitial(undefined, initialState?.sorting, []),
      globalFilter: pickInitial(undefined, initialState?.globalFilter as string | undefined, ""),
      columnFilters: pickInitial(undefined, initialState?.columnFilters, []),
    }),
  );

  useIsomorphicLayoutEffect(() => {
    const persisted = readPersistedMrtState(storageKey);
    if (persisted) {
      persistedRef.current = persisted;

      const values: Partial<PreferencesState> = {};
      if (managed.columnVisibility && persisted.columnVisibility !== undefined) values.columnVisibility = persisted.columnVisibility;
      if (managed.columnOrder && persisted.columnOrder !== undefined) values.columnOrder = persisted.columnOrder;
      if (managed.columnSizing && persisted.columnSizing !== undefined) values.columnSizing = persisted.columnSizing;
      if (managed.columnPinning && persisted.columnPinning !== undefined) values.columnPinning = persisted.columnPinning;
      if (managed.density && persisted.density !== undefined) values.density = persisted.density;
      if (managed.pagination && persisted.pagination !== undefined) values.pagination = persisted.pagination;
      if (managed.sorting && persisted.sorting !== undefined) values.sorting = persisted.sorting;
      if (managed.globalFilter && persisted.globalFilter !== undefined) values.globalFilter = persisted.globalFilter;
      if (managed.columnFilters && persisted.columnFilters !== undefined) values.columnFilters = persisted.columnFilters;

      if (Object.keys(values).length > 0) {
        dispatch({ type: "hydrate", values });
      }
    }
    setIsHydrated(true);
  }, [
    storageKey,
    managed.columnVisibility,
    managed.columnOrder,
    managed.columnSizing,
    managed.columnPinning,
    managed.density,
    managed.pagination,
    managed.sorting,
    managed.globalFilter,
    managed.columnFilters,
  ]);

  useEffect(() => {
    if (!isHydrated) return;
    const persisted = persistedRef.current;
    const next: PersistedMrtState = { v: 1 };

    if (managed.columnVisibility) next.columnVisibility = preferences.columnVisibility;
    else if (persisted.columnVisibility !== undefined) next.columnVisibility = persisted.columnVisibility;

    if (managed.columnOrder) next.columnOrder = preferences.columnOrder;
    else if (persisted.columnOrder !== undefined) next.columnOrder = persisted.columnOrder;

    if (managed.columnSizing) next.columnSizing = preferences.columnSizing;
    else if (persisted.columnSizing !== undefined) next.columnSizing = persisted.columnSizing;

    if (managed.columnPinning) next.columnPinning = preferences.columnPinning;
    else if (persisted.columnPinning !== undefined) next.columnPinning = persisted.columnPinning;

    if (managed.density) next.density = preferences.density;
    else if (persisted.density !== undefined) next.density = persisted.density;

    if (managed.pagination) next.pagination = preferences.pagination;
    else if (persisted.pagination !== undefined) next.pagination = persisted.pagination;

    if (managed.sorting) next.sorting = preferences.sorting;
    else if (persisted.sorting !== undefined) next.sorting = persisted.sorting;

    if (managed.globalFilter) next.globalFilter = preferences.globalFilter;
    else if (persisted.globalFilter !== undefined) next.globalFilter = persisted.globalFilter;

    if (managed.columnFilters) next.columnFilters = preferences.columnFilters;
    else if (persisted.columnFilters !== undefined) next.columnFilters = persisted.columnFilters;

    writePersistedMrtState(storageKey, next);
    persistedRef.current = next;
  }, [
    storageKey,
    isHydrated,
    managed.columnVisibility,
    managed.columnOrder,
    managed.columnSizing,
    managed.columnPinning,
    managed.density,
    managed.pagination,
    managed.sorting,
    managed.globalFilter,
    managed.columnFilters,
    preferences,
  ]);

  const mergedState = { ...(tableOptions.state ?? {}) } as Record<string, unknown>;
  if (managed.columnVisibility) mergedState.columnVisibility = preferences.columnVisibility;
  if (managed.columnOrder) mergedState.columnOrder = preferences.columnOrder;
  if (managed.columnSizing) mergedState.columnSizing = preferences.columnSizing;
  if (managed.columnPinning) mergedState.columnPinning = preferences.columnPinning;
  if (managed.density) mergedState.density = preferences.density;
  if (managed.pagination) mergedState.pagination = preferences.pagination;
  if (managed.sorting) mergedState.sorting = preferences.sorting;
  if (managed.globalFilter) mergedState.globalFilter = preferences.globalFilter;
  if (managed.columnFilters) mergedState.columnFilters = preferences.columnFilters;

  let onColumnVisibilityChange = tableOptions.onColumnVisibilityChange;
  if (managed.columnVisibility) {
    onColumnVisibilityChange = (updater) => {
      dispatch({
        type: "set",
        key: "columnVisibility",
        value: applyUpdater(updater, preferences.columnVisibility),
      });
    };
  }

  let onColumnOrderChange = tableOptions.onColumnOrderChange;
  if (managed.columnOrder) {
    onColumnOrderChange = (updater) => {
      dispatch({ type: "set", key: "columnOrder", value: applyUpdater(updater, preferences.columnOrder) });
    };
  }

  let onColumnSizingChange = tableOptions.onColumnSizingChange;
  if (managed.columnSizing) {
    onColumnSizingChange = (updater) => {
      dispatch({ type: "set", key: "columnSizing", value: applyUpdater(updater, preferences.columnSizing) });
    };
  }

  let onColumnPinningChange = tableOptions.onColumnPinningChange;
  if (managed.columnPinning) {
    onColumnPinningChange = (updater) => {
      dispatch({ type: "set", key: "columnPinning", value: applyUpdater(updater, preferences.columnPinning) });
    };
  }

  let onDensityChange = tableOptions.onDensityChange;
  if (managed.density) {
    onDensityChange = (updater) => {
      dispatch({ type: "set", key: "density", value: applyUpdater(updater, preferences.density) });
    };
  }

  let onPaginationChange = tableOptions.onPaginationChange;
  if (managed.pagination) {
    onPaginationChange = (updater) => {
      dispatch({ type: "set", key: "pagination", value: applyUpdater(updater, preferences.pagination) });
    };
  }

  let onSortingChange = tableOptions.onSortingChange;
  if (managed.sorting) {
    onSortingChange = (updater) => {
      dispatch({ type: "set", key: "sorting", value: applyUpdater(updater, preferences.sorting) });
    };
  }

  let onGlobalFilterChange = tableOptions.onGlobalFilterChange;
  if (managed.globalFilter) {
    onGlobalFilterChange = (updater) => {
      dispatch({ type: "set", key: "globalFilter", value: applyUpdater(updater, preferences.globalFilter) });
    };
  }

  let onColumnFiltersChange = tableOptions.onColumnFiltersChange;
  if (managed.columnFilters) {
    onColumnFiltersChange = (updater) => {
      dispatch({ type: "set", key: "columnFilters", value: applyUpdater(updater, preferences.columnFilters) });
    };
  }

  const options: MRT_TableOptions<TData> = {
    ...tableOptions,
    state: mergedState,
    onColumnVisibilityChange,
    onColumnOrderChange,
    onColumnSizingChange,
    onColumnPinningChange,
    onDensityChange,
    onPaginationChange,
    onSortingChange,
    onGlobalFilterChange,
    onColumnFiltersChange,
  };

  if (mantineReactTable) {
    options.localization = mantineReactTable;
  }

  return useMantineReactTable<TData>(options);
};
