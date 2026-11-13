"use client";

import { createContext, useContext } from "react";

import type { HeaderPreferences } from "@homarr/validation/user";

// Private previews override the header; the normal demo uses saved user preferences.
export const DemoPrototypeContext = createContext<{ headerPreferences: HeaderPreferences } | null>(null);
export const useDemoPrototype = () => useContext(DemoPrototypeContext);
