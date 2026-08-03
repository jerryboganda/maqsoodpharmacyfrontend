import { api } from "./client";
import type { ItemListResult, ItemSummary } from "./types";

export const catalogApi = {
  listItems: (params: { q?: string; isActive?: boolean; limit?: number; offset?: number } = {}) =>
    api.get<ItemListResult>("/items", params),
  getItem: (itemId: number) => api.get<ItemSummary>(`/items/${itemId}`),
};
