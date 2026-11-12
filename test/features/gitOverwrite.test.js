const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {runGitBinary}=require('../../dist/project/BranchHeadBinding');
const {previewGitOverwrite,executeGitOverwrite,assertGitOverwriteCurrent}=require('../../dist/project/GitOverwrite');
async function git(root,args){const r=await runGitBinary(args,root);assert.equal(r.code,0,r.stderr);return r.stdout.toString('utf8').trim();}
async function fixture(){
 const parent=await fs.mkdtemp(path.join(os.tmpdir(),'git-overwrite-review-')),root=path.join(parent,'working'),remote=path.join(parent,'remote');
 await fs.mkdir(root);await fs.mkdir(remote);await git(remote,['init','-q','-b','master']);
 assert.equal(await fs.realpath(await git(remote,['rev-parse','--show-toplevel'])),await fs.realpath(remote));
 await git(remote,['config','user.name','acceptance']);await git(remote,['config','user.email','acceptance@example.invalid']);
 await fs.writeFile(path.join(remote,'keep.txt'),'original\n','utf8');await fs.writeFile(path.join(remote,'.gitignore'),'ignored.txt\n','utf8');
 await git(remote,['add','.']);await git(remote,['commit','-qm','initial']);await git(root,['clone','-q',remote,'.']);
 assert.equal(await fs.realpath(await git(root,['rev-parse','--show-toplevel'])),await fs.realpath(root));
 return {root:await fs.realpath(root),remote};
}
test('Git preview freezes precise paths, preserves ignored files, and rejects changed content even while status stays modified',async()=>{
 const {root,remote}=await fixture();await fs.writeFile(path.join(root,'keep.txt'),'local first\n','utf8');
 await fs.writeFile(path.join(root,'untracked.txt'),'local\n','utf8');await fs.writeFile(path.join(root,'ignored.txt'),'protected\n','utf8');
 const calls=[];const call=async(method,args)=>{calls.push({method,args});return {token:'preview',digest:'frozen',confirmations:0};};
 const p=await previewGitOverwrite(root,call);assert.deepEqual(p.writes,['keep.txt']);assert.deepEqual(p.deletes,['keep.txt','untracked.txt']);
 assert.equal(calls.length,1);assert.equal(calls[0].method,'files.cleanup.preview');assert.equal(calls[0].args.authorizationMode,'confirmed_paths');
 assert.deepEqual(calls[0].args.targets,[{relativePath:'keep.txt',type:'file'},{relativePath:'untracked.txt',type:'file'}]);
 await assert.rejects(executeGitOverwrite(p,call),/CONFIRM_REQUIRED/);assert.equal(await fs.readFile(path.join(root,'keep.txt'),'utf8'),'local first\n');
 await assert.rejects(executeGitOverwrite(p,async method=>method.endsWith('.status')?{digest:'frozen',confirmations:2}:{ok:true}),/GIT_OVERWRITE_DELETE_UNCONFIRMED/);
 assert.equal(await fs.readFile(path.join(root,'keep.txt'),'utf8'),'local first\n');
 await fs.writeFile(path.join(root,'keep.txt'),'local second\n','utf8');await assert.rejects(assertGitOverwriteCurrent(p),/GIT_OVERWRITE_CHANGED: keep.txt/);
 assert.equal(await fs.readFile(path.join(root,'ignored.txt'),'utf8'),'protected\n');assert.equal(await git(root,['rev-parse','HEAD']),await git(remote,['rev-parse','HEAD']));
});
test('Git overwrite writes only reviewed additions, updates index and exact branch, and never invokes hard reset or clean',async()=>{
 const {root,remote}=await fixture();await fs.writeFile(path.join(remote,'new.txt'),'from upstream\n','utf8');await git(remote,['add','new.txt']);await git(remote,['commit','-qm','new file']);
 const commands=[];const run=async(args,cwd,stdin)=>{commands.push(args);return runGitBinary(args,cwd,stdin);};
 const call=async()=>{throw Error('No deletion is needed for an upstream addition');};
 const p=await previewGitOverwrite(root,call,run);assert.deepEqual(p.writes,['new.txt']);assert.deepEqual(p.deletes,[]);
 await executeGitOverwrite(p,call,run);assert.equal((await fs.readFile(path.join(root,'new.txt'),'utf8')).replace(/\r\n/g,'\n'),'from upstream\n');
 assert.equal(await git(root,['rev-parse','HEAD']),p.target);assert.equal(await git(root,['status','--porcelain']),'');
 assert(!commands.some(args=>args.includes('--hard')||args[0]==='clean'));
});
test('Git review requires two ordered human phases and closing it does not execute',async()=>{
 const syncFs=require('node:fs'),Module=require('node:module'),vm=require('node:vm'),file=require.resolve('../../dist/extension/GitOverwriteReview');
 let receive,dispose;const replies=[],calls=[],exports={};const root='D:\\acceptance';
 const preview={root,branch:'refs/heads/master',upstream:'refs/remotes/origin/master',target:'a'.repeat(40),writes:['one.txt'],deletes:['one.txt'],indexChanges:['staged-only.txt'],cleanup:{token:'token',digest:'frozen'}};
 const row={token:'token',digest:'frozen',confirmations:0,targets:[{absolutePath:root+'/one.txt'}]};
 const panel={webview:{onDidReceiveMessage:fn=>{receive=fn;return{dispose(){}};},postMessage:async r=>replies.push(r)},onDidDispose:fn=>{dispose=fn;}};
 const vscode={ViewColumn:{Active:1},workspace:{workspaceFolders:[{uri:{fsPath:root}}]},window:{createWebviewPanel:()=>panel}};
 const project={previewGitOverwrite:async()=>preview,assertGitOverwriteCurrent:async()=>{},executeGitOverwrite:async()=>calls.push('execute')};
 new Function('require','exports',syncFs.readFileSync(file,'utf8'))(name=>name==='vscode'?vscode:name==='../project/GitOverwrite'?project:Module.createRequire(file)(name),exports);
 const pending=exports.reviewGitOverwrite(root,async(method,args)=>{calls.push(method);if(method.endsWith('.status'))return structuredClone(row);assert.equal(args.phase,row.confirmations+1);row.confirmations=args.phase;return{};});
 await new Promise(setImmediate);new vm.Script(/<script[^>]*>([\s\S]*?)<\/script>/.exec(panel.webview.html)[1]);
 assert(panel.webview.html.includes(root+'/one.txt'));await receive({type:'confirm',phase:2});assert.equal(calls.length,0);
 assert(panel.webview.html.includes(root+'/staged-only.txt'));
 await receive({type:'confirm',phase:1});assert(!calls.includes('execute'));await receive({type:'confirm',phase:1});assert.equal(row.confirmations,1);
 await receive({type:'confirm',phase:2});await pending;assert.equal(row.confirmations,2);assert.equal(calls.at(-1),'execute');
 const cancelled=exports.reviewGitOverwrite(root,async()=>{throw Error('must not mutate');});await new Promise(setImmediate);dispose();await assert.rejects(cancelled,/Git 覆盖已取消/);
});

test('Git preview includes staged-only changes even when working files already equal upstream',async()=>{
 const {root}=await fixture();await fs.writeFile(path.join(root,'keep.txt'),'staged content\n','utf8');await git(root,['add','keep.txt']);
 await fs.writeFile(path.join(root,'keep.txt'),'original\n','utf8');
 const p=await previewGitOverwrite(root,async()=>{throw Error('No working file deletion is needed');});
 assert.deepEqual(p.writes,[]);assert.deepEqual(p.deletes,[]);assert.deepEqual(p.indexChanges,['keep.txt']);
 await executeGitOverwrite(p,async()=>{throw Error('No deletion');});assert.equal(await git(root,['status','--porcelain']),'');
});
