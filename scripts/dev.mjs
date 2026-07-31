/**
 * Clean dev-server launcher.
 *
 * Problem this solves: on Windows, stopping `next dev` (Ctrl+C, closing the VS
 * Code terminal, a crash) sometimes leaves a `node` process still holding port
 * 3000. The next `next dev` then either fails with EADDRINUSE, or — worse — an
 * OLD server keeps serving STALE compiled routes while your edits never take
 * effect. That looks exactly like "generate/upload/send suddenly stopped
 * working" even though the code is fine.
 *
 * So before starting, we free port 3000, then launch Next on a guaranteed-clean
 * port. Cross-platform (Windows + macOS/Linux).
 *
 * Used by `npm run dev`.
 */
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const PORT = Number(process.env.PORT) || 3000;
const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function freePort(port) {
  const pids = new Set();

  if (process.platform === "win32") {
    const res = spawnSync("netstat", ["-ano", "-p", "tcp"], { encoding: "utf8" });
    for (const line of (res.stdout || "").split(/\r?\n/)) {
      if (!/LISTENING/i.test(line)) continue;
      const parts = line.trim().split(/\s+/);
      // Columns: Proto  Local-Address  Foreign-Address  State  PID
      // Match the LOCAL address (2nd column) ending in :<port>, e.g. 0.0.0.0:3000 or [::]:3000
      if (parts.length >= 5 && parts[1].endsWith(`:${port}`)) {
        pids.add(parts[parts.length - 1]);
      }
    }
    for (const pid of pids) {
      spawnSync("taskkill", ["/PID", pid, "/F", "/T"], { stdio: "ignore" });
      console.log(`[dev] freed port ${port} (stopped lingering PID ${pid})`);
    }
  } else {
    const res = spawnSync("bash", ["-lc", `lsof -ti tcp:${port} || true`], { encoding: "utf8" });
    for (const pid of (res.stdout || "").split(/\s+/).filter(Boolean)) pids.add(pid);
    for (const pid of pids) {
      spawnSync("kill", ["-9", pid], { stdio: "ignore" });
      console.log(`[dev] freed port ${port} (stopped lingering PID ${pid})`);
    }
  }

  if (pids.size === 0) console.log(`[dev] port ${port} is clear`);
}

freePort(PORT);

// Launch Next via its JS entrypoint with the current Node — avoids relying on
// the platform-specific `next` shell shim and matches how the app runs on E:.
const child = spawn(
  process.execPath,
  [join(projectRoot, "node_modules", "next", "dist", "bin", "next"), "dev", "-p", String(PORT)],
  { stdio: "inherit", cwd: projectRoot, env: process.env }
);

child.on("exit", (code) => process.exit(code ?? 0));
// Forward Ctrl+C so the child (and its pool) shut down cleanly.
for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => {
    if (!child.killed) child.kill(sig);
  });
}
