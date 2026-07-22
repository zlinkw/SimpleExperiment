const fs = require("fs");
const crypto = require("crypto");
const path = require("path");

const root = path.resolve(__dirname, "..");
const runtimes = [
  ["dist/clusterAgentRuntime.js", "CLUSTER_AGENT_RUNTIME", "dist/runtime/cluster_agent.py", "#!/usr/bin/env python3\n"],
  ["dist/clusterSchedulerRuntime.js", "CLUSTER_SCHEDULER_RUNTIME", "dist/runtime/cluster_scheduler.py", "from __future__ import annotations\n"],
];

for (const [modulePath, exportName, targetPath, expectedPrefix] of runtimes) {
  const sourceModule = require(path.join(root, modulePath));
  const content = sourceModule[exportName];
  if (typeof content !== "string" || !content.startsWith(expectedPrefix)) {
    throw new Error(`[agent-runtime] invalid ${exportName} from ${modulePath}`);
  }
  const target = path.join(root, targetPath);
  const previous = fs.existsSync(target) ? fs.readFileSync(target, "utf8") : "";
  if (previous === content) {
    console.log(`[agent-runtime] kept ${targetPath}`);
  } else {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content, "utf8");
    console.log(`[agent-runtime] wrote ${targetPath}`);
  }
  const checksumTarget = `${target}.sha256`;
  if (fs.existsSync(checksumTarget)) {
    const checksum = `${crypto.createHash("sha256").update(content).digest("hex")}  ${path.basename(target)}\n`;
    if (fs.readFileSync(checksumTarget, "utf8") !== checksum) {
      fs.writeFileSync(checksumTarget, checksum, "utf8");
      console.log(`[agent-runtime] wrote ${path.relative(root, checksumTarget)}`);
    }
  }
}

const templates = path.join(root, "dist/templates/project-adapter");
if (!fs.existsSync(templates)) {
  throw new Error("[agent-runtime] missing dist/templates/project-adapter");
}
console.log("[agent-runtime] kept dist/templates/project-adapter");
