// Missing-file race fixtures preserve bytes instead of permanently removing them.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), os = require('node:os');
module.exports = function retainFixtureTarget(scope, source) {
  scope = fs.realpathSync(scope); source = path.resolve(source);
  const temporary = fs.realpathSync(os.tmpdir());
  const inside = (root, file) => { const rel = path.relative(root, file); return rel && rel !== '..' && !rel.startsWith('..' + path.sep) && !path.isAbsolute(rel); };
  if (!inside(temporary, scope) || !inside(scope, source)) throw Error('FIXTURE_SCOPE_REQUIRED');
  const relative = path.relative(scope, source);
  if (relative.split(path.sep).some(x => ['.git', 'clean_dir'].includes(x))) throw Error('FIXTURE_PROTECTED_PATH');
  const inventory = target => {
    const info = fs.lstatSync(target);
    if (info.isSymbolicLink() || info.dev !== fs.statSync(scope).dev) throw Error('FIXTURE_LINK_OR_MOUNT');
    if (info.isDirectory()) return { type: 'directory', entries: fs.readdirSync(target).sort().map(name => [name, inventory(path.join(target, name))]) };
    if (!info.isFile() || info.nlink > 1) throw Error('FIXTURE_NOT_REGULAR');
    return { type: 'file', size: info.size, sha256: crypto.createHash('sha256').update(fs.readFileSync(target)).digest('hex') };
  };
  let current = scope;
  for (const part of relative.split(path.sep).slice(0, -1)) {
    current = path.join(current, part);
    if (fs.lstatSync(current).isSymbolicLink()) throw Error('FIXTURE_PARENT_LINK');
  }
  const before = inventory(source), destination = path.join(scope, 'clean_dir', relative);
  if (fs.existsSync(destination)) throw Error('FIXTURE_DESTINATION_EXISTS');
  current = scope;
  for (const part of path.relative(scope, path.dirname(destination)).split(path.sep)) {
    current = path.join(current, part);
    if (!fs.existsSync(current)) fs.mkdirSync(current);
    if (fs.lstatSync(current).isSymbolicLink()) throw Error('FIXTURE_DESTINATION_LINK');
  }
  const record = { source, destination, type: before.type, reason: 'simulate missing fixture input', discoveredAt: new Date().toISOString(), fingerprint: before };
  if (JSON.stringify(inventory(source)) !== JSON.stringify(before)) throw Error('FIXTURE_CHANGED');
  fs.renameSync(source, destination);
  if (fs.existsSync(source) || JSON.stringify(inventory(destination)) !== JSON.stringify(before)) throw Error('FIXTURE_MOVE_FAILED');
  fs.appendFileSync(path.join(scope, 'clean_dir', 'MANIFEST.md'), JSON.stringify(record) + '\n', 'utf8');
  return destination;
};
