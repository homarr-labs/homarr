interface AssistantBrowserToolDependencies {
  getOrigin: () => string;
  navigate: (path: string) => void;
  openCommandMenu: () => void;
  openMediaRequestSearch: () => void;
}

export const resolveAssistantInternalRoute = (path: string, origin: string) => {
  if (!path.startsWith("/") || path.startsWith("/\\")) return null;

  const target = URL.canParse(path, origin) ? new URL(path, origin) : null;
  if (target === null || target.origin !== origin) return null;

  return `${target.pathname}${target.search}${target.hash}`;
};

export const createAssistantBrowserToolExecutors = ({
  getOrigin,
  navigate,
  openCommandMenu,
  openMediaRequestSearch,
}: AssistantBrowserToolDependencies) => ({
  navigate_to_route: async ({ path }: { path: string }) => {
    const internalPath = resolveAssistantInternalRoute(path, getOrigin());
    if (internalPath === null) {
      return { success: false as const, error: "Only internal Homarr paths are allowed." };
    }

    navigate(internalPath);
    return { success: true as const, path: internalPath };
  },
  open_command_menu: async () => {
    openCommandMenu();
    return { success: true as const };
  },
  open_media_request_search: async () => {
    openMediaRequestSearch();
    return { success: true as const };
  },
});

export type AssistantBrowserToolExecutors = ReturnType<typeof createAssistantBrowserToolExecutors>;
