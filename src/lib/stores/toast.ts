// No toast/notification system exists anywhere in this theme (confirmed by the architecture
// survey) -- financial create/post/approve actions need consistent success/error feedback, so
// this is new. Classic writable store, same convention as theme.ts/locale.ts.
import { writable } from "svelte/store";

export interface ToastMessage {
  id: number;
  kind: "success" | "error" | "info";
  text: string;
}

export const toasts = writable<ToastMessage[]>([]);

let nextId = 1;

function push(kind: ToastMessage["kind"], text: string, timeoutMs = 5000): void {
  const id = nextId++;
  toasts.update((list) => [...list, { id, kind, text }]);
  setTimeout(() => dismiss(id), timeoutMs);
}

export function dismiss(id: number): void {
  toasts.update((list) => list.filter((t) => t.id !== id));
}

export const toast = {
  success: (text: string) => push("success", text),
  error: (text: string) => push("error", text, 8000),
  info: (text: string) => push("info", text),
};
