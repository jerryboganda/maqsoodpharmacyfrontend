# Project rules — pharmacy-platform frontend

This is the frontend for the pharmacy-platform rebuild. The backend lives in the sibling
`rebuild` repo (https://github.com/jerryboganda/maqsoodpharmacysoftware) — see its own
`CLAUDE.md` for the full backend architecture and the origin of the rules below, which apply
project-wide, not just to that repo.

## Hard rule: heavy compute runs in GitHub Actions, not on the laptop

Same standing rule as the backend. `npm install`, `npm run check`/`lint`/`test:unit`/`test:e2e`/
`build` across the whole project belong in `.github/workflows/ci.yml`, which runs on every push
and PR. Before re-running a full local pass "to make sure it's clean," push and let CI verify —
use `gh run list` / `gh run watch` / `gh run view --log-failed` instead.

What's still fine locally: the interactive dev loop (`npm run dev`, clicking through a screen in
a browser), and a single targeted command while actively debugging one file (`npm run check` on
its own is fast enough to run locally while iterating — it's the "run everything, every time"
pattern that belongs in CI, not this specific command).

## Rule M: money and quantities are never plain JavaScript numbers

Identical rule to the backend (see `rebuild/CLAUDE.md`). Every money/quantity/percentage field
in an API request or response is a decimal STRING — see `src/lib/api/types.ts`'s header comment.
`Number()`/`parseFloat()` are permitted ONLY in `src/lib/api/format.ts` (display formatting) and
for pure UI comparisons/tone logic (e.g. "is this row's qty below a threshold") that never feed
back into a request body. For money/quantity form INPUT, use
`src/lib/components/pharmacy/shared/DecimalInput.svelte`, never `<input type="number">` bound to
a JS number (that is this theme's own default convention for non-pharmacy demo pages — it is
deliberately NOT followed for pharmacy screens).

## Architecture notes for whoever picks this up next

- This is a from-scratch integration of a purchased SvelteKit admin theme ("Adminex") with a
  real backend. The theme itself has an unusual architecture worth knowing before touching
  routing: there are no SvelteKit `load` functions anywhere; routing is a hand-rolled
  `RouteView.svelte` (one big `{#if path === '/x'}` chain + an `exactRoutes` Set) loaded lazily
  via `RoutePage.svelte`. Adding a new page requires three edits: a thin `+page.svelte` wrapper
  under `src/routes/...`, a new branch + `exactRoutes` entry in `src/lib/components/RouteView.
  svelte`, and (if it belongs in the sidebar) an entry in `src/lib/navigation.ts`.
- All existing/original template code uses classic Svelte stores (`writable`) and `export let`
  props/`on:click` — not Svelte 5 runes, despite Svelte 5 being installed. New pharmacy code
  follows the same convention for consistency.
- The theme has no generic `DataTable`/`Modal`/`Toast`/`Badge` component library — every
  template page hand-rolls its own table/modal markup. `src/lib/components/pharmacy/shared/`
  adds a *small* set of primitives (`Toast`, `Modal`, `Badge`, `DecimalInput`) specifically
  because pharmacy screens are numerous enough that NOT sharing these would mean many
  independently-reinvented, inconsistent implementations — this is a deliberate, narrow
  exception, not a signal to build out a full component library.
- `Toast` must be mounted once, globally, in `src/routes/+layout.svelte` — it was built once and
  initially forgotten there (caught during manual browser verification, not by typecheck), so if
  `toast.success()`/`toast.error()` calls stop producing visible toasts, check that mount first.
- Backend list-endpoint `limit` caps are inconsistent across modules (some cap at 200, some 500,
  some uncapped) — always check the actual DTO in `rebuild/apps/api/src/modules/*/api/dto/*.ts`
  before picking a `limit` value in a new API call; a mismatch here doesn't show up in
  `npm run check` (it's a runtime 422), only in an actual network request.
