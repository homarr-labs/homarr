import type { DependencyList, PropsWithChildren } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import type { TablerIcon } from "@homarr/ui";

import type { inferSearchInteractionDefinition, SearchInteraction } from "../../lib/interaction";

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type ContextSpecificItem = {
  id: string;
  name: string;
  icon: TablerIcon | string;
  interaction: () => inferSearchInteractionDefinition<SearchInteraction>;
  disabled?: boolean;
};

interface SpotlightContextProps {
  items: ContextSpecificItem[];
  registerItems: (key: string, results: ContextSpecificItem[]) => void;
  unregisterItems: (key: string) => void;
}

const createSpotlightContext = (displayName: string) => {
  const SpotlightContext = createContext<SpotlightContextProps | null>(null);
  SpotlightContext.displayName = displayName;

  const Provider = ({ children }: PropsWithChildren) => {
    const registrationsRef = useRef<Map<string, number>>(new Map());
    const [itemsMap, setItemsMap] = useState<Map<string, ContextSpecificItem[]>>(new Map());

    const registerItems = useCallback((key: string, newItems: ContextSpecificItem[]) => {
      setItemsMap((prevItems) => {
        const newItemsMap = new Map(prevItems);
        newItemsMap.set(key, newItems);
        registrationsRef.current.set(key, (registrationsRef.current.get(key) ?? 0) + 1);

        return newItemsMap;
      });
    }, []);

    const unregisterItems = useCallback((key: string) => {
      setItemsMap((prevItems) => {
        const registrationCount = registrationsRef.current.get(key) ?? 0;

        if (registrationCount <= 1) {
          const newItemsMap = new Map(prevItems);
          newItemsMap.delete(key);
          registrationsRef.current.delete(key);

          return newItemsMap;
        }

        registrationsRef.current.set(key, registrationCount - 1);

        return prevItems;
      });
    }, []);

    const items = useMemo(() => Array.from(itemsMap.values()).flat(), [itemsMap]);

    return (
      <SpotlightContext.Provider value={{ items, registerItems, unregisterItems }}>
        {children}
      </SpotlightContext.Provider>
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
    const context = useContext(SpotlightContext);

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
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, dependencyArray);
  };

  return [SpotlightContext, Provider, useSpotlightContextItems, useRegisterSpotlightContextItems] as const;
};

const [_ResultContext, ResultProvider, useSpotlightContextResults, useRegisterSpotlightContextResults] =
  createSpotlightContext("SpotlightContextSpecificResults");
const [_ActionContext, ActionProvider, useSpotlightContextActions, useRegisterSpotlightContextActions] =
  createSpotlightContext("SpotlightContextSpecificActions");

export {
  useSpotlightContextResults,
  useRegisterSpotlightContextResults,
  useSpotlightContextActions,
  useRegisterSpotlightContextActions,
};

export const SpotlightProvider = ({ children }: PropsWithChildren) => {
  return (
    <ResultProvider>
      <ActionProvider>{children}</ActionProvider>
    </ResultProvider>
  );
};
