const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "../..");
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const cli = fs.readFileSync(path.join(root, "src/cli.ts"), "utf8");
const runCli = fs.readFileSync(path.join(root, "src/runCli.ts"), "utf8");
const readme = fs.readFileSync(path.join(root, "README.md"), "utf8");

test("public CLI names use SimpleExperiment while legacy aliases remain", () => {
  assert.equal(packageJson.bin["simple-experiment"], "./dist/cli.js");
  assert.equal(packageJson.bin["simple-experiment-run"], "./dist/runCli.js");
  assert.equal(packageJson.bin["simple-experiment"], "./dist/cli.js");
  assert.equal(packageJson.bin["simple-experiment-run"], "./dist/runCli.js");
  assert.match(cli, /export function runRecordedCli\(argv: string\[\]\): number/);
  assert.match(cli, /if \(require\.main === module\)/);
  assert.match(runCli, /import \{ runRecordedCli \} from "\.\/cli"/);
  assert.match(runCli, /runRecordedCli\(process\.argv\.slice\(2\)\)/);
  assert.match(cli, /Usage: simple-experiment status/);
  assert.match(readme, /公开命令使用 `simple-experiment-run`/);
  assert.match(readme, /旧 `simple-experiment-run` 作为兼容别名继续可用/);
  assert.match(readme, /simple-experiment-run --name baseline/);
});
