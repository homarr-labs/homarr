"use client";

import { createContext, useContext } from "react";

const DemoReadOnlyContext = createContext(false);

export const DemoReadOnlyProvider = DemoReadOnlyContext.Provider;

export const useDemoReadOnly = () => useContext(DemoReadOnlyContext);
