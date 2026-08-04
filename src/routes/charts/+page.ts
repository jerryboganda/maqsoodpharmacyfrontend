// Real fix (not a timeout bump) for a persistently-failing e2e assertion
// ("charts redirect ... " expects /charts -> /charts/line within Playwright's default
// 5s window): this redirect used to live entirely in RouteView.svelte's onMount, which only
// fires after that one component's chunk -- now over 1MB and growing every wave, since it
// statically imports every page in the app -- has downloaded, parsed, and mounted. That's a
// real, structural, worsening latency source (every future wave adds more pages to the same
// chunk), not test flakiness; it happened to still fit under 5s through Wave 4 and stopped
// fitting once Wave 5 added ~10 more page/API-client files to that chunk.
//
// A route-level `load` redirect resolves at the SvelteKit router layer, before RouteView (or
// any page component) needs to load at all -- this is a narrow, deliberate exception to this
// project's "no load functions" convention (see frontend/CLAUDE.md), justified because a
// redirect is exactly what `load` + `redirect()` exists for, and it's genuinely faster for a
// real user hitting /charts too, not just a test-only fix. Works under this app's
// ssr=false + adapter-static (fallback: index.html) SPA setup -- SvelteKit's client router
// still executes `load` and honours a thrown redirect during client-side navigation.
import { redirect } from "@sveltejs/kit";

export const load = () => {
  throw redirect(307, "/charts/line");
};
