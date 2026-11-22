"use strict";
// SIMPLEEX_STABLE_ENTRY_V1
const fs=require("node:fs"),path=require("node:path"),os=require("node:os");

function option(argv,name){
 const values=[];
 for(let i=0;i<argv.length;i++){
  if(argv[i]===name){const value=argv[++i];if(!value||value.startsWith('--'))throw Error(name+' requires a value');values.push(value)}
  else if(argv[i].startsWith(name+'='))values.push(argv[i].slice(name.length+1));
 }
 if(values.length>1||values.some(value=>!value))throw Error('Invalid or repeated '+name);
 return values[0]||'';
}
function installations(root){
 const prefix='simple-local.simple-experiment-';
 return fs.readdirSync(root).filter(name=>name.startsWith(prefix)).flatMap(name=>{
  const dir=path.join(root,name),st=fs.lstatSync(dir);if(!st.isDirectory()||st.isSymbolicLink())return [];
  try{const pkg=JSON.parse(fs.readFileSync(path.join(dir,'package.json'),'utf8'));
   if(pkg.name!=='simple-experiment'||pkg.publisher!=='simple-local'||!/^\d+\.\d+\.\d+$/.test(pkg.version)||!(name===prefix+pkg.version||name.startsWith(prefix+pkg.version+'-')))return [];
   return [{dir,version:pkg.version}];
  }catch{return []}
 }).sort((a,b)=>{const x=a.version.split('.').map(Number),y=b.version.split('.').map(Number);return y[0]-x[0]||y[1]-x[1]||y[2]-x[2]});
}
function inside(row,relative){
 const pkg=JSON.parse(fs.readFileSync(path.join(row.dir,'package.json'),'utf8'));
 if(pkg.name!=='simple-experiment'||pkg.publisher!=='simple-local'||pkg.version!==row.version)throw Error('Installed MCP identity changed');
 const base=fs.realpathSync(row.dir),file=fs.realpathSync(path.join(row.dir,relative));
 if(!file.startsWith(base+path.sep)||!fs.statSync(file).isFile())throw Error('Invalid installed MCP entry');
 return file;
}
async function resolveMcp(options={}){
 const argv=options.argv||[],workspace=option(argv,'--workspace').trim(),pin=(option(argv,'--instance')||process.env.SIMPLE_CLI_INSTANCE_ID||'').trim();
 if(!workspace||!path.isAbsolute(workspace))throw Error('MCP_WORKSPACE_REQUIRED: pass --workspace ABSOLUTE_PROJECT_PATH');
 const root=options.extensionsRoot||process.env.SIMPLE_CLI_EXTENSIONS_ROOT||path.join(os.homedir(),'.vscode','extensions');
 const rows=installations(root);if(!rows.length||rows.filter(row=>row.version===rows[0].version).length!==1)throw Error('Expected exactly one newest installed SimpleExperiment');
 const helper=options.helper||require(inside(rows[0],path.join('dist','api','LocalApiClient.js')));
 const signal=AbortSignal.any([options.signal,AbortSignal.timeout(30000)].filter(Boolean));signal.throwIfAborted();
 const discoveryFile=options.discoveryFile||process.env.SIMPLE_EXPERIMENT_API_FILE||
  (await helper.resolveInstanceByWorkspace('experiment',workspace,pin||undefined,{signal,onProgress:options.onProgress})).discoveryPath;
 const selected=await helper.preflightPluginAt('experiment',discoveryFile,workspace,signal);helper.assertInstancePin(pin||undefined,selected);signal.throwIfAborted();
 const fresh=helper.readLocalDiscovery(discoveryFile);
 for(const key of ['baseUrl','token','pid','startedAt','version','name'])if(fresh[key]!==selected.discovery[key])throw Error('Discovery changed during MCP resolution');
 const version=String(selected.capabilities.version||''),matching=installations(root).filter(row=>row.version===version);
 if(matching.length!==1)throw Error('Expected exactly one installed MCP server matching the running plugin '+version);
 return inside(matching[0],path.join('dist','mcp','server.cjs'));
}
module.exports={resolveMcp};
