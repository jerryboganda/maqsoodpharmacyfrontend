# Adminex SvelteKit Dashboard

Adminex is a pixel-preserving SvelteKit migration of the original Adminex dashboard. It keeps the original branding, mock data, assets, layouts, routes, themes, ten locale files, RTL behavior, charts, forms, tables, and localStorage-driven interactions.

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
