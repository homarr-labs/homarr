"use client";

import { createContext, useContext } from "react";

import type { HeaderPreferences } from "@homarr/validation/user";

// Throwaway design exploration. The chosen design must be rewritten before promotion.
export const DemoPrototypeContext = createContext<{ headerPreferences: HeaderPreferences } | null>(null);
export const useDemoPrototype = () => useContext(DemoPrototypeContext);
