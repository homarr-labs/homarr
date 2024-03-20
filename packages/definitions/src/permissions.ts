export const boardPermissions = ["board-view", "board-change"] as const;

export type BoardPermission = (typeof boardPermissions)[number];
