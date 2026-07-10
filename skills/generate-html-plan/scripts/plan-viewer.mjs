#!/usr/bin/env node
import { spawn } from "node:child_process";
import {
  existsSync,
  openSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";

const [action, supplied] = process.argv.slice(2);
if (!supplied || !["start", "status", "stop"].includes(action)) {
  throw new Error("Usage: plan-viewer.mjs <start|status|stop> <app>");
}

const app = resolve(supplied);
const pidPath = join(app, ".plan-viewer.pid");
const logPath = join(app, ".plan-viewer.log");

if (action === "start") {
  if (!existsSync(join(app, "package.json"))) {
    throw new Error(`Not a plan app: ${app}`);
  }
  if (existsSync(pidPath)) {
    throw new Error(
      `Viewer already recorded at PID ${readFileSync(pidPath, "utf8").trim()}; run status or stop.`,
    );
  }
  const child = spawn(
    "npm",
    ["run", "dev", "--", "--host", "127.0.0.1"],
    {
      cwd: app,
      detached: true,
      stdio: ["ignore", openSync(logPath, "w"), openSync(logPath, "a")],
    },
  );
  child.unref();
  writeFileSync(pidPath, `${child.pid}\n`);
  console.log(
    `Viewer started (PID ${child.pid}). Read ${logPath} for the loopback URL.`,
  );
} else if (!existsSync(pidPath)) {
  console.log("Viewer is not running.");
} else {
  const pid = Number(readFileSync(pidPath, "utf8"));
  try {
    process.kill(pid, 0);
    if (action === "status") {
      console.log(`Viewer PID ${pid} is running. Log: ${logPath}`);
    } else {
      process.kill(-pid, "SIGTERM");
      unlinkSync(pidPath);
      console.log(`Stopped viewer PID ${pid}.`);
    }
  } catch {
    console.log(`Viewer PID ${pid} is not running.`);
    if (action === "stop") unlinkSync(pidPath);
  }
}
