// Display-only formatting for the decimal STRINGS the API returns. Mirrors packages/money's own
// `Money.format()` on the backend (`Number(this.#value.toFixed(SCALE))` fed to Intl.NumberFormat)
// -- Number() here is presentation-only, the same pragmatic exception Money.ts itself documents.
// NEVER feed the result of these functions back into a request body; always send the original
// string (or a fresh string the user typed) instead.

export function formatMoney(value: string | null | undefined, currency = "PKR"): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("en-PK", { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    Number(value),
  );
}

export function formatQty(value: string | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const n = Number(value);
  // Whole-number quantities read cleaner without trailing .0000 (most pharmacy units are whole).
  return Number.isInteger(n) ? String(n) : n.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-PK", { year: "numeric", month: "short", day: "numeric" });
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("en-PK", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** Today as a YYYY-MM-DD business date (local time -- matches the API's Asia/Karachi convention
 *  closely enough for a browser field default; the user can always override it). */
export function todayYmd(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
