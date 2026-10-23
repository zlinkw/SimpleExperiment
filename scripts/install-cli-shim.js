"use strict";
const fs=require("node:fs"),path=require("node:path"),{execFileSync}=require("node:child_process");
const MARKER="SIMPLEEX_STABLE_ENTRY_V1";
function installCliShim(destination){
 const root=fs.realpathSync(destination);
 if(!fs.statSync(root).isDirectory())throw Error("CLI destination must be an existing command directory");
 const launcher=fs.readFileSync(path.join(__dirname,"../bin/simpleex.cjs"),"utf8");
 const files={
  "simpleex-launcher.cjs":launcher,
  "simpleex.cmd":'@echo off\r\nrem '+MARKER+'\r\nnode "%~dp0simpleex-launcher.cjs" %*\r\nexit /b %errorlevel%\r\n',
  "simpleex.ps1":'# '+MARKER+'\n& node (Join-Path $PSScriptRoot "simpleex-launcher.cjs") @args\nexit $LASTEXITCODE\n',
  "simpleex":'#!/bin/sh\n# '+MARKER+'\nexec node "$(dirname "$0")/simpleex-launcher.cjs" "$@"\n',
 };
 // Preflight every destination before touching any file; retain old npm package links.
 for(const name of Object.keys(files)){
  const file=path.join(root,name);
  if(fs.existsSync(file)){
   const st=fs.lstatSync(file);if(!st.isFile()||st.isSymbolicLink())throw Error("Refusing linked/non-file CLI target: "+file);
   const old=fs.readFileSync(file,"utf8");if(!old.includes(MARKER)&&!old.includes("simple-experiment/dist/cli.js")&&!old.includes("simple-experiment\\dist\\cli.js")&&!old.includes("simple-experiment/bin/simpleex.cjs"))throw Error("Refusing unrelated command: "+file);
  }
 }
 for(const [name,text]of Object.entries(files)){const file=path.join(root,name);fs.writeFileSync(file,text,"utf8");if(process.platform!=="win32"&&name==="simpleex")fs.chmodSync(file,0o755);}
 return {destination:root,files:Object.keys(files),kind:MARKER};
}
function commandDirectory(){
 const result=process.platform==="win32"?execFileSync("cmd.exe",["/d","/s","/c","npm prefix -g"],{encoding:"utf8",windowsHide:true,timeout:10000}):execFileSync("npm",["prefix","-g"],{encoding:"utf8",windowsHide:true,timeout:10000});
 const prefix=result.trim();if(!path.isAbsolute(prefix))throw Error("Invalid npm global prefix");
 return process.platform==="win32"?prefix:path.join(prefix,"bin");
}
if(require.main===module){try{console.log(JSON.stringify(installCliShim(process.argv[2]||commandDirectory())));}catch(e){console.error(e.message);process.exitCode=1;}}
module.exports={installCliShim,commandDirectory};
