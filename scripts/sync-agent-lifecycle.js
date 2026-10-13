// Explicit vendor refresh; build never reaches into another checkout.
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(process.argv[2], 'utf8').replace(/\r\n/g,'\n');
const body = source.slice(0, source.indexOf('\nif __name__ == "__main__":')).trimEnd()+'\n';
if (body.includes('`') || body.includes('${') || !body.includes('def lifecycle_control')) throw new Error('Invalid lifecycle source');
fs.writeFileSync(path.join(__dirname,'../src/runtime/AgentLifecycle.ts'),'// Vendored from SimpleSFTP agent-lifecycle.py; protocol 1. Keep parity regression.\nexport const AGENT_LIFECYCLE_PYTHON = String.raw`'+body+'`;\n','utf8');
