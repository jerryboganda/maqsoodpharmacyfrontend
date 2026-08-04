import { api } from "./client";
import type {
  CreateStockAdjustmentInput,
  CreateStockTakeInput,
  ExpiryDashboardResult,
  GenerateStockTakeAdjustmentsInput,
  GenerateStockTakeAdjustmentsResult,
  HoldStockLotInput,
  RecordStockTakeCountLineInput,
  RecordStockTakeCountsResult,
  ReleaseStockLotInput,
  StockAdjustmentListResult,
  StockAdjustmentRow,
  StockListResult,
  StockLotDetail,
  StockLotListResult,
  StockMovementListResult,
  StockTakeDetail,
  StockTakeListResult,
  StockTakeStatus,
  StockTakeVarianceResult,
} from "./types";

export const inventoryApi = {
  listStock: (params: { itemId?: number; includeZero?: boolean; limit?: number; offset?: number } = {}) =>
    api.get<StockListResult>("/stock", params),
  listMovements: (params: { itemId?: number; stockLotId?: number; limit?: number; afterId?: number } = {}) =>
    api.get<StockMovementListResult>("/stock/movements", params),
  listLots: (
    params: { itemId?: number; lotStatus?: string; limit?: number; offset?: number } = {},
  ) => api.get<StockLotListResult>("/stock-lots", params),
  getStockLot: (id: number) => api.get<StockLotDetail>(`/stock-lots/${id}`),
  /** POST /stock-lots/:id/hold|release both return the raw `stock_lot` DB row (internal columns
   *  like `batchKey`/`tenantId`, no `qtyOnHand`) -- not the same shape as `StockLotRow`/
   *  `StockLotDetail`. No caller reads this response; they toast and reload the list instead, so
   *  it's typed `unknown` rather than lying about the shape. */
  holdStockLot: (id: number, input: HoldStockLotInput = {}, idempotencyKey?: string) =>
    api.post<unknown>(`/stock-lots/${id}/hold`, input, idempotencyKey),
  releaseStockLot: (id: number, input: ReleaseStockLotInput = {}, idempotencyKey?: string) =>
    api.post<unknown>(`/stock-lots/${id}/release`, input, idempotencyKey),
  getExpiryDashboard: (params: { itemId?: number } = {}) =>
    api.get<ExpiryDashboardResult>("/inventory/expiry-dashboard", params),

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

  // -- stock takes (physical counts) -------------------------------------------------------
  listStockTakes: (params: { status?: StockTakeStatus; limit?: number; offset?: number } = {}) =>
    api.get<StockTakeListResult>("/stock-takes", params),
  getStockTake: (id: number) => api.get<StockTakeDetail>(`/stock-takes/${id}`),
  createStockTake: (input: CreateStockTakeInput, idempotencyKey?: string) =>
    api.post<StockTakeDetail>("/stock-takes", input, idempotencyKey),
  /** POST /stock-takes/:id/count-sheet -- a write (materialises frozen lines from current stock
   *  balances), not a GET, and only callable once (draft -> counting). */
  generateCountSheet: (id: number, idempotencyKey?: string) =>
    api.post<StockTakeDetail>(`/stock-takes/${id}/count-sheet`, undefined, idempotencyKey),
  recordStockTakeCounts: (id: number, lines: RecordStockTakeCountLineInput[], idempotencyKey?: string) =>
    api.put<RecordStockTakeCountsResult>(`/stock-takes/${id}/lines`, { lines }, idempotencyKey),
  getStockTakeVariance: (id: number, params: { minVarianceQty?: string } = {}) =>
    api.get<StockTakeVarianceResult>(`/stock-takes/${id}/variance`, params),
  generateStockTakeAdjustments: (id: number, input: GenerateStockTakeAdjustmentsInput, idempotencyKey?: string) =>
    api.post<GenerateStockTakeAdjustmentsResult>(`/stock-takes/${id}/generate-adjustments`, input, idempotencyKey),
  closeStockTake: (id: number, reason?: string, idempotencyKey?: string) =>
    api.post<StockTakeDetail>(`/stock-takes/${id}/close`, { reason }, idempotencyKey),
};
