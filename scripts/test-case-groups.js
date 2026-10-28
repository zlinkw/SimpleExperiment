const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const escape = name => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function expandCaseGroups(root, jobs, files = []) {
  const selected = new Set(files), names = new Map();
  return jobs.flatMap(job => {
    if (!selected.has(job.file)) return [job];
    if (!names.has(job.file)) {
      const source = ts.createSourceFile(job.file, fs.readFileSync(path.join(root, job.file), 'utf8'), ts.ScriptTarget.Latest, true);
      const titles = [];
      const visit = node => {
        if (ts.isCallExpression(node) && node.expression.getText(source) === 'test') {
          if (!ts.isExpressionStatement(node.parent) || node.parent.parent !== source || !node.arguments[0] || !ts.isStringLiteralLike(node.arguments[0])) throw Error('CASE_GROUP_DYNAMIC_NAME: ' + job.file);
          titles.push(node.arguments[0].text);
        }
        ts.forEachChild(node, visit);
      };
      visit(source);
      if (!titles.length || new Set(titles).size !== titles.length) throw Error('CASE_GROUP_NAMES_INVALID: ' + job.file);
      names.set(job.file, titles);
    }
    const retained = [];
    for (let i = 0; i < job.argv.length; i++) {
      const arg = job.argv[i];
      if (arg === '--test-timeout') { i++; continue; }
      if (arg === '--test' || arg === '--test-force-exit' || arg.startsWith('--test-timeout=')) continue;
      if (arg.startsWith('--test-name-pattern')) throw Error('CASE_GROUP_PATTERN_CONFLICT');
      retained.push(arg);
    }
    return names.get(job.file).map(title => ({ ...job, argv: ['--test', '--test-force-exit', '--test-timeout', '20000',
      '--test-name-pattern', '^' + escape(title) + '$', ...retained] }));
  });
}
module.exports = { expandCaseGroups };
