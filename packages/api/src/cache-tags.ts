export const cacheTags = {
  serverSettings: () => "server-settings" as const,
  board: (boardId: string) => `board:${boardId}` as const,
  boardByName: (name: string) => `board-name:${name.toUpperCase()}` as const,
  boardList: () => "board-list" as const,
  user: (userId: string) => `user:${userId}` as const,
  integration: (integrationId: string) => `integration:${integrationId}` as const,
  integrationData: (integrationId: string, query: string) => `integration-data:${integrationId}:${query}` as const,
  app: (appId: string) => `app:${appId}` as const,
} as const;
