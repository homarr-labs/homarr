"use client";

import type { PropsWithChildren } from "react";
import { createContext, useContext, useEffect, useState } from "react";

type Data = Record<
  string,
  {
    data: Record<string, unknown> | undefined;
    isReady: boolean;
  }
>;

interface GlobalItemServerDataContext {
  setItemServerData: (id: string, data: Record<string, unknown> | undefined) => void;
  data: Data;
  initalItemIds: string[];
}

const GlobalItemServerDataContext = createContext<GlobalItemServerDataContext | null>(null);

interface Props {
  initalItemIds: string[];
}

export const GlobalItemServerDataProvider = ({ children, initalItemIds }: PropsWithChildren<Props>) => {
  const [data, setData] = useState<Data>({});

  const setItemServerData = (id: string, itemData: Record<string, unknown> | undefined) => {
    setData((prev) => ({
      ...prev,
      [id]: {
        data: itemData,
        isReady: true,
      },
    }));
  };

  return (
    <GlobalItemServerDataContext.Provider value={{ setItemServerData, data, initalItemIds }}>
      {children}
    </GlobalItemServerDataContext.Provider>
  );
};

export const useServerDataFor = (id: string) => {
  const context = useContext(GlobalItemServerDataContext);

  if (!context) {
    throw new Error("GlobalItemServerDataProvider is required");
  }

  // When the item is not in the initial list, it means the data can not come from the server
  if (!context.initalItemIds.includes(id)) {
    return {
      data: undefined,
      isReady: true,
    };
  }

  return context.data[id];
};

export const useServerDataInitializer = (id: string, serverData: Record<string, unknown> | undefined) => {
  const context = useContext(GlobalItemServerDataContext);

  if (!context) {
    throw new Error("GlobalItemServerDataProvider is required");
  }

  useEffect(() => {
    context.setItemServerData(id, serverData);
  }, []);
};
