// esbuild's entry point. The build footer turns these two exports into the
// top-level globals that Apps Script time-driven triggers can call by name.

import { appsScriptEnv } from './env.ts'
import { heartbeat, poll } from './main.ts'

export function pollForNewSubmissions(): void {
  poll(appsScriptEnv())
}

export function weeklyHeartbeat(): void {
  heartbeat(appsScriptEnv())
}
