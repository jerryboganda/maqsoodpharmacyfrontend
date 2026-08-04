import { api } from "./client";
import type { ItemDetail, ItemListResult, PatchItemInput } from "./types";

export const catalogApi = {
  listItems: (params: { q?: string; isActive?: boolean; limit?: number; offset?: number } = {}) =>
    api.get<ItemListResult>("/items", params),
  getItem: (itemId: number) => api.get<ItemDetail>(`/items/${itemId}`),
  /** PATCH /items/:id -- edits an item's own already-populated fields (items.controller.ts).
   *  Send only the fields that changed; the backend rejects an empty body. */
  updateItem: (itemId: number, input: PatchItemInput, idempotencyKey?: string) =>
    api.patch<ItemDetail>(`/items/${itemId}`, input, idempotencyKey),
  /** POST /items/:id/deactivate -- flips `isActive` to false. No reactivate endpoint exists yet
   *  (items.service.ts: "out of scope for this task" as of the PATCH+deactivate addition) -- do
   *  not add a reactivate call here until the backend actually has one. */
  deactivateItem: (itemId: number, idempotencyKey?: string) =>
    api.post<ItemDetail>(`/items/${itemId}/deactivate`, undefined, idempotencyKey),
};
