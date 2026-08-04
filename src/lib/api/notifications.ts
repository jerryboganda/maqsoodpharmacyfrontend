// Notifications module client (Wave 6 -- in-app notifications only: list-my-notifications +
// mark-one-read + mark-all-read; rules/channels admin CRUD and email/SMS/push delivery are
// explicitly deferred server-side, see notification.service.ts's own header comment).
//
// Wire shapes read directly from the real backend source, not guessed:
//   - rebuild/apps/api/src/modules/notifications/api/notifications.controller.ts
//     (GET /notifications, POST /notifications/:id/read, POST /notifications/read-all -- neither
//     POST route requires an Idempotency-Key: the controller's own header comment documents both
//     as naturally retry-safe (`readAt` only ever moves from null to "now"; a repeat call is a
//     no-op), the same reasoning payments.ts's reverseAllocation/cancelPayment already follow for
//     the same class of endpoint -- so this client never passes one, same as those two calls.
//   - rebuild/apps/api/src/modules/notifications/api/dto/notification.dto.ts
//     (ListNotificationsQuerySchema -- offset/limit only, no status/kind filter: the endpoint
//     always returns the current actor's own visible set, unread-first)
//   - rebuild/apps/api/src/modules/notifications/application/notification.service.ts (list()
//     returns `{ notifications, unreadCount, offset, limit }`; markRead() returns
//     `{ notification }`; markAllRead() returns `{ updatedCount }`)
//   - rebuild/packages/db/schema/notifications.ts (`notification` table column list)
//
// Rule M: this table has no money/quantity/percentage column, so nothing here is a decimal
// string -- `unreadCount`/`updatedCount` are plain JSON numbers straight off `count(*)`/
// `affectedRows`, not a Rule M field.
import { api } from "./client";

export type NotificationSeverity = "info" | "warning" | "critical";

/** Free-text, module-extensible (notifications.ts's own `kind` column comment) -- not a fixed
 *  enum. Every kind the current scan job materializes (notification.service.ts's header
 *  comment): "low_stock", "expiry_risk", "adjustment_pending_approval", "purchase_order_pending".
 *  "ap_overdue"/"ar_overdue" are named in the column comment as future kinds, not yet scanned. */
export type NotificationKind = string;

/** One `notification` row exactly as the API returns it -- every column on the table, no field
 *  dropped (list's `notifications` array and markRead's `notification` are both raw `select()`
 *  rows, see notification.service.ts). */
export interface NotificationRow {
  notificationId: number;
  tenantId: number;
  /** Exactly one of `recipientUserId`/`recipientRoleKey` is set per row (service-layer enforced,
   *  see notifications.ts's own class comment) -- a targeted alert vs. a role broadcast. */
  recipientUserId: number | null;
  recipientRoleKey: string | null;
  kind: NotificationKind;
  severity: NotificationSeverity;
  title: string;
  body: string;
  /** Frontend route path to navigate to on click, e.g. "/stock-adjustments/123" -- `null` for
   *  kinds with no single linkable resource. Written by the backend scan job; some values may not
   *  (yet) match a route this SPA has actually built -- render/link it verbatim regardless, per
   *  this task's own instruction, rather than silently dropping or rewriting it here. */
  link: string | null;
  /** The table/entity kind that triggered this notification, e.g. "item", "stock_lot",
   *  "stock_adjustment", "purchase_order". */
  sourceType: string;
  /** Soft ref -- the specific row that triggered it; `null` for kinds with no single source row. */
  sourceId: number | null;
  /** ISO datetime string, or `null` while unread. Format with `formatDateTime`. */
  readAt: string | null;
  /** Soft ref -- who marked it read (not necessarily the recipient, e.g. on a role-broadcast
   *  row); `null` while unread. */
  readBy: number | null;
  createdAt: string;
  createdBy: number | null;
  createdSource: "ui" | "api" | "migration" | "system_job" | "import";
  updatedAt: string;
  updatedBy: number | null;
}

/** GET /notifications query params -- mirrors ListNotificationsQuerySchema exactly: offset/limit
 *  only, no filter. Always the current actor's own visible set (own `recipientUserId` rows plus
 *  every `recipientRoleKey` row matching one of the actor's roles), unread first, newest first
 *  within each group. `limit` is capped at 200 server-side (DEFAULT_PAGE_SIZE=50,
 *  MAX_PAGE_SIZE=200 in notification.service.ts) -- passing a higher value does not error, it's
 *  silently clamped, same convention as audit.ts's own `listAuditEvents`.
 *  A `type` alias (not `interface`) on purpose -- same reasoning as audit.ts's
 *  `ListAuditEventsParams` (an `interface` doesn't pick up the implicit index signature
 *  `api.get`'s query parameter needs). */
export type ListNotificationsParams = {
  offset?: number;
  limit?: number;
};

export interface ListNotificationsResult {
  notifications: NotificationRow[];
  unreadCount: number;
  offset: number;
  limit: number;
}

export interface MarkNotificationReadResult {
  notification: NotificationRow;
}

export interface MarkAllNotificationsReadResult {
  updatedCount: number;
}

export const notificationsApi = {
  /** GET /notifications -- also runs the backend's materialized-alert scan for the actor's
   *  tenant first (notification.service.ts's `list`), so every call can surface freshly-detected
   *  conditions, not just what was already stored. Requires `notification:list`. */
  listNotifications: (params: ListNotificationsParams = {}) =>
    api.get<ListNotificationsResult>("/notifications", params),
  /** POST /notifications/:id/read -- 404s as `NOTIFICATION.NOT_FOUND` if the id doesn't belong to
   *  this actor by either `recipientUserId` or a `recipientRoleKey` the actor holds. Already-read
   *  is a no-op that still returns the row. Requires `notification:edit`. No Idempotency-Key --
   *  see this file's header comment. */
  markRead: (notificationId: number) =>
    api.post<MarkNotificationReadResult>(`/notifications/${notificationId}/read`),
  /** POST /notifications/read-all -- marks every one of the actor's currently-visible UNREAD
   *  notifications as read in one statement. Does not re-run the alert scan first (unlike list).
   *  Requires `notification:edit`. No Idempotency-Key -- see this file's header comment. */
  markAllRead: () => api.post<MarkAllNotificationsReadResult>("/notifications/read-all"),
};
