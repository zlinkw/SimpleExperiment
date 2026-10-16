const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");

const { RequestBudget, defaultRequestBudgetConfig } = require("../../dist/tunnel/RequestBudget.js");
const { FileTransferClient } = require("../../dist/tunnel/FileTransferClient.js");

test("file upload reports progress", async () => {
  const server = http.createServer((req, res) => {
    req.resume();
    req.on("end", () => {
      res.setHeader("Content-Type", "application/json");
      if (req.url === "/api/files/upload-init") return res.end(JSON.stringify({ transferId: "progress", chunkSize: 2, accepted: true, resumeFromByte: 0 }));
      if (req.url.startsWith("/api/files/upload-chunk")) return res.end(JSON.stringify({ nextOffset: Number(new URL(req.url, "http://localhost").searchParams.get("offset") || 0) + 2 }));
      if (req.url === "/api/files/upload-complete") return res.end(JSON.stringify({ status: "completed", sha256: crypto.createHash("sha256").update("abcdef").digest("hex") }));
      res.end(JSON.stringify({ ok: true }));
    });
  });
  await listen(server);
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "simple-progress-"));
  const local = path.join(dir, "in.txt");
  await fs.writeFile(local, "abcdef", "utf8");
  const progress = [];
  const client = new FileTransferClient({ localHost: "127.0.0.1", localPort: server.address().port, chunkSizeBytes: 2 }, new RequestBudget({ ...defaultRequestBudgetConfig, minIntervalByPurpose: {} }), (event) => progress.push(event));
  try {
    await client.uploadFile(local, "paper/tables/in.txt");
    assert.deepEqual(progress.map((item) => item.transferredBytes), [2, 4, 6]);
  } finally {
    await client.dispose();
    await new Promise((resolve) => server.close(resolve));
  }
});

function listen(server) { return new Promise((resolve) => server.listen(0, "127.0.0.1", resolve)); }

test('silent file IO reports a stall but waits for real writes and a matching final SHA',async()=>{
 const progressModule=require('../../dist/core/ProgressInactivity'),Original=progressModule.ProgressInactivity;
 let now=0,watch,posts=0;const reports=[];
 progressModule.ProgressInactivity=class extends Original{constructor(ms,onIdle,_clock,notifyOnly){super(ms,onIdle,()=>now,notifyOnly);watch=this;}};
 const savedFetch=global.fetch;global.fetch=async()=>{throw Error('native fetch headers timeout');};
 const server=http.createServer((req,res)=>{
  req.resume();req.on('end',()=>{
   posts++;res.setHeader('Content-Type','application/json');
   if(req.url==='/api/files/upload-init'){
    now=120001;assert.equal(watch.check(),true);
    assert.equal(reports.at(-1).stalled,true);assert.equal(reports.at(-1).transferredBytes,0);
    now=120010;return res.end(JSON.stringify({transferId:'slow',chunkSize:2,accepted:true,resumeFromByte:0}));
   }
   if(req.url.startsWith('/api/files/upload-chunk'))return res.end(JSON.stringify({nextOffset:2}));
   return res.end(JSON.stringify({status:'completed',sha256:crypto.createHash('sha256').update('ok').digest('hex')}));
  });
 });
 await listen(server);const dir=await fs.mkdtemp(path.join(os.tmpdir(),'simple-slow-file-')),file=path.join(dir,'file.txt');await fs.writeFile(file,'ok','utf8');
 const client=new FileTransferClient({localHost:'127.0.0.1',localPort:server.address().port},new RequestBudget({...defaultRequestBudgetConfig,minIntervalByPurpose:{}}),row=>reports.push(row));
 try{const result=await client.uploadFile(file,'outputs/file.txt');assert.equal(result.status,'completed');assert.equal(posts,3);assert.equal(reports.at(-1).transferredBytes,2);assert.equal(reports.at(-1).stalled,undefined);}
 finally{global.fetch=savedFetch;progressModule.ProgressInactivity=Original;await client.dispose();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
