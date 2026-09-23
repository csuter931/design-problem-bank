// Apps Script has no module system, so the TypeScript is bundled into one flat
// file and the two trigger entry points are re-exposed as top-level globals.
import { build } from 'esbuild'
import { copyFileSync, mkdirSync, readFileSync } from 'node:fs'
import vm from 'node:vm'

const OUT_DIR = 'notifier/build'
const OUT_FILE = `${OUT_DIR}/Code.js`

// The two names Apps Script's trigger scheduler calls directly, and that the
// footer below re-exposes as top-level globals. If entry.ts ever renames one
// without updating this file, assertTriggersAreWired() below fails the build
// loudly — the alternative is a silently green build that only fails when a
// trigger actually fires in production.
const TRIGGER_NAMES = ['pollForNewSubmissions', 'weeklyHeartbeat']

mkdirSync(OUT_DIR, { recursive: true })

await build({
  entryPoints: ['notifier/src/entry.ts'],
  bundle: true,
  format: 'iife',
  globalName: 'NOTIFIER',
  target: 'es2020',
  outfile: OUT_FILE,
  legalComments: 'none',
  // Apps Script triggers call a bare function name, which the IIFE would
  // otherwise hide. esbuild appends the footer outside the wrapper, so these
  // two land at top level where the trigger scheduler can see them.
  footer: {
    js: TRIGGER_NAMES.map(name => `function ${name}() { return NOTIFIER.${name}() }`).join('\n'),
  },
})

assertTriggersAreWired()

copyFileSync('notifier/appsscript.json', `${OUT_DIR}/appsscript.json`)
console.log(`notifier: built ${OUT_FILE}`)

/**
 * Two checks, because either can fail independently of the other:
 *  - a textual check that the bundle still *references* NOTIFIER.<name>,
 *    which catches the footer and the export getting out of sync;
 *  - loading the bundle in a sandbox and checking it actually *defines*
 *    <name>() at top level and NOTIFIER.<name>() underneath, which catches a
 *    rename in entry.ts that the textual check alone would miss (the footer
 *    text would still "reference" the old name; it just wouldn't resolve).
 *
 * The sandbox only loads the bundle, it never calls a trigger function —
 * that would reach PropertiesService / UrlFetchApp / MailApp, none of which
 * exist outside Apps Script.
 */
function assertTriggersAreWired() {
  const code = readFileSync(OUT_FILE, 'utf8')

  for (const name of TRIGGER_NAMES) {
    if (!code.includes(`NOTIFIER.${name}`)) {
      throw new Error(
        `notifier build check failed: ${OUT_FILE} never references "NOTIFIER.${name}". ` +
        'Expected the footer to expose it as a top-level Apps Script trigger — check entry.ts and build.mjs.',
      )
    }
  }

  const sandbox = {}
  vm.runInNewContext(code, sandbox, { filename: OUT_FILE })

  for (const name of TRIGGER_NAMES) {
    if (typeof sandbox[name] !== 'function') {
      throw new Error(
        `notifier build check failed: ${OUT_FILE} does not define a top-level ${name}() function. ` +
        'Apps Script calls trigger functions by bare name, so this bundle would fail only when the ' +
        `trigger fires in production. Check that entry.ts still exports ${name} and that build.mjs's ` +
        'footer names match.',
      )
    }
    if (typeof sandbox.NOTIFIER?.[name] !== 'function') {
      throw new Error(
        `notifier build check failed: ${OUT_FILE}'s NOTIFIER global does not define ${name}(). ` +
        `The top-level ${name}() footer function calls through to it, so a rename in entry.ts breaks ` +
        `this silently until a trigger fires. Check entry.ts's exports.`,
      )
    }
  }

  console.log(`notifier: verified ${TRIGGER_NAMES.join(' and ')} are wired`)
}
