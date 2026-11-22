import * as fs from "node:fs";
import * as path from "node:path";
import { buildExperimentMatrix, expandPlanMatrix, parsePlanSummary, stripYamlLineComment } from "../../features/PlanBuilder";
import { businessError, emit, queryContext, usageError } from "./Support";

export function planBuild(flags: {suite?:string;base?:string;seeds?:string}): number {
  const suite=flags.suite||"suite",baseConfig=flags.base||"config.yaml";
  const seeds=(flags.seeds===undefined?"1":flags.seeds).split(",").map(seed=>seed.trim());
  if(seeds.some(seed=>!/^[+-]?\d+$/.test(seed)))throw usageError("seeds must contain explicit integers");
  if(new Set(seeds.map(seed=>BigInt(seed).toString())).size!==seeds.length)throw usageError("seeds must not contain duplicates");
  const result=buildExperimentMatrix({suite,baseConfig,seeds,variables:[]});emit({suite,baseConfig,seeds,yaml:result.yaml});return 0;
}
export function planMatrix(fileArg:string): number {
  const file=path.isAbsolute(fileArg)?fileArg:path.resolve(queryContext().root,fileArg);
  if(!fs.existsSync(file))throw businessError(`plan file not found: ${fileArg}`);
  const yaml=fs.readFileSync(file,"utf8"),summary=parsePlanSummary(yaml);
  const empty=hasExplicitEmptyMatrix(yaml,/^(?:cases|experiments)[ \t]*:[ \t]*(.*)$/)||hasExplicitEmptyMatrix(yaml,/^seeds[ \t]*:[ \t]*(.*)$/);
  const result=expandPlanMatrix({variables:[...(summary.cases.length?[{key:"case",mode:"grid" as const,values:summary.cases}]:[]),
    ...(summary.seeds.length?[{key:"seed",mode:"grid" as const,values:summary.seeds}]:[])],namingRule:{pattern:"{suite}_{case}",sanitize:true}},[],summary.suite||"suite");
  emit({count:empty?0:Array.isArray(result.experiments)?result.experiments.length:0,suite:summary.suite,cases:summary.cases.length,seeds:summary.seeds.length,filteredCount:result.filteredCount||0});return 0;
}
function hasExplicitEmptyMatrix(yaml:string,key:RegExp):boolean {
  const lines=yaml.split(/\r?\n/);
  for(let i=0;i<lines.length;i++){
    const match=lines[i].match(key);if(!match)continue;
    const inline=stripYamlLineComment(match[1]).trim();if(inline)return /^(?:\[\s*\]|\{\s*\})$/.test(inline);
    for(const line of lines.slice(i+1)){const value=stripYamlLineComment(line);if(!value.trim())continue;return /^[ \t]+(?:\[\s*\]|\{\s*\})[ \t]*$/.test(value)}
    return false;
  }
  return false;
}
