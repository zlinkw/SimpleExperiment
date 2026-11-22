const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '../..');

test('only the independent MCP connection launcher is published', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.deepEqual(pkg.bin, { 'simpleex-mcp': './bin/mcp-launch.cjs' });
  const launcher = fs.readFileSync(path.join(root, pkg.bin['simpleex-mcp']), 'utf8');
  assert.match(launcher, /require\(['"]\.\/simpleex-mcp-resolver\.cjs['"]\)/);
  assert.doesNotMatch(launcher, /require\(['"]\.\/simpleex\.cjs['"]\)/);
  const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
  const guide = fs.readFileSync(path.join(root, 'docs/mcp-integration.md'), 'utf8');
  assert.match(readme, /业务 CLI 入口已退役/);
  assert.doesNotMatch(readme, /simpleex run\b/);
  assert.doesNotMatch(guide, /simpleex run\b/);
  const historical = fs.readFileSync(path.join(root, 'docs/technical-notes.md'), 'utf8');
  assert.match(historical, /手动实验运行记录器（历史）[\s\S]{0,100}recorded-run 入口现已退役/);
});
