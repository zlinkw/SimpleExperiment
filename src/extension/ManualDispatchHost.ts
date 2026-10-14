import * as vscode from "vscode";
import { randomUUID } from "node:crypto";
import { dispatchManualJobs, dispatchReadyManualJobs, ManualDispatchRequest, ManualDispatchPorts } from "../features/ManualJobDispatch";
import { stopPulledTask } from "../features/PulledTaskControl";

export class ManualDispatchHost {
  private gpuSnapshot: any;
  constructor(private readonly host: any, private readonly root: string) {}
  ports(): ManualDispatchPorts {
    const h=this.host, client=h.client, stopEpoch=h.distributedPlanStopEpoch;
    return {
      load:()=>h.loadDistributedQueue(this.root), save:async q=>{await h.saveDistributedQueue(this.root,q);h.postState();},
      assertCurrent:()=>{if(h.client!==client||vscode.workspace.workspaceFolders?.[0]?.uri.fsPath!==this.root||h.distributedPlanStopEpoch!==stopEpoch)throw Error("项目、连接或停止请求已变化，未继续派发。");},
      online:id=>h.enabledWorkerConfigs().some((w:any)=>w.id===id)&&h.lastWorkerProbes?.[id]?.status==="ok",
      supports:id=>h.lastWorkerProbes?.[id]?.capabilities?.endpoints?.manualDispatch===1,
      newCommandId:()=>randomUUID().replace(/-/g,""),
      prepare:async plan=>{
        h.assertExecutionWorkersReady();h.assertExecutionAgentProjectsReady({options:{workers:h.workerActionTargets()}});
        const gpu=this.gpuSnapshot||await client.getGpu({userInitiated:true});
        for(const j of plan.jobs.filter(j=>j.manualDispatch?.stage==="preparing")){
          const p=j.manualDispatch!,rows=Array.isArray(gpu[p.workerId])?gpu[p.workerId]:[];
          if(!rows.some((r:any)=>String(r.index??r.gpu_id??r.gpuId??r.id)===p.gpuId))throw Error("目标 GPU 不可见："+p.workerId+" · GPU "+p.gpuId+"；未停止原任务或审核产物。");
        }
        await h.ensureCodeReadyForRun(h.captureProjectContext(),[]);
        if(h.lastCodeSyncState?.fingerprint!==plan.codeFingerprint)throw Error("代码已偏离当前 PLAN，请重新校验和预演当前声明。");
        for(const w of h.enabledWorkerConfigs())h.lastWorkerTaskSnapshots.set(this.root+"\u0000"+w.id,await client.getWorkerTasks(w.id));
      },
      stop:async(p,j)=>{await stopPulledTask(client,p,j,randomUUID().replace(/-/g,""));},
      review:(p,j)=>this.review(p,j),send:(p,j)=>h.sendDistributedJob(p,j,j.workerId,j.gpuId,j.commandId),
      tick:()=>dispatchReadyManualJobs(this.ports()),
    };
  }
  async dispatch(params:any,fromUi=false){
    const h=this.host;
    if(!fromUi&&params.confirm!==true)throw Error("CONFIRM_REQUIRED：请确认所选 job、服务器和 GPU。");
    const workflowId=String(params.workflowId||params.planId||""),indices=Array.isArray(params.indices)?params.indices:[params.jobIndex];
    let workerId=String(params.workerId||""),gpuId=params.gpuId===undefined?"":String(params.gpuId);
    if(fromUi&&!workerId){
      const saved=await h.loadDistributedQueue(this.root),plan=saved.plans.find((p:any)=>p.id===workflowId);
      const placements=indices.map((i:number)=>plan?.jobs.find((j:any)=>j.index===i)?.manualDispatch);
      const first=placements[0];
      if(first?.stage==="preparing"&&placements.every((p:any)=>p?.workerId===first.workerId&&p?.gpuId===first.gpuId)){
        workerId=first.workerId;gpuId=first.gpuId;
      }
    }
    if(fromUi&&!workerId){
      const picked=await vscode.window.showQuickPick<any>(h.enabledWorkerConfigs().map((w:any)=>({label:w.displayName||w.id,description:w.id+(h.lastWorkerProbes?.[w.id]?.status==="ok"?" · 已连接":" · 未连接"),id:w.id})),{title:"手动派发：选择服务器",ignoreFocusOut:true});
      if(!picked)return {status:"cancelled"};workerId=picked.id;
    }
    if(!h.enabledWorkerConfigs().some((w:any)=>w.id===workerId))throw Error("目标 Worker 未启用或不存在："+workerId);
    if(fromUi&&!gpuId){
      let snapshot=h.client.currentState?.().gpu||h.lastRealtimeState?.gpu||{};
      try{snapshot=await h.client.getGpu({userInitiated:true});this.gpuSnapshot=snapshot;}catch{}
      const rows=Array.isArray(snapshot[workerId])?snapshot[workerId]:[];
      const tasks=h.lastWorkerTaskSnapshots?.get(this.root+"\u0000"+workerId)?.tasks||[];
      const picked=await vscode.window.showQuickPick<any>(rows.map((r:any)=>({label:"GPU "+String(r.index??r.gpu_id??r.gpuId??r.id),id:String(r.index??r.gpu_id??r.gpuId??r.id),
        description:String(r.name||"")+" · 显存 "+String(r.memoryUsedMb??r.memoryUsed??r.memory_used_mb??"?")+"/"+String(r.memoryTotalMb??r.memoryTotal??r.memory_total_mb??"?")+" MB · 利用率 "+String(r.utilizationPercent??r.utilization??r.utilization_gpu??"?")+"% · 任务 "+tasks.filter((t:any)=>!['completed','failed','cancelled'].includes(t.status)&&String(t.gpuId??t.observation?.tmux?.gpuId??"")===String(r.index??r.gpu_id??r.gpuId??r.id)).length})),{title:"选择 GPU（忙卡可用，允许多个 job 同时运行）",ignoreFocusOut:true});
      if(!picked)return {status:"cancelled"};gpuId=picked.id;
    }
    const key=this.root+"\0"+workflowId;if(h.manualDispatchInFlight.has(key))throw Error("这批任务正在处理，请勿重复点击。");
    h.manualDispatchInFlight.add(key);
    try{if(h.distributedQueueTickPromise)await h.distributedQueueTickPromise;return await dispatchManualJobs(this.ports(),{workflowId,indices,workerId,gpuId,expectedCommands:params.expectedCommands,stopRunning:fromUi||params.stopRunning===true} as ManualDispatchRequest);}
    finally{h.manualDispatchInFlight.delete(key);h.postState();void h.tickDistributedQueue();}
  }
  async review(plan:any,jobs:any[]){
    const h=this.host,c=h.planCleanupHost(),ids=["local",...h.enabledWorkerConfigs().map((w:any)=>w.id)];
    const exactPaths=ids.flatMap(nodeId=>jobs.flatMap(j=>[{nodeId,relativePath:j.outputDir,type:"directory"},...(j.collectionResultCsv&&!j.collectionResultCsv.startsWith(j.outputDir+"/")?[{nodeId,relativePath:j.collectionResultCsv,type:"file"}]:[])]));
    const p=await c.service.preview({planFile:plan.planFile,action:"delete",authorizationMode:"confirmed_paths",exactPaths});
    if(p.blockers.length)throw Error(p.blockers.map((r:any)=>r.nodeId+"："+r.code+" "+r.detail).join("\n"));
    const rows=p.rows.filter((r:any)=>r.disposition==="delete");if(!rows.length)return true;
    const detail=rows.map((r:any)=>r.nodeId+" "+(r.node.kind==="remote"?r.node.user+"@"+r.node.host+":"+r.node.port:"本机")+"\n"+r.absolutePath).join("\n\n");
    await vscode.window.showTextDocument(await vscode.workspace.openTextDocument({language:"markdown",content:"# 重新执行前审核已有文件\n\n仅处理任务输出和独立指标；保留 PLAN、配置和本机汇总。\n\n"+detail}),{preview:false});
    for(const phase of [1,2]){
      if(await vscode.window.showWarningMessage((phase===1?"第一次确认完整路径":"第二次确认：永久删除这些文件")+"\n"+detail,{modal:true},"确认上述路径")!=="确认上述路径")return false;
      await c.service.confirm({token:p.token,digest:p.digest,phase,confirm:true,exactTargets:rows.map((r:any)=>r.nodeId+":"+r.absolutePath)});
    }
    const result=await c.execute(p.token);if(result.state!=="completed")throw Error("文件尚未全部清除，请刷新清理状态；未派发新任务。");return true;
  }
}
