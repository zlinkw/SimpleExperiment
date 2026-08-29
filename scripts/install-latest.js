const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
const vsix = path.join(__dirname, `../simple-experiment-${pkg.version}.vsix`);
if (!fs.existsSync(vsix)) {
  console.error(`[install-latest] vsix not found: ${vsix}`);
  process.exit(1);
}
console.log(`[install-latest] installing ${vsix} ...`);
try {
  execSync(`code --install-extension "${vsix}" --force`, { stdio: 'inherit' });
  console.log(`[install-latest] installed ${pkg.version} successfully`);
} catch (e) {
  console.error('[install-latest] failed', e.message);
  process.exit(1);
}
