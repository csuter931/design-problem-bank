import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { execSync } from 'child_process'

// Build stamp shown in the footer so a deploy can be visually confirmed on the
// live site. GITHUB_SHA is set in CI; fall back to local git, then 'dev'.
function commitSha(): string {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.slice(0, 7)
  try { return execSync('git rev-parse --short HEAD').toString().trim() } catch { return 'dev' }
}
const buildStamp = `${commitSha()} · ${new Date().toISOString().slice(0, 10)}`

export default defineConfig({
  plugins: [react()],
  base: '/design-problem-bank/',
  define: {
    __BUILD_STAMP__: JSON.stringify(buildStamp),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
