"use client";

import { useServerDataInitializer } from "./provider";

interface Props {
  id: string;
  serverData: Record<string, unknown> | undefined;
}

export const ClientServerDataInitalizer = ({ id, serverData }: Props) => {
  useServerDataInitializer(id, serverData);
  return null;
};
