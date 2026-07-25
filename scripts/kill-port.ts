import { execSync } from "node:child_process";

const port = Number(process.argv[2] || process.env.PORT || 3000);

function killPort(p: number) {
  if (process.platform === "win32") {
    try {
      const out = execSync(`netstat -ano | findstr :${p}`, { encoding: "utf8" });
      const pids = new Set<string>();
      for (const line of out.split(/\r?\n/)) {
        if (!line.includes("LISTENING")) continue;
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && /^\d+$/.test(pid) && pid !== "0") pids.add(pid);
      }
      for (const pid of pids) {
        try {
          execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore" });
          console.log(`Killed PID ${pid} on port ${p}`);
        } catch {
          // already gone
        }
      }
      if (pids.size === 0) console.log(`No listener on port ${p}`);
    } catch {
      console.log(`No listener on port ${p}`);
    }
    return;
  }

  try {
    execSync(`fuser -k ${p}/tcp`, { stdio: "ignore" });
    console.log(`Freed port ${p}`);
  } catch {
    console.log(`No listener on port ${p}`);
  }
}

killPort(port);
