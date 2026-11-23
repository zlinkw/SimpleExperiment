const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { readSource } = require("../_helpers/sourceReader");

const extension = readSource("src/extension.ts");
const panel = readSource("src/ui/PanelHtml.ts");

function restoreWorld(stem='demo') {
  const ts=require('typescript'),vm=require('node:vm');
  const source=fs.readFileSync(path.join(__dirname,'../../src/extension/legacy.ts'),'utf8');
  const ast=ts.createSourceFile('legacy.ts',source,ts.ScriptTarget.Latest,true);
  const cls=ast.statements.find(node=>ts.isClassDeclaration(node)&&node.name?.text==='RealtimeTunnelPanelProvider');
  const method=cls.members.find(node=>node.name?.getText(ast)==='restoreArchivedPlanFromUi').getText(ast);
  const names=['stringField','planDirSafe','safeWorkspacePlanPath','safeWorkspaceChildPath','existsAt',
    'nextAvailableVersionedPlanFile','safeArchiveBundleChildPath','archiveManifestFileList','safePlanToken','readPlanArchiveBundle','uniqueStrings'];
  const funcs=ast.statements.filter(node=>ts.isFunctionDeclaration(node)&&names.includes(node.name?.text));
  assert.equal(funcs.length,names.length);
  const root=path.resolve('C:/fixture/project'), archive='experiments/plans/_archived/old/plan.yaml';
  const sourceFile=path.join(root,archive), bundleDir=path.dirname(sourceFile), events=[], files=new Map();
  const oldPlan='output_dir: work_dirs/original\nresult_csv: tmp/result/original.csv\nconfig: model.yaml\n';
  files.set(sourceFile,oldPlan);
  files.set(path.join(bundleDir,'archive_manifest.json'),JSON.stringify({schemaVersion:5,originalPlanFile:`experiments/plans/${stem}.yaml`,configs:['model.yaml'],environment:[],parameters:{}}));
  files.set(path.join(bundleDir,'configs/model.yaml'),'model: original\n');
  const v1=path.join(root,`experiments/plans/_restored/${stem}__v1.yaml`); files.set(v1,'existing version');
  let current=true,answer='确认恢复独立版本', switchAt='', statFailure='';
  const memoryFs={constants:fs.constants,
    readFile:async file=>{if(!files.has(file))throw Object.assign(Error('missing'),{code:'ENOENT'});return files.get(file);},
    access:async file=>{if(!files.has(file))throw Object.assign(Error('missing'),{code:'ENOENT'});},
    stat:async file=>{if(file===statFailure)throw Object.assign(Error('access denied'),{code:'EACCES'});if(!files.has(file))throw Object.assign(Error('missing'),{code:'ENOENT'});return {isFile:()=>true};},
    lstat:async file=>{if(!files.has(file)&&![...files.keys()].some(name=>name.startsWith(file+path.sep)))throw Object.assign(Error('missing'),{code:'ENOENT'});return {isFile:()=>true};},
    mkdir:async file=>{events.push(['mkdir',file]);},
    copyFile:async (from,to,flags=0)=>{events.push(['copy',from,to]);if((flags&fs.constants.COPYFILE_EXCL)&&files.has(to))throw Object.assign(Error('already exists'),{code:'EEXIST'});files.set(to,files.get(from));if(switchAt==='copy')current=false;},
  };
  const vscode={workspace:{getConfiguration:()=>({get:(_key,fallback)=>fallback})},window:{
    showWarningMessage:async text=>{events.push(['confirm',text]);if(switchAt==='confirm')current=false;return answer;},
    showInformationMessage:async text=>events.push(['info',text]),
  }};
  const code=funcs.map(node=>node.getText(ast)).join('\n')+'\nclass Host {'+method+'}; Host';
  const Host=vm.runInNewContext(ts.transpileModule(code,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,{
    path,fs:memoryFs,vscode,PlanBuilder_1:require('../../dist/features/PlanBuilder'),
    restorePlanText:require('../../dist/features/PlanArchive').restorePlanText,
    atomicWriteText:async (file,text,options)=>{assert.equal(options?.noReplace,true);await options.beforeRename();if(files.has(file))throw Object.assign(Error('already exists'),{code:'EEXIST'});events.push(['write',file]);files.set(file,text);if(switchAt==='planWrite')current=false;},
    UiCommandCancelled:class UiCommandCancelled extends Error {},
  });
  const h=new Host(); Object.assign(h,{captureProjectContext:()=>({root}),projectContextIsCurrent:()=>current,
    refreshExperimentTracesProjectionForCurrentInterest(){},refreshLocalPlanMetadata:async()=>{events.push(['metadata']);if(switchAt==='metadata')current=false;},
    persistProjectPlanSelectionState:async()=>events.push(['persist',h.selectedPlanId]),postState:()=>events.push(['state'])});
  return {h,root,archive,sourceFile,bundleDir,v1,files,events,setAnswer:value=>answer=value,switchAt:value=>switchAt=value,failStat:value=>statFailure=value};
}

test('restore reports unreadable archived assets instead of treating them as missing',async()=>{
  const f=restoreWorld(); f.failStat(path.join(f.bundleDir,'configs/model.yaml'));
  await assert.rejects(f.h.restoreArchivedPlanFromUi({file:f.archive}),/access denied/);
  assert.equal(f.events.some(row=>row[0]==='write'),false);
  assert.equal(f.files.get(f.v1),'existing version');
});

test('restore uses a new version and actual restoration functions without changing the archive',async()=>{
  const f=restoreWorld(), archiveBefore=f.files.get(f.sourceFile);
  await f.h.restoreArchivedPlanFromUi({file:f.archive});
  const restored='experiments/plans/_restored/demo__v2.yaml', target=path.join(f.root,restored);
  assert.equal(f.files.get(f.v1),'existing version'); assert.equal(f.files.get(f.sourceFile),archiveBefore);
  assert.equal(f.h.selectedPlanId,restored); assert.equal(f.h.planFileInput,restored);
  const output=f.files.get(target); assert.match(output,/__restored_v2/); assert.match(output,/result scope: experiments\/plans\/_restored\/demo__v2\.yaml/);
  const recordPath=f.events.filter(row=>row[0]==='write').map(row=>row[1]).find(file=>file.includes('plan_restores'));
  const record=JSON.parse(f.files.get(recordPath));
  assert.equal(record.originalPlanFile,'experiments/plans/demo.yaml'); assert.equal(record.archivedPlanFile,f.archive);
  assert.equal(record.restoredPlanFile,restored); assert.equal(record.resultScopeFile,restored); assert.equal(record.outputNamespace,'__restored_v2');
  assert.equal(record.restoredConfigs.length,1); assert.match(record.restoredConfigs[0].restored,/^experiments\/restored_assets\//);
  assert.ok(output.includes(record.restoredConfigs[0].restored));
  assert.match(output,/work_dirs\/original\/__restored_v2/);
  assert.match(output,/tmp\/result\/original__restored_v2\.csv/);
  assert.equal(f.files.get(path.join(f.root,record.restoredConfigs[0].restored)),'model: original\n');
  assert.ok(f.events.some(row=>row[0]==='persist'&&row[1]===restored));
});

test('restore never overwrites pre-existing assets or restore records from another Plan',async()=>{
  for(const kind of ['asset','record']) {
    const f=restoreWorld(), token='experiments_plans__restored_demo__v2.yaml';
    const prior=kind==='asset'?path.join(f.root,'experiments/restored_assets',token,'configs/model.yaml'):
      path.join(f.root,'simple_cluster/plan_restores',token+'.json');
    f.files.set(prior,'other Plan data');
    await f.h.restoreArchivedPlanFromUi({file:f.archive});
    assert.equal(f.files.get(prior),'other Plan data');
    const recordPath=f.events.filter(row=>row[0]==='write').map(row=>row[1]).find(file=>file.includes('plan_restores'));
    assert.notEqual(recordPath,prior);
    const record=JSON.parse(f.files.get(recordPath));
    assert.ok(record.restoredConfigs[0].restored.includes(token+'_2/'));
    assert.ok(f.events.find(row=>row[0]==='confirm')[1].includes(token+'_2'));
    assert.equal(record.resultScopeFile,f.h.selectedPlanId);
  }
});

test('two long Plan names sharing the old truncated token keep independent assets and records',async()=>{
  const first='shared_very_long_plan_name_with_the_same_prefix_alpha', second='shared_very_long_plan_name_with_the_same_prefix_beta';
  const f=restoreWorld(first);
  await f.h.restoreArchivedPlanFromUi({file:f.archive});
  const firstSelected=f.h.selectedPlanId;
  const firstRecordPath=f.events.filter(row=>row[0]==='write').map(row=>row[1]).find(file=>file.includes('plan_restores'));
  const firstRecord=f.files.get(firstRecordPath), firstAsset=JSON.parse(firstRecord).restoredConfigs[0].restored;
  f.files.set(path.join(f.bundleDir,'archive_manifest.json'),JSON.stringify({schemaVersion:5,originalPlanFile:`experiments/plans/${second}.yaml`,configs:['model.yaml'],environment:[],parameters:{}}));
  f.events.length=0;await f.h.restoreArchivedPlanFromUi({file:f.archive});
  const secondRecordPath=f.events.filter(row=>row[0]==='write').map(row=>row[1]).find(file=>file.includes('plan_restores'));
  const secondRecord=JSON.parse(f.files.get(secondRecordPath));
  assert.notEqual(firstSelected,f.h.selectedPlanId);assert.notEqual(firstRecordPath,secondRecordPath);
  assert.equal(f.files.get(firstRecordPath),firstRecord);assert.equal(f.files.get(path.join(f.root,firstAsset)),'model: original\n');
  assert.notEqual(firstAsset,secondRecord.restoredConfigs[0].restored);
  assert.equal(secondRecord.resultScopeFile,f.h.selectedPlanId);
  assert.ok(f.events.find(row=>row[0]==='confirm')[1].includes(path.posix.dirname(path.posix.dirname(secondRecord.restoredConfigs[0].restored))));
});

test('restore cancellation and workspace changes stop subsequent writes and selection persistence',async()=>{
  for(const stage of ['cancel','confirm','copy','planWrite','metadata']) {
    const f=restoreWorld(); if(stage==='cancel')f.setAnswer(undefined);else f.switchAt(stage);
    await assert.rejects(f.h.restoreArchivedPlanFromUi({file:f.archive}),/已取消|工作区已切换/);
    const effects=f.events.filter(row=>['mkdir','copy','write','persist'].includes(row[0]));
    if(stage==='cancel'||stage==='confirm')assert.equal(effects.length,0,stage);
    if(stage==='copy')assert.deepEqual(effects.map(row=>row[0]),['mkdir','copy']);
    if(stage==='planWrite')assert.equal(effects.filter(row=>row[0]==='write').length,1);
    assert.equal(effects.some(row=>row[0]==='persist'),false,stage);
    assert.equal(f.files.get(f.v1),'existing version');
  }
});

test("archived plan restore creates an isolated version with isolated configs and result scope", () => {
  assert.match(extension, /case "restoreArchivedPlan":/);
  assert.match(extension, /async restoreArchivedPlanFromUi\(message\)/);
  assert.match(extension, /path\.basename\(source\)\.toLowerCase\(\) !== "plan\.yaml"/);
  assert.match(extension, /readPlanArchiveBundle\(source\)/);
  assert.match(extension, /nextAvailableVersionedPlanFile\(path\.join\(planRoot, "_restored", path\.dirname\(originalRelative\)\), parsed\.name, parsed\.ext\)/);
  assert.match(extension, /safeArchiveBundleChildPath\(path\.join\(bundleDir, "configs"\), relative\)/);
  assert.match(extension, /path\.posix\.join\(restoredAssetRoot, "configs", relative\)/);
  assert.match(extension, /resultScopeFile: restoredFile/);
  assert.match(extension, /restorePlanText\(planText, \{ originalPlanFile, archivedPlanFile: file, restoredFile, planVersion, configPathMap, restoredEnvironmentDir, restoredParameterDir \}\)/);
  assert.match(extension, /const projectContext = this\.captureProjectContext\(\)/);
  assert.match(extension, /工作区已切换，归档 Plan 恢复已取消/);
  assert.match(extension, /await this\.persistProjectPlanSelectionState\(\)/);
  assert.match(extension, /自动切换到 Plan 工作台/);
});
