import { builtInResultPresets } from "../../features/Results";
import { emit, usageError } from "./Support";
import { numericMetrics } from "./Metrics";
import { loadResults, selectResult } from "./Results";

const LOWER_IS_BETTER=/(?:^|_)(loss|error|mse|mae|perplexity)(?:_|$)/i;
export async function compareResults(leftId: string,rightId: string): Promise<number> {
  leftId=String(leftId||"").trim();rightId=String(rightId||"").trim();
  if(!leftId)throw usageError("missing first experiment id");
  if(!rightId)throw usageError("missing second experiment id");
  const rows=await loadResults(),leftRow=selectResult(rows,leftId),rightRow=selectResult(rows,rightId);
  const left=leftRow?numericMetrics(leftRow):{},right=rightRow?numericMetrics(rightRow):{};
  const difference:Record<string,{left:number;right:number;delta:number}>=Object.create(null),improvement:string[]=[],regression:string[]=[];
  const reason=!leftRow&&!rightRow?"no results recorded for either experiment":!leftRow?`no results recorded for ${leftId}`:
    !rightRow?`no results recorded for ${rightId}`:!Object.keys(left).length||!Object.keys(right).length?"no numeric metrics available for comparison":"";
  for(const key of Object.keys(left)){
    if(!Object.hasOwn(right,key))continue;
    const delta=Math.round((right[key]-left[key])*1e12)/1e12;difference[key]={left:left[key],right:right[key],delta};
    const directions=[leftRow,rightRow].map(row=>{const metric=row?.record.metrics?.[key];return metric?.higherIsBetter??(row?.record.primaryMetric===key?row.record.higherIsBetter:undefined)}).filter((value):value is boolean=>typeof value==="boolean");
    if(new Set(directions).size>1||delta===0)continue;
    const preset=builtInResultPresets.flatMap(item=>Object.entries(item.metricDirections||{})).find(([name])=>name.toLowerCase()===key.toLowerCase())?.[1];
    const higher=directions[0]??(preset?preset==="higher":LOWER_IS_BETTER.test(key)?false:undefined);
    if(higher===undefined)continue;
    const improved=higher?delta>0:delta<0;(improved?improvement:regression).push(key);
  }
  emit({left:leftId,right:rightId,metric_difference:difference,improvement,regression,reason});return 0;
}
