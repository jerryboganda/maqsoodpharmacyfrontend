import { api } from "./client";
import type {
  CreateStockAdjustmentInput,
  StockAdjustmentListResult,
  StockAdjustmentRow,
  StockListResult,
  StockLotListResult,
  StockMovementListResult,
} from "./types";

export const inventoryApi = {
  listStock: (params: { itemId?: number; includeZero?: boolean; limit?: number; offset?: number } = {}) =>
    api.get<StockListResult>("/stock", params),
  listMovements: (params: { itemId?: number; stockLotId?: number; limit?: number; afterId?: number } = {}) =>
    api.get<StockMovementListResult>("/stock/movements", params),
  listLots: (
    params: { itemId?: number; lotStatus?: string; limit?: number; offset?: number } = {},
  ) => api.get<StockLotListResult>("/stock-lots", params),

  listAdjustments: (
    params: { status?: string; direction?: "increase" | "decrease"; limit?: number; offset?: number } = {},
  ) => api.get<StockAdjustmentListResult>("/stock-adjustments", params),
  getAdjustment: (id: number) => api.get<StockAdjustmentRow>(`/stock-adjustments/${id}`),
  createAdjustment: (input: CreateStockAdjustmentInput, idempotencyKey?: string) =>
    api.post<StockAdjustmentRow>("/stock-adjustments", input, idempotencyKey),
  postAdjustment: (id: number, postingDate?: string, idempotencyKey?: string) =>
    api.post<StockAdjustmentRow>(`/stock-adjustments/${id}/post`, { postingDate }, idempotencyKey),
  approveAdjustment: (id: number, reason?: string, idempotencyKey?: string) =>
    api.post<StockAdjustmentRow>(`/stock-adjustments/${id}/approve`, { reason }, idempotencyKey),
};
