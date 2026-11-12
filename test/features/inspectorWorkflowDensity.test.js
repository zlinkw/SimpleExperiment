const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { readSource } = require("../_helpers/sourceReader");

const panel = readSource("src/ui/PanelHtml.ts");

// 7c23e89 基线保留 workflow 阶段、对象条、通信路径与抽屉 rails，不做 display:none 隐藏。
test("inspector and workflow keep render helpers and drawer rails", () => {
  assert.match(panel, /\.inspectorHint \{/);
  assert.match(panel, /\.inspectorSummary \{/);
  assert.match(panel, /function renderWorkbenchInspector\(state, options\)/);
  assert.match(panel, /var\(--tree-col\)/);
});

// 基线用 statusInfoPopover details 元素（非 fixed portal）。
test("status info uses details popover with close scheduling", () => {
  assert.match(panel, /function statusInfoPopover\(text, label\)/);
  assert.match(panel, /function scheduleStatusInfoPopoverClose\(details\)/);
  assert.match(panel, /<details class="statusInfoPopover">/);
  assert.match(panel, /\.statusInfoPopoverBody \{ position: absolute/);
});

test('custom inspector buttons keep their group through rendered HTML, menu selection and save', async () => {
  const vm=require('node:vm'),inline=require('../_helpers/panelFunction'),{parseFragment}=await import('parse5');
  const group='实验准备',groups={[group]:[]};let menu,saved;
  const context={inspectorCustomGroupTitles:()=>[group],inspectorCustomGroupsState:()=>groups,
    inspectorSectionsForCustomGroup:()=>['plans'],escAttr:String,esc:String,inspectorSavedActionButton:()=>'',
    el:()=>menu,closeInspectorAddMenu:()=>{menu=undefined;},commandHelp:()=>'',markWorkbenchInspectorInteraction(){},
    inspectorCustomCandidatePool:title=>title===group?[['刷新识别','snapshot',{}]]:[],
    document:{createElement:()=>({style:{},setAttribute(){}}),body:{appendChild:value=>{menu=value;},classList:{add(){}}}},
    window:{innerWidth:1200,innerHeight:800},normalizeSavedButtonAction:spec=>({...spec,id:spec.command}),savedActionSame:(a,b)=>a.id===b.id,
    saveInspectorCustomGroups:value=>{saved=value;}};
  vm.createContext(context);vm.runInContext(['renderInspectorCustomGroups','openInspectorAddMenu','confirmInspectorAddMenu'].map(inline).join('\n'),context);
  const find=(html,name)=>{let found;const walk=node=>{if(node.attrs?.some(a=>a.name===name))found=node;for(const child of node.childNodes||[])walk(child);};walk(parseFragment(html));assert(found,'missing '+name);return found;};
  const attr=(node,key)=>node.attrs.find(a=>a.name===key)?.value;
  const add=find(context.renderInspectorCustomGroups(),'data-inspector-add');assert.equal(attr(add,'data-inspector-add'),group);
  context.openInspectorAddMenu(attr(add,'data-inspector-add'));
  const confirm=find(menu.innerHTML,'data-inspector-confirm'),cancel=find(menu.innerHTML,'data-inspector-cancel');
  assert.equal(attr(confirm,'data-inspector-confirm'),group);assert.equal(attr(cancel,'data-inspector-cancel'),'1');
  const pick=find(menu.innerHTML,'data-inspector-pick');menu.querySelectorAll=()=>[{getAttribute:key=>attr(pick,key)}];
  context.confirmInspectorAddMenu(attr(confirm,'data-inspector-confirm'));assert.equal(saved[group][0].command,'snapshot');assert.equal(saved[''],undefined);
});
