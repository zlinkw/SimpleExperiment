import * as fs from "node:fs";
import * as path from "node:path";
import { businessError, queryContext } from "./Support";

export const EXPERIMENT_INDEX_REL=path.join("simple_cluster","experiment_index.json");
export const RUNS_DIR=path.join("experiments","runs");
export function projectRoot():string{return queryContext().root}
export function resolveProjectPath(...parts:string[]):string{return path.resolve(projectRoot(),...parts)}
export function checkedProjectPath(candidate:string,code:string):string{
  const root=path.resolve(projectRoot()),absolute=path.resolve(root,candidate);
  const inside=(base:string,target:string)=>{const rel=path.relative(base,target);return rel!==".."&&!rel.startsWith(".."+path.sep)&&!path.isAbsolute(rel)};
  if(!inside(root,absolute))throw businessError(code+": "+candidate);
  const physicalRoot=fs.realpathSync(root);let current=root;
  for(const part of path.relative(root,absolute).split(path.sep).filter(Boolean)){
    current=path.join(current,part);
    try{fs.lstatSync(current)}catch(error){if((error as NodeJS.ErrnoException).code==="ENOENT")break;throw error}
    if(!inside(physicalRoot,fs.realpathSync(current)))throw businessError(code+": "+candidate);
  }
  return absolute;
}
export function readJsonFile<T>(file:string,fallback:T):T{
  if(!fs.existsSync(file))return fallback;
  try{return JSON.parse(fs.readFileSync(file,"utf8")) as T}catch{return fallback}
}
export function readTextFile(file:string):string{return fs.readFileSync(file,"utf8")}
export function fileExists(file:string):boolean{try{return fs.existsSync(file)}catch{return false}}
export function listFilesRecursive(dir:string,matcher:(name:string)=>boolean,depth=3):string[]{
  if(!fileExists(dir)||depth<0)return [];
  const out:string[]=[];
  for(const name of fs.readdirSync(dir)){
    const full=path.join(dir,name);let stat:fs.Stats;
    try{stat=fs.statSync(full)}catch{continue}
    if(stat.isDirectory())out.push(...listFilesRecursive(full,matcher,depth-1));else if(matcher(name))out.push(full);
  }
  return out;
}
export function readTail(file:string,maxLines=20):string{
  if(!fileExists(file))return "";
  const lines=fs.readFileSync(file,"utf8").replace(/\r\n/g,"\n").split("\n");return lines.slice(Math.max(0,lines.length-maxLines)).join("\n");
}
