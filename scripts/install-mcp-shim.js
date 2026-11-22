"use strict";
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const MARKER='SIMPLEEX_STABLE_ENTRY_V1';
function installMcpShim(destination){
 const root=fs.realpathSync(destination);if(!fs.statSync(root).isDirectory())throw Error('MCP destination must be an existing command directory');
 const files={
  'simpleex-mcp-launcher.cjs':fs.readFileSync(path.join(__dirname,'../bin/mcp-launch.cjs'),'utf8'),
  'simpleex-mcp-resolver.cjs':fs.readFileSync(path.join(__dirname,'../bin/simpleex-mcp-resolver.cjs'),'utf8'),
  'simpleex-mcp.cmd':'@echo off\r\nrem '+MARKER+'\r\nnode "%~dp0simpleex-mcp-launcher.cjs" %*\r\nexit /b %errorlevel%\r\n',
  'simpleex-mcp.ps1':'# '+MARKER+'\n& node (Join-Path $PSScriptRoot "simpleex-mcp-launcher.cjs") @args\nexit $LASTEXITCODE\n',
  'simpleex-mcp':'#!/bin/sh\n# '+MARKER+'\nexec node "$(dirname "$0")/simpleex-mcp-launcher.cjs" "$@"\n',
 };
 for(const [name] of Object.entries(files)){
  const file=path.join(root,name);if(!fs.existsSync(file))continue;
  const st=fs.lstatSync(file);if(!st.isFile()||st.isSymbolicLink())throw Error('Refusing linked/non-file MCP target: '+file);
  if(!fs.readFileSync(file,'utf8').includes(MARKER))throw Error('Refusing unrelated command: '+file);
 }
 for(const [name,text] of Object.entries(files)){const file=path.join(root,name);fs.writeFileSync(file,text,'utf8');if(process.platform!=='win32'&&name==='simpleex-mcp')fs.chmodSync(file,0o755)}
 return {destination:root,files:Object.keys(files),kind:MARKER};
}
function commandDirectory(){
 const result=process.platform==='win32'?execFileSync('cmd.exe',['/d','/s','/c','npm prefix -g'],{encoding:'utf8',windowsHide:true,timeout:10000}):execFileSync('npm',['prefix','-g'],{encoding:'utf8',windowsHide:true,timeout:10000});
 const prefix=result.trim();if(!path.isAbsolute(prefix))throw Error('Invalid npm global prefix');return process.platform==='win32'?prefix:path.join(prefix,'bin');
}
module.exports={installMcpShim,commandDirectory};
