// Audit module client (read-only browse surface over `audit_log` -- Wave 6).
//
// Wire shapes read directly from the real backend source, not guessed:
//   - rebuild/apps/api/src/modules/audit/api/audit-events.controller.ts (GET /audit/events,
//     GET /audit/events/:id -- both plain reads, no writes anywhere in this module; the only
//     writer is apps/api/src/common/audit, cross-cutting and out of scope here)
//   - rebuild/apps/api/src/modules/audit/api/dto/audit-event.dto.ts (ListAuditEventsQuerySchema --
//     entityType/action are free-text varchars, not fixed enums, per that schema's own comment;
//     zIntString/zDateString wire helpers for entityId/actorUserId/offset/limit and
//     dateFrom/dateTo respectively)
//   - rebuild/apps/api/src/modules/audit/application/audit-event.service.ts (list() returns
//     `{ events, offset, limit }`, newest-first, limit capped at 200 server-side; getById()
//     returns the raw row, no wrapper)
//   - rebuild/packages/db/schema/audit.ts (audit_log column list)
//
// Rule M: `amountImpact` is a DECIMAL(15,2) column (packages/db/schema/_shared.ts's
// DOCUMENT_AMOUNT) -- returned as a decimal STRING, exactly like every other money field in this
// client directory. Never Number()/parseFloat() it except for pure display via format.ts.
import { api } from "./client";

/** One `audit_log` row exactly as the API returns it (audit-event.service.ts's `getById`/the
 *  entries of `list`'s `events` array -- same shape, no field is dropped from the list view). */
export interface AuditEventRow {
  auditLogId: number;
  /** Nullable -- some audited events are platform-level (no single tenant), per audit.ts's own
   *  class comment. */
  tenantId: number | null;
  branchId: number | null;
  /** DATETIME(3) column -- arrives as an ISO datetime string (JSON.stringify's default Date
   *  serialization), same convention as expenseDate/postedAt elsewhere in this API. Format with
   *  `formatDateTime`, never `formatDate` (this is a timestamp, not a date-only field). */
  occurredAt: string;
  /** No FK on purpose (audit.ts: "an audit row must remain exactly as written even if the
   *  actor's account is later deleted/merged") -- may reference a since-deleted user, so don't
   *  assume a live user lookup will resolve it. `actorUsername` is the denormalised display name
   *  to use instead. */
  actorUserId: number | null;
  actorUsername: string;
  sessionId: string | null;
  /** Free-text, admin-extensible (e.g. "create", "update", "post", "cancel", "reverse", "grant",
   *  "revoke", "login", "export", "visibility_change", "setting_change", "price_change") -- not a
   *  fixed enum, per audit.ts's own column comment. */
  action: string;
  /** Target table/resource name, e.g. "expense", "purchase.order". Free-text, same reasoning as
   *  `action`. */
  entityType: string;
  entityId: number | null;
  /** Human-readable identity at the time the event was recorded, e.g. the invoice number --
   *  survives even if the entity itself is later renamed. */
  entityLabel: string | null;
  /** JSON columns -- arbitrary snapshot objects (or `null` when not captured, which is the norm
   *  for the generic AuditInterceptor-written rows; only richer service-initiated writes
   *  populate these). Never assume a particular shape -- pretty-print as opaque JSON. */
  beforeJson: unknown;
  afterJson: unknown;
  /** Array of column names that changed, or `null`. */
  changedFields: string[] | null;
  /** Decimal STRING (Rule M) or `null` -- financial magnitude of the event, for risk-ranked
   *  review. */
  amountImpact: string | null;
  /** Mandatory (service-layer enforced) for cancel/reverse/visibility-bulk-change/permission
   *  events; `null` otherwise. */
  reason: string | null;
  /** VARBINARY(16) column -- currently always `null` on every row: the only writer
   *  (AuditService.write in apps/api/src/common/audit/audit.service.ts) never populates it today
   *  (see that file's own AuditWriteInput.ipAddress comment -- tracked as a real follow-up, not
   *  silently dropped). Typed as a plain string for forward-compatibility, not a guess at a
   *  packed-binary wire shape that has no verified serialization path yet. */
  ipAddress: string | null;
  machineName: string | null;
  /** Correlates one user action across multiple audit rows written in the same request. */
  requestId: string | null;
  /** Wave 6 addition -- true for the hardcoded "security-class" action set (login, grant, revoke,
   *  setting.change, ...); false for everything else. */
  isSensitive: boolean;
}

/** GET /audit/events query params -- mirrors ListAuditEventsQuerySchema exactly.
 *  `entityType`/`action` are free-text (not enums, per the schema's own comment) -- plain text
 *  inputs, not selects. `dateFrom`/`dateTo` are `YYYY-MM-DD`; the service treats `dateTo` as
 *  inclusive of the whole calendar day. `limit` is capped at 200 server-side
 *  (DEFAULT_PAGE_SIZE=50, MAX_PAGE_SIZE=200 in audit-event.service.ts) -- passing a higher value
 *  does not error, it's silently clamped. */
// A `type` alias (not `interface`) on purpose: `interface` declarations do not pick up
// TypeScript's implicit index signature for object literal shapes, so passing one straight to
// `api.get`'s `Record<string, string | number | boolean | undefined>` query parameter fails with
// "Index signature is missing" -- confirmed against every other client in this directory (none
// use a named `interface` for inline query params, only `type`/object-literal parameter
// annotations, e.g. payments.ts's `listPayments`).
export type ListAuditEventsParams = {
  entityType?: string;
  entityId?: number;
  actorUserId?: number;
  action?: string;
  dateFrom?: string;
  dateTo?: string;
  offset?: number;
  limit?: number;
};

export interface ListAuditEventsResult {
  events: AuditEventRow[];
  offset: number;
  limit: number;
}

export const auditApi = {
  /** GET /audit/events -- tenant-scoped, newest-first (occurredAt desc, auditLogId desc),
   *  offset/limit paged. Requires `audit:list`. */
  listAuditEvents: (params: ListAuditEventsParams = {}) => api.get<ListAuditEventsResult>("/audit/events", params),
  /** GET /audit/events/:id -- one row, including the full beforeJson/afterJson/changedFields.
   *  Requires `audit:view`. 404s as `AUDIT.NOT_FOUND` if the id doesn't exist (or belongs to
   *  another tenant). */
  getAuditEvent: (auditLogId: number) => api.get<AuditEventRow>(`/audit/events/${auditLogId}`),
};
