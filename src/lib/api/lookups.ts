import { api } from "./client";
import type { AdjustmentReason, OptionValueResponse, PaymentMethod, PurchaseCategory, SaleCategory } from "./types";

export const lookupsApi = {
  adjustmentReasons: (direction?: "increase" | "decrease") =>
    api
      .get<{ adjustmentReasons: AdjustmentReason[] }>("/adjustment-reasons", { direction })
      .then((r) => r.adjustmentReasons),
  purchaseCategories: () =>
    api.get<{ purchaseCategories: PurchaseCategory[] }>("/purchase-categories").then((r) => r.purchaseCategories),
  saleCategories: () => api.get<{ saleCategories: SaleCategory[] }>("/sale-categories").then((r) => r.saleCategories),
  paymentMethods: () => api.get<{ paymentMethods: PaymentMethod[] }>("/payment-methods").then((r) => r.paymentMethods),
  /** Generic P1 option set, e.g. "sale.tender_method" -- see settings/api/dto/option-value.dto.ts. */
  options: (key: string) => api.get<OptionValueResponse[]>(`/settings/options/${key}`),
};
