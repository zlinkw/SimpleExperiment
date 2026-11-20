const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { readSource } = require("../_helpers/sourceReader");

const root = path.join(__dirname, "../..");
const extension = readSource("src/extension.ts");
const panel = readSource("src/ui/PanelHtml.ts");
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));

test('remote root policy rejects invalid nonempty entries without changing workspace configuration', async () => {
  const ts=require('typescript'),vm=require('node:vm');
  const source=fs.readFileSync(path.join(root,'src/extension/legacy.ts'),'utf8');
  const ast=ts.createSourceFile('legacy.ts',source,ts.ScriptTarget.Latest,true);
  const cls=ast.statements.find(node=>ts.isClassDeclaration(node)&&node.name?.text==='RealtimeTunnelPanelProvider');
  const method=cls.members.find(node=>node.name?.getText(ast)==='saveRemoteRootPolicyFromUi').getText(ast);
  require('../_helpers/registerTsRequire');
  const api=require('../../src/features/ApiWorkflow.ts');
  const writes=[],notices=[]; let current=true;
  const folder={uri:{fsPath:'C:/fixture/project'}};
  const vscode={ConfigurationTarget:{WorkspaceFolder:3},workspace:{workspaceFolders:[folder],getConfiguration:(_section,uri)=>{
    assert.equal(uri,folder.uri);return {update:async(...args)=>writes.push(args)};}},
    window:{showInformationMessage:async text=>notices.push(text)}};
  const Host=vm.runInNewContext(ts.transpileModule(`class Host {${method}}; Host`,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,
    {vscode,ApiWorkflow_1:api,recordField:(message,key)=>message[key]});
  const h=new Host();Object.assign(h,{captureProjectContext:()=>({root:folder.uri.fsPath}),projectContextIsCurrent:()=>current,postState:()=>notices.push('state')});
  for(const invalid of ['/','relative/path','/safe/../escape']) {
    for(const key of ['allowedRoots','deniedRoots']) {
      writes.length=0;notices.length=0;
      await assert.rejects(h.saveRemoteRootPolicyFromUi({patch:{allowedRoots:'/safe',deniedRoots:'/blocked',[key]:invalid}}));
      assert.equal(writes.length,0,`${key}: ${invalid}`);assert.equal(notices.length,0);
    }
  }
  await h.saveRemoteRootPolicyFromUi({patch:{allowedRoots:' /safe//child/ \n\n',deniedRoots:'/blocked/'}});
  assert.equal(writes.length,2);assert.deepEqual(Array.from(writes[0][1]),['/safe/child']);assert.deepEqual(Array.from(writes[1][1]),['/blocked']);
  assert.ok(writes.every(row=>row[2]===3));assert.ok(notices.some(row=>String(row).includes('已保存')));
  writes.length=0;notices.length=0;current=false;
  await h.saveRemoteRootPolicyFromUi({patch:{allowedRoots:'',deniedRoots:''}});
  assert.equal(writes.length,2);assert.equal(notices.length,0);
  vscode.workspace.workspaceFolders=[];writes.length=0;
  await assert.rejects(h.saveRemoteRootPolicyFromUi({patch:{}}),/先打开/);assert.equal(writes.length,0);
  for(const policy of [{deniedRoots:['/']},{allowedRoots:['relative']},{deniedRoots:['/a/../b']},{deniedRoots:'/blocked'},{deniedRoots:[false]},{deniedRoots:[0]}]) {
    assert.throws(()=>api.resolveApiRemoteRootWithPolicy('/data/project',{},policy));
  }
  const configFunction=ast.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='remoteRootPolicyConfig').getText(ast);
  const readPolicy=vm.runInNewContext(`(${configFunction})`,{vscode:{workspace:{getConfiguration:()=>({get:key=>key==='remote.deniedRoots'?'/blocked':[]})}},stringArrayConfig:value=>Array.isArray(value)?value:[]});
  assert.throws(()=>api.resolveApiRemoteRootWithPolicy('/data/project',{},readPolicy()));
  assert.equal(api.resolveApiRemoteRootWithPolicy('/data/project',{}, {allowedRoots:['/data'],deniedRoots:[]}),'/data/project');
  assert.throws(()=>api.resolveApiRemoteRootWithPolicy('/data/private/job',{}, {allowedRoots:['/data'],deniedRoots:['/data/private']}),/禁止/);
  assert.throws(()=>api.resolveApiRemoteRootWithPolicy('/database/job',{}, {allowedRoots:['/data']}),/必须匹配/);
});

test("remote root policies are exposed in the plugin settings page", () => {
  assert.equal(packageJson.contributes.configuration.properties["simpleExperiment.remote.allowedRoots"].scope, "resource");
  assert.equal(packageJson.contributes.configuration.properties["simpleExperiment.remote.deniedRoots"].scope, "resource");
  assert.match(panel, /<div id="remoteRootPolicySettings" data-anchor="settings-remote-root-policy"><\/div>/);
  assert.match(panel, /function renderRemoteRootPolicySettings\(state\)/);
  assert.doesNotMatch(panel, /settingsLayoutTools"[^>]*>\s*<b>远端根目录安全边界/);
  assert.match(panel, /class="remoteRootPolicy"/);
  assert.match(panel, /class="remoteRootPolicyFields"/);
  assert.match(panel, /data-key="allowedRoots"/);
  assert.match(panel, /data-key="deniedRoots"/);
  assert.match(panel, /<button class="secondary" data-command="saveRemoteRootPolicy"[^>]*>保存<\/button>/);
  assert.match(panel, /textarea\.remoteRootPolicyInput \{ width: 100%; height: 100%; min-height: 0;/);
  assert.match(extension, /const remoteRootPolicy = remoteRootPolicyConfig\(\)/);
  assert.match(extension, /remoteRootPolicyRevision = sha256Text\(JSON\.stringify\(remoteRootPolicy\)\)/);
  assert.match(extension, /\n\s+remoteRootPolicy,/);
});

test("saving remote root policies writes the workspace configuration", () => {
  const start = extension.indexOf("async saveRemoteRootPolicyFromUi(message)");
  const end = extension.indexOf("async chooseResultCsvDirFromUi()", start);
  assert.ok(start >= 0 && end > start);
  const method = extension.slice(start, end);
  assert.match(method, /config\.update\("remote\.allowedRoots", allowedRoots, vscode\.ConfigurationTarget\.WorkspaceFolder\)/);
  assert.match(method, /config\.update\("remote\.deniedRoots", deniedRoots, vscode\.ConfigurationTarget\.WorkspaceFolder\)/);
  assert.match(method, /ApiWorkflow_1\.normalizeApiRemotePolicyRoot\(item\)/);
});
