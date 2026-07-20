import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.config'

export default defineConfig(({ mode }) => ({
  // Tailwind only ever reaches the side panel: styles.css is imported by
  // sidepanel/main.tsx and nothing else. The on-page overlay renders into a
  // closed shadow root with its own injected <style>, so no utility class or
  // preflight rule can leak onto a page we are filling.
  plugins: [react(), tailwindcss(), crx({ manifest })],
  build: {
    target: 'es2022',
    // Dev and prod builds MUST NOT share an output folder. dist/ is what you
    // load unpacked while developing; a production build landing there
    // silently repoints the loaded extension at the hosted origin, and the
    // only symptom is "cloud unreachable" for a URL you never chose. Sending
    // production elsewhere makes `bun run build` safe to run at any time,
    // including by a tool that just wants to check the build passes.
    outDir: mode === 'production' ? 'dist-prod' : 'dist',
  },
  server: {
    port: 5199,
    strictPort: true,
    hmr: { port: 5199 },
  },
}))
