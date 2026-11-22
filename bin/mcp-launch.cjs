#!/usr/bin/env node
"use strict";
// SIMPLEEX_STABLE_ENTRY_V1
const {spawn}=require('node:child_process');
const {resolveMcp}=require('./simpleex-mcp-resolver.cjs');
async function main(){
 const argv=process.argv.slice(2),controller=new AbortController();
 const cancel=()=>controller.abort(Error('MCP instance resolution cancelled'));
 process.once('SIGINT',cancel);process.once('SIGTERM',cancel);
 let entry;
 try{entry=await resolveMcp({argv,signal:controller.signal})}
 finally{process.removeListener('SIGINT',cancel);process.removeListener('SIGTERM',cancel)}
 const child=spawn(process.execPath,[entry,...argv],{stdio:'inherit',windowsHide:true});
 child.on('error',error=>{process.stderr.write(error.message+'\n');process.exitCode=1});
 child.on('close',code=>{process.exitCode=code===null?1:code});
}
if(require.main===module)main().catch(error=>{process.stderr.write(error.message+'\n');process.exitCode=1});
module.exports={main};
