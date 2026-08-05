import { copyFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Emit dist/404.html as a copy of index.html, so a host that serves 404.html for
 * unmatched paths hands every URL to the React router instead of its own "Not
 * Found" page.
 *
 * This is for DESIGN PREVIEWS ONLY, and off unless VITE_SPA_404_FALLBACK=true.
 * The correct fix on Render is a rewrite rule (`/*` -> `/index.html`, action
 * Rewrite) in the service's Redirects/Rewrites settings, which serves the app
 * with a 200. This trick serves the same HTML but keeps the 404 status, so a
 * crawler is told every page is missing — fine for a preview nobody indexes,
 * wrong for production. Do not set this variable on the live site.
 *
 * It lives here rather than in the `build` script because Render's build command
 * is fixed per service and can only be changed in the dashboard; an env var can
 * be set through the API, so the switch has to be inside the build itself.
 */
function spa404Fallback() {
  return {
    name: 'fx-spa-404-fallback',
    apply: 'build',
    closeBundle() {
      if (process.env.VITE_SPA_404_FALLBACK !== 'true') return
      const dist = resolve(import.meta.dirname, 'dist')
      const index = resolve(dist, 'index.html')
      if (!existsSync(index)) return
      copyFileSync(index, resolve(dist, '404.html'))
      this.info('wrote dist/404.html (SPA fallback for preview hosting)')
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), spa404Fallback()],
  server: {
    host: true, // listen on 0.0.0.0 so other devices on the LAN (e.g. your phone) can reach it
  },
})
