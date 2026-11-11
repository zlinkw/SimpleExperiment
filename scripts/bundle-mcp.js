"use strict";
const fs = require("node:fs"), path = require("node:path");
const root = path.resolve(__dirname, "..");
const result = require("esbuild").buildSync({
  entryPoints: [path.join(root, "src/mcp/Server.ts")], outfile: path.join(root, "dist/mcp/server.cjs"),
  bundle: true, platform: "node", target: "node22", format: "cjs", metafile: true,
  legalComments: "inline", minify: false,
});
const packages = new Set();
for (const input of Object.keys(result.metafile.inputs)) {
  if (!input.includes("node_modules/")) continue;
  let directory = path.dirname(path.resolve(root, input));
  while (directory.startsWith(path.join(root, "node_modules") + path.sep)) {
    if (fs.existsSync(path.join(directory, "package.json"))) { packages.add(directory); break; }
    directory = path.dirname(directory);
  }
}
const notices = [...packages].sort().map(directory => {
  const pkg = JSON.parse(fs.readFileSync(path.join(directory, "package.json"), "utf8"));
  const licenses = fs.readdirSync(directory).filter(name => /^(license|licence|copying|notice)(\.|$)/i.test(name));
  return [pkg.name + " " + pkg.version + " (" + pkg.license + ")", ...licenses.map(name => fs.readFileSync(path.join(directory, name), "utf8"))].join("\n");
});
fs.writeFileSync(path.join(root, "dist/mcp/THIRD-PARTY-NOTICES.txt"), notices.join("\n\n"), "utf8");
process.stdout.write(`MCP bundled with ${packages.size} dependency notices.\n`);
