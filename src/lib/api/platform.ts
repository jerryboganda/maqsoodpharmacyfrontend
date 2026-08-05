// Blueprint: rebuild/apps/api/src/modules/platform -- platform.controller.ts. `health`/`ready`
// need no auth (@Public() on the backend) but the client still works unauthenticated the same way
// every other `api.get` call does -- no special-casing needed here.
import { api } from "./client";
import type { FeatureCapabilityRow, PlatformHealth, PlatformReady, UpdateFeatureCapabilityInput } from "./types";

export const platformApi = {
  health: () => api.get<PlatformHealth>("/health"),
  ready: () => api.get<PlatformReady>("/ready"),

  /** The D1 register -- what's in scope / deferred / excluded / replaced, and why. */
  listFeatureCapabilities: () => api.get<FeatureCapabilityRow[]>("/admin/feature-capabilities"),
  /** Record an owner decision on a deferred vertical. `rationale` must be >= 20 characters
   *  (server-enforced) -- a one-word status flip is not an audit trail. */
  updateFeatureCapability: (code: string, input: UpdateFeatureCapabilityInput, idempotencyKey?: string) =>
    api.patch<FeatureCapabilityRow>(`/admin/feature-capabilities/${code}`, input, idempotencyKey),
};
