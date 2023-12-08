import { createTRPCReact } from "@trpc/react-query";

import type { AppRouter } from "@alparr/api";

export const api = createTRPCReact<AppRouter>();

export { type RouterInputs, type RouterOutputs } from "@alparr/api";
