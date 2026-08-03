# Adminex SvelteKit Dashboard

Adminex is a pixel-preserving SvelteKit migration of the original Adminex dashboard. It keeps the original branding, mock data, assets, layouts, routes, themes, ten locale files, RTL behavior, charts, forms, tables, and localStorage-driven interactions.

This repository is Svelte-only: the application source, dependencies, routes, and tests are SvelteKit/TypeScript. Historical migration comparison scripts and the original framework reference are not part of the active project; the reference backup is retained outside this repository.

## Local development

```bash
npm install
npm run dev
```

Open <http://localhost:5173>.

## Verification commands

```bash
npm run check
npm run lint
npm run test:unit
npm run test:e2e
npm run build
npm run preview
npm run verify:svelte-only
```

The production build is written to `build/` and uses `adapter-static` with an SPA fallback so the complete route set remains directly addressable.

## Project structure

```text
public/assets/          Preserved Adminex images, fonts, flags, and logos
src/data/               Preserved mock data
src/features/           Preserved domain types, configs, and pure engines
src/i18n/locales/       Ten preserved locale JSON files
src/lib/components/     Svelte shared shell and page components
src/lib/stores/         Typed theme, locale, and feature stores
src/routes/             SvelteKit shell and SPA route entrypoints
src/styles/             Preserved Adminex design tokens and CSS
src/types/              Preserved shared TypeScript types
```

## Pharmacy platform integration

This repo is the frontend for the pharmacy-platform rebuild (backend: the sibling `rebuild`
repo, https://github.com/jerryboganda/maqsoodpharmacysoftware). The Adminex template above is
the design system; the actual pharmacy screens live under `src/lib/components/pharmacy/` and
`src/routes/pharmacy/`, wired to the real NestJS API via `src/lib/api/`.

```bash
cp .env.example .env   # set PUBLIC_API_BASE_URL if the backend isn't on localhost:3000
npm install
npm run dev            # then open http://localhost:5173/pharmacy/login
```

Screens (all against real endpoints, no mock data):
- `/pharmacy` -- dashboard KPIs (item/stock counts, pending approvals, today's sales)
- `/pharmacy/inventory` -- stock levels + stock lots
- `/pharmacy/inventory/adjustments` -- create/approve/post stock adjustments
- `/pharmacy/purchasing/suppliers`, `/pharmacy/purchasing/invoices`
- `/pharmacy/sales/customers`, `/pharmacy/sales/invoices` (cash-sale/POS flow)
- `/pharmacy/settings/options` -- generic P1 option-list viewer

**Dev-mode auth**: the backend's session guard has no real credential check yet (see
`rebuild/apps/api/src/common/auth/session.guard.ts`) -- `/pharmacy/login` calls the real
`/identity/me` endpoint and resolves the seeded `dev.owner` user regardless of what's typed in
the password field. This is documented in the login page itself, not hidden.

**Rule M** (money/quantity fields are decimal strings end to end, never a JS number) applies here
too -- see `src/lib/api/types.ts`'s header comment and `src/lib/components/pharmacy/shared/
DecimalInput.svelte`. `src/lib/api/format.ts` is the one place `Number()` is allowed, for
display only.

**CI**: this repo follows the same hard rule as the backend -- heavy compute (install, typecheck,
lint, unit tests, e2e, build) runs in `.github/workflows/ci.yml`, not locally. See `CLAUDE.md`.

## License

This item is licensed under the Envato Market License. See [LICENSE.txt](LICENSE.txt).
