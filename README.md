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

## License

This item is licensed under the Envato Market License. See [LICENSE.txt](LICENSE.txt).
