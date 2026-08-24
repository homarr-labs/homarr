import type { DependencyList, PropsWithChildren } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import type { TablerIcon } from "@homarr/ui";

import type { inferSearchInteractionDefinition, SearchInteraction } from "../../lib/interaction";

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type ContextSpecificItem = {
  id: string;
  name: string;
  icon: TablerIcon | string;
  interaction: (query: string) => inferSearchInteractionDefinition<SearchInteraction>;
  aliases?: string[];
  placement?: "primary" | "fallback";
  disabled?: boolean;
  description?: string;
  unavailable?: boolean;
  alwaysVisible?: boolean;
  dedupeKey?: string;
};

interface SpotlightContextProps {
  items: ContextSpecificItem[];
}

interface SpotlightRegistrationContextProps {
  registerItems: (key: string, results: ContextSpecificItem[]) => void;
  unregisterItems: (key: string) => void;
}

const createSpotlightContext = (displayName: string) => {
  const SpotlightContext = createContext<SpotlightContextProps | null>(null);
  const SpotlightRegistrationContext = createContext<SpotlightRegistrationContextProps | null>(null);
  SpotlightContext.displayName = displayName;
  SpotlightRegistrationContext.displayName = `${displayName}Registration`;

  const Provider = ({ children }: PropsWithChildren) => {
    const [itemsMap, setItemsMap] = useState<Map<string, { items: ContextSpecificItem[]; count: number }>>(new Map());

    const registerItems = useCallback((key: string, newItems: ContextSpecificItem[]) => {
      setItemsMap((prevItems) => {
        const newItemsMap = new Map(prevItems);
        newItemsMap.set(key, { items: newItems, count: (newItemsMap.get(key)?.count ?? 0) + 1 });
        return newItemsMap;
      });
    }, []);

    const unregisterItems = useCallback((key: string) => {
      setItemsMap((prevItems) => {
        const registrationCount = prevItems.get(key)?.count ?? 0;

        if (registrationCount <= 1) {
          const newItemsMap = new Map(prevItems);
          newItemsMap.delete(key);
          return newItemsMap;
        }

        const newItemsMap = new Map(prevItems);
        newItemsMap.set(key, { items: newItemsMap.get(key)?.items ?? [], count: registrationCount - 1 });

        return newItemsMap;
      });
    }, []);

    const items = useMemo(() => {
      const uniqueItems: ContextSpecificItem[] = [];
      const itemKeys = new Set<string>();

      for (const registration of itemsMap.values()) {
        for (const item of registration.items) {
          const itemKey = item.dedupeKey ?? item.id;
          if (itemKeys.has(itemKey)) continue;

          itemKeys.add(itemKey);
          uniqueItems.push(item);
        }
      }

      return uniqueItems;
    }, [itemsMap]);
    const itemsContext = useMemo(() => ({ items }), [items]);
    const registration = useMemo(() => ({ registerItems, unregisterItems }), [registerItems, unregisterItems]);

    return (
      <SpotlightRegistrationContext.Provider value={registration}>
        <SpotlightContext.Provider value={itemsContext}>{children}</SpotlightContext.Provider>
      </SpotlightRegistrationContext.Provider>
    );
  };

  const useSpotlightContextItems = () => {
    const context = useContext(SpotlightContext);

    if (!context) {
      throw new Error(`useSpotlightContextItems must be used within SpotlightContext[displayName=${displayName}]`);
    }

    return context.items;
  };

  const useRegisterSpotlightContextItems = (
    key: string,
    items: ContextSpecificItem[],
    dependencyArray: DependencyList,
  ) => {
    const context = useContext(SpotlightRegistrationContext);

    if (!context) {
      throw new Error(
        `useRegisterSpotlightContextItems must be used within SpotlightContext[displayName=${displayName}]`,
      );
    }

    useEffect(() => {
      context.registerItems(
        key,
        items.filter((item) => !item.disabled),
      );

      return () => {
        context.unregisterItems(key);
      };
      // We ignore the results
    }, [...dependencyArray, context.registerItems, context.unregisterItems, key]);
  };

  return [SpotlightContext, Provider, useSpotlightContextItems, useRegisterSpotlightContextItems] as const;
};

const [_ResultContext, ResultProvider, useSpotlightContextResults, useRegisterSpotlightContextResults] =
  createSpotlightContext("SpotlightContextSpecificResults");
const [_ActionContext, ActionProvider, useSpotlightContextActions, useRegisterSpotlightContextActions] =
  createSpotlightContext("SpotlightContextSpecificActions");

export {
  useRegisterSpotlightContextActions,
  useRegisterSpotlightContextResults,
  useSpotlightContextActions,
  useSpotlightContextResults,
};

export const SpotlightProvider = ({ children }: PropsWithChildren) => {
  return (
    <ResultProvider>
      <ActionProvider>{children}</ActionProvider>
    </ResultProvider>
  );
};
