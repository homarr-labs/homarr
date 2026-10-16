import { cache } from "react";

import { api } from "./server";

export const getBoardByNameAsync = cache(async (name: string) => await api.board.getBoardByName.query({ name }));

export const getHomeBoardAsync = cache(async () => await api.board.getHomeBoard.query());
