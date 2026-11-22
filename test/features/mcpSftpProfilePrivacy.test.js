const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),Module=require('node:module'),ts=require('typescript');
require('../_helpers/registerTsRequire');
const {createProjectAuthorization}=require('../../src/mcp/ProjectAuthorization.ts');
const companion=process.env.SIMPLE_TEST_SFTP_ROOT;
if(!companion||!path.isAbsolute(companion)||path.resolve(companion)!==companion)throw Error('SIMPLE_TEST_SFTP_ROOT must name the verified absolute companion source');
const pkg=JSON.parse(fs.readFileSync(path.join(companion,'package.json'),'utf8'));
if(pkg.name!=='simple-sftp'||pkg.version!=='0.2.120')throw Error('unexpected SimpleSFTP source identity');
const text=fs.readFileSync(path.join(companion,'extension.js'),'utf8'),ast=ts.createSourceFile('extension.js',text,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
const functions=new Map();let listMethod;
function visit(node){
 if(ts.isFunctionDeclaration(node)&&node.name)functions.set(node.name.text,node.getText(ast));
 if(ts.isPropertyAssignment(node)&&node.name.getText(ast)==='"servers.list"')listMethod=node.initializer.getText(ast);
 ts.forEachChild(node,visit);
}
visit(ast);
for(const name of ['firstNonEmpty','normalizeSshPort','publicServerRecord'])assert.ok(functions.has(name),name);
assert.match(listMethod,/data\.servers\.map\(publicServerRecord\)/);
const publicServerRecord=new Function([...['firstNonEmpty','normalizeSshPort','publicServerRecord'].map(name=>functions.get(name)),'return publicServerRecord;'].join('\n'))();
const root=fs.mkdtempSync(path.join(os.tmpdir(),'g004-sftp-profile-')),vscode={workspace:{workspaceFolders:[{uri:{fsPath:root}}]},window:{}};
const original=Module._load;let mcpGateway;
try{Module._load=function(id,...args){return id==='vscode'?vscode:original.call(this,id,...args)};({mcpGateway}=require('../../src/extension/McpHost.ts'))}finally{Module._load=original}

test('MCP server list preserves companion public fields without credentials',async()=>{
 const secret='fixture-credential-never-export',grant=createProjectAuthorization(root),calls=[];
 const originalProfile={id:'worker-1',label:'gpu',host:'host1',port:22,user:'user',remotePath:'/project',password:secret,token:secret,privateKey:secret};
 const host={context:{workspaceState:{get:()=>grant}},refreshSharedConnectionSettings(){},workerCodeSyncTargets:()=>[],createLocalApiMethods:()=>({}),
  readSimpleSftpCapabilities:async()=>({methods:['servers.list']}),
  simpleSftpApiCall:async method=>{calls.push(method);return {ok:true,activeServerId:'worker-1',servers:[publicServerRecord(originalProfile)]}}};
 const result=await mcpGateway(host).call('sftp_servers',{});
 assert.deepEqual(calls,['servers.list']);assert.equal(result.activeServerId,'worker-1');
 assert.equal(result.servers[0].id,'worker-1');assert.equal(result.servers[0].host,'host1');
 assert.ok(!JSON.stringify(result).includes(secret));
 for(const key of ['password','token','privateKey'])assert.ok(!Object.hasOwn(result.servers[0],key));
});
