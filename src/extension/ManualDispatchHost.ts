import * as vscode from "vscode";
import { randomUUID } from "node:crypto";
import { dispatchManualJobs, dispatchReadyManualJobs, ManualDispatchRequest, ManualDispatchPorts } from "../features/ManualJobDispatch";
import { stopPulledTask } from "../features/PulledTaskControl";
import { PlanRunHost } from "./PlanRunHost";
import { supportsPlanCodeScope, verifyWorkerPlanSource, verifyLocalPlanSource } from "./PlanCodeScopeHost";
import { mcpInvocation } from "../mcp/Invocation";

export class ManualDispatchHost {
  private static readonly selections = new WeakMap<object, Set<string>>();
  private gpuSnapshot: any;
  constructor(private readonly host: any, private readonly root: string) {}
  ports(): ManualDispatchPorts {
    const h=this.host, context=h.captureProjectContext(), client=h.client, stopEpoch=h.distributedPlanStopEpoch;
    const targets=()=>JSON.stringify([h.effectiveConnectionMode?.(),h.workerActionTargets().map((w:any)=>
      [w.id,w.host,w.port,w.user,w.project_dir,w.local_agent_url,w.agent_runtime_dir,w.conda_env])]);
    const targetKey=targets();
    const isCurrent=()=>h.projectContextIsCurrent(context)&&context.root===this.root&&h.client===client&&targets()===targetKey&&vscode.workspace.workspaceFolders?.[0]?.uri.fsPath===this.root&&h.distributedPlanStopEpoch===stopEpoch;
    const assertCurrent=()=>{if(!isCurrent())throw Error("项目、连接或停止请求已变化，未继续派发；已保存的原项目意图请返回原项目核查。");mcpInvocation.getStore()?.permission("experiment");};
    return {
      load:()=>h.loadDistributedQueue(this.root), save:async(q,options)=>{assertCurrent();const receipt=await h.saveDistributedQueue(this.root,q,{...options,projectContextCurrent:isCurrent,recallAssertCurrent:assertCurrent});assertCurrent();h.postState();return receipt;},
      commitReview:async (mutate,release=false)=>{
        if(!release)assertCurrent();
        await h.saveDistributedQueue(this.root,undefined,{controlMutation:true,projectContextCurrent:isCurrent,...(!release?{recallAssertCurrent:assertCurrent}:{}),mutateLatest:(latest:any)=>{const next=mutate(latest);return release?next:{...next};}});
        if(!release)assertCurrent();
        if(isCurrent())h.postState();
      },
      assertCurrent,
      online:id=>h.enabledWorkerConfigs().some((w:any)=>w.id===id)&&h.lastWorkerProbes?.[id]?.status==="ok",
      supports:id=>h.lastWorkerProbes?.[id]?.capabilities?.endpoints?.manualDispatch===1,
      newCommandId:()=>randomUUID().replace(/-/g,""),
      prepare:async plan=>{
        assertCurrent();
        h.assertExecutionWorkersReady();h.assertExecutionAgentProjectsReady({options:{workers:h.workerActionTargets()}});
        const specific=plan.jobs.filter(j=>j.manualDispatch?.stage==="preparing"&&j.manualDispatch.gpuSelection!=="automatic");
        const gpu=specific.length?(this.gpuSnapshot||await client.getGpu({userInitiated:true})):{};
        assertCurrent();
        for(const j of specific){
          const p=j.manualDispatch!,rows=Array.isArray(gpu[p.workerId])?gpu[p.workerId]:[];
          if(!rows.some((r:any)=>String(r.index??r.gpu_id??r.gpuId??r.id)===p.gpuId))throw Error("目标 GPU 不可见："+p.workerId+" · GPU "+p.gpuId+"；未停止原任务或审核产物。");
        }
        const placements=[...new Set<string>(plan.jobs.filter(j=>j.manualDispatch?.stage==="preparing").map(j=>j.manualDispatch!.workerId))];
        if(placements.length&&placements.every(id=>supportsPlanCodeScope(h,id))){
          for(const id of placements){
            assertCurrent();
            let source;
            try{source=await verifyWorkerPlanSource(h,id,{...plan},context.signal);}
            catch(error){assertCurrent();throw error;}
            assertCurrent();plan.executionSource=source;
            await verifyLocalPlanSource(this.root,source,h.projectFileObservationIndex?.());
            assertCurrent();
          }
        }else{
          await h.ensureCodeReadyForRun(context,[]);
          assertCurrent();
          if(h.lastCodeSyncState?.fingerprint!==plan.codeFingerprint)throw Error("需更新目标 Agent/Scheduler 按本 PLAN 依赖核实源码；项目整体版本变化不能证明本 job 的源码变化。");
        }
        await Promise.all(h.enabledWorkerConfigs().map(async(w:any)=>{
          assertCurrent();
          if(h.readWorkerTaskSnapshot)await h.readWorkerTaskSnapshot(w.id,{fresh:true,signal:context.signal});
          else {const snapshot=await client.getWorkerTasks(w.id);assertCurrent();h.lastWorkerTaskSnapshots.set(this.root+"\u0000"+w.id,{...snapshot,fetchedAt:new Date().toISOString()});}
        }));
        assertCurrent();
      },
      stop:async(p,j)=>{assertCurrent();await stopPulledTask(client,p,j,randomUUID().replace(/-/g,""));assertCurrent();},
      review:(p,j)=>this.review(p,j),send:(p,j)=>{assertCurrent();return h.sendDistributedJob(p,j,j.workerId,j.gpuId,j.commandId);},
      tick:()=>{assertCurrent();return dispatchReadyManualJobs(this.ports());},
    };
  }
  async dispatch(params:any,fromUi=false){
    const h=this.host, context=h.captureProjectContext(), client=h.client, inFlight=h.manualDispatchInFlight;
    if(!fromUi&&params.confirm!==true)throw Error("CONFIRM_REQUIRED：请确认所选 job、服务器和 GPU。");
    const workflowId=String(params.workflowId||params.planId||""),indices=Array.isArray(params.indices)?params.indices:[params.jobIndex];
    if(h.manualDispatchReviewKeys?.size)throw Error("请先完成或取消当前产物审核；其他任务仍会自动调度。");
    let selections=ManualDispatchHost.selections.get(h);
    if(!selections){selections=new Set();ManualDispatchHost.selections.set(h,selections);}
    const key=this.root+"\0"+workflowId;if(h.manualDispatchInFlight.has(key)||selections.has(key))throw Error("这批任务正在处理，请勿重复点击。");
    if(h.manualDispatchInFlight.has(this.root+"\0server-queue"))throw Error("剩余 job 正在按配额派发服务器队列，请等待本批结果。");
    const ports=this.ports();
    let acquired=false;
    selections.add(key);
    try {
    let workerId=String(params.workerId||""),gpuId=params.gpuId===undefined?"":String(params.gpuId),gpuSelection=params.gpuSelection;
    if(fromUi&&!workerId){
      const saved=await h.loadDistributedQueue(this.root),plan=saved.plans.find((p:any)=>p.id===workflowId);
      ports.assertCurrent();
      const placements=indices.map((i:number)=>plan?.jobs.find((j:any)=>j.index===i)?.manualDispatch);
      const first=placements[0];
      if(first?.stage==="preparing"&&placements.every((p:any)=>p?.workerId===first.workerId&&p?.gpuId===first.gpuId)){
        workerId=first.workerId;gpuId=first.gpuId;gpuSelection=first.gpuSelection;
      }
    }
    if(fromUi&&!workerId){
      const picked=await vscode.window.showQuickPick<any>(h.enabledWorkerConfigs().map((w:any)=>({label:w.displayName||w.id,description:w.id+(h.lastWorkerProbes?.[w.id]?.status==="ok"?" · 已连接":" · 未连接"),id:w.id})),{title:"手动派发：选择服务器",ignoreFocusOut:true});
      ports.assertCurrent();
      if(!picked)return {status:"cancelled"};workerId=picked.id;
    }
    if(!h.enabledWorkerConfigs().some((w:any)=>w.id===workerId))throw Error("目标 Worker 未启用或不存在："+workerId);
    if(fromUi&&!gpuId&&gpuSelection!=="automatic"){
      let snapshot=h.client.currentState?.().gpu||h.lastRealtimeState?.gpu||{};
      try{snapshot=await h.client.getGpu({userInitiated:true});this.gpuSnapshot=snapshot;}catch{}
      ports.assertCurrent();
      const rows=Array.isArray(snapshot[workerId])?snapshot[workerId]:[];
      const tasks=h.lastWorkerTaskSnapshots?.get(this.root+"\u0000"+workerId)?.tasks||[];
      const picked=await vscode.window.showQuickPick<any>([{label:"此服务器自动派发",id:"",gpuSelection:"automatic",description:"仅等待此 Worker 的可用显卡；遵守显存阈值、预算与并行上限"},...rows.map((r:any)=>({label:"GPU "+String(r.index??r.gpu_id??r.gpuId??r.id),id:String(r.index??r.gpu_id??r.gpuId??r.id),
        description:String(r.name||"")+" · 显存 "+String(r.memoryUsedMb??r.memoryUsed??r.memory_used_mb??"?")+"/"+String(r.memoryTotalMb??r.memoryTotal??r.memory_total_mb??"?")+" MB · 利用率 "+String(r.utilizationPercent??r.utilization??r.utilization_gpu??"?")+"% · 任务 "+tasks.filter((t:any)=>!['completed','failed','cancelled'].includes(t.status)&&String(t.gpuId??t.observation?.tmux?.gpuId??"")===String(r.index??r.gpu_id??r.gpuId??r.id)).length}))],{title:"选择此服务器自动派发或指定 GPU",ignoreFocusOut:true});
      ports.assertCurrent();
      if(!picked)return {status:"cancelled"};gpuId=picked.id;gpuSelection=picked.gpuSelection;
    }
    ports.assertCurrent();
    if(h.manualDispatchInFlight.has(key)||h.manualDispatchInFlight.has(this.root+"\0server-queue")||h.manualDispatchReviewKeys?.size)throw Error("已有派发或产物审核正在处理，请等待本批结果。");
    h.manualDispatchInFlight.add(key);acquired=true;
    if(h.distributedQueueTickPromise)await h.distributedQueueTickPromise;
    ports.assertCurrent();
    return await dispatchManualJobs(ports,{workflowId,indices,workerId,gpuId,gpuSelection,expectedCommands:params.expectedCommands,stopRunning:fromUi||params.stopRunning===true} as ManualDispatchRequest);
    }
    finally{selections.delete(key);if(acquired){inFlight.delete(key);if(h.projectContextIsCurrent(context)&&h.client===client){h.postState();void Promise.resolve(h.tickDistributedQueue()).catch(()=>{});}}}
  }
  async review(plan:any,jobs:any[]){
    const h=this.host, context=h.captureProjectContext(), client=h.client, reviewPorts=this.ports(),body={planFile:plan.planFile,planRevision:plan.revision,options:{},distributedSkipJobIndices:[],
      workerSubmissionSnapshots:[],runReplacement:{}};
    (body as any).runConfirmationWaitLocal=async(work:()=>Promise<string>)=>{
      const batchKey=this.root+"\0server-queue",key=h.manualDispatchInFlight.has(batchKey)?batchKey:this.root+"\0"+plan.id;
      if(!h.manualDispatchInFlight.has(key))return work();
      const ports=this.ports();
      ports.assertCurrent();
      const reviewKeys=h.manualDispatchReviewKeys||=new Set(), inFlight=h.manualDispatchInFlight;
      reviewKeys.add(key);
      inFlight.delete(key);h.postState();
      void Promise.resolve(h.tickDistributedQueue()).catch(()=>{});
      try{return await work();}
      finally{
        reviewKeys.delete(key);
        if(!h.projectContextIsCurrent(context)||h.client!==client)throw Error("项目或连接已变化，请返回原项目核查审核结果。");
        inFlight.add(key);
        if(h.distributedQueueTickPromise)await h.distributedQueueTickPromise;
        ports.assertCurrent();
      }
    };
    const validation={execution_mode:plan.executionMode,jobs:jobs.map(j=>({index:j.index,case:j.case,seed:j.seed,output_dir:j.outputDir,result_csv:j.collectionResultCsv}))};
    reviewPorts.assertCurrent();
    await h.assertPlanSubmissionWorkers(body,{validation},reviewPorts.assertCurrent,context.signal);
    reviewPorts.assertCurrent();
    try {await new PlanRunHost(h,this.root).replace(plan,body,validation,reviewPorts.assertCurrent);
      reviewPorts.assertCurrent();
      // r82：审核结果成对透传——accepted 可派发，blocked（隔离未完成/核验未知，带 stage/code）交派发层
      // 打 job 级阻断标记。此前只回 assignedExperimentIndices，阻断 job 被派发层当普通未完成 job 处理，
      // 正是现场"排除又派发"的入口之一；取消仍返回 false（未移动任何文件）。
      const blocked=(body as any).runReplacement?.blocked||[];
      return {accepted:(body as any).assignedExperimentIndices||[],
        blocked:blocked.map((row:any)=>({index:Number(row.index),reason:String(row.reason||""),stage:row.stage,code:row.code,operationId:row.operationId,codes:row.codes,busyOnly:row.busyOnly}))};}
    catch(error:any){if(error.apiData?.code==="REPLACEMENT_CANCELLED")return false;throw error;}
  }
}
