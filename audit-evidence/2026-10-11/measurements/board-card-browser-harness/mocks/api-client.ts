import { useMutation, useQuery, type UseMutationOptions } from "@tanstack/react-query";

type DuplicateBoardInput = { id: string; name: string };
type DuplicateBoardMutationOptions = UseMutationOptions<DuplicateBoardInput, Error, DuplicateBoardInput>;

export const clientApi = {
  board: {
    exists: {
      useQuery: (name: string, options: { enabled?: boolean } = {}) =>
        useQuery({
          queryKey: ["board.exists", name],
          enabled: options.enabled,
          queryFn: async () => {
            const response = await fetch("/__synthetic/board.exists", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ name }),
            });
            if (!response.ok) throw new Error(`Synthetic board.exists returned ${response.status}`);
            return (await response.json()) as boolean;
          },
        }),
    },
    duplicateBoard: {
      useMutation: (options: DuplicateBoardMutationOptions) =>
        useMutation({
          ...options,
          mutationFn: async (input: { id: string; name: string }) => {
            window.__boardAudit.mutationCalls.push(input);
            return input;
          },
        }),
    },
  },
};
