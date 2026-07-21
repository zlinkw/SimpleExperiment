const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const required = [
  "dist/runtime/cluster_agent.py",
  "dist/runtime/cluster_scheduler.py",
  "dist/templates/project-adapter",
];

for (const rel of required) {
  const target = path.join(root, rel);
  if (!fs.existsSync(target)) {
    throw new Error(`[agent-runtime] missing ${rel}`);
  }
  console.log(`[agent-runtime] kept ${rel}`);
}