export const ssr = false
// The app is intentionally client-rendered; adapter-static writes the SPA fallback
// so every Adminex route (including dynamic slugs and ids) remains directly reachable.
export const prerender = false
