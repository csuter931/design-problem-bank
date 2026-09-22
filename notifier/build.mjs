// Apps Script has no module system, so the TypeScript is bundled into one flat
// file and the two trigger entry points are re-exposed as top-level globals.
import { build } from 'esbuild'
import { copyFileSync, mkdirSync } from 'node:fs'

const OUT_DIR = 'notifier/build'

mkdirSync(OUT_DIR, { recursive: true })

await build({
  entryPoints: ['notifier/src/entry.ts'],
  bundle: true,
  format: 'iife',
  globalName: 'NOTIFIER',
  target: 'es2020',
  outfile: `${OUT_DIR}/Code.js`,
  legalComments: 'none',
  // Apps Script triggers call a bare function name, which the IIFE would
  // otherwise hide. esbuild appends the footer outside the wrapper, so these
  // two land at top level where the trigger scheduler can see them.
  footer: {
    js: [
      'function pollForNewSubmissions() { return NOTIFIER.pollForNewSubmissions() }',
      'function weeklyHeartbeat() { return NOTIFIER.weeklyHeartbeat() }',
    ].join('\n'),
  },
})

copyFileSync('notifier/appsscript.json', `${OUT_DIR}/appsscript.json`)
console.log(`notifier: built ${OUT_DIR}/Code.js`)
