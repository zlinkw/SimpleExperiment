// @ts-nocheck
export function renderPanelHtml(): string {
    const nonce = String(Date.now());
    return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SimpleExperiment</title>
  <style>
    :root {
      --app-bg: var(--vscode-editor-background, var(--vscode-sideBar-background));
      --card-bg: color-mix(in srgb, var(--vscode-panel-background, var(--vscode-sideBar-background)) 92%, var(--vscode-editor-foreground) 8%);
      --subtle-bg: color-mix(in srgb, var(--vscode-input-background, var(--vscode-panel-background)) 88%, var(--vscode-editor-foreground) 12%);
      --border: color-mix(in srgb, var(--vscode-input-border, var(--vscode-focusBorder)) 64%, transparent);
      --text: var(--vscode-editor-foreground);
      --muted: var(--vscode-descriptionForeground);
      --success: var(--vscode-charts-green, #2ea043);
      --info: #037CD5;
      --danger: #f85149;
      --warning: #d29922;
      --gpu-progress-track: rgba(127, 127, 127, .32);
      --gpu-progress-free: #2ea043;
      --gpu-progress-busy: #037CD5;
      --gpu-progress-hot: #d29922;
      --gpu-progress-danger: #f85149;
      --zlk-font-xs: 10px;
      --zlk-font-sm: 11px;
      --zlk-font-md: 12px;
      --zlk-font-lg: 13px;
      --zlk-font-status: 13px;
      --zlk-font-section: 15px;
      --zlk-font-title: 18px;
      --radius: 8px;
      --radius-sm: 6px;
    }
    * { box-sizing: border-box; }
    html, body { height: 100%; }
    body { margin: 0; padding: 0; overflow: hidden; font-family: var(--vscode-font-family); font-size: var(--zlk-font-md); line-height: 1.45; color: var(--text); background: #EEF2F7; }
    h2 { margin: 0 0 12px; font-size: var(--zlk-font-section); font-weight: 650; }
    h3 { margin: 18px 0 8px; font-size: 13px; font-weight: 600; }
    input, select, textarea { min-height: 28px; color: var(--vscode-input-foreground); background: var(--vscode-input-background); border: 1px solid var(--vscode-input-border, var(--border)); border-radius: var(--radius-sm); padding: 4px 7px; }
    textarea { width: 100%; min-height: 180px; font-family: Consolas, monospace; font-size: 12px; line-height: 1.45; resize: vertical; }
    input[type="checkbox"] { width: 16px; height: 16px; margin: 0; accent-color: var(--vscode-checkbox-selectBackground, var(--vscode-focusBorder)); vertical-align: middle; cursor: pointer; }
    input[type="checkbox"]:focus-visible { outline: 1px solid var(--vscode-focusBorder); outline-offset: 2px; }
    input.wide { width: 100%; box-sizing: border-box; }
    .row { display: grid; grid-template-columns: 150px minmax(0, 1fr); gap: 8px; padding: 4px 0; }
    .label, .muted { color: var(--muted); }
    .value, .pathCell { overflow-wrap: anywhere; }
    .toolbar, .actionGrid, .summaryLine, .actions { display: flex; flex-wrap: wrap; gap: 8px; margin: 8px 0; align-items: center; min-width: 0; }
    .toolbar > *, .actionGrid > *, .summaryLine > *, .actions > * { min-width: 0; }
    .contractQuickLinks { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0 12px; }
    .syncPublishPanel { display: grid; gap: 8px; min-width: 0; }
    .summaryLink { display: inline-flex; align-items: center; min-width: 0; padding: 6px 9px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--subtle-bg); color: var(--text); text-decoration: none; font-size: 12px; }
    .summaryLink:hover, .summaryLink:focus-visible { border-color: var(--vscode-focusBorder); color: var(--vscode-textLink-foreground, var(--text)); outline: none; }
    button { max-width: 100%; min-width: 0; display: inline-flex; align-items: center; justify-content: center; gap: 5px; color: var(--vscode-button-foreground); background: var(--vscode-button-background); border: 1px solid var(--vscode-button-background); padding: 6px 10px; border-radius: var(--radius-sm); cursor: pointer; line-height: 1.25; text-align: center; white-space: normal; overflow-wrap: anywhere; }
    button.secondary { color: var(--vscode-button-secondaryForeground); background: transparent; border-color: var(--border); }
    button:disabled { opacity: .45; cursor: not-allowed; }
    button.is-loading { opacity: .72; cursor: wait; }
    .loading-spinner { width: 12px; height: 12px; border: 2px solid currentColor; border-right-color: transparent; border-radius: 999px; display: inline-block; flex: 0 0 auto; animation: zlk-spin .75s linear infinite; }
    @keyframes zlk-spin { to { transform: rotate(360deg); } }
    pre { white-space: pre-wrap; overflow-wrap: anywhere; padding: 10px; background: var(--vscode-textCodeBlock-background); border-radius: 4px; max-height: 240px; overflow: auto; }
    .cardGrid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 8px; }
    .gpuServerStack { display: grid; grid-template-columns: 1fr; gap: 10px; }
    .card, .section-card { min-width: 0; padding: 12px; border: 1px solid var(--border); border-radius: var(--radius); background: var(--card-bg); display: grid; gap: 12px; }
    .app-shell { width: min(100%, 1560px); margin: 0 auto; padding: 22px 24px 30px; display: grid; gap: 16px; }
    .topbar { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 10px; min-width: 0; }
    .topbar-actions { margin-left: auto; display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 6px; min-width: 0; }
    .topbar-actions button { min-height: 24px; padding: 3px 8px; font-size: 12px; }
    .topbar-actions .topbarIconButton { width: 28px; height: 28px; min-width: 28px; padding: 0; font-size: 15px; }
    .projectOnboardingNotice { display: none; min-width: 0; align-items: center; justify-content: space-between; gap: 10px; padding: 9px 10px; border: 1px solid #F59E0B; border-left: 4px solid #D97706; border-radius: 8px; background: #FFFBEB; color: #78350F; }
    .projectOnboardingNotice.is-visible { display: flex; }
    .projectOnboardingNoticeBody { min-width: 0; display: grid; gap: 2px; }
    .projectOnboardingNoticeBody b { font-size: 12px; }
    .projectOnboardingNoticeBody span { min-width: 0; color: #92400E; font-size: 11px; overflow-wrap: anywhere; }
    .projectOnboardingNotice button { flex: 0 0 auto; }
    .workflowStageRail {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(168px, 1fr));
      gap: 8px;
      padding: 8px;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: #F8FAFC;
    }
    .workflowStage {
      position: relative;
      min-width: 0;
      display: grid;
      grid-template-columns: 28px minmax(0, 1fr);
      gap: 8px;
      align-items: start;
      min-height: 74px;
      padding: 9px;
      border: 1px solid #CBD5E1;
      border-left: 4px solid #CBD5E1;
      border-radius: 8px;
      background: #FFFFFF;
      color: #0F172A;
    }
    .workflowStage.good { border-left-color: #16A34A; border-color: #BBF7D0; background: #F0FDF4; }
    .workflowStage.info { border-left-color: #2563EB; }
    .workflowStage.warn { border-left-color: #D97706; border-color: #FDE68A; background: #FFFBEB; }
    .workflowStage.error { border-left-color: #DC2626; border-color: #FCA5A5; background: #FEF2F2; }
    .workflowStage.mine { border-left-color: #7C3AED; border-color: #C4B5FD; background: #F5F3FF; }
    .workflowStageIndex {
      width: 28px;
      height: 28px;
      display: inline-grid;
      place-items: center;
      border-radius: 999px;
      border: 1px solid #CBD5E1;
      background: #F8FAFC;
      color: #475569;
      font-size: 12px;
      font-weight: 850;
    }
    .workflowStage.good .workflowStageIndex { color: #15803D; background: #DCFCE7; border-color: #BBF7D0; }
    .workflowStage.warn .workflowStageIndex { color: #B45309; background: #FEF3C7; border-color: #FDE68A; }
    .workflowStage.error .workflowStageIndex { color: #DC2626; background: #FEE2E2; border-color: #FCA5A5; }
    .workflowStage.mine .workflowStageIndex { color: #6D28D9; background: #EDE9FE; border-color: #C4B5FD; }
    .workflowStageBody { min-width: 0; display: grid; gap: 3px; }
    .workflowStageBody b { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #111827; font-size: 12px; font-weight: 850; }
    .workflowStageBody span { color: #64748B; font-size: 11px; line-height: 1.35; }
    .workflowStageStatus { justify-self: start; margin-top: 2px; padding: 1px 7px; border: 1px solid #CBD5E1; border-radius: 999px; background: #F8FAFC; color: #475569; font-size: 10px; font-weight: 800; }
    .workflowStage.good .workflowStageStatus { color: #15803D; background: #DCFCE7; border-color: #BBF7D0; }
    .workflowStage.warn .workflowStageStatus { color: #B45309; background: #FEF3C7; border-color: #FDE68A; }
    .workflowStage.error .workflowStageStatus { color: #DC2626; background: #FEE2E2; border-color: #FCA5A5; }
    .workflowStage.mine .workflowStageStatus { color: #6D28D9; background: #EDE9FE; border-color: #C4B5FD; }
    .workflowCard, .featureReadinessCard, .targetMatrixCard { min-width: 0; padding: 9px; border: 1px solid #CBD5E1; border-left: 4px solid #CBD5E1; border-radius: 8px; background: #FFFFFF; color: #0F172A; }
    .workflowCard { border-left: 4px solid #CBD5E1; }
    .featureReadinessCard { border-left: 4px solid #CBD5E1; }
    .targetMatrixCard { border-left: 4px solid #CBD5E1; }
    .workflowCard.good, .featureReadinessCard.good, .targetMatrixCard.good { border-left-color: #16A34A; }
    .workflowCard.warn, .featureReadinessCard.warn, .targetMatrixCard.warn { border-left-color: #D97706; background: #FFFBEB; }
    .workflowCard.error, .featureReadinessCard.error, .targetMatrixCard.error { border-left-color: #DC2626; background: #FEF2F2; }
    .workflowBlockerBar { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
    .workflowBlockerBar .pill { margin: 0; }
    .objectStrip {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 8px;
      padding: 8px;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: color-mix(in srgb, var(--vscode-sideBar-background, var(--card-bg)) 88%, var(--vscode-editor-background) 12%);
    }
    .objectTile {
      min-width: 0;
      display: grid;
      grid-template-columns: 28px minmax(0, 1fr);
      gap: 8px;
      align-items: center;
      padding: 8px;
      border: 1px solid var(--border);
      border-left: 4px solid #94A3B8;
      border-radius: 8px;
      background: var(--vscode-editor-background);
      color: var(--text);
    }
    .objectTile.good { border-left-color: #16A34A; }
    .objectTile.warn { border-left-color: #D97706; background: #FFFBEB; color: #0F172A; }
    .objectTile.error { border-left-color: #DC2626; background: #FEF2F2; color: #0F172A; }
    .objectTile.mine { border-left-color: #7C3AED; background: #F5F3FF; color: #0F172A; border-color: #C4B5FD; }
    .objectGlyph {
      width: 28px;
      height: 28px;
      display: inline-grid;
      place-items: center;
      border: 1px solid var(--border);
      border-radius: 7px;
      background: var(--subtle-bg);
      color: var(--muted);
      font-size: 13px;
      font-weight: 850;
    }
    .objectTile.good .objectGlyph { color: #16A34A; background: #F0FDF4; border-color: #BBF7D0; }
    .objectTile.warn .objectGlyph { color: #D97706; background: #FFFBEB; border-color: #FDE68A; }
    .objectTile.error .objectGlyph { color: #DC2626; background: #FEF2F2; border-color: #FCA5A5; }
    .objectTile.mine .objectGlyph { color: #6D28D9; background: #EDE9FE; border-color: #C4B5FD; }
    .objectTileBody { min-width: 0; display: grid; gap: 2px; }
    .objectTileHead { display: flex; justify-content: space-between; gap: 6px; align-items: baseline; min-width: 0; }
    .objectTileHead b { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; font-weight: 850; }
    .objectTileStatus { color: var(--muted); font-size: 11px; font-weight: 800; white-space: nowrap; }
    .objectTile.warn .objectTileStatus { color: #B45309; }
    .objectTile.error .objectTileStatus { color: #DC2626; }
    .objectTile.mine .objectTileStatus { color: #6D28D9; }
    .workflowActions { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin-top: 2px; }
    .workflowActions button { min-width: 0; padding: 5px 8px; font-size: 12px; }
    .section-grid { display: grid; grid-template-columns: 260px minmax(0, 1fr); gap: 16px; align-items: start; }
    .section-stack { display: grid; gap: 16px; }
    #cardDeck { display: grid; grid-template-columns: 260px minmax(0, 1fr) 320px; gap: 16px; align-items: start; }
    #cardDeck > [data-section] { grid-column: 2; }
    .mainColumn { grid-column: 2; display: grid; gap: 16px; min-width: 0; }
    .resourceTree {
      grid-column: 1;
      grid-row: 1 / span 20;
      position: static;
      min-height: 0;
      max-height: none;
      overflow: visible;
      padding: 12px;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: color-mix(in srgb, var(--vscode-sideBar-background, var(--card-bg)) 94%, var(--vscode-focusBorder) 6%);
      box-shadow: 0 8px 22px rgba(15, 23, 42, .07);
      contain: layout paint;
    }
    .workbenchInspector {
      grid-column: 3;
      grid-row: 1 / span 20;
      position: static;
      min-height: 0;
      max-height: none;
      overflow: auto;
      display: grid;
      gap: 10px;
      padding: 12px;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: #FFFFFF;
      color: #0F172A;
      box-shadow: 0 8px 22px rgba(15, 23, 42, .07);
      contain: layout paint;
    }
    .inspectorHeader { display: grid; gap: 5px; padding-bottom: 10px; border-bottom: 1px solid #E2E8F0; }
    .inspectorEyebrow { color: #64748B; font-size: 11px; font-weight: 800; }
    .inspectorTitle { display: flex; justify-content: space-between; gap: 8px; align-items: flex-start; }
    .inspectorTitle b { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #111827; font-size: 15px; font-weight: 850; }
    .inspectorSummary { color: #475569; font-size: 12px; line-height: 1.45; }
    .inspectorStatus { border: 1px solid #CBD5E1; border-radius: 999px; padding: 2px 8px; color: #475569; background: #F8FAFC; font-size: 11px; font-weight: 800; white-space: nowrap; }
    .inspectorStatus.good { border-color: #BBF7D0; background: #F0FDF4; color: #15803D; }
    .inspectorStatus.warn { border-color: #FDE68A; background: #FFFBEB; color: #B45309; }
    .inspectorStatus.error { border-color: #FCA5A5; background: #FEF2F2; color: #DC2626; }
    .inspectorStatus.mine { border-color: #C4B5FD; background: #EDE9FE; color: #6D28D9; }
    .inspectorGrid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 7px; }
    .inspectorFact { display: grid; gap: 2px; min-width: 0; padding: 7px 8px; border: 1px solid #E2E8F0; border-radius: 7px; background: #FAFBFC; }
    .inspectorFact span { color: #64748B; font-size: 11px; font-weight: 600; }
    .inspectorFact b { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #0F172A; font-size: 13px; font-weight: 850; }
    .inspectorActions { display: grid; gap: 6px; }
    .inspectorActions .workflowActions { margin: 0; }
    .inspectorActions button { flex: 1 1 130px; justify-content: center; min-height: 30px; }
    .inspectorReadiness { display: grid; gap: 5px; padding: 8px; border: 1px solid #E2E8F0; border-radius: 8px; background: #FAFBFC; }
    .inspectorReadinessRow { display: grid; grid-template-columns: minmax(70px, .42fr) minmax(0, 1fr); gap: 6px; align-items: baseline; min-width: 0; font-size: 11px; }
    .inspectorReadinessRow b { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #0F172A; }
    .inspectorReadinessRow span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #64748B; }
    .inspectorReadinessRow.good span { color: #15803D; font-weight: 750; }
    .inspectorReadinessRow.warn span { color: #B45309; font-weight: 750; }
    .inspectorBudgetNotice { margin-top: 6px; padding: 6px 8px; border: 1px dashed #CBD5E1; border-radius: 7px; background: #F8FAFC; color: #64748B; font-size: 11px; line-height: 1.4; }
    .inspectorTimeline { display: grid; gap: 7px; }
    .inspectorEvent { display: grid; gap: 3px; padding: 8px 9px; border: 1px solid #E2E8F0; border-left: 3px solid #94A3B8; border-radius: 7px; background: #FAFBFC; }
    .inspectorEvent.running, .inspectorEvent.accepted { border-left-color: #2563EB; }
    .inspectorEvent.completed { border-left-color: #16A34A; }
    .inspectorEvent.failed, .inspectorEvent.stalled { border-left-color: #DC2626; background: #FEF2F2; }
    .inspectorEvent b { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #111827; font-size: 12px; }
    .inspectorEvent span { color: #64748B; font-size: 11px; line-height: 1.35; overflow-wrap: anywhere; }
    .inspectorHint { padding: 8px 9px; border: 1px solid #E2E8F0; border-radius: 7px; background: #F8FAFC; color: #475569; font-size: 11px; line-height: 1.45; }
    .tree-head { display: grid; grid-template-columns: 5px minmax(0, 1fr); gap: 4px 8px; align-items: start; padding: 4px 4px 10px; border-bottom: 1px solid var(--border); margin-bottom: 8px; }
    .tree-head::before { content: ""; grid-row: 1 / 3; width: 4px; min-height: 32px; align-self: stretch; border-radius: 999px; background: #CBD5E1; box-shadow: 0 0 0 3px rgba(148, 163, 184, .10); }
    .tree-head.good::before { background: #16A34A; box-shadow-color: rgba(22, 163, 74, .12); }
    .tree-head.info::before { background: #2563EB; box-shadow-color: rgba(37, 99, 235, .12); }
    .tree-head.warn::before { background: #D97706; box-shadow-color: rgba(217, 119, 6, .12); }
    .tree-head.error::before { background: #DC2626; box-shadow-color: rgba(220, 38, 38, .12); }
    .tree-head.mine::before { background: #7C3AED; box-shadow-color: rgba(124, 58, 237, .12); }
    .tree-title { min-width: 0; font-size: 12px; font-weight: 800; color: var(--text); letter-spacing: 0; }
    .tree-subtitle { min-width: 0; font-size: 11px; line-height: 1.35; color: var(--muted); }
    .tree-group { display: grid; gap: 4px; margin: 8px 0 12px; }
    .tree-group-label { display: inline-flex; align-items: center; gap: 6px; padding: 0 4px; color: var(--muted); font-size: 11px; font-weight: 700; text-transform: none; }
    .tree-group-label::before { content: ""; width: 4px; height: 13px; border-radius: 999px; background: #CBD5E1; box-shadow: 0 0 0 3px rgba(148, 163, 184, .10); }
    .tree-group.good .tree-group-label::before { background: #16A34A; box-shadow-color: rgba(22, 163, 74, .12); }
    .tree-group.info .tree-group-label::before { background: #2563EB; box-shadow-color: rgba(37, 99, 235, .12); }
    .tree-group.warn .tree-group-label::before { background: #D97706; box-shadow-color: rgba(217, 119, 6, .12); }
    .tree-group.error .tree-group-label::before { background: #DC2626; box-shadow-color: rgba(220, 38, 38, .12); }
    .tree-group.mine .tree-group-label::before { background: #7C3AED; box-shadow-color: rgba(124, 58, 237, .12); }
    .tree-item {
      width: 100%;
      min-height: 30px;
      display: grid;
      grid-template-columns: 16px minmax(0, 1fr);
      align-items: center;
      gap: 7px;
      padding: 5px 7px;
      color: var(--text);
      background: transparent;
      border: 1px solid transparent;
      border-radius: var(--radius-sm);
      text-align: left;
      font-size: 12px;
      line-height: 1.25;
    }
    .tree-item:hover, .tree-item:focus-visible { background: var(--vscode-list-hoverBackground); border-color: var(--border); outline: none; }
    .tree-item[draggable="true"] { cursor: grab; }
    .tree-item.tree-dragging { opacity: .58; }
    .tree-item.tree-drop-before { box-shadow: inset 0 2px 0 var(--vscode-focusBorder); }
    .tree-item.tree-drop-after { box-shadow: inset 0 -2px 0 var(--vscode-focusBorder); }
    .tree-item.is-hot { background: color-mix(in srgb, var(--vscode-list-activeSelectionBackground, var(--vscode-focusBorder)) 12%, transparent); border-color: color-mix(in srgb, var(--vscode-focusBorder) 35%, transparent); }
    .tree-item.is-current { background: var(--vscode-list-activeSelectionBackground); color: var(--vscode-list-activeSelectionForeground); border-color: var(--vscode-focusBorder); box-shadow: inset 3px 0 0 var(--vscode-focusBorder); }
    .tree-item.is-current .tree-icon { color: var(--vscode-list-activeSelectionForeground); }
    .tree-icon { width: 14px; height: 14px; display: inline-grid; place-items: center; color: var(--muted); font-size: 12px; }
    .tree-item.good .tree-icon { color: #16A34A; background: #F0FDF4; }
    .tree-item.info .tree-icon { color: #2563EB; background: #EFF6FF; }
    .tree-item.warn .tree-icon { color: #D97706; background: #FFFBEB; }
    .tree-item.error .tree-icon { color: #DC2626; background: #FEF2F2; }
    .tree-item.mine .tree-icon { color: #7C3AED; background: #F5F3FF; }
    .tree-label { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .tree-child-list { display: grid; gap: 2px; margin: 2px 0 6px 21px; padding-left: 8px; border-left: 1px solid var(--border); }
    .tree-object {
      width: 100%;
      min-height: 26px;
      display: grid;
      grid-template-columns: 16px minmax(0, 1fr);
      align-items: center;
      gap: 7px;
      padding: 4px 6px;
      color: var(--text);
      background: transparent;
      border: 1px solid transparent;
      border-radius: var(--radius-sm);
      text-align: left;
      font-size: 11px;
      line-height: 1.25;
    }
    .tree-object:hover, .tree-object:focus-visible { background: var(--vscode-list-hoverBackground); border-color: var(--border); outline: none; }
    .tree-object.is-current { background: var(--vscode-list-activeSelectionBackground); color: var(--vscode-list-activeSelectionForeground); border-color: var(--vscode-focusBorder); box-shadow: inset 3px 0 0 var(--vscode-focusBorder); }
    .tree-object-icon { width: 16px; height: 16px; display: inline-grid; place-items: center; border-radius: 5px; background: rgba(226, 232, 240, .52); color: #64748B; font-size: 10px; font-weight: 850; }
    .tree-object.good .tree-object-icon { color: #16A34A; background: #F0FDF4; }
    .tree-object.warn .tree-object-icon { color: #D97706; background: #FFFBEB; }
    .tree-object.error .tree-object-icon { color: #DC2626; background: #FEF2F2; }
    .tree-object.mine .tree-object-icon { color: #7C3AED; background: #F5F3FF; }
    .tree-object-label { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .tree-inspector {
      height: 34px;
      min-height: 34px;
      display: flex;
      gap: 8px;
      align-items: center;
      overflow: hidden;
      margin-top: 10px;
      padding: 7px 8px;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: var(--vscode-editor-background);
    }
    .tree-inspector-title { display: flex; justify-content: space-between; gap: 8px; align-items: center; min-width: 0; font-size: 12px; font-weight: 800; }
    .tree-inspector-title span:first-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .tree-inspector-line { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--muted); font-size: 11px; line-height: 1.4; }
    .tree-inspector-facts { display: none; }
    .tree-inspector-action { display: none; }
    .ops-flow {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(168px, 1fr));
      gap: 8px;
      margin: 8px 0 0;
    }
    .ops-step {
      min-height: 68px;
      display: grid;
      gap: 5px;
      padding: 10px;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: color-mix(in srgb, var(--subtle-bg) 88%, var(--vscode-focusBorder) 4%);
    }
    .ops-step b { font-size: 12px; }
    .ops-step span { color: var(--muted); font-size: 11px; line-height: 1.35; }
    .onboardingFlow { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 160px), 1fr)); gap: 8px; margin: 8px 0; }
    .onboardingStep { display: grid; gap: 6px; min-height: 86px; padding: 10px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--vscode-editor-background); }
    .onboardingStep.good { border-color: color-mix(in srgb, var(--success) 34%, var(--border)); box-shadow: inset 3px 0 0 var(--success); }
    .onboardingStep.warn { border-color: color-mix(in srgb, var(--warning) 36%, var(--border)); box-shadow: inset 3px 0 0 var(--warning); }
    .onboardingStep.current { border-color: color-mix(in srgb, var(--vscode-focusBorder) 55%, var(--border)); box-shadow: inset 3px 0 0 var(--vscode-focusBorder); background: color-mix(in srgb, var(--vscode-editor-background) 92%, var(--vscode-focusBorder) 8%); }
    .onboardingStep.pending { border-color: var(--border); opacity: .78; }
    button.onboardingStep.is-link { width: 100%; color: inherit; font: inherit; text-align: left; cursor: pointer; }
    button.onboardingStep.is-link:hover { border-color: var(--vscode-focusBorder); }
    button.onboardingStep.is-link:focus-visible { outline: 2px solid var(--vscode-focusBorder); outline-offset: 2px; }
    .onboardingStep b { display: flex; justify-content: space-between; gap: 8px; align-items: baseline; font-size: 12px; }
    .onboardingStep span { color: var(--muted); font-size: 11px; line-height: 1.35; }
    .onboardingStep .onboardingStepLink { justify-self: end; color: var(--vscode-textLink-foreground); font-size: 11px; font-weight: 650; }
    .projectQuickNav { display: grid; gap: 8px; margin: 10px 0; padding: 10px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: color-mix(in srgb, var(--card-bg) 94%, var(--vscode-input-background) 6%); }
    .projectQuickHead { display: flex; justify-content: space-between; align-items: center; gap: 8px; min-width: 0; }
    .projectQuickHead b { font-size: 13px; }
    .projectQuickNext { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 8px; align-items: center; min-height: 34px; padding: 6px 7px; border-left: 3px solid #2563EB; background: #EFF6FF; color: #0F172A; }
    .projectQuickNext span { color: #475569; font-size: 11px; }
    .projectQuickNext b { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; }
    .projectQuickRows { display: grid; gap: 6px; }
    .projectQuickDetails { border-top: 1px solid var(--border); padding-top: 6px; }
    .projectQuickDetails > summary { cursor: pointer; color: var(--muted); font-size: 11px; font-weight: 650; }
    .projectQuickDetails[open] > summary { margin-bottom: 6px; }
    .projectQuickRow { display: grid; grid-template-columns: minmax(86px, 118px) minmax(0, 1fr) auto; gap: 8px; align-items: center; min-height: 30px; padding: 6px 7px; border: 1px solid var(--border); border-radius: 6px; background: var(--vscode-editor-background); }
    .projectQuickLabel { color: var(--muted); font-size: 11px; }
    .projectQuickValue { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; }
    .projectQuickActions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 5px; }
    @container main-workflow (max-width: 520px) {
      .projectQuickNext { grid-template-columns: minmax(0, 1fr); align-items: stretch; }
      .projectQuickNext b { overflow: visible; text-overflow: clip; white-space: normal; overflow-wrap: anywhere; line-height: 1.4; }
      .projectQuickNext > button, .projectQuickNext > .projectQuickActions { width: 100%; justify-self: stretch; }
      .projectQuickNext > .projectQuickActions { justify-content: stretch; }
      .projectQuickNext > .projectQuickActions > button { flex: 1 1 100%; min-width: 0; }
    }
    .projectPathButton { min-height: 24px; padding: 3px 7px; font-size: 11px; }
    .planRunWorkbench { display: grid; gap: 10px; margin: 10px 0; padding: 10px; border: 1px solid var(--border); border-radius: 8px; background: color-mix(in srgb, var(--card-bg) 92%, var(--vscode-input-background) 8%); }
    .planRunActions { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; padding-top: 2px; }
    .planRunRows { display: grid; gap: 6px; }
    .planRunRow { display: grid; grid-template-columns: minmax(86px, 118px) minmax(0, 1fr) auto; gap: 8px; align-items: center; min-height: 30px; padding: 6px 7px; border: 1px solid #E2E8F0; border-left: 3px solid #CBD5E1; border-radius: 6px; background: #FFFFFF; color: #0F172A; font-size: 12px; }
    .planRunRow.good { border-left-color: #16A34A; }
    .planRunRow.warn { border-left-color: #D97706; background: #FFFBEB; }
    .planRunRow.error { border-left-color: #DC2626; background: #FEF2F2; }
    .planRunRow.info { border-left-color: #2563EB; }
    .planRunRow.mine { border-left-color: #7C3AED; background: #F5F3FF; }
    .planRunLabel { color: #64748B; font-size: 11px; }
    .planRunValue { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .planRunBadge { justify-self: end; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11px; font-weight: 800; }
    .planGateList { display: grid; gap: 6px; }
    .planGateItem { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 8px; align-items: center; padding: 7px 8px; border: 1px solid #E2E8F0; border-radius: 6px; background: #FFFFFF; font-size: 12px; }
    .planGateDot { width: 8px; height: 8px; border-radius: 999px; background: #94A3B8; }
    .planGateItem.good .planGateDot { background: #16A34A; }
    .planGateItem.info .planGateDot { background: #2563EB; }
    .planGateItem.warn .planGateDot { background: #D97706; }
    .planGateItem.error .planGateDot { background: #DC2626; }
    .planGateName { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #0F172A; font-weight: 700; }
    .outputGateChecklist { display: grid; gap: 7px; padding: 9px; border: 1px solid #E2E8F0; border-left: 4px solid #D97706; border-radius: 8px; background: #FFFBEB; color: #0F172A; }
    .outputGateChecklist.ready { border-left-color: #16A34A; background: #F0FDF4; }
    .outputGateHead { display: flex; justify-content: space-between; gap: 8px; align-items: center; min-width: 0; }
    .outputGateHead b { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; font-weight: 850; }
    .outputGateHead span { font-size: 11px; font-weight: 800; white-space: nowrap; }
    .outputGateRows { display: grid; gap: 5px; }
    .outputGateRow { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 6px; align-items: baseline; min-width: 0; padding: 5px 6px; border: 1px solid #E2E8F0; border-radius: 6px; background: rgba(255,255,255,.78); font-size: 11px; }
    .outputGateRow b, .outputGateRow span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .outputGateRow b { color: #111827; }
    .outputGateRow span { color: #64748B; }
    .projectRuleEditor { display: grid; gap: 8px; padding: 9px 10px; border: 1px solid #E2E8F0; border-radius: 8px; background: #FFFFFF; color: #0F172A; }
    .projectRuleEditor summary { cursor: pointer; font-weight: 850; color: #111827; }
    .projectRuleGrid { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 8px; }
    .projectRuleField { display: grid; gap: 4px; min-width: 0; }
    .projectRuleField label { display: flex; gap: 5px; align-items: center; color: #64748B; font-size: 11px; font-weight: 700; }
    .projectRuleField input, .projectRuleField textarea { width: 100%; box-sizing: border-box; border: 1px solid #CBD5E1; border-radius: 6px; padding: 6px 8px; background: #F8FAFC; color: #0F172A; font-family: var(--vscode-font-family); font-size: 12px; }
    .projectRuleField textarea { min-height: 78px; resize: vertical; font-family: Consolas, monospace; }
    .projectRuleField.wide { grid-column: 1 / -1; }
    .projectRuleField.readonly textarea { color: #475569; background: #F1F5F9; }
    .projectRuleActions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; justify-content: space-between; }
    .layoutToolbar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; }
    .layoutToolbar .toolbar { margin: 0; }
    .section-card h2, .section-card h3 { margin-top: 0; }
    .section-card { min-width: 0; }
    .section-card.is-collapsed > :not(.section-head) { display: none !important; }
    .section-card.dragging { opacity: .55; outline: 1px dashed var(--vscode-focusBorder); }
    body.layout-edit .section-card { outline: 1px dashed color-mix(in srgb, var(--vscode-focusBorder) 55%, transparent); }
    .cardTools { display: flex; flex-wrap: wrap; gap: 6px; justify-content: flex-end; align-items: center; }
    .dragHandle { display: none; cursor: grab; user-select: none; color: var(--muted); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 3px 7px; background: var(--subtle-bg); }
    body.layout-edit .dragHandle { display: inline-flex; }
    .collapseBtn { color: var(--vscode-button-secondaryForeground); background: transparent; border-color: var(--border); min-width: 28px; padding: 3px 7px; }
    .taskProgressCards { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 8px; margin: 8px 0; }
    .taskProgressCard { border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 10px; background: var(--subtle-bg); display: grid; gap: 6px; }
    .operationTimeline { display: grid; gap: 6px; }
    .operationItem {
      position: relative;
      display: grid;
      grid-template-columns: 18px minmax(0, 1fr);
      gap: 8px;
      padding: 7px 9px;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: var(--vscode-editor-background);
    }
    .operationItem::before { content: ""; position: absolute; left: 20px; top: 34px; bottom: -12px; width: 1px; background: var(--border); }
    .operationItem:last-child::before { display: none; }
    .operationDot { width: 10px; height: 10px; margin-top: 5px; border-radius: 999px; background: var(--muted); box-shadow: 0 0 0 4px color-mix(in srgb, var(--muted) 16%, transparent); }
    .operationItem.is-running .operationDot { background: var(--info); box-shadow: 0 0 0 4px color-mix(in srgb, var(--info) 16%, transparent); }
    .operationItem.is-completed .operationDot { background: var(--success); box-shadow: 0 0 0 4px color-mix(in srgb, var(--success) 16%, transparent); }
    .operationItem.is-cancelled .operationDot { background: var(--muted); box-shadow: 0 0 0 4px color-mix(in srgb, var(--muted) 16%, transparent); }
    .operationItem.is-failed .operationDot, .operationItem.is-stalled .operationDot { background: var(--danger); box-shadow: 0 0 0 4px color-mix(in srgb, var(--danger) 16%, transparent); }
    .operationBody { min-width: 0; display: grid; gap: 6px; }
    .operationHead { display: flex; justify-content: space-between; gap: 10px; align-items: baseline; }
    .operationTitle { min-width: 0; display: flex; flex-wrap: wrap; gap: 6px; align-items: center; font-weight: 800; }
    .operationId { max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: Consolas, monospace; font-size: 12px; color: var(--muted); }
    .operationMessage { color: var(--muted); font-size: 12px; line-height: 1.45; overflow-wrap: anywhere; }
    .operationError { display: flex; align-items: baseline; gap: 6px; margin-top: 4px; padding: 4px 7px; border-left: 3px solid var(--danger); border-radius: 4px; background: color-mix(in srgb, var(--danger) 8%, var(--vscode-editor-background)); color: #7F1D1D; font-size: 12px; line-height: 1.45; overflow-wrap: anywhere; }
    .operationError b { flex: 0 0 auto; }
    .operationDetails { display: flex; flex-wrap: wrap; gap: 6px; }
    .operationDetailPill { display: inline-flex; gap: 4px; align-items: center; max-width: 100%; padding: 2px 7px; border: 1px solid var(--border); border-radius: 999px; background: var(--subtle-bg); font-size: 11px; color: var(--muted); }
    .operationDetailPill b { max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text); font-variant-numeric: tabular-nums; }
    .operationDetailPill.warn { border-color: #F59E0B; background: #FFFBEB; color: #92400E; }
    .operationDetailPill.error { border-color: #FCA5A5; background: #FEF2F2; color: #991B1B; }
    .operationFileActions { display: grid; gap: 5px; margin-top: 7px; min-width: 0; }
    .operationFileActions > span { color: var(--muted); font-size: 11px; }
    .operationFileEntry { min-width: 0; display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; align-items: center; padding: 5px 0; border-top: 1px solid var(--border); }
    .operationFileReason { min-width: 0; display: grid; gap: 1px; }
    .operationFileReason b, .operationFileReason span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .operationFileReason b { color: var(--text); font-size: 11px; }
    .operationFileReason span { color: var(--danger); font-size: 11px; }
    .operationMeta { display: flex; flex-wrap: wrap; gap: 6px; }
    .operationStatusSummary { display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 5px; margin-bottom: 7px; }
    .operationHiddenSummary { margin: 0 0 7px; padding: 5px 8px; border: 1px solid var(--border); border-left: 4px solid #CBD5E1; border-radius: var(--radius-sm); background: var(--subtle-bg); color: var(--muted); font-size: 11px; }
    .operationStatusCard { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: baseline; gap: 6px; min-height: 42px; padding: 6px 8px; border: 1px solid var(--border); border-left: 4px solid #94A3B8; border-radius: 6px; background: var(--vscode-input-background); color: var(--text); text-align: left; }
    .operationStatusCard:hover:not(:disabled) { border-color: var(--vscode-focusBorder); }
    .operationStatusCard.is-active { outline: 2px solid var(--vscode-focusBorder); outline-offset: -2px; }
    .operationStatusCard:disabled { opacity: .55; cursor: default; }
    .operationStatusCard.running { border-left-color: #2563EB; }
    .operationStatusCard.completed { border-left-color: #16A34A; }
    .operationStatusCard.cancelled { border-left-color: #64748B; }
    .operationStatusCard.failed { border-left-color: #DC2626; background: #FEF2F2; color: #0F172A; }
    .operationStatusCard.accepted { border-left-color: #D97706; background: #FFFBEB; color: #0F172A; }
    .operationStatusCard span { color: var(--muted); font-size: var(--zlk-font-sm); }
    .operationStatusCard b { font-size: var(--zlk-font-status); font-weight: 850; font-variant-numeric: tabular-nums; }
    .tree-inspector-facts { display: none; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; margin-top: 4px; }
    .tree-inspector-fact { display: grid; gap: 2px; padding: 6px 7px; border: 1px solid var(--border); border-radius: 6px; background: var(--vscode-input-background); }
    .tree-inspector-fact span { color: var(--muted); font-size: 10px; }
    .tree-inspector-fact b { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; }
    .tree-inspector-action { display: none; margin-top: 4px; padding: 7px 8px; border: 1px solid var(--border); border-radius: 6px; background: color-mix(in srgb, var(--vscode-focusBorder) 8%, var(--vscode-input-background) 92%); color: var(--muted); font-size: 11px; line-height: 1.4; }
    .planQuickGrid { display: grid; grid-template-columns: minmax(0, 1fr) auto auto auto; gap: 8px; align-items: end; }
    .runModeBar { grid-column: 1 / -1; display: flex; align-items: center; gap: 8px; min-width: 0; }
    .runModeSwitch { display: inline-flex; gap: 2px; padding: 2px; border: 1px solid var(--border); border-radius: 6px; background: var(--subtle-bg); }
    .runModeSwitch button { min-height: 26px; padding: 3px 9px; border-color: transparent; background: transparent; color: var(--muted); }
    .runModeSwitch button.is-active { background: var(--vscode-button-background); color: var(--vscode-button-foreground); }
    .runModeNote { color: var(--muted); font-size: 11px; overflow-wrap: anywhere; }
    body.debug-run-mode .runModeNote { color: var(--warning); }
    .workbench-summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 8px; }
    .workbench-summary .row { border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--subtle-bg); padding: 8px; grid-template-columns: 92px minmax(0, 1fr); }
    .overviewOpsWorkbench { display: grid; gap: 10px; grid-column: 1 / -1; }
    .commandCenter { display: grid; gap: 8px; padding: 10px; border: 1px solid #CBD5E1; border-radius: 10px; background: rgba(255,255,255,.9); }
    .commandCenterHead { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; align-items: baseline; }
    .commandCenterGrid { display: none; }
    .clusterRuntimeOverview { display: grid; gap: 8px; padding: 10px; border: 1px solid var(--border); border-left: 4px solid #CBD5E1; border-radius: 10px; background: rgba(255,255,255,.90); color: #0F172A; }
    .runtimeOverviewHead { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 10px; align-items: start; }
    .runtimeOverviewTitle { display: block; min-width: 0; }
    .runtimeOverviewTitle b { color: #111827; font-size: var(--zlk-font-lg); font-weight: 850; }
    .runtimeOverviewChips { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 5px; min-width: 0; }
    .runtimeOverviewChip { display: inline-flex; max-width: 100%; align-items: center; gap: 4px; padding: 2px 7px; border: 1px solid #CBD5E1; border-radius: 999px; background: #F8FAFC; color: #475569; font-size: var(--zlk-font-sm); font-weight: 750; overflow-wrap: anywhere; }
    .runtimeOverviewChip.good { border-color: #BBF7D0; background: #F0FDF4; color: #15803D; }
    .runtimeOverviewChip.warn { border-color: #FDE68A; background: #FFFBEB; color: #B45309; }
    .runtimeOverviewChip.error { border-color: #FCA5A5; background: #FEF2F2; color: #DC2626; }
    .runtimeOverviewChip.mine { border-color: #C4B5FD; background: #F5F3FF; color: #6D28D9; }
    .clusterRuntimeOverview .overviewStatusGrid { grid-template-columns: repeat(auto-fit, minmax(172px, 1fr)); gap: 7px; }
    .clusterRuntimeOverview .overviewRiskBand { padding: 0; border: 0; background: transparent; }
    .overviewStatusGrid { display: grid; grid-template-columns: repeat(auto-fit, minmax(196px, 1fr)); gap: 8px; }
    .overviewStatusCard {
      position: relative;
      overflow: hidden;
      display: grid;
      gap: 5px;
      min-width: 0;
      padding: 7px 8px 7px 10px;
      border: 1px solid var(--border);
      border-left: 4px solid #94A3B8;
      border-radius: 8px;
      background: #FAFBFC;
      color: #0F172A;
      box-shadow: 0 6px 16px rgba(15, 23, 42, .05);
    }
    .overviewStatusCard.good { border-left-color: #16A34A; }
    .overviewStatusCard.warn { border-left-color: #D97706; background: #FFFBEB; }
    .overviewStatusCard.error { border-left-color: #DC2626; background: #FEF2F2; }
    .overviewStatusCard.info { border-left-color: #2563EB; }
    .overviewStatusCard.mine { border-left-color: #7C3AED; background: #F5F3FF; border-color: #C4B5FD; }
    .overviewCardHead { display: grid; grid-template-columns: minmax(0, 1fr) minmax(4.5em, auto) auto; gap: 6px; align-items: center; min-width: 0; }
    .overviewCardTitle { display: grid; gap: 0; min-width: 0; }
    .overviewCardTitle b { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #111827; font-size: var(--zlk-font-md); font-weight: 800; }
    .overviewCardValue { max-width: none; min-width: 0; overflow-wrap: anywhere; text-align: right; color: #0F172A; font-size: var(--zlk-font-status); font-weight: 850; line-height: 1.2; font-variant-numeric: tabular-nums; white-space: normal; }
    .overviewStatusCard.good .overviewCardValue { color: #15803D; }
    .overviewStatusCard.warn .overviewCardValue { color: #B45309; }
    .overviewStatusCard.error .overviewCardValue { color: #DC2626; }
    .overviewStatusCard.mine .overviewCardValue { color: #6D28D9; }
    .overviewMiniGrid { display: flex; flex-wrap: wrap; gap: 4px; }
    .overviewMini { display: inline-grid; grid-template-columns: auto auto; gap: 4px; min-width: 0; max-width: 100%; padding: 3px 6px; border: 1px solid #E2E8F0; border-radius: 999px; background: #FFFFFF; align-items: baseline; }
    .overviewMini span { color: #64748B; font-size: var(--zlk-font-sm); }
    .overviewMini b { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #0F172A; font-size: var(--zlk-font-md); font-weight: 800; }
    .statusInfoPopover { position: relative; justify-self: end; align-self: center; }
    .statusInfoPopover summary { list-style: none; cursor: pointer; width: 20px; height: 20px; display: inline-flex; align-items: center; justify-content: center; border: 1px solid #CBD5E1; border-radius: 999px; background: #F8FAFC; color: #475569; font-size: 11px; font-weight: 850; user-select: none; }
    .statusInfoPopover summary::-webkit-details-marker { display: none; }
    .statusInfoPopoverBody { position: absolute; right: 0; z-index: 30; width: min(280px, 78vw); margin-top: 5px; padding: 8px 9px; border: 1px solid #CBD5E1; border-radius: 8px; background: #FFFFFF; box-shadow: 0 18px 40px rgba(15,23,42,.16); color: #334155; font-size: 11px; line-height: 1.45; }
    .overviewRiskBand { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; padding: 9px 10px; border: 1px solid var(--border); border-radius: 8px; background: color-mix(in srgb, var(--card-bg) 92%, var(--vscode-input-background) 8%); }
    .communicationMatrix { display: grid; gap: 7px; padding: 8px; border: 1px solid var(--border); border-radius: 8px; background: #FFFFFF; color: #0F172A; }
    .communicationMatrixHead { display: flex; justify-content: space-between; gap: 10px; align-items: baseline; }
    .communicationMatrixHead b { font-size: 13px; font-weight: 850; color: #111827; }
    .communicationMatrixGrid { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 8px; }
    .communicationPathCard { display: grid; gap: 5px; min-width: 0; padding: 8px 9px; border: 1px solid #E2E8F0; border-left: 4px solid #CBD5E1; border-radius: 8px; background: #FAFBFC; }
    .communicationPathCard.good { border-left-color: #16A34A; }
    .communicationPathCard.warn { border-left-color: #D97706; background: #FFFBEB; }
    .communicationPathCard.info { border-left-color: #2563EB; }
    .communicationPathCard b { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; color: #111827; }
    .communicationPathCard span { color: #64748B; font-size: 11px; line-height: 1.25; }
    .communicationPathMeta { display: flex; flex-wrap: wrap; gap: 5px; }
    .overviewLegacyRows { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 8px; }
    .overviewLegacyRows .row { border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--subtle-bg); padding: 8px; grid-template-columns: 92px minmax(0, 1fr); }
    .param-list { display: grid; gap: 6px; }
    .param-row { display: grid; grid-template-columns: minmax(120px, .4fr) minmax(0, 1fr); gap: 8px; align-items: start; padding: 8px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--subtle-bg); }
    .param-row.important { border-color: color-mix(in srgb, var(--success) 44%, var(--border)); background: color-mix(in srgb, var(--success) 8%, var(--subtle-bg)); }
    .param-key { display: flex; flex-wrap: wrap; gap: 5px; align-items: center; min-width: 0; font-size: 12px; font-weight: 650; overflow-wrap: anywhere; }
    .param-value { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: Consolas, monospace; font-size: 12px; }
    .empty-state { min-height: 78px; display: grid; place-items: center; text-align: center; color: var(--muted); border: 1px dashed var(--border); border-radius: var(--radius-sm); padding: 16px; background: color-mix(in srgb, var(--card-bg) 70%, transparent); }
    .initial-state-notice { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 8px 12px; border-bottom: 1px solid var(--border); color: var(--muted); background: var(--subtle-bg); }
    .initial-state-notice[hidden] { display: none; }
    .section-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
    .section-title { display: grid; gap: 3px; min-width: 0; }
    .section-desc { font-size: 12px; color: var(--muted); }
    .table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .table th, .table td { border-bottom: 1px solid var(--vscode-panel-border); padding: 4px 6px; text-align: left; vertical-align: top; }
    .taskWorkbench { display: grid; grid-template-columns: minmax(0, 1fr) 360px; gap: 12px; align-items: start; }
    #taskTable { overflow-x: auto; padding-bottom: 4px; }
    #taskTable .table { min-width: 1120px; }
    #taskTable .table th:last-child, #taskTable .table td:last-child { min-width: 230px; }
    .taskScopeBar { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-bottom: 6px; }
    .taskScopeSwitch { display: inline-flex; gap: 2px; padding: 2px; border: 1px solid var(--border); border-radius: 6px; background: var(--subtle-bg); }
    .taskScopeSwitch button { min-height: 24px; padding: 3px 8px; border-color: transparent; background: transparent; color: var(--muted); }
    .taskScopeSwitch button.is-active { background: var(--vscode-button-background); color: var(--vscode-button-foreground); }
    .taskDetailPane { position: static; align-self: start; min-width: 0; display: grid; gap: 10px; padding: 12px; border: 1px solid var(--border); border-radius: var(--radius); background: var(--vscode-editor-background); }
    .taskDetailPane h3 { margin: 0; font-size: 13px; }
    .detailHeader { display: flex; justify-content: space-between; gap: 10px; align-items: flex-start; min-width: 0; padding-bottom: 8px; border-bottom: 1px solid var(--border); }
    .detailHeaderText { display: grid; gap: 3px; min-width: 0; }
    .detailHeaderText h3 { margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; font-weight: 850; }
    .detailHeaderText span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--muted); font-size: 11px; }
    .detailBadge { display: inline-flex; align-items: center; min-height: 20px; padding: 1px 8px; border: 1px solid var(--border); border-radius: 999px; background: var(--subtle-bg); color: var(--muted); font-size: 11px; font-weight: 800; white-space: nowrap; }
    .detailBadge.good { color: #16A34A; background: #F0FDF4; border-color: #BBF7D0; }
    .detailBadge.warn { color: #B45309; background: #FFFBEB; border-color: #FDE68A; }
    .detailBadge.error { color: #DC2626; background: #FEF2F2; border-color: #FCA5A5; }
    .detailTabs { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; }
    .traceDetailPane .detailTabs { grid-template-columns: repeat(auto-fit, minmax(82px, 1fr)); }
    .detailTab { display: grid; gap: 2px; padding: 7px 8px; border: 1px solid var(--border); border-radius: 6px; background: var(--subtle-bg); }
    .detailTab b { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11px; color: var(--text); }
    .detailTab span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--muted); font-size: 10px; }
    .detailLogLabel { display: flex; justify-content: space-between; gap: 8px; align-items: center; color: var(--muted); font-size: 11px; font-weight: 700; }
    .taskDetailMeta { display: grid; gap: 6px; }
    .taskDetailLine { display: grid; grid-template-columns: 76px minmax(0, 1fr); gap: 6px; font-size: 12px; }
    .taskDetailLine span:first-child { color: var(--muted); }
    .taskDetailLine span:last-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .taskDetailLog { max-height: 260px; margin: 0; font-size: 11px; }
    .taskReadinessGrid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 5px; }
    .taskReadinessItem { display: grid; gap: 1px; min-width: 0; padding: 5px 7px; border: 1px solid var(--border); border-left: 3px solid #94A3B8; border-radius: 6px; background: var(--subtle-bg); }
    .taskReadinessItem.good { border-left-color: #16A34A; }
    .taskReadinessItem.warn { border-left-color: #D97706; background: #FFFBEB; }
    .taskReadinessItem.error { border-left-color: #DC2626; background: #FEF2F2; }
    .taskReadinessItem span { color: var(--muted); font-size: 11px; }
    .taskReadinessItem b { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--vscode-foreground); font-size: 12px; }
    .taskTimeline { display: grid; gap: 5px; padding: 6px 0 0; border-top: 1px solid var(--border); }
    .taskTimelineItem { position: relative; display: grid; gap: 1px; padding-left: 14px; font-size: 12px; }
    .taskTimelineItem::before { content: ""; position: absolute; left: 2px; top: 5px; width: 7px; height: 7px; border-radius: 999px; background: #94A3B8; }
    .taskTimelineItem.good::before { background: #16A34A; }
    .taskTimelineItem.warn::before { background: #D97706; }
    .taskTimelineItem.error::before { background: #DC2626; }
    .taskTimelineItem b { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--vscode-foreground); }
    .taskTimelineItem span { color: var(--muted); line-height: 1.35; }
    .resultWorkbench { display: grid; grid-template-columns: minmax(0, 1fr) 360px; gap: 12px; align-items: start; }
    .traceList { display: grid; gap: 10px; }
    .traceCard { position: relative; overflow: hidden; display: grid; gap: 8px; padding: 10px 12px 10px 16px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--vscode-editor-background); }
    .traceCard::before { content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: #94A3B8; }
    .traceCard:has(.status-completed)::before { background: #16A34A; }
    .traceCard:has(.status-failed)::before { background: #DC2626; }
    .traceCard:has(.status-warning)::before { background: #D97706; }
    .traceCard.status-completed::before { background: #16A34A; }
    .traceCard.status-failed::before { background: #DC2626; }
    .traceCard.status-warning::before { background: #D97706; }
    .traceCard.selectedRow { border-color: var(--vscode-focusBorder); box-shadow: inset 0 0 0 1px var(--vscode-focusBorder); }
    .traceCardHead { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 10px; align-items: start; }
    .traceTitle { min-width: 0; display: flex; flex-wrap: wrap; gap: 6px; align-items: center; font-weight: 800; }
    .traceMetaGrid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 6px; }
    .traceDetailPane { position: static; align-self: start; min-width: 0; display: grid; gap: 10px; padding: 12px; border: 1px solid var(--border); border-radius: var(--radius); background: var(--vscode-editor-background); }
    .traceDetailPane h3 { margin: 0; font-size: 13px; }
    .tracePath { margin: 0; padding: 8px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--subtle-bg); color: var(--muted); font-family: Consolas, monospace; font-size: 12px; white-space: pre-wrap; overflow-wrap: anywhere; }
    .traceReadinessGrid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 5px; }
    .traceReadinessItem { display: grid; gap: 1px; min-width: 0; padding: 5px 7px; border: 1px solid var(--border); border-left: 3px solid #94A3B8; border-radius: 6px; background: var(--subtle-bg); }
    .traceReadinessItem.good { border-left-color: #16A34A; }
    .traceReadinessItem.warn { border-left-color: #D97706; background: #FFFBEB; }
    .traceReadinessItem.error { border-left-color: #DC2626; background: #FEF2F2; }
    .traceReadinessItem span { color: var(--muted); font-size: 11px; }
    .traceReadinessItem b { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--vscode-foreground); font-size: 12px; }
    .traceTimeline { display: grid; gap: 5px; padding: 6px 0 0; border-top: 1px solid var(--border); }
    .traceTimelineItem { position: relative; display: grid; gap: 1px; padding-left: 14px; font-size: 12px; }
    .traceTimelineItem::before { content: ""; position: absolute; left: 2px; top: 5px; width: 7px; height: 7px; border-radius: 999px; background: #94A3B8; }
    .traceTimelineItem.good::before { background: #16A34A; }
    .traceTimelineItem.warn::before { background: #D97706; }
    .traceTimelineItem.error::before { background: #DC2626; }
    .traceTimelineItem b { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--vscode-foreground); }
    .traceTimelineItem span { color: var(--muted); line-height: 1.35; }
    .resultEvidenceWorkbench { display: grid; gap: 10px; margin: 8px 0 12px; padding: 10px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: color-mix(in srgb, var(--card-bg) 92%, var(--vscode-input-background) 8%); }
    .resultEvidenceRows { display: grid; gap: 6px; }
    .resultEvidenceRow { display: grid; grid-template-columns: minmax(92px, 140px) minmax(0, 1fr) auto auto; gap: 8px; align-items: center; min-width: 0; padding: 7px 8px; border: 1px solid var(--border); border-left: 4px solid #94A3B8; border-radius: 7px; background: #FAFBFC; color: #0F172A; }
    .resultEvidenceRow.good { border-left-color: #16A34A; }
    .resultEvidenceRow.warn { border-left-color: #D97706; background: #FFFBEB; }
    .resultEvidenceRow.info { border-left-color: #2563EB; }
    .resultEvidenceRow.mine { border-left-color: #7C3AED; background: #F5F3FF; border-color: #C4B5FD; }
    .resultEvidenceName { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #111827; font-size: 12px; font-weight: 850; }
    .resultEvidenceFacts { display: flex; flex-wrap: wrap; gap: 4px; min-width: 0; }
    .resultEvidenceFact { display: inline-flex; gap: 4px; max-width: 100%; min-width: 0; padding: 2px 6px; border: 1px solid #E2E8F0; border-radius: 999px; background: #FFFFFF; font-size: 11px; align-items: baseline; }
    .resultEvidenceFact span { color: #64748B; }
    .resultEvidenceFact b { min-width: 0; max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #0F172A; font-weight: 850; }
    .resultEvidenceMore { justify-self: end; }
    .resultEvidenceMore .statusInfoPopoverBody { display: grid; gap: 6px; width: min(340px, 82vw); }
    .resultEvidenceMiniGrid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 5px; }
    .resultEvidenceMini { display: grid; gap: 2px; min-width: 0; padding: 5px 6px; border: 1px solid #E2E8F0; border-radius: 6px; background: #FFFFFF; }
    .resultEvidenceMini span { color: #64748B; font-size: 11px; }
    .resultEvidenceMini b { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #0F172A; font-size: 12px; }
    .pptPlotConfig { display: grid; gap: 8px; margin: 8px 0 10px; padding: 10px; border: 1px solid var(--border); border-radius: 7px; background: color-mix(in srgb, var(--card-bg) 90%, var(--vscode-input-background) 10%); }
    .pptPlotConfigGrid { display: grid; grid-template-columns: minmax(180px, 1fr) 110px 130px; gap: 8px; align-items: end; }
    .pptPathInputRow { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; gap: 6px; align-items: center; }
    .pptPathInputRow button { white-space: nowrap; padding: 5px 8px; }
    .pptPlotActions { display: flex; flex-wrap: wrap; gap: 6px; }
    .pptPlotInline { display: inline-flex; align-items: center; gap: 6px; margin-left: 6px; vertical-align: middle; }
    .pptPlotInline button { padding: 3px 7px; font-size: 11px; }
    .claimEvidenceList { display: grid; gap: 6px; }
    .claimEvidenceRow { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; align-items: center; padding: 7px 9px; border: 1px solid #E2E8F0; border-left: 3px solid #94A3B8; border-radius: 6px; background: #FFFFFF; color: #0F172A; }
    .claimEvidenceRow.supported { border-left-color: #16A34A; }
    .claimEvidenceRow.unsupported { border-left-color: #DC2626; background: #FEF2F2; }
    .claimEvidenceRow.needs { border-left-color: #D97706; background: #FFFBEB; }
    .claimEvidenceText { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; font-weight: 650; }
    .claimEvidenceMeta { color: #64748B; font-size: 11px; white-space: nowrap; }
    .capabilityBar { display: flex; flex-wrap: wrap; gap: 5px; margin: 6px 0 10px; }
    .capabilityItem { display: inline-flex; align-items: baseline; gap: 6px; min-width: 0; max-width: 100%; padding: 4px 7px; border: 1px solid #E2E8F0; border-left: 3px solid #94A3B8; border-radius: 6px; background: #FFFFFF; color: #0F172A; font-size: 11px; }
    .capabilityItem.ok { border-left-color: #16A34A; }
    .capabilityItem.warn { border-left-color: #D97706; background: #FFFBEB; }
    .capabilityItem span { color: #64748B; white-space: nowrap; }
    .capabilityItem b { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 850; }
    .featureReadiness { display: grid; gap: 8px; margin: 8px 0 12px; }
    .featureReadinessList { display: grid; gap: 4px; }
    .featureReadinessRow { display: grid; grid-template-columns: minmax(0, 1fr) auto auto auto auto; gap: 8px; align-items: center; min-width: 0; padding: 4px 7px; border: 1px solid #E2E8F0; border-left: 3px solid #CBD5E1; border-radius: 6px; background: #FFFFFF; color: #0F172A; font-size: 11px; }
    .featureReadinessRow.good { border-left-color: #16A34A; }
    .featureReadinessRow.warn { border-left-color: #D97706; background: #FFFBEB; }
    .featureReadinessRow.error { border-left-color: #DC2626; background: #FEF2F2; }
    .featureReadinessName { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 750; }
    .featureReadinessStatus { color: #0F172A; font-weight: 850; white-space: nowrap; }
    .featureReadinessMetric { color: #64748B; white-space: nowrap; }
    .featureAuditBar { display: flex; flex-wrap: wrap; gap: 5px; }
    .featureAuditPill { display: inline-flex; align-items: baseline; gap: 6px; max-width: 100%; min-width: 0; padding: 4px 7px; border: 1px solid #E2E8F0; border-left: 3px solid #94A3B8; border-radius: 6px; background: #FFFFFF; color: #0F172A; font-size: 11px; }
    .featureAuditPill.good { border-left-color: #16A34A; }
    .featureAuditPill.warn { border-left-color: #D97706; background: #FFFBEB; }
    .featureAuditPill.error { border-left-color: #DC2626; background: #FEF2F2; }
    .featureAuditPill span { color: #64748B; white-space: nowrap; }
    .featureAuditPill b { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 850; }
    .targetMatrix { display: grid; gap: 4px; margin: 6px 0 10px; }
    .targetMatrixList { display: grid; gap: 4px; }
    .targetMatrixRow { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; gap: 8px; align-items: center; min-width: 0; padding: 4px 7px; border: 1px solid #E2E8F0; border-left: 3px solid #CBD5E1; border-radius: 6px; background: #FFFFFF; color: #0F172A; font-size: 11px; }
    .targetMatrixRow.done { border-left-color: #16A34A; }
    .targetMatrixRow.partial { border-left-color: #D97706; background: #FFFBEB; }
    .targetMatrixRow.later { border-left-color: #94A3B8; background: #F8FAFC; }
    .targetMatrixName { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 750; }
    .targetMatrixStatus { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 130px; color: #0F172A; font-weight: 800; }
    .targetEvidenceCount { color: #64748B; white-space: nowrap; }
    .errorList { display: grid; gap: 4px; margin: 6px 0 10px; }
    .errorRow { display: grid; grid-template-columns: minmax(90px, 150px) auto minmax(0, 1fr); gap: 8px; align-items: center; min-width: 0; padding: 4px 7px; border: 1px solid color-mix(in srgb, var(--danger) 28%, var(--border)); border-left: 3px solid var(--danger); border-radius: 6px; background: color-mix(in srgb, var(--danger) 6%, var(--vscode-editor-background)); color: #0F172A; font-size: 11px; }
    .errorRowSuggestion { grid-column: 1 / -1; color: var(--muted); overflow-wrap: anywhere; }
    .errorRowCommand { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 850; }
    .errorRowTime { color: #64748B; white-space: nowrap; }
    .errorRowMessage { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .taskCardList { display: grid; gap: 12px; }
    .taskRenderBudgetNotice { padding: 8px 10px; margin-bottom: 10px; border: 1px solid #CBD5E1; border-left: 4px solid #94A3B8; border-radius: 8px; background: #F8FAFC; color: #475569; font-size: 12px; }
    .task-card {
      --task-status-color: #2563EB;
      --task-border-color: #BFDBFE;
      --task-bg: #FAFBFC;
      position: relative;
      display: grid;
      gap: 10px;
      padding: 14px 16px 14px 20px;
      border: 1.5px solid var(--task-border-color);
      border-radius: 8px;
      background: var(--task-bg);
      color: #0F172A;
      overflow: hidden;
    }
    .task-card::before { content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: var(--task-status-color); }
    .task-card.is-queued { --task-status-color: #D97706; --task-border-color: #FDE68A; }
    .task-card.is-running, .task-card.is-testing { --task-status-color: #2563EB; --task-border-color: #BFDBFE; }
    .task-card.is-completed { --task-status-color: #16A34A; --task-border-color: #BBF7D0; }
    .task-card.is-failed, .task-card.is-stopped { --task-status-color: #DC2626; --task-border-color: #FCA5A5; }
    .task-card.delete-pending { --task-status-color: #DC2626; --task-border-color: #FCA5A5; --task-bg: #FEF2F2; }
    .task-card.selectedRow { outline: 1px solid var(--vscode-focusBorder); }
    .taskCardHead { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 10px; align-items: start; }
    .taskSelectBox { position: relative; z-index: 1; flex: 0 0 16px; align-self: start; }
    .taskTitle { min-width: 0; display: flex; flex-wrap: wrap; align-items: center; gap: 7px; }
    .taskTitle b { color: #111827; font-size: 14px; font-weight: 800; }
    .planCardHead { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 10px; align-items: start; }
    .planCardActions { grid-column: 1 / -1; display: flex; flex-wrap: wrap; gap: 6px; align-items: center; justify-content: flex-start; }
    @media (min-width: 760px) {
      .planCardHead { grid-template-columns: auto minmax(0, 1fr) minmax(300px, max-content); }
      .planCardActions { grid-column: auto; justify-content: flex-end; }
    }
    .taskFacts { display: flex; flex-wrap: wrap; gap: 5px 14px; align-items: center; }
    .taskFacts .taskMetric { flex: 1 1 150px; }
    .taskMetric { display: grid; gap: 2px; min-width: 0; }
    .taskMetric .metric-label { text-align: left; }
    .taskMetric .metric-value { text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .taskActionPending { display: inline-flex; align-items: center; gap: 5px; border: 1px solid #FCA5A5; border-radius: 999px; background: #FEF2F2; color: #DC2626; font-size: 11px; font-weight: 800; padding: 2px 8px; }
    .taskActions { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
    .taskActionButton { min-height: 30px; padding: 6px 10px; font-size: 12px; line-height: 1.2; border-radius: var(--radius-sm); }
    .taskLogRow { display: block; }
    .taskLogRow td { padding: 0 6px 8px; background: color-mix(in srgb, var(--card-bg) 86%, transparent); }
    .taskLogDetails { border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--subtle-bg); padding: 7px 9px; }
    .taskLogDetails summary { cursor: pointer; color: var(--muted); }
    .taskLogPre { max-height: 220px; margin: 8px 0 0; background: var(--vscode-textCodeBlock-background); }
    .taskLogMeta { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
    .clipCell { display: inline-block; max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; vertical-align: top; }
    .clipCell.wide { max-width: 280px; }
    .clipCell.narrow { max-width: 150px; }
    .selectedRow { outline: 1px solid var(--vscode-focusBorder); }
    .status-running, .status-testing, .status-queued { color: var(--vscode-testing-iconQueued); font-weight: 600; }
    .status-completed { color: var(--vscode-testing-iconPassed); }
    .status-failed { color: var(--vscode-testing-iconFailed); font-weight: 600; }
    .status-warning { color: var(--vscode-editorWarning-foreground); }
    .progressTrack { height: 6px; background: var(--vscode-editorWidget-background); border-radius: 3px; overflow: hidden; min-width: 70px; }
    .progressBar { height: 6px; background: var(--vscode-progressBar-background); }
    .pill, .status-chip { display: inline-flex; align-items: center; gap: 5px; min-height: 20px; border: 1px solid var(--border); border-radius: 999px; padding: 1px 7px; background: var(--subtle-bg); color: var(--muted); font-size: 12px; }
    .pill.taskLivePill { border-color: #BFD4EA; background: #EEF4FB; color: #1F4E79; }
    .taskRenderBudgetNotice .muted { margin-left: 6px; }
    .mini { padding: 3px 6px; font-size: 11px; }
    .gpuServer {
      display: grid;
      gap: 12px;
      padding: 14px;
      border: 1px solid #D9E2EC;
      border-radius: 8px;
      background: #FFFFFF;
      color: #0F172A;
    }
    .gpuServerHead { display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: 10px; margin-bottom: 0; }
    .gpuServerTitle { display: flex; flex-wrap: wrap; align-items: baseline; gap: 7px; color: #111827; font-size: 15px; font-weight: 800; }
    .gpuServerAlias { color: #64748B; font-size: 13px; font-weight: 600; }
    .gpuServerStatus { font-size: 13px; font-weight: 700; }
    .gpuServerStatus.online { color: #16A34A; }
    .gpuServerStatus.stale { color: #D97706; }
    .gpuServerStatus.offline, .gpuServerStatus.failed { color: #DC2626; }
    .gpuHistoryPanel { display: grid; gap: 10px; margin-bottom: 12px; padding: 10px 12px; border: 1px solid var(--border); border-radius: 6px; background: var(--subtle-bg); }
    .gpuHistoryPanel > summary { cursor: pointer; color: var(--vscode-foreground); font-size: 13px; font-weight: 800; }
    .gpuHistoryPanelBody { display: grid; gap: 8px; min-width: 0; }
    .gpuHistoryChart { display: grid; gap: 7px; min-width: 0; padding: 8px; border: 1px solid var(--border); border-radius: 6px; background: var(--card-bg); }
    .gpuHistoryChartHead { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 6px 12px; }
    .gpuHistoryChartTitle { color: var(--vscode-foreground); font-size: 12px; font-weight: 800; }
    .gpuHistoryChartMeta { color: var(--vscode-descriptionForeground); font-size: 11px; }
    .gpuHistoryCanvasWrap { position: relative; min-width: 0; }
    .gpuHistoryCanvas { display: block; width: 100%; height: 190px; min-height: 150px; border: 1px solid var(--border); border-radius: 4px; background: var(--vscode-editor-background); outline: none; }
    .gpuHistoryCanvas:focus { border-color: var(--vscode-focusBorder); box-shadow: 0 0 0 1px var(--vscode-focusBorder); }
    .gpuHistoryTooltip { position: absolute; top: 6px; left: 6px; z-index: 2; max-width: min(320px, calc(100% - 12px)); padding: 5px 7px; border: 1px solid var(--vscode-focusBorder); border-radius: 4px; background: var(--vscode-editorHoverWidget-background, var(--vscode-editorWidget-background)); color: var(--vscode-editorHoverWidget-foreground, var(--vscode-foreground)); font-size: 11px; line-height: 1.4; box-shadow: 0 4px 12px rgba(0, 0, 0, .18); pointer-events: none; }
    .gpuHistoryLegend { display: flex; flex-wrap: wrap; gap: 5px 8px; align-items: center; }
    .gpuLegendItem { display: inline-flex; align-items: center; gap: 5px; min-height: 24px; padding: 2px 5px; border: 1px solid transparent; border-radius: 4px; background: transparent; color: var(--vscode-foreground); font: inherit; font-size: 11px; cursor: pointer; }
    .gpuLegendItem:hover, .gpuLegendItem:focus-visible { border-color: var(--vscode-focusBorder); background: var(--vscode-list-hoverBackground); outline: none; }
    .gpuLegendSwatch { width: 18px; height: 3px; flex: 0 0 auto; border-radius: 2px; }
    .gpuHistorySummary { color: var(--vscode-descriptionForeground); font-size: 11px; line-height: 1.45; }
    .gpuHistoryGap { color: var(--vscode-editorWarning-foreground); }
    .gpuHistoryDetails { display: grid; gap: 8px; margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--border); }
    .gpuHistoryDetails > summary { cursor: pointer; color: var(--vscode-textLink-foreground); font-size: 11px; font-weight: 700; }
    .gpuHistoryStatus { color: var(--vscode-descriptionForeground); font-size: 11px; }
    .gpuHistoryStatus.error { color: var(--vscode-errorForeground); }
    .gpuHistoryStatus.stale { color: var(--vscode-editorWarning-foreground); }
    .gpuList { display: grid; gap: 12px; }
    .gpu-row {
      --gpu-status-color: #16A34A;
      --gpu-border-color: #BBF7D0;
      --gpu-progress-color: #22C55E;
      --gpu-status-text: #15803D;
      --gpu-card-bg: #FAFBFC;
      position: relative;
      isolation: isolate;
      overflow: hidden;
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 12px 18px;
      align-items: start;
      min-width: 0;
      padding: 14px 16px 14px 20px;
      border: 1.5px solid var(--gpu-border-color);
      border-radius: 8px;
      background: var(--gpu-card-bg);
      color: #0F172A;
      transition: border-color 140ms ease, background-color 140ms ease, box-shadow 140ms ease;
    }
    .gpu-row::before { content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: transparent; }
    .gpu-row.is-occupied::before, .gpu-row.is-mine::before { background: var(--gpu-status-color); }
    .gpu-row.is-free { --gpu-status-color: #16A34A; --gpu-border-color: #BBF7D0; --gpu-progress-color: #22C55E; --gpu-status-text: #15803D; }
    .gpu-row.is-occupied { --gpu-status-color: #2563EB; --gpu-border-color: #BFDBFE; --gpu-progress-color: #2563EB; --gpu-status-text: #1D4ED8; }
    .gpu-row.is-mine { --gpu-status-color: #7C3AED; --gpu-border-color: #C4B5FD; --gpu-progress-color: #8B5CF6; --gpu-status-text: #6D28D9; --gpu-card-bg: #F5F3FF; box-shadow: 0 0 0 1px rgba(124, 58, 237, .06); }
    .gpu-row.mem-danger:not(.is-mine) { --gpu-status-color: #DC2626; --gpu-border-color: #FCA5A5; --gpu-progress-color: #EF4444; --gpu-status-text: #DC2626; }
    .gpu-row:hover { box-shadow: 0 8px 20px rgba(15, 23, 42, .08); }
    .gpu-main { display: grid; gap: 8px; min-width: 0; }
    .gpu-main .line { overflow-wrap: anywhere; color: #334155; font-size: 12px; }
    .gpu-title { display: flex; flex-wrap: wrap; gap: 7px; align-items: center; min-width: 0; }
    .gpu-title b { color: #0F172A; font-size: 14px; font-weight: 800; }
    .gpu-model { border: 1px solid #D9E2EC; border-radius: 999px; padding: 2px 8px; color: #334155; background: #FFFFFF; font-size: 12px; font-weight: 700; }
    .gpu-id { color: #64748B; font-size: 12px; font-weight: 600; }
    .myTaskBadge, .gpuServerMineBadge { display: inline-flex; align-items: center; border: 1px solid #C4B5FD; border-radius: 999px; background: #EDE9FE; color: #6D28D9; font-size: 11px; font-weight: 700; padding: 2px 8px; }
    .gpuServerMineBadge { margin-left: 2px; }
    .gpu-metrics { display: grid; grid-template-columns: repeat(2, max-content); gap: 10px 20px; align-items: start; justify-content: end; white-space: nowrap; }
    .metric { display: grid; gap: 3px; min-width: 66px; text-align: right; font-variant-numeric: tabular-nums; }
    .metric-label { color: #64748B; font-size: 12px; font-weight: 500; }
    .metric-value { color: #0F172A; font-size: 14px; font-weight: 800; }
    .metric-value.statusValue { color: var(--gpu-status-text); }
    .metric-value.statusValue.mine { color: #6D28D9; font-weight: 800; }
    .metric-value.statusValue.stale { color: #92400E; font-style: italic; }
    .gpu-row.is-stale { border-style: dashed; }
    .gpuServerStatusGroup { display: inline-flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .pill.gpuServerFreshness.stale { border-color: #E5C07B; background: #FEF6E7; color: #92400E; }
    .metric-value.warn { color: #D97706; font-weight: 800; }
    .metric-value.danger { color: #DC2626; font-weight: 800; }
    .progress-line { display: grid; grid-template-columns: minmax(120px, 1fr) auto; gap: 10px; align-items: center; }
    .progress-bar { height: 10px; min-width: 120px; border-radius: 999px; overflow: hidden; background: #E2E8F0; }
    .progress-fill { height: 100%; border-radius: inherit; background: var(--gpu-progress-color); }
    .progress-fill.danger { background: #EF4444; }
    .progressPercent { color: #0F172A; font-size: 12px; font-weight: 800; font-variant-numeric: tabular-nums; }
    .progressPercent.danger { color: #DC2626; }
    .quickFlow { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 8px; margin: 10px 0; }
    .flowStep { padding: 10px; border: 1px solid var(--vscode-panel-border); border-radius: 4px; background: var(--vscode-editor-background); }
    .flowStep b { display: block; margin-bottom: 6px; }
    .flowStep button { width: 100%; }
    .serverStack { display: grid; gap: 10px; }
    .serverObjectWorkbench { display: grid; gap: 10px; padding: 10px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: color-mix(in srgb, var(--card-bg) 92%, var(--vscode-input-background) 8%); }
    .serverObjectSummary { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 8px; }
    .serverObjectSummaryItem { display: grid; gap: 2px; padding: 8px 10px; border: 1px solid var(--border); border-radius: 6px; background: var(--vscode-input-background); }
    .serverObjectSummaryItem b { color: var(--vscode-foreground); font-size: var(--zlk-font-status); line-height: 1.2; }
    .serverObjectSummaryItem span { color: var(--vscode-descriptionForeground); font-size: var(--zlk-font-sm); }
    .serverObjectGrid { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 10px; }
    .serverObjectCard { position: relative; display: grid; gap: 8px; min-width: 0; padding: 10px 11px 10px 14px; border: 1px solid var(--border); border-left: 4px solid #94A3B8; border-radius: 8px; background: #FAFBFC; color: #0F172A; }
    .serverObjectCard.hub { border-left-color: #CBD5E1; }
    .serverObjectCard.ok { border-left-color: #16A34A; }
    .serverObjectCard.warn { border-left-color: #D97706; background: #FFFBEB; }
    .serverObjectCard.error { border-left-color: #DC2626; background: #FEF2F2; }
    .serverObjectCard.disabled { border-left-color: #94A3B8; opacity: .76; }
    .serverObjectHead { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; min-width: 0; }
    .serverObjectHead h4 { margin: 0; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 14px; font-weight: 800; color: #111827; }
    .serverObjectRole { color: #64748B; font-size: 11px; font-weight: 700; text-transform: uppercase; }
    .serverObjectMeta { display: flex; flex-wrap: wrap; gap: 6px; min-width: 0; }
    .serverObjectMeta .pill { flex: 0 0 auto; white-space: nowrap; overflow-wrap: normal; border-radius: 6px; }
    .serverObjectStats { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }
    .serverObjectStat { display: grid; gap: 2px; min-width: 0; padding: 6px 8px; border: 1px solid #E2E8F0; border-radius: 6px; background: #FFFFFF; }
    .serverObjectStat span { color: #64748B; font-size: 11px; font-weight: 600; }
    .serverObjectStat b { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #0F172A; font-size: 12px; font-weight: 800; }
    .schedulerDependencyStatus { display: grid; gap: 4px; padding: 8px 10px; border: 1px solid var(--border); border-left: 3px solid var(--success); border-radius: 6px; background: var(--vscode-input-background); }
    .schedulerDependencyStatus.warn { border-left-color: var(--warning); }
    .schedulerDependencyStatus code { display: block; padding: 5px 7px; overflow-wrap: anywhere; white-space: normal; background: var(--vscode-textCodeBlock-background); }
    .serverRiskBand { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; padding-top: 2px; }
    .serverRiskBand .pill { margin: 0; }
    .serverTopologyMap { display: grid; gap: 8px; padding: 10px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: #F8FAFC; }
    .topologyHeader { display: flex; justify-content: space-between; gap: 8px; align-items: center; color: #111827; font-size: 13px; font-weight: 850; }
    .topologyHeader span { color: #64748B; font-size: 11px; font-weight: 650; }
    .topologyGrid { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 8px; }
    .topologyNode { display: grid; gap: 4px; min-width: 0; padding: 9px 10px; border: 1px solid #CBD5E1; border-left: 4px solid #94A3B8; border-radius: 8px; background: #FFFFFF; }
    .topologyNode.local, .topologyNode.hub, .topologyNode.worker, .topologyNode.sftp { border-left-color: #CBD5E1; background: #FFFFFF; }
    .topologyNode b { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #0F172A; font-size: 13px; }
    .topologyNode span { color: #64748B; font-size: 11px; line-height: 1.4; }
    .topologyLanes { display: grid; gap: 6px; }
    .topologyLane { display: grid; grid-template-columns: minmax(88px, 140px) minmax(0, 1fr); gap: 8px; align-items: start; padding: 7px 8px; border: 1px solid #E2E8F0; border-radius: 7px; background: #FFFFFF; }
    .topologyLane b { color: #0F172A; font-size: 12px; }
    .topologyLane span { color: #475569; font-size: 11px; line-height: 1.45; }
    .endpointCardGrid { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 9px; }
    .endpointStatusCard { display: grid; gap: 8px; min-width: 0; padding: 10px; border: 1px solid var(--border); border-left: 4px solid #94A3B8; border-radius: 8px; background: color-mix(in srgb, var(--card-bg) 90%, var(--vscode-input-background) 10%); }
    .endpointStatusCard.ok { border-left-color: #16A34A; }
    .endpointStatusCard.warn { border-left-color: #D97706; background: #FFFBEB; }
    .endpointStatusCard.error { border-left-color: #DC2626; background: #FEF2F2; }
    .endpointStatusCard.disabled { opacity: .75; }
    .diagnosticBudgetNotice { margin-top: 8px; padding: 7px 10px; border: 1px dashed var(--border); border-radius: 7px; background: var(--subtle-bg); color: var(--muted); font-size: 12px; line-height: 1.4; }
    .endpointCardHead { display: flex; justify-content: space-between; gap: 8px; align-items: flex-start; min-width: 0; }
    .endpointCardHead b { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--vscode-foreground); font-size: 13px; }
    .endpointCardSub { color: var(--vscode-descriptionForeground); font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .endpointMiniGrid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }
    .endpointMini { display: grid; gap: 2px; min-width: 0; padding: 6px 7px; border: 1px solid var(--border); border-radius: 6px; background: var(--vscode-input-background); }
    .endpointMini span { color: var(--vscode-descriptionForeground); font-size: 11px; }
    .endpointMini b { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; color: var(--vscode-foreground); }
    .endpointConflictList { display: grid; gap: 8px; }
    .server-card { display: grid; gap: 10px; padding: 11px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: color-mix(in srgb, var(--card-bg) 82%, var(--vscode-input-background) 18%); }
    .serverHead { display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: 10px; padding-bottom: 2px; }
    .serverTitle { display: grid; gap: 3px; min-width: 0; }
    .serverBadges { display: flex; flex-wrap: wrap; gap: 6px; justify-content: flex-end; }
    .configGrid { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 8px; }
    .serverDestinationPreview { display: grid; grid-template-columns: minmax(105px, auto) minmax(0, 1fr); gap: 5px 10px; padding: 8px 10px; border-left: 3px solid var(--vscode-focusBorder); background: color-mix(in srgb, var(--vscode-input-background) 70%, transparent); font-size: 12px; }
    .serverDestinationPreview.draft { border-left-color: var(--vscode-inputValidation-warningBorder); }
    .serverDestinationPreview.error { border-left-color: var(--vscode-inputValidation-errorBorder); }
    .serverDestinationPreview span { color: var(--muted); }
    .serverDestinationPreview code { min-width: 0; color: var(--text); white-space: normal; overflow-wrap: anywhere; }
    .serverDestinationPreview .destinationPreviewStatus { grid-column: 1 / -1; font-size: 11px; }
    .schedulerGlossary { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 8px; }
    .schedulerGlossaryItem { display: grid; gap: 3px; padding: 8px 9px; border: 1px solid var(--border); border-radius: 6px; background: var(--vscode-input-background); }
    .schedulerGlossaryItem b { color: var(--vscode-foreground); font-size: 12px; }
    .schedulerGlossaryItem span { color: var(--vscode-descriptionForeground); font-size: 11px; line-height: 1.4; }
    .field { display: grid; gap: 3px; min-width: 0; }
    .configBoundsHint { margin-left: 6px; color: var(--muted); font-size: var(--zlk-font-xs); font-weight: 500; }
    .configBoundsError { color: var(--danger); font-size: var(--zlk-font-sm); overflow-wrap: anywhere; }
    .field.is-invalid > input { border-color: var(--danger); }
    .field.wide { grid-column: 1 / -1; }
    .field label { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; color: var(--vscode-descriptionForeground); }
    .helpBadge { display: inline-flex; align-items: center; justify-content: center; width: 14px; height: 14px; border: 1px solid var(--border); border-radius: 999px; color: var(--muted); font-size: 10px; font-weight: 700; line-height: 1; cursor: help; }
    .field input, .field select { width: 100%; box-sizing: border-box; }
    .toolbar, .workflowActions, .actionGrid, .topbar-actions, .section-actions, .serverBadges, .serverObjectMeta, .statusLegend, .publishActionDeck, .taskActions, .traceActions, .planQuickGrid { min-width: 0; }
    button, input, select, textarea { max-width: 100%; min-width: 0; box-sizing: border-box; }
    button { white-space: normal; overflow-wrap: anywhere; line-height: 1.25; }
    input, select, textarea, pre, code, .pill, .status-chip, .summaryLine, .muted, .detail, .subtle, .tree-text, .tree-title, .tree-subtitle { overflow-wrap: anywhere; }
    .resourceTree *, .mainColumn *, .workbenchInspector * { min-width: 0; }
    .portPair { grid-column: 1 / -1; }
    .portPairBox { display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); gap: 7px; align-items: center; }
    .portPairSide { display: grid; grid-template-columns: auto minmax(72px, 1fr); align-items: center; gap: 5px; min-width: 0; }
    .portPairHost { color: var(--vscode-descriptionForeground); font-size: 12px; white-space: nowrap; }
    .portPairArrow { color: var(--vscode-descriptionForeground); font-size: 12px; }
    details.advanced { margin: 10px 0; }
    details.advanced > summary { cursor: pointer; color: var(--vscode-descriptionForeground); }
    .sectionNote { margin: 6px 0 10px; color: var(--vscode-descriptionForeground); line-height: 1.45; }

    /* Final dashboard layout: macOS-like surfaces, restrained status color, draggable three columns. */
    .app-shell { width: min(100%, 1680px); height: 100vh; padding: 18px 20px 18px; gap: 10px; grid-template-rows: auto auto minmax(0, 1fr); overflow: hidden; }
    .topbar { position: relative; z-index: 3; padding: 8px 10px; border: 1px solid rgba(148, 163, 184, .32); border-radius: 12px; background: rgba(248, 250, 252, .9); backdrop-filter: blur(16px); box-shadow: 0 10px 28px rgba(15, 23, 42, .07); max-height: 72px; overflow: auto; overscroll-behavior: contain; }
    .statusLegend { position: relative; z-index: 3; display: flex; flex-wrap: wrap; gap: 8px; align-items: center; min-width: 0; flex: 1 1 auto; padding: 0; border: 0; background: transparent; backdrop-filter: none; color: #475569; box-shadow: none; }
    .topbar-actions { align-items: center; }
    .legendItem { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 750; white-space: nowrap; }
    .legendDot { width: 8px; height: 8px; border-radius: 999px; background: #2563EB; box-shadow: 0 0 0 3px rgba(37, 99, 235, .10); }
    .legendDot.good { background: #16A34A; box-shadow-color: rgba(22, 163, 74, .12); }
    .legendDot.info { background: #2563EB; }
    .legendDot.warn { background: #D97706; box-shadow-color: rgba(217, 119, 6, .12); }
    .legendDot.error { background: #DC2626; box-shadow-color: rgba(220, 38, 38, .12); }
    .legendDot.mine { background: #7C3AED; box-shadow-color: rgba(124, 58, 237, .12); }
    /* Pinned layout expands to: grid-template-columns: var(--tree-col) 8px minmax(var(--main-min), 1fr) 8px var(--inspector-col). */
    #cardDeck { --tree-col: 280px; --inspector-col: 360px; --main-min: 420px; --tree-peek: 16px; --inspector-peek: 18px; --tree-active-col: var(--tree-peek); --inspector-active-col: var(--inspector-peek); min-height: 0; overflow: hidden; align-items: stretch; grid-template-columns: var(--tree-active-col) 8px minmax(0, 1fr) 8px var(--inspector-active-col); grid-template-rows: minmax(0, 1fr); gap: 10px; }
    body.layout-edit #cardDeck, body.resizing-layout #cardDeck, body.tree-pinned #cardDeck { --tree-active-col: var(--tree-col); }
    body.layout-edit #cardDeck, body.resizing-layout #cardDeck, body.inspector-pinned #cardDeck { --inspector-active-col: var(--inspector-col); }
    #cardDeck > [data-section] { grid-column: 3; }
    .mainColumn { grid-column: 3; min-height: 0; overflow: auto; overscroll-behavior: contain; overflow-anchor: none; scroll-behavior: smooth; scroll-padding-top: 12px; display: grid; align-content: start; gap: 12px; padding-right: 2px; container: main-workflow / inline-size; }
    .mainColumn > [data-section], .mainColumn [data-anchor] { scroll-margin-top: 12px; }
    body:not(.main-view-settings) #mainColumn > [data-section="settings"] { display: none; }
    body.main-view-settings #mainColumn > [data-section]:not([data-section="settings"]) { display: none; }
    .settingsBackButton { width: auto; height: 30px; min-width: 84px; padding: 0 12px; font-size: 12px; white-space: nowrap; }
    .settingsLayoutTools { display: flex; flex-wrap: wrap; align-items: center; gap: 7px; padding-bottom: 10px; border-bottom: 1px solid var(--border); }
    .settingsLayoutTools b { margin-right: auto; font-size: 12px; }
    .settingsCommandTools { display: flex; flex-wrap: wrap; align-items: center; gap: 7px 12px; padding: 10px 0; border-bottom: 1px solid var(--border); }
    .settingsCommandTools > div { display: grid; gap: 2px; margin-right: auto; min-width: min(100%, 280px); }
    .settingsCommandTools b { font-size: 12px; }
    .resourceTree { grid-column: 1; grid-row: 1; position: relative; width: var(--tree-col); max-height: none; min-height: 0; overflow: hidden; overscroll-behavior: contain; justify-self: start; padding: 10px; border-color: rgba(148, 163, 184, .30); border-radius: 12px; background: rgba(255, 255, 255, .84); backdrop-filter: blur(18px); box-shadow: 0 12px 30px rgba(15, 23, 42, .08); contain: layout paint; display: grid; grid-template-rows: auto auto minmax(0, 1fr) 34px; transform: translateX(calc(-1 * (var(--tree-col) - var(--tree-peek)))); transition: transform 180ms ease, box-shadow 140ms ease, opacity 140ms ease; z-index: 14; }
    .resourceTree::after { content: "导航"; position: absolute; top: 12px; right: 0; bottom: 12px; width: var(--tree-peek); display: grid; place-items: center; padding: 8px 0; border-left: 1px solid rgba(148, 163, 184, .26); background: linear-gradient(180deg, rgba(248, 250, 252, .96), rgba(226, 232, 240, .92)); color: #475569; font-size: 11px; font-weight: 800; writing-mode: vertical-rl; text-orientation: mixed; letter-spacing: 0; opacity: 1; transition: opacity 120ms ease; pointer-events: none; }
    .resourceTree:hover, .resourceTree:focus-within, body.layout-edit .resourceTree, body.resizing-layout .resourceTree { transform: translateX(0); box-shadow: 0 16px 34px rgba(15, 23, 42, .12); }
    .resourceTree:hover::after, .resourceTree:focus-within::after, body.layout-edit .resourceTree::after, body.resizing-layout .resourceTree::after { opacity: 0; }
    .workbenchInspector { grid-column: 5; grid-row: 1; position: relative; width: var(--inspector-col); max-height: none; min-height: 0; justify-self: end; grid-template-rows: auto minmax(0, 1fr); overflow: hidden; border-color: rgba(148, 163, 184, .30); border-radius: 12px; background: rgba(255, 255, 255, .86); backdrop-filter: blur(18px); box-shadow: 0 12px 30px rgba(15, 23, 42, .08); contain: layout paint; transform: translateX(calc(var(--inspector-col) - var(--inspector-peek))); transition: transform 180ms ease, box-shadow 140ms ease, opacity 140ms ease; z-index: 13; }
    .workbenchInspector::before { content: "详情"; position: absolute; top: 12px; left: 0; bottom: 12px; width: var(--inspector-peek); display: grid; place-items: center; padding: 8px 0; border-right: 1px solid rgba(148, 163, 184, .26); background: linear-gradient(180deg, rgba(248, 250, 252, .96), rgba(226, 232, 240, .92)); color: #475569; font-size: 11px; font-weight: 800; writing-mode: vertical-rl; text-orientation: mixed; letter-spacing: 0; opacity: 1; transition: opacity 120ms ease; pointer-events: none; }
    .workbenchInspector:hover, .workbenchInspector:focus-within, body.layout-edit .workbenchInspector, body.resizing-layout .workbenchInspector { transform: translateX(0); box-shadow: 0 16px 34px rgba(15, 23, 42, .12); }
    .workbenchInspector:hover::before, .workbenchInspector:focus-within::before, body.layout-edit .workbenchInspector::before, body.resizing-layout .workbenchInspector::before { opacity: 0; }
    body.tree-pinned .resourceTree, body.inspector-pinned .workbenchInspector { transform: translateX(0); box-shadow: 0 16px 34px rgba(15, 23, 42, .10); }
    body.tree-pinned .resourceTree::after, body.inspector-pinned .workbenchInspector::before { opacity: 0; }
    .drawerPinButton { position: absolute; top: 8px; z-index: 3; width: 24px; height: 24px; min-width: 24px; padding: 0; display: grid; place-items: center; border-radius: 7px; border: 1px solid rgba(148, 163, 184, .42); background: rgba(255,255,255,.92); color: #475569; font-size: 13px; line-height: 1; box-shadow: 0 8px 18px rgba(15,23,42,.08); }
    .drawerPinButton:hover, .drawerPinButton:focus-visible, .drawerPinButton.is-pinned { background: #EEF2FF; border-color: #C7D2FE; color: #4F46E5; outline: none; }
    .resourceTree .drawerPinButton { right: 24px; }
    .workbenchInspector .drawerPinButton { right: 8px; }
    .layoutResizer { grid-row: 1; position: relative; z-index: 12; width: 8px; min-height: 0; cursor: col-resize; border-radius: 999px; background: transparent; }
    .layoutResizer::after { content: ""; position: absolute; left: 3px; top: 12px; bottom: 12px; width: 2px; border-radius: 999px; background: rgba(148, 163, 184, .34); transition: background 120ms ease, width 120ms ease, left 120ms ease; }
    .layoutResizer:hover::after, body.resizing-layout .layoutResizer::after { left: 2px; width: 4px; background: #94A3B8; }
    .layoutResizer.left { grid-column: 2; opacity: .28; pointer-events: auto; }
    body.layout-edit .layoutResizer.left, body.resizing-layout .layoutResizer.left, .layoutResizer.left:hover { opacity: 1; pointer-events: auto; }
    .layoutResizer.right { grid-column: 4; opacity: .28; pointer-events: auto; }
    body.layout-edit .layoutResizer.right, body.resizing-layout .layoutResizer.right, .layoutResizer.right:hover { opacity: 1; pointer-events: auto; }
    .tree-search { display: grid; gap: 4px; margin-top: 8px; }
    .tree-search input { width: 100%; min-height: 28px; padding: 5px 8px; border-radius: 9px; background: rgba(248, 250, 252, .94); }
    #resourceTreeBody { min-height: 0; overflow: auto; overscroll-behavior: contain; scroll-snap-type: y proximity; contain: layout paint; }
    .tree-group { padding: 8px 0 10px; margin: 0; border-top: 1px solid rgba(226, 232, 240, .72); }
    .tree-group:first-child { border-top: 0; }
    .tree-group-label { position: static; z-index: auto; margin: 0 0 5px; padding: 3px 5px; border-radius: 6px; background: rgba(255, 255, 255, .72); backdrop-filter: none; }
    .tree-group-label::before { content: ""; width: 4px; height: 13px; border-radius: 999px; background: #CBD5E1; box-shadow: 0 0 0 3px rgba(148, 163, 184, .10); }
    .tree-group.good .tree-group-label::before { background: #16A34A; box-shadow-color: rgba(22, 163, 74, .12); }
    .tree-group.info .tree-group-label::before { background: #2563EB; box-shadow-color: rgba(37, 99, 235, .12); }
    .tree-group.warn .tree-group-label::before { background: #D97706; box-shadow-color: rgba(217, 119, 6, .12); }
    .tree-group.error .tree-group-label::before { background: #DC2626; box-shadow-color: rgba(220, 38, 38, .12); }
    .tree-group.mine .tree-group-label::before { background: #7C3AED; box-shadow-color: rgba(124, 58, 237, .12); }
    .tree-item, .tree-object { border-radius: 8px; transition: background 120ms ease, border-color 120ms ease, box-shadow 120ms ease; }
    .tree-icon { width: 18px; height: 18px; border-radius: 6px; background: rgba(226, 232, 240, .58); }
    .tree-item.good .tree-icon { color: #16A34A; background: #F0FDF4; }
    .tree-item.info .tree-icon { color: #2563EB; background: #EFF6FF; }
    .tree-item.warn .tree-icon { color: #D97706; background: #FFFBEB; }
    .tree-item.error .tree-icon { color: #DC2626; background: #FEF2F2; }
    .tree-item.mine .tree-icon { color: #7C3AED; background: #F5F3FF; }
    .tree-child-list { margin-left: 25px; padding-left: 10px; border-left-color: rgba(148, 163, 184, .34); }
    .tree-empty { padding: 10px 8px; color: #64748B; font-size: 12px; line-height: 1.45; }
    .section-card, .card, .taskProgressCard, .overviewStatusCard, .workflowStage, .objectTile, .planRunRow, .resultEvidenceRow, .endpointStatusCard, .serverObjectCard, .operationItem, .task-card, .traceCard { min-width: 0; background: rgba(255,255,255,.88); border-color: rgba(148, 163, 184, .30); box-shadow: 0 8px 22px rgba(15, 23, 42, .045); }
    .workflowStage.good, .workflowStage.info, .workflowStage.warn, .workflowStage.error, .workflowStage.mine,
    .objectTile.good, .objectTile.info, .objectTile.warn, .objectTile.error, .objectTile.mine,
    .overviewStatusCard.good, .overviewStatusCard.info, .overviewStatusCard.warn, .overviewStatusCard.error, .overviewStatusCard.mine,
    .planRunRow.good, .planRunRow.info, .planRunRow.warn, .planRunRow.error, .planRunRow.mine,
    .resultEvidenceRow.good, .resultEvidenceRow.info, .resultEvidenceRow.warn, .resultEvidenceRow.error, .resultEvidenceRow.mine,
    .serverObjectCard.ok, .serverObjectCard.warn, .serverObjectCard.error,
    .endpointStatusCard.ok, .endpointStatusCard.warn, .endpointStatusCard.error,
    .operationStatusCard.failed, .operationStatusCard.accepted,
    .taskReadinessItem.warn, .taskReadinessItem.error,
    .traceReadinessItem.warn, .traceReadinessItem.error,
    .claimEvidenceRow.unsupported, .claimEvidenceRow.needs,
    .featureReadinessRow.good, .featureReadinessRow.warn, .featureReadinessRow.error,
    .targetMatrixRow.done, .targetMatrixRow.partial,
    .inspectorEvent.failed, .inspectorEvent.stalled { background: rgba(255,255,255,.88); }
    .task-card.delete-pending { --task-bg: #FAFBFC; }
    .workflowStageRail { grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); padding: 6px; background: rgba(248,250,252,.78); }
    .workflowStage { min-height: 56px; padding: 8px; }
    .objectStrip { grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 8px; }
    .overviewStatusGrid { grid-template-columns: repeat(auto-fit, minmax(196px, 1fr)); gap: 8px; }
    .endpointCardGrid, .serverObjectGrid { grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 8px; }
    .endpointMiniGrid, .serverObjectStats, .traceReadinessGrid, .taskReadinessGrid { grid-template-columns: repeat(auto-fit, minmax(118px, 1fr)); }
    .pinnedActions { position: relative; z-index: 1; flex: 0 0 auto; display: grid; gap: 7px; max-height: 126px; overflow: auto; overscroll-behavior: contain; scrollbar-gutter: stable; padding: 9px; border: 1px solid #E2E8F0; border-left: 4px solid #7C3AED; border-radius: 10px; background: rgba(255,255,255,.92); }
    .pinnedActions .workflowActions { margin: 0; }
    .inspectorBody { min-height: 0; overflow: auto; overscroll-behavior: contain; scrollbar-gutter: stable; overflow-anchor: none; display: grid; gap: 10px; padding-right: 2px; }
    .inspectorActionRow { display: flex; align-items: stretch; gap: 6px; min-width: 0; }
    .inspectorActionRow > button[data-command] { flex: 1 1 auto; min-width: 0; }
    .pinContextMenu { position: fixed; z-index: 10000; display: none; min-width: 164px; padding: 6px; border: 1px solid #CBD5E1; border-radius: 8px; background: rgba(255,255,255,.98); box-shadow: 0 18px 40px rgba(15,23,42,.18); }
    .pinContextMenu.is-open { display: grid; gap: 4px; }
    .pinContextMenu button { width: 100%; justify-content: flex-start; padding: 6px 8px; color: #0F172A; background: transparent; border-color: transparent; text-align: left; }
    .pinContextMenu button:hover, .pinContextMenu button:focus-visible { background: #EEF2FF; border-color: #C7D2FE; outline: none; }
    .statusCardCollapsed { max-height: 56px; min-height: 44px; overflow: hidden !important; cursor: context-menu; }
    .statusCardCollapsed > *:not(:first-child) { display: none !important; }
    .statusCardCollapsed::after { content: "右键展开"; position: absolute; right: 9px; bottom: 6px; padding: 1px 6px; border-radius: 999px; border: 1px solid #CBD5E1; background: rgba(248,250,252,.95); color: #64748B; font-size: 11px; font-weight: 700; pointer-events: none; }
    .publishActionDeck { display: grid; grid-template-columns: repeat(auto-fit, minmax(148px, 1fr)); gap: 7px; align-items: stretch; margin-top: 8px; }
    .publishActionAnchor { display: grid; min-width: 0; scroll-margin-top: 12px; }
    .publishActionDeck button { width: 100%; min-width: 0; justify-content: center; }
    .actionGrid.statusOnly { color: #64748B; font-size: 12px; line-height: 1.45; }
    .ops-flow.is-hidden { display: none; }
    @media (max-width: 1320px) { #cardDeck { --tree-col: 250px; --inspector-col: 330px; --main-min: 360px; } .taskWorkbench, .resultWorkbench { grid-template-columns: 1fr; } .taskDetailPane, .traceDetailPane { position: static; } }
    @media (max-width: 1040px) { #cardDeck { --tree-col: 240px; --inspector-col: 320px; --main-min: 0px; } .mainColumn { grid-column: 3; } .resourceTree { grid-column: 1; width: var(--tree-col); transform: translateX(calc(-1 * (var(--tree-col) - var(--tree-peek)))); } .resourceTree::after { display: grid; } .workbenchInspector { grid-column: 5; grid-row: 1; position: relative; width: var(--inspector-col); overflow: hidden; transform: translateX(calc(var(--inspector-col) - var(--inspector-peek))); } .workbenchInspector::before { display: grid; } .inspectorBody { overflow: auto; } .topbar-actions, .toolbar { justify-content: flex-start; margin-left: 0; } }
    @media (max-width: 760px) {
      .app-shell { padding: 16px 14px 24px; }
      .topbar, .section-head { flex-direction: column; align-items: stretch; max-height: none; }
      .topbar-actions { justify-content: flex-start; margin-left: 0; }
      .objectStrip { grid-template-columns: 1fr; }
      .section-grid { grid-template-columns: 1fr; }
      #cardDeck { --tree-col: min(78vw, 260px); --inspector-col: min(86vw, 340px); }
      #cardDeck > [data-section], .mainColumn { grid-column: 3; }
      .resourceTree { grid-column: 1; position: relative; width: var(--tree-col); max-height: none; overflow: hidden; transform: translateX(calc(-1 * (var(--tree-col) - var(--tree-peek)))); }
      .workbenchInspector { grid-column: 5; position: relative; width: var(--inspector-col); max-height: none; overflow: hidden; transform: translateX(calc(var(--inspector-col) - var(--inspector-peek))); }
      .taskWorkbench { grid-template-columns: 1fr; }
      .resultWorkbench { grid-template-columns: 1fr; }
      .taskDetailPane, .traceDetailPane { position: static; }
      .gpu-row { grid-template-columns: 1fr; }
      .gpu-metrics { justify-content: start; }
      .planQuickGrid { grid-template-columns: 1fr; }
      .toolbar, .workflowActions, .actionGrid, .publishActionDeck, .serverBadges { grid-template-columns: 1fr; justify-content: stretch; }
      .toolbar > *, .workflowActions > *, .actionGrid > *, .publishActionDeck > *, .serverBadges > * { width: 100%; }
    }
  </style>
</head>
<body>
  <div class="app-shell">
    <header class="topbar" aria-label="状态图例与全局快捷操作">
      <div class="statusLegend" aria-label="状态颜色图例"><span class="legendItem"><span class="legendDot good"></span>正常</span><span class="legendItem"><span class="legendDot info"></span>运行 / 信息</span><span class="legendItem"><span class="legendDot warn"></span>等待 / 注意</span><span class="legendItem"><span class="legendDot error"></span>异常 / 失败</span><span class="legendItem"><span class="legendDot mine"></span>我的任务 / 重点</span></div>
      <div class="topbar-actions">
        <button data-command="bootstrapProject" type="button" title="识别当前项目并继续到唯一下一步；已有 Plan 和接入配置不会重复写入">接入当前项目</button>
        <span class="status-chip">Xshell</span>
        <span class="status-chip">全局配置</span>
        <span class="status-chip status-completed">仅本机端口</span>
        <button data-command="pauseAll" class="secondary" type="button">暂停全部网络</button>
        <button data-command="resumeNetwork" class="secondary" type="button">恢复网络</button>
        <button data-command="openSetupGuide" class="secondary" type="button" title="打开安装与服务器目录配置说明">配置说明</button>
        <button type="button" class="secondary topbarIconButton" data-section-target="settings" data-anchor-target="settings" title="设置" aria-label="设置">&#9881;</button>
      </div>
    </header>

    <div id="projectOnboardingNotice" class="projectOnboardingNotice" role="status" aria-live="polite"></div>
    <div id="renderError" class="status-failed"></div>
    <div id="initialStateNotice" class="initial-state-notice" role="status" aria-live="polite">
      <span id="initialStateMessage">正在读取本地面板状态...</span>
      <button id="initialStateRetry" class="secondary" type="button" hidden>重新读取</button>
    </div>

    <main id="cardDeck" class="section-grid">
    <aside id="resourceTree" class="resourceTree" aria-label="集群资源导航">
      <button type="button" class="drawerPinButton" data-drawer-pin="tree" title="固定左侧目录" aria-label="固定左侧目录" aria-pressed="false">&#128204;</button>
      <div id="resourceTreeHead" class="tree-head">
        <div class="tree-title">资源树</div>
        <div class="tree-subtitle">对象入口</div>
      </div>
      <div class="tree-search"><input id="resourceTreeSearch" type="search" placeholder="搜索功能、状态、按钮" title="搜索"></div>
      <div id="resourceTreeBody"></div>
      <div id="resourceTreeInspector" class="tree-inspector" aria-live="polite"></div>
    </aside>
    <div class="layoutResizer left" data-resize-column="tree" title="拖动调整资源树宽度"></div>
    <div class="layoutResizer right" data-resize-column="inspector" title="拖动调整工作详情宽度"></div>
    <aside id="workbenchInspector" class="workbenchInspector" aria-label="工作详情"></aside>
    <div id="pinContextMenu" class="pinContextMenu" role="menu" hidden></div>
    <div id="mainColumn" class="mainColumn" aria-label="中间状态与结果列">
    <section class="section-card" data-section="overview" data-anchor="overview" data-title="运维总览">
      <div class="section-head">
        <div class="section-title">
          <h2>运维总览</h2>
          <div class="section-desc">连接、实时流、错误</div>
        </div>
      </div>
      <div id="summary" class="workbench-summary" data-anchor="overview-status"></div>
      <div id="opsFlow" class="ops-flow" data-anchor="overview-flow"></div>
      <div class="muted">Xshell 本地隧道 · 127.0.0.1 · 全局服务器配置</div>
    </section>

    <section class="section-card" data-section="servers" data-anchor="servers" data-title="服务器管理">
      <div class="section-head">
        <div class="section-title">
          <h2>服务器管理</h2>
          <div class="section-desc">Xshell、端口、项目父目录</div>
        </div>
      </div>
      <div id="serverCards" data-anchor="servers-list"></div>
    </section>

    <section class="section-card" data-section="settings" data-anchor="settings" data-title="设置">
      <div class="section-head">
        <div class="section-title">
          <h2>设置</h2>
          <div class="section-desc">服务器、隧道与调度参数</div>
        </div>
        <div class="cardTools">
          <button type="button" class="secondary settingsBackButton" data-main-view="workspace" title="返回工作台">返回工作台</button>
        </div>
      </div>
      <div class="settingsLayoutTools" data-anchor="settings-layout">
        <b>界面布局</b>
        <button id="layoutEditToggle" class="secondary" type="button">管理布局</button>
        <button id="collapseAllSections" class="secondary" type="button">一键折叠</button>
        <button id="expandAllSections" class="secondary" type="button">一键展开</button>
        <button data-command="resetUiLayout" class="secondary" type="button">恢复默认布局</button>
      </div>
      <div class="settingsCommandTools" data-anchor="settings-advanced-commands">
        <div>
          <b>高级命令</b>
          <span class="muted">默认隐藏旧兼容、诊断和实时流命令</span>
        </div>
        <button data-command="openAdvancedCommandsSetting" class="secondary" type="button">打开命令设置</button>
      </div>
      <div id="serverSettingsCards" data-anchor="settings-servers"></div>
    </section>

      <section class="section-card" data-section="plans" data-anchor="plans" data-title="实验准备">
        <div class="section-head">
          <div class="section-title">
            <h2>实验准备</h2>
            <div class="section-desc">Plan、校验、预演、运行</div>
          </div>
          <div class="toolbar">
            <button data-command="bootstrapProject">接入当前项目</button>
            <button data-command="snapshot" class="secondary">刷新识别</button>
          </div>
        </div>
        <div id="planDetectedProject" data-anchor="plans-detected"></div>
        <div id="planQuickGrid" class="planQuickGrid" data-anchor="plans-actions">
          <div class="field wide">
            <label>计划文件</label>
            <input id="planFileInput" class="wide" placeholder="experiments/plans/example.yaml">
          </div>
          <div class="runModeBar">
            <span class="muted">运行类型</span>
            <div class="runModeSwitch" role="group" aria-label="运行类型">
              <button type="button" data-run-mode="formal" class="is-active" aria-pressed="true">正式运行</button>
              <button type="button" data-run-mode="debug" aria-pressed="false">Debug</button>
            </div>
            <span id="runModeNote" class="runModeNote">完整执行 Plan，结果进入正式闭环</span>
          </div>
          <button data-command="validatePlan">校验</button>
          <button data-command="dryRunPlan" class="secondary">预演</button>
          <button data-command="runPlan" data-confirm="true">校验并提交运行</button>
          <button data-command="runAllPlans" data-confirm="true" class="secondary">运行全部计划</button>
        </div>
        <div id="recentPlans" data-anchor="plans-list"></div>
        <h3>实验操作</h3>
        <div id="experimentActions" class="actionGrid"></div>
      </section>

      <section class="section-card" data-section="results" data-anchor="results" data-title="结果与归档">
        <div class="section-head">
          <div class="section-title">
            <h2>结果与归档</h2>
            <div class="section-desc">结果、归档、绘图</div>
          </div>
        </div>
        <h3>结果操作</h3>
        <div id="pptPlotConfig" data-anchor="results-ppt-plot"></div>
        <div id="resultActions" class="actionGrid"></div>
        <h3>归档与删除</h3>
        <div id="artifactActions" class="actionGrid"></div>
        <div class="resultWorkbench">
          <div class="resultMainPane">
            <h3>结果摘要</h3>
            <div id="resultSummary" data-anchor="results-summary"></div>
            <div class="contractQuickLinks" data-anchor="results-contract">
              <a id="results-contract" class="summaryLink" href="#results-contract" title="metrics/case/env/artifact">输出契约</a>
              <a id="results-dataset" class="summaryLink" data-anchor="results-dataset" href="#results-dataset" title="CSV/split/leakage">数据集画像</a>
              <a id="results-checkpoints" class="summaryLink" data-anchor="results-checkpoints" href="#results-checkpoints" title="dry-run/retention">检查点清理预案</a>
              <a id="results-plotting" class="summaryLink" data-anchor="results-plotting" href="#results-plotting" title="registry/statistics/table">PPT 绘图契约</a>
            </div>
            <h3>实验记录</h3>
            <div id="traceTable" data-anchor="results-traces"></div>
          </div>
          <aside id="traceDetailPane" class="traceDetailPane" aria-live="polite"></aside>
        </div>
      </section>

      <section class="section-card" data-section="sync" data-anchor="sync" data-title="发布与同步">
        <div class="section-head">
          <div class="section-title">
            <h2>发布与同步</h2>
            <div class="section-desc">GitHub、SFTP、Agent</div>
          </div>
        </div>
        <div class="syncPublishPanel" data-anchor="sync-publish">
          <div id="publishFlow"></div>
          <div id="publishActions" class="actionGrid"></div>
          <div id="codeSyncState" class="muted"></div>
        </div>
      </section>

    <section class="section-card" data-section="gpu" data-anchor="gpu" data-title="GPU 状态">
      <div class="section-head">
        <div class="section-title">
          <h2>GPU 状态</h2>
          <div class="section-desc">显存、利用率、温度、进程</div>
        </div>
      </div>
      <div id="gpuHistoryOverview" data-anchor="gpu-history-overview"></div>
      <div id="gpuSummary" data-anchor="gpu-summary"></div>
      <div id="gpuGrid" class="gpuServerStack" data-anchor="gpu-grid"></div>
    </section>

    <section class="section-card" data-section="tasks" data-anchor="tasks" data-title="任务运行状态">
      <div class="section-head">
        <div class="section-title">
          <h2>任务运行状态</h2>
          <div class="section-desc">Hub 调度、Worker 观测</div>
        </div>
      </div>
      <div id="taskSummary" data-anchor="tasks-summary"></div>
      <div id="taskBatchActions" class="actionGrid"></div>
      <div id="taskProgressCards" data-anchor="tasks-progress"></div>
      <div class="taskWorkbench">
        <div id="taskTable" data-anchor="tasks-list"></div>
        <aside id="taskDetailPane" class="taskDetailPane" aria-live="polite"></aside>
      </div>
    </section>

      <section class="section-card" data-section="operations" data-anchor="operations" data-title="操作进度">
        <div class="section-head">
          <div class="section-title">
            <h2>操作进度</h2>
            <div class="section-desc">界面操作、Agent 返回状态</div>
          </div>
        </div>
        <div id="operationList" data-anchor="operations-list"></div>
      </section>

    <section class="section-card" data-section="diagnostics" data-anchor="diagnostics" data-title="诊断与自检">
      <div class="section-head">
        <div class="section-title">
          <h2>诊断与自检</h2>
          <div class="section-desc">能力、端口、JSON</div>
        </div>
      </div>
      <div id="diagnosticActions" class="actionGrid"></div>
      <div id="targetCompletionMatrix" data-anchor="diagnostics-targets"></div>
      <div id="featureReadiness" data-anchor="diagnostics-audit"></div>
      <div id="actionErrors" data-anchor="diagnostics-errors"></div>
      <details class="advanced">
        <summary>高级诊断</summary>
        <div class="toolbar" title="插件不内置 SSH；Hub 和 Worker 连接由 Xshell 本地端口转发提供">
          <button data-command="startHub" type="button">启动 Hub</button>
          <button data-command="startWorker" type="button">启动 Worker</button>
          <button data-command="configurePorts" class="secondary" type="button">配置端口</button>
          <button data-command="repairPorts" class="secondary" type="button">处理端口冲突</button>
        </div>
        <h3>配置来源</h3>
        <div id="configurationSources" data-anchor="diagnostics-config-sources"></div>
        <h3>Hub 控制面</h3>
        <div id="hubControlStatus" data-anchor="diagnostics-hub-control"></div>
        <h3>Worker 实时观测</h3>
        <div id="workerTelemetryStatus" data-anchor="diagnostics-worker-telemetry"></div>
        <h3>隧道端口分配</h3>
        <div id="tunnelPortAssignments" data-anchor="diagnostics-ports"></div>
        <h3>端口冲突</h3>
        <div id="tunnelPortConflicts" data-anchor="diagnostics-conflicts"></div>
        <h3>能力状态</h3>
        <div id="capabilities" data-anchor="diagnostics-capabilities"></div>
        <h3>诊断 JSON</h3>
        <pre id="details" data-anchor="diagnostics-json">待展开</pre>
      </details>
    </section>
    </div>
    </main>
  </div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const OPERATION_STATUS_FILTER_VALUES = ["all", "accepted", "running", "completed", "cancelled", "failed"];
    const PLAN_VIEW_SCOPE_VALUES = ["selected", "all"];
    const restoredWebviewState = typeof vscode.getState === "function" ? (vscode.getState() || {}) : {};
    let bootstrapErrorReported = false;
    const reportBootstrapError = (error) => {
      if (bootstrapErrorReported) return;
      bootstrapErrorReported = true;
      const message = error && (error.message || error.reason || error.error) ? String(error.message || error.reason || error.error) : String(error || "Webview 启动失败");
      vscode.postMessage({ command: "webviewBootstrapError", error: message.slice(0, 480) });
    };
    window.addEventListener("error", (event) => reportBootstrapError(event.error || event.message));
    window.addEventListener("unhandledrejection", (event) => reportBootstrapError(event.reason));
    const el = (id) => document.getElementById(id);
    const DIAGNOSTIC_JSON_PREVIEW_LIMIT = 16000;
    const DIAGNOSTIC_JSON_MAX_DEPTH = 4;
    const DIAGNOSTIC_JSON_ARRAY_LIMIT = 16;
    const DIAGNOSTIC_JSON_OBJECT_KEY_LIMIT = 36;
    const DIAGNOSTIC_JSON_STRING_LIMIT = 1200;
    const DIAGNOSTIC_WORKER_CARD_LIMIT = 8;
    const DIAGNOSTIC_PORT_ASSIGNMENT_LIMIT = 12;
    const DIAGNOSTIC_PORT_CONFLICT_LIMIT = 8;
    const DIAGNOSTIC_AGENT_WORKER_CARD_LIMIT = 8;
    let lastState = {};
    let initialStateTimer = 0;
    let lastRenderErrorMessage = "";
    let lastGpuServersById = {};
    let expandedTaskLogs = {};
    let pendingButtonKeys = new Set();
    let pendingActions = {};
    let pendingActionsById = {};
    let pendingActionTimeouts = {};
    let loadingButtonCount = 0;
    let configParamFilter = "";
    let configLevel1Filter = "all";
    let configLevel2Filter = "all";
    let selectedConfigIndex = 0;
    let currentUiLayout = { order: [], collapsed: {}, resourceTreeChildren: {}, manual: false, treePinned: false, inspectorPinned: false, detailActions: [], pinnedActions: [] };
    let lastAppliedUiLayoutKey = "";
    let selectedTaskPayloadVersion = 0;
    let selectedTaskPayloadCacheKey = "";
    let selectedTaskPayloadCache = null;
    let selectedTaskStateRowsCacheKey = "";
    let selectedTaskStateRowsCache = [];
    let selectedTaskStatePayloadCacheKey = "";
    let selectedTaskStatePayloadCache = null;
    let configDrafts = {};
    let serverConfigEditLockUntil = 0;
    let planPreviewEditLockUntil = 0;
    let detailsOpenState = {};
    let workbenchInspectorInteractionLockUntil = 0;
    let workbenchInspectorLastHtml = "";
    let workbenchInspectorLastRenderAt = 0;
    let workbenchInspectorForceRenderUntil = 0;
    let workbenchInspectorLastLiveSignature = "";
    let layoutEdit = false;
    let draggedSection = "";
    let draggedResourceTreeSection = "";
    let draggedResourceTreeChild = null;
    let activeResourceSection = "overview";
    let activeResourceAnchor = "overview";
    let currentMainView = "workspace";
    let runMode = normalizeRunMode(restoredWebviewState.runMode);
    let lastWorkspaceResource = { section: "overview", anchor: "overview" };
    let activeResourceNode = null;
    let resourceTreeScrollLockUntil = 0;
    let resourceTreeMeta = {};
    let resourceTreeFilter = "";
    let resourceTreeRenderKey = "";
    let resourceTreeStaticModelCache = null;
    let mainColumnSyncFrame = 0;
    let collapsedStatusCards = {};
    let statusInfoPopoverTimers = new Map();
    let postRenderMaintenanceScheduled = false;
    let lastPostRenderMaintenanceKey = "";
    let postRenderDomVersion = 0;
    let postRenderButtonDomVersion = 0;
    let postRenderCardDomVersion = 0;
    let nativeTitleMutationVersion = 0;
    let lastButtonDecorationVersion = -1;
    let lastCardDecorationKey = "";
    let lastNativeTitleCompactKey = "";
    let statusCardCollapseVersion = 0;
    let lastStatusCollapseScanKey = "";
    let lastStatusCollapseKey = "";
    let contextActionStateSignatureCacheState = null;
    let contextActionStateSignatureCacheVersion = "";
    let contextActionStateSignatureCacheValue = "";
    let lastRenderedSectionSignatures = {};
    let lastSectionPreRenderKeys = {};
    let sectionDataSignatureCacheState = null;
    let sectionDataSignatureCache = {};
    let objectReferenceIds = new WeakMap();
    let nextObjectReferenceId = 1;
    let operationRowsCacheInput = null;
    let operationRowsCacheRows = [];
    const operationSearchHaystackCache = new WeakMap();
    const resourceTreeSearchTextCache = new WeakMap();
    const compactPathCache = new Map();
    const COMPACT_PATH_CACHE_LIMIT = 256;
    const pinnedCommandsNormalizationCache = new WeakMap();
    const savedButtonActionsNormalizationCache = new WeakMap();
    const SAVED_BUTTON_ACTION_NORMALIZATION_VARIANT_LIMIT = 8;
    const compactRowsForSignatureCache = new WeakMap();
    const compactObjectMapForSignatureCache = new WeakMap();
    const SIGNATURE_COMPACTION_VARIANT_LIMIT = 8;
    const planOutputCandidatesCache = new WeakMap();
    const planOutputEvidenceCandidatesCache = new WeakMap();
    const planOutputEvidenceSignalsCache = new WeakMap();
    const adapterRuleResultCandidatesCache = new WeakMap();
    const renderAdapterRulesCache = new WeakMap();
    const planTaskScaleSummaryCache = new WeakMap();
    const validResultPreviewCountCache = new WeakMap();
    const planScopedResultCandidateCache = new WeakMap();
    const planScopedResultPreviewCache = new WeakMap();
    const projectResultLocationCache = new WeakMap();
    const projectOutputGateDiagnosticsCache = new WeakMap();
    const projectUploadDestinationSummaryCache = new WeakMap();
    const projectEnvironmentSummaryCache = new WeakMap();
    const projectWorkspaceContextCache = new WeakMap();
    let taskSelectionSetsCacheSources = null;
    let taskSelectionSetsCacheValue = null;
    let taskSectionViewCacheState = null;
    let taskSectionViewCacheScope = "";
    let taskSectionViewCacheValue = null;
    let planExecutionStageCacheState = null;
    let planExecutionStageCache = new Map();
    let planActiveRunEvidenceCacheState = null;
    let planActiveRunEvidenceCache = new Map();
    let planVersionRowsCacheState = null;
    let planVersionOperationRowsCache = new Map();
    let planVersionTaskRowsCache = new Map();
    let planArchiveReadinessIndexState = null;
    let planArchiveReadinessIndexSummary = null;
    let planArchiveReadinessIndexResults = null;
    let planArchiveReadinessIndexTasks = null;
    let planArchiveReadinessIndexValue = null;
    let planArchiveReadinessCache = new Map();
    let operationViewCacheRows = null;
    let operationViewCacheFilter = "";
    let operationViewCacheValue = null;
    let operationStatusFilter = normalizeOperationStatusFilter(restoredWebviewState.operationStatusFilter);
    let operationSignatureCacheRows = null;
    let operationSignatureCacheValue = null;
    let operationSectionSignatureCacheRows = null;
    let operationSectionSignatureCacheMinute = -1;
    let operationSectionSignatureCacheValue = null;
    let experimentTraceRowsCacheInput = null;
    let experimentTraceRowsCacheRows = [];
    let experimentTraceViewCacheRows = null;
    let experimentTraceViewCacheSelectionKey = "";
    let experimentTraceViewCacheValue = null;
    const traceRowsForPlanScopeCache = new WeakMap();
    let resultEvidenceTraceStatsCacheRows = null;
    let resultEvidenceTraceStatsCacheValue = null;
    let currentPlanWorkflowResultCacheState = null;
    let currentPlanWorkflowResultCache = new Map();
    let currentPlanRevisionRunEvidenceCacheState = null;
    let currentPlanRevisionRunEvidenceCache = new Map();
    let resultAutoParseReadinessCacheState = null;
    let resultAutoParseReadinessCacheSummary = null;
    let resultAutoParseReadinessCacheValue = null;
    let currentResultOutputContractCheckCacheState = null;
    let currentResultOutputContractCheckCacheValue = null;
    let resultAnalysisArtifactsCacheState = null;
    let resultAnalysisArtifactsCacheSummary = null;
    let resultAnalysisArtifactsCacheValue = null;
    let resultEvidenceWorkbenchCacheKey = "";
    let resultEvidenceWorkbenchCacheHtml = "";
    let claimEvidencePreviewHtmlCacheKey = "";
    let claimEvidencePreviewHtmlCache = "";
    let planLookupIndexCacheSource = null;
    let planLookupIndexCacheValue = new Map();
    const planFileEquivalenceCache = new Map();
    let enabledWorkerTunnelsCacheSource = null;
    let enabledWorkerTunnelsCacheValue = [];
    let simpleSftpReadinessCacheSource = null;
    let simpleSftpReadinessCacheValue = null;
    let serverSetupReadinessCacheSetup = null;
    let serverSetupReadinessCacheWorkers = null;
    let serverSetupReadinessCacheValue = null;
    let executionWorkerReadinessCacheWorkers = null;
    let executionWorkerReadinessCacheValue = null;
    let agentPreparationBlockersCacheSource = null;
    let agentPreparationBlockersCacheValue = null;
    let uiCapabilityReadinessCacheKey = "";
    let uiCapabilityReadinessCache = new Map();
    let workerAliasMapCacheSource = null;
    let workerAliasMapCacheValue = null;
    let overviewGpuStatsCacheState = null;
    let overviewGpuStatsCacheSource = null;
    let overviewGpuStatsCacheSetup = null;
    let overviewGpuStatsCacheOwner = null;
    let overviewGpuStatsCacheValue = null;
    let gpuViewModelCacheState = null;
    let gpuViewModelCacheSource = null;
    let gpuViewModelCacheSetup = null;
    let gpuViewModelCacheOwner = null;
    let gpuViewModelCacheValue = null;
    let gpuWorkerLookupCacheSource = null;
    let gpuWorkerLookupCacheValue = null;
    let gpuServerWorkerMatchCacheLookup = null;
    let gpuServerWorkerMatchCache = new WeakMap();
    let gpuOwnerStateCacheOwnerSig = "";
    let gpuOwnerStateCache = new WeakMap();
    let gpuHistoryOverviewOpen = false;
    let gpuHistorySeriesCache = new Map();
    let gpuHistorySeriesRevision = 0;
    let gpuHistoryOverviewCacheRevision = -1;
    let gpuHistoryOverviewCacheState = null;
    let gpuHistoryOverviewCacheServers = null;
    let gpuHistoryOverviewCacheValue = [];
    let gpuHistoryMeta = {};
    let gpuHistoryLastStateStatus = "idle";
    let expandedGpuHistoryKeys = new Set();
    const GPU_HISTORY_REQUEST_COOLDOWN_MS = 60_000;
    const GPU_HISTORY_SERVER_STYLE_LIMIT = 128;
    const GPU_HISTORY_OKLAB_CACHE_LIMIT = 256;
    const gpuHistoryRequestLastAt = new Map();
    let gpuHistoryDrawFrame = 0;
    let activeGpuHistoryTooltip = null;
    let gpuHistoryPointIndexCache = new WeakMap();
    const gpuHistoryOklabCache = new Map();
    let gpuHistoryServerStyles = loadGpuHistoryServerStyles();
    let gpuHistoryServerStylesSaveTimer = 0;
    let overviewTaskStatsCacheRows = null;
    let overviewTaskStatsCacheValue = null;
    let overviewOperationStatsCacheRows = null;
    let overviewOperationStatsCacheValue = null;
    let overviewProjectStatsCacheProject = null;
    let overviewProjectStatsCachePlans = null;
    let overviewProjectStatsCacheValue = null;
    let overviewProjectReadinessCacheState = null;
    let overviewProjectReadinessCacheValue = null;
    let projectEndpointReadinessCacheState = null;
    let projectEndpointReadinessCacheValue = null;
    let projectCodeSyncReadinessCacheState = null;
    let projectCodeSyncReadinessCacheValue = null;
    let serverStatusIndexCacheSources = null;
    let serverStatusIndexCacheValue = null;
    let xshellSessionIndexCacheSource = null;
    let xshellSessionIndexCacheValue = null;
    const configParamDiffBaseCache = new WeakMap();
    const EMPTY_CONFIG_PARAM_DIFF_SOURCE = Object.freeze({});
    let configInspectorIndexCacheSource = null;
    let configInspectorIndexCacheValue = null;
    let configParamFilterTimer = 0;
    let configParamFilterGeneration = 0;
    let selectedPlanCheckbox = null;
    let taskPlanScope = normalizePlanViewScope(restoredWebviewState.taskPlanScope);
    let tracePlanScope = normalizePlanViewScope(restoredWebviewState.tracePlanScope);
    let webviewDomCommandAuditCache = null;
    let webviewDomCommandAuditCacheKey = "";
    let webviewDomCommandAuditUpdatedAt = 0;
    let featureReadinessRowsCacheKey = "";
    let featureReadinessRowsCacheHtml = "";
    let activeButtonActionSpec = null;
    let activeLayoutResize = null;
    const TASK_RENDER_LIMIT = 80;
    const PLAN_ACTIVE_STATUSES = new Set(["accepted", "submitted", "queued", "pending", "running", "testing", "progress", "in_progress", "operation_started", "started"]);
    const PLAN_RUN_OPERATION_TYPES = new Set(["run-plan", "reproduce-plan"]);
    const PPT_AUTOMATION_ACTION_COMMANDS = new Set(["refreshPptAutomation", "startPptAutomation", "openPptAutomationGuide"]);
    const BUTTON_AUDIT_ROW_ACTION_COMMANDS = new Set(["stopExperiment", "retryExperiment", "archiveArtifacts", "deleteArtifacts", "selectLogRunKey"]);
    const RESOURCE_TREE_SECTION_KEYS = new Set(["overview", "servers", "settings", "gpu", "tasks", "plans", "results", "sync", "operations", "diagnostics"]);
    const PINNED_COMMAND_VALUES = new Set(["startAllConnections", "prepareAgents", "testAll", "snapshot", "runPlan", "runAllPlans", "archivePlan", "validatePlan", "dryRunPlan", "parseResults", "refreshResults", "runQualityGate", "runStatistics", "checkClaimEvidence", "exportPaperTable", "checkOutputContract", "parseCaseLevel", "runLeakageCheck", "runSubgroupAnalysis", "exportCaseAnalysis", "planCheckpointRetention", "inspectDataset", "exportPlottingContract", "plotResultsToPpt", "inferConfigFromRun", "recoverPlanFromRun", "diagnoseResultAnomaly", "compareWithBestConfig", "publishGithub", "syncGithub", "overwriteGithub", "uploadProjectToHub", "uploadProjectToWorkers", "distributeCodeToWorkers", "deployLatestAgent", "configureSftpIgnores", "selfCheck", "createDebugBundle", "pauseAll", "resumeNetwork"]);
    const SIMPLE_SFTP_GATED_COMMANDS = new Set(["prepareAgents", "deployLatestAgent", "uploadProjectToHub", "uploadProjectToWorkers", "distributeCodeToWorkers", "configureSftpIgnores", "runPlan", "reproducePlan", "runAllPlans"]);
    const DEBUG_MODE_BLOCKED_UI_COMMANDS = new Set(["runAllPlans", "archivePlan", "restoreArchivedPlan", "archiveArtifacts", "excludeResults", "syncArtifacts", "completeThreeWay", "deleteArtifacts", "reconcileDeletions", "parseResults", "refreshResults", "runQualityGate", "runStatistics", "checkClaimEvidence", "exportPaperTable", "checkOutputContract", "parseCaseLevel", "runLeakageCheck", "runSubgroupAnalysis", "exportCaseAnalysis", "planCheckpointRetention", "inspectDataset", "createOfflineBundle", "exportPlottingContract", "plotResultsToPpt", "inferConfigFromRun", "recoverPlanFromRun", "diagnoseResultAnomaly", "compareWithBestConfig"]);
    const COMMAND_ACTION_NAMES = Object.freeze({
      validatePlan: "validate-plan", dryRunPlan: "dry-run-plan", runPlan: "run-plan", stopExperiment: "stop-experiment", retryExperiment: "retry-experiment", reproducePlan: "reproduce-plan",
      parseResults: "parse-results", refreshResults: "refresh-results", runQualityGate: "run-quality-gate", runStatistics: "run-statistics", exportPaperTable: "export-paper-table", checkClaimEvidence: "check-claim-evidence",
      checkOutputContract: "check-output-contract", parseCaseLevel: "parse-case-level", runLeakageCheck: "run-leakage-check", runSubgroupAnalysis: "run-subgroup-analysis", exportCaseAnalysis: "export-case-analysis",
      planCheckpointRetention: "plan-checkpoint-retention", inspectDataset: "inspect-dataset", exportPlottingContract: "export-plotting-contract", inferConfigFromRun: "infer-config-from-run", recoverPlanFromRun: "recover-plan-from-run",
      diagnoseResultAnomaly: "diagnose-result-anomaly", compareWithBestConfig: "compare-with-best-config", archiveArtifacts: "archive-artifacts", excludeResults: "exclude-results", syncArtifacts: "sync-artifacts",
      completeThreeWay: "complete-three-way", deleteArtifacts: "delete-artifacts", reconcileDeletions: "reconcile-deletions", selfCheck: "self-check", createDebugBundle: "create-debug-bundle"
    });
    const RESOURCE_TREE_NEXT_STEPS = Object.freeze({ overview: "检查总览", servers: "保存后检测", gpu: "查看 GPU", plans: "校验/预演", tasks: "查看任务", results: "解析/统计", sync: "发布/同步", operations: "看终态", diagnostics: "看诊断" });
    const COMMAND_INSPECTOR_SECTIONS = Object.freeze({
      prepareAgents: "servers", startAllConnections: "overview", pauseAll: "overview", resumeNetwork: "overview", saveTopologyMode: "servers", saveSchedulerConfig: "servers", startAll: "servers", testAll: "servers", snapshot: "gpu",
      validatePlan: "plans", dryRunPlan: "plans", runPlan: "plans", runAllPlans: "plans", archivePlan: "plans", generateOutputAdapter: "plans",
      stopExperiment: "tasks", retryExperiment: "tasks", archiveArtifacts: "tasks", excludeResults: "results", deleteArtifacts: "tasks", parseResults: "results", refreshResults: "results", checkOutputContract: "results",
      inferConfigFromRun: "results", recoverPlanFromRun: "results", diagnoseResultAnomaly: "results", compareWithBestConfig: "results", inspectDataset: "results", planCheckpointRetention: "results",
      parseCaseLevel: "results", runLeakageCheck: "results", runSubgroupAnalysis: "results", exportCaseAnalysis: "results", runQualityGate: "results", runStatistics: "results", checkClaimEvidence: "results",
      exportPaperTable: "results", exportPlottingContract: "results", plotResultsToPpt: "results", publishGithub: "sync", syncGithub: "sync", overwriteGithub: "sync", uploadProjectToHub: "sync",
      uploadProjectToWorkers: "sync", distributeCodeToWorkers: "sync", deployLatestAgent: "sync", configureSftpIgnores: "sync", selfCheck: "diagnostics", createDebugBundle: "diagnostics", downloadDebugBundle: "diagnostics", openAuditTail: "diagnostics"
    });
    const ACTION_RESOURCE_ANCHORS = Object.freeze({
      saveTopologyMode: "settings-servers", saveSchedulerConfig: "servers-scheduler", startAll: "servers-sessions", startAllConnections: "servers-sessions", prepareAgents: "servers-sessions", testAll: "servers-sessions", snapshot: "gpu-summary",
      validatePlan: "plans-actions", dryRunPlan: "plans-actions", runPlan: "plans-actions", runAllPlans: "plans-actions", archivePlan: "plans-actions", generateOutputAdapter: "plans-detected",
      stopExperiment: "tasks-list", retryExperiment: "tasks-list", archiveArtifacts: "tasks-list", excludeResults: "results-traces", deleteArtifacts: "tasks-list", parseResults: "results-summary", refreshResults: "results-summary",
      runQualityGate: "results-summary", runStatistics: "results-summary", checkClaimEvidence: "results-summary", exportPaperTable: "results-summary", checkOutputContract: "results-contract", inspectDataset: "results-dataset",
      planCheckpointRetention: "results-checkpoints", inferConfigFromRun: "results-recovery", recoverPlanFromRun: "results-recovery", diagnoseResultAnomaly: "results-anomaly", compareWithBestConfig: "results-anomaly",
      parseCaseLevel: "results-traces", runLeakageCheck: "results-traces", runSubgroupAnalysis: "results-traces", exportCaseAnalysis: "results-traces", exportPlottingContract: "results-plotting",
      selfCheck: "diagnostics-targets", createDebugBundle: "diagnostics-json", downloadDebugBundle: "diagnostics-json", openAuditTail: "diagnostics-errors"
    });
    const SYNC_COMMAND_ANCHORS = Object.freeze({ publishGithub: "sync-publish-github", syncGithub: "sync-github-push", overwriteGithub: "sync-github-overwrite", uploadProjectToHub: "sync-upload-hub", uploadProjectToWorkers: "sync-upload-workers", distributeCodeToWorkers: "sync-distribute-workers", deployLatestAgent: "sync-deploy-agent", configureSftpIgnores: "sync-sftp-ignore" });
    const RESULT_METADATA_FILENAMES = new Set(["jobs.csv", "artifact_manifest.json", "checkpoint_manifest.json", "manifest.json", "metadata.json", "status.json", "state.json", "progress.json", "job.json", "jobs.json", "env_snapshot.json", "config_snapshot.json", "config_snapshot.yaml", "config_snapshot.yml"]);
    const RESULT_METADATA_SUFFIXES = ["_snapshot.json", "_manifest.json", "_status.json", "_state.json", "_progress.json"];
    const EMPTY_OUTPUT_DERIVATION_VALUES = Object.freeze([]);
    const EMPTY_OUTPUT_DERIVATION_SOURCE = Object.freeze({});
    const EMPTY_SERVER_SETUP = Object.freeze({});
    const EMPTY_AGENT_PREPARATION_BLOCKERS = Object.freeze([]);
    const EMPTY_CAPABILITY_SOURCE = Object.freeze({});
    const EMPTY_PLAN_ROWS_FOR_LOOKUP = [];
    const EMPTY_SCHEDULER_STATES = [];
    const MATCH_EVERY_OPERATION = () => true;
    const MATCH_NO_OPERATION = () => false;
    const OPERATION_INFRASTRUCTURE_PATTERN = /self|debug|audit|diagnostic|agent|tunnel|port/;
    const OPERATION_SECTION_MATCH_PATTERNS = new Map([
      ["sync", /publish|github|upload|deploy|sftp|sync|distribute/],
      ["tasks", /stop|retry|archive|delete|worker|task|experiment|run/],
      ["results", /parse|result|quality|statistics|paper|claim|archive|sync/],
      ["plans", /plan|validate|dry-run|run-plan|reproduce/],
      ["servers", OPERATION_INFRASTRUCTURE_PATTERN],
      ["diagnostics", OPERATION_INFRASTRUCTURE_PATTERN]
    ]);
    const GPU_SERVER_UNCONFIGURED_INDEX = 10000;
    const EMPTY_SIMPLE_SFTP_INTEGRATION = {};
    const DEFAULT_SIMPLE_SFTP_READINESS = { ready: true, message: "" };
    const EMPTY_SERVER_STATUS_ROWS = [];
    const EMPTY_TASK_SELECTION_VALUES = [];
    const EMPTY_TASK_SELECTION_SET = new Set();
    const TASK_LOG_RENDER_LIMIT = 8000;
    const PLAN_RENDER_LIMIT = 30;
    const TRACE_RENDER_LIMIT = 60;
    const OPERATION_RENDER_LIMIT = 24;
    const ARCHIVED_PLAN_RENDER_LIMIT = 24;
    const EMPTY_WORKER_TUNNELS_FOR_ALIAS = [];
    const EMPTY_XSHELL_SESSIONS = [];
    const TASK_LIVE_STATUS_TOKENS = new Set(["running", "testing"]);
    const TASK_STATUS_RANKS = Object.freeze({ running: 0, testing: 1, queued: 2, pending: 2, failed: 3, error: 3, stalled: 3, stopped: 3, cancelled: 3, completed: 4, done: 4, archived: 4, deleted: 4 });
    const SCHEDULER_BUCKET_STATUSES = Object.freeze({
      running_experiments: "running",
      testing_experiments: "testing",
      queued_experiments: "queued",
      pending_experiments: "queued",
      completed_experiments: "completed",
      failed_experiments: "failed",
      stopped_experiments: "stopped"
    });
    const SCHEDULER_BUCKETS = Object.freeze(Object.keys(SCHEDULER_BUCKET_STATUSES));
    const TASK_RENDER_BUDGET_HINT = "超出渲染预算时按已选、运行或失败、排队、其余的顺序保留；折叠的任务仍参与计数与批量操作";
    const FEATURE_READINESS_GROUPS = [
      ["发布同步", ["publishGithub", "syncGithub", "overwriteGithub", "uploadProjectToHub", "uploadProjectToWorkers", "distributeCodeToWorkers", "deployLatestAgent", "configureSftpIgnores"]],
      ["计划运行链路", ["validatePlan", "dryRunPlan", "runPlan", "reproducePlan"]],
      ["Worker 手动控制", ["stopExperiment", "retryExperiment", "archiveArtifacts", "deleteArtifacts"]],
      ["结果证据闭环", ["parseResults", "refreshResults", "excludeResults", "checkOutputContract", "inferConfigFromRun", "recoverPlanFromRun", "diagnoseResultAnomaly", "compareWithBestConfig", "parseCaseLevel", "runLeakageCheck", "runSubgroupAnalysis", "exportCaseAnalysis", "runQualityGate", "runStatistics", "checkClaimEvidence", "exportPaperTable", "exportPlottingContract", "plotResultsToPpt"]],
      ["诊断与恢复", ["selfCheck", "createDebugBundle", "downloadDebugBundle", "openAuditTail", "reconcileDeletions"]]
    ];
    const TARGET_MATRIX_BASELINE_ROWS = [
      ["UI 中文与工作流", "partial", "持续优化", ["test/ui/*.test.js", "README", "入口不删减"]],
      ["Xshell 本地隧道边界", "done", "已实现+测试", ["127.0.0.1", "tunnel tests", "lint"]],
      ["通信风控节奏", "done", "已实现+测试", ["60s+jitter", "requestBudget", "realtimeReconnect"]],
      ["任务按钮终态", "done", "已实现+测试", ["clientActionId", "taskActionLayout", "operationTimeline"]]
    ];
    const TARGET_MATRIX_TRAILING_ROWS = [
      ["旧隧道内部遗留", "later", "最后阶段", ["P3", "迁移测试", "兼容读取"]]
    ];
    const TARGET_MATRIX_PROJECT_EVIDENCE = ["planActionWorkflow", "Results", "ProjectAdapterTemplates"];
    const TARGET_MATRIX_SMOKE_EVIDENCE = ["检测全部", "GPU 状态", "任务/结果/归档"];
    const SECTION_SIGNATURE_ROW_LIMIT = 80;
    const GPU_SERVER_RENDER_LIMIT = 24;
    const GPU_ROW_PER_SERVER_RENDER_LIMIT = 16;
    const GPU_PROCESS_SIGNATURE_LIMIT = 4;
    const GPU_CACHE_SERVER_LIMIT = 80;
    const GPU_HISTORY_SERIES_CACHE_LIMIT = 128;
    const GPU_HISTORY_GAP_FACTOR = 1.75;
    const GPU_HISTORY_OKLCH_CANDIDATES = [[0.62, 0.18, 255], [0.67, 0.16, 75], [0.62, 0.17, 150], [0.62, 0.2, 25], [0.62, 0.19, 310], [0.64, 0.14, 205], [0.62, 0.18, 340], [0.65, 0.15, 120], [0.65, 0.17, 50], [0.62, 0.13, 180], [0.60, 0.17, 5], [0.60, 0.13, 230]];
    const GPU_HISTORY_COLORS = GPU_HISTORY_OKLCH_CANDIDATES.map(gpuHistoryOklchToHex);
    const GPU_HISTORY_MIN_COLOR_DISTANCE = 0.09;
    const GPU_HISTORY_LINE_STYLES = ["solid", "dash", "dot", "dashdot"];
    const GPU_HISTORY_MARKERS = ["circle", "square", "triangle", "diamond"];
    const TASK_LOG_EXPANSION_LIMIT = 160;
    const WEBVIEW_DOM_AUDIT_CACHE_MS = 60000;
    const INSPECTOR_ACTION_RENDER_LIMIT = 10;
    const INSPECTOR_CUSTOM_ACTION_RENDER_LIMIT = 6;
    const INSPECTOR_READINESS_RENDER_LIMIT = 8;
    const PLAN_EXECUTION_STAGE_CACHE_LIMIT = 64;
    const PLAN_VERSION_ROWS_CACHE_LIMIT = 64;
    const CURRENT_PLAN_RUN_EVIDENCE_CACHE_LIMIT = 64;
    const CURRENT_PLAN_WORKFLOW_RESULT_CACHE_LIMIT = 32;
    const PLAN_FILE_EQUIVALENCE_CACHE_LIMIT = 128;
    const PLAN_ARCHIVE_READINESS_CACHE_LIMIT = 64;
    const PROJECT_OUTPUT_GATE_DIAGNOSTICS_VARIANT_LIMIT = 16;
    const EMPTY_PLAN_FILE_EQUIVALENCE_ENTRY = Object.freeze({ keys: Object.freeze([]), keySet: new Set() });
    const RESULT_ANALYSIS_ARTIFACT_FIELDS = Object.freeze({
      "export-plotting-contract": "plottingContractPath",
      "parse-case-level": "caseLevelPath",
      "recover-plan-from-run": "recoveredPlanReportPath",
      "diagnose-result-anomaly": "anomalyPath"
    });
    const NATIVE_TITLE_MAX_CHARS = 56;
    const LOW_VALUE_NATIVE_TITLES = new Set([
      "详情", "工作流", "对象状态", "通信矩阵", "通信拓扑", "调度参数", "服务器管理",
      "任务详情", "记录详情", "详情分区", "任务检查", "任务事件", "记录检查", "记录事件",
      "常用操作", "当前操作", "最近操作", "固定操作", "操作进度", "操作明细",
      "结果证据", "论文证据", "目标验收矩阵", "功能可用性", "PPT 绘图", "发布同步",
      "快捷操作", "工作详情", "中间状态与结果列", "集群运行态", "可用性",
      "运行门禁", "项目接入", "接入规则", "建议", "说明", "提示", "修复"
    ]);
    const LOW_VALUE_NATIVE_TITLE_KEYS = new Set(["详情", "建议", "说明", "提示", "修复", "原因", "帮助"]);
    const EXPLANATORY_TITLE_PATTERN = /(点击|请|用于|建议|避免|需要|不会|可以|保持|查看|显示|打开|确认|检查|保存|选择|拖动|执行|推荐|完整|这里|这个|当前|负责|说明|提示)/;
    const pinnedCommandDefaults = ["testAll", "snapshot", "startAllConnections", "runPlan", "parseResults", "configureSftpIgnores"];
    const uiCapabilityMap = {
      validatePlan: ["actions.validate-plan"],
      dryRunPlan: ["actions.dry-run-plan"],
      runPlan: ["actions.run-plan"],
      stopExperiment: ["actions.stop-experiment"],
      retryExperiment: ["actions.retry-experiment"],
      reproducePlan: ["actions.reproduce-plan"],
      parseResults: ["actions.parse-results"],
      refreshResults: ["actions.refresh-results", "endpoints.resultsSummary"],
      runQualityGate: ["actions.run-quality-gate"],
      runStatistics: ["actions.run-statistics"],
      exportPaperTable: ["actions.export-paper-table"],
      checkClaimEvidence: ["actions.check-claim-evidence"],
      checkOutputContract: ["actions.check-output-contract"],
      parseCaseLevel: ["actions.parse-case-level"],
      runLeakageCheck: ["actions.run-leakage-check"],
      runSubgroupAnalysis: ["actions.run-subgroup-analysis"],
      exportCaseAnalysis: ["actions.export-case-analysis"],
      planCheckpointRetention: ["actions.plan-checkpoint-retention"],
      inspectDataset: ["actions.inspect-dataset"],
      exportPlottingContract: ["actions.export-plotting-contract"],
      inferConfigFromRun: ["actions.infer-config-from-run"],
      recoverPlanFromRun: ["actions.recover-plan-from-run"],
      diagnoseResultAnomaly: ["actions.diagnose-result-anomaly"],
      compareWithBestConfig: ["actions.compare-with-best-config"],
        archiveArtifacts: ["actions.archive-artifacts"],
        excludeResults: ["actions.exclude-results"],
      syncArtifacts: ["actions.sync-artifacts"],
      completeThreeWay: ["actions.complete-three-way"],
      deleteArtifacts: ["actions.delete-artifacts"],
      reconcileDeletions: ["actions.reconcile-deletions"],
      selfCheck: ["actions.self-check"],
      createDebugBundle: ["actions.create-debug-bundle"],
      downloadDebugBundle: ["endpoints.fileDownload"],
      downloadRemoteResult: ["endpoints.fileDownload"],
      openAuditTail: ["endpoints.auditTail"]
    };
    const noHubWorkerResultCommands = new Set([
      "refreshResults", "parseResults", "runQualityGate", "runStatistics", "exportPaperTable",
      "checkClaimEvidence", "checkOutputContract", "parseCaseLevel", "runLeakageCheck", "runSubgroupAnalysis",
      "exportCaseAnalysis", "planCheckpointRetention", "inspectDataset", "exportPlottingContract", "inferConfigFromRun",
      "recoverPlanFromRun", "diagnoseResultAnomaly", "compareWithBestConfig", "archiveArtifacts", "excludeResults",
      "syncArtifacts", "completeThreeWay"
    ]);
    const directWorkerActionMap = {
      stopExperiment: "stop-worker-task",
      retryExperiment: "retry-worker-task",
      archiveArtifacts: "archive-worker-artifacts",
      deleteArtifacts: "delete-worker-artifacts"
    };
    const taskObjectScopedCommands = new Set(["selectLogRunKey", "stopExperiment", "retryExperiment", "archiveArtifacts", "excludeResults", "deleteArtifacts", "syncArtifacts", "completeThreeWay", "clearLegacyTasks"]);
    const taskBatchScopedCommands = new Set(["stopExperiment", "retryExperiment", "parseResults", "archiveArtifacts", "excludeResults", "deleteArtifacts", "syncArtifacts", "completeThreeWay", "clearLegacyTasks"]);
    const endpointScopedCommands = new Set(["startTunnelEndpoint", "startAgentEndpoint", "saveWorkerConfig", "deleteWorkerConfig"]);
    const explicitPlanFileCommands = new Set(["openPlan", "archivePlan", "restoreArchivedPlan"]);
    const explicitSavePlanCommands = new Set(["savePlan"]);
    const webviewHandledCommands = new Set([
      "quickSetup", "openSetupGuide", "openAdvancedCommandsSetting", "configureSessions", "configureAgentSessions", "writeAgentCommands", "saveTopologyMode", "saveHubConfig", "saveSchedulerConfig", "saveWorkerConfig", "addWorkerConfig", "deleteWorkerConfig", "prepareAgents",
      "startTunnelEndpoint", "startAgentEndpoint", "configureWorkers", "configurePorts", "repairPorts", "configure", "startHub", "startWorker", "start", "startAll", "startAgents", "startAllConnections",
      "test", "testAll", "showRegistry", "restart", "pauseStream", "resumeStream", "pauseAll", "resumeNetwork", "snapshot", "manualGpuSnapshot", "loadGpuHistory", "manualSchedulerSnapshot", "manualTracesSnapshot",
      "selectLogRunKey", "script", "realCheck", "status", "offline", "openPlan", "savePlan", "archivePlan", "restoreArchivedPlan", "runAllPlans", "generatePlanGuide", "bootstrapProject", "generateOutputAdapter", "saveProjectAdapterRules", "savePptPlotConfig", "choosePptPath", "chooseNewPptPath", "plotResultsToPpt", "refreshPptAutomation", "startPptAutomation", "openPptAutomationGuide", "clearLegacyTasks", "saveUiLayout", "resetUiLayout",
      "publishGithub", "syncGithub", "overwriteGithub", "uploadProjectToHub", "uploadProjectToWorkers", "distributeCodeToWorkers", "deployLatestAgent", "configureSftpIgnores", "resetRemotePathConfirmations", "downloadDebugBundle", "downloadRemoteResult", "openResultArtifact", "openAuditTail",
      "selectPlan", "selectExperiment",
      ...Object.keys(uiCapabilityMap)
    ]);
    document.addEventListener("click", (event) => {
      const taskSelectionInput = event.target.closest('input[type="checkbox"][data-command="selectExperiment"]');
      if (taskSelectionInput) {
        event.stopPropagation();
        return;
      }
      const auditRefresh = event.target.closest("#refreshDomCommandAudit");
      if (auditRefresh) {
        event.preventDefault();
        refreshWebviewDomCommandAudit("manual");
        renderFeatureReadiness(lastState || {});
        return;
      }
      const mainViewTarget = event.target.closest("[data-main-view]");
      if (mainViewTarget) {
        event.preventDefault();
        switchMainView(mainViewTarget.dataset.mainView || "workspace");
        return;
      }
      const runModeTarget = event.target.closest("button[data-run-mode]");
      if (runModeTarget) {
        event.preventDefault();
        setRunMode(runModeTarget.dataset.runMode);
        refreshRunModeUi();
        return;
      }
      const operationFilterTarget = event.target.closest("button[data-operation-filter]");
      if (operationFilterTarget) {
        event.preventDefault();
        const nextFilter = String(operationFilterTarget.dataset.operationFilter || "all");
        if (OPERATION_STATUS_FILTER_VALUES.includes(nextFilter) && operationStatusFilter !== nextFilter) {
          operationStatusFilter = nextFilter;
          persistWebviewState({ operationStatusFilter });
          operationViewCacheRows = null;
          operationViewCacheFilter = "";
          operationViewCacheValue = null;
          operationSectionSignatureCacheRows = null;
          operationSectionSignatureCacheValue = null;
          renderOperationSection(lastState || {});
        }
        return;
      }
      const historyLegend = event.target.closest("button[data-gpu-history-focus]");
      if (historyLegend) {
        event.preventDefault();
        const chart = historyLegend.closest(".gpuHistoryChart");
        const canvas = chart && chart.querySelector("canvas.gpuHistoryCanvas");
        if (canvas) {
          canvas.dataset.focusSeries = historyLegend.dataset.gpuHistoryFocus || "";
          drawGpuHistoryCanvas(canvas);
          canvas.focus();
        }
        return;
      }
      const treeTarget = event.target.closest("[data-section-target]");
      if (treeTarget) {
        hidePinContextMenu();
        event.preventDefault();
        if (PLAN_VIEW_SCOPE_VALUES.includes(treeTarget.dataset.taskPlanScope)) setTaskPlanScope(treeTarget.dataset.taskPlanScope);
        navigateToResourceTarget(treeTarget.dataset.sectionTarget, treeTarget.dataset.anchorTarget);
        renderResourceTreeInspector(activeResourceSection, activeResourceAnchor);
        renderWorkbenchInspector(lastState || {});
        return;
      }
      const taskPlanScopeTarget = event.target.closest("button[data-task-plan-scope]");
      if (taskPlanScopeTarget) {
        event.preventDefault();
        handleTaskPlanScopeClick(taskPlanScopeTarget);
        return;
      }
      const tracePlanScopeTarget = event.target.closest("button[data-trace-plan-scope]");
      if (tracePlanScopeTarget) {
        event.preventDefault();
        handleTracePlanScopeClick(tracePlanScopeTarget);
        return;
      }
      const mainTarget = event.target.closest && event.target.closest("#mainColumn [data-anchor], #mainColumn [data-section]");
      if (mainTarget) syncSidePanelsFromMainColumn(mainTarget, { force: true });
      const drawerPin = event.target.closest("[data-drawer-pin]");
      if (drawerPin) {
        event.preventDefault();
        event.stopPropagation();
        toggleDrawerPinned(drawerPin.dataset.drawerPin);
        return;
      }
      const collapse = event.target.closest("[data-collapse-section]");
      if (collapse) {
        hidePinContextMenu();
        event.preventDefault();
        event.stopPropagation();
        const section = collapse.dataset.collapseSection;
        const card = document.querySelector('[data-section="' + cssEscape(section) + '"]');
        const next = !(card && card.classList.contains("is-collapsed"));
        currentUiLayout.collapsed = Object.assign({}, currentUiLayout.collapsed, { [section]: next });
        preserveScroll(() => applyUiLayout({ uiLayout: currentUiLayout }));
        if (!next) renderSectionIfVisible(lastState || {}, section, { force: true });
        refreshCardDecorations();
        saveUiLayout();
        return;
      }
      const pinMenuAction = event.target.closest("[data-pin-menu-action]");
      if (pinMenuAction) {
        event.preventDefault();
        event.stopPropagation();
        const action = pinMenuAction.dataset.pinMenuAction || "";
        const spec = activeButtonActionSpec;
        hidePinContextMenu();
        handleButtonActionMenu(action, spec);
        return;
      }
      const cardMenuAction = event.target.closest("[data-card-menu-action]");
      if (cardMenuAction) {
        event.preventDefault();
        event.stopPropagation();
        const key = cardMenuAction.dataset.cardKey || "";
        const action = cardMenuAction.dataset.cardMenuAction || "toggle";
        hidePinContextMenu();
        setStatusCardCollapsed(key, action === "collapse" ? true : action === "expand" ? false : undefined);
        return;
      }
      hidePinContextMenu();
      if (event.target.closest("#collapseAllSections")) {
        event.preventDefault();
        setAllSectionsCollapsed(true);
        return;
      }
      if (event.target.closest("#expandAllSections")) {
        event.preventDefault();
        setAllSectionsCollapsed(false);
        return;
      }
      const button = event.target.closest("button[data-command]");
      if (!button || button.disabled) return;
      const command = button.dataset.command;
      const payload = payloadFromButton(button);
      const pendingKey = pendingKeyForButton(button, command, payload);
      if (pendingButtonKeys.has(pendingKey)) return;
      if (commandNeedsLoading(command)) {
        const clientActionId = createClientActionId(command, pendingKey);
        payload.clientActionId = clientActionId;
        pendingButtonKeys.add(pendingKey);
        const pendingItem = Object.assign({ command, pendingKey, clientActionId, actionSection: button.dataset.actionSection || "", startedAt: Date.now(), label: button.textContent.trim(), status: "running" }, payload);
        pendingActions[pendingKey] = pendingItem;
        pendingActionsById[clientActionId] = pendingItem;
        setButtonLoading(button, pendingKey);
        pendingActionTimeouts[clientActionId] = setTimeout(() => {
          const item = pendingActionsById[clientActionId];
          if (item && Date.now() - Number(item.startedAt || 0) >= 45000) {
            item.status = "stalled";
            item.message = "UI command timed out waiting for terminal status";
            delete pendingActions[pendingKey];
            delete pendingActionsById[clientActionId];
            clearPendingActionTimeout(clientActionId);
            pendingButtonKeys.delete(pendingKey);
            clearButtonsForPending(clientActionId, pendingKey, command);
            refreshTerminalUi(command);
          }
        }, 45500);
      }
      vscode.postMessage(Object.assign({ command }, payload));
    });
    document.addEventListener("contextmenu", (event) => {
      const button = event.target.closest("#workbenchInspector button[data-command], #mainColumn button[data-command]");
      if (!button) {
        const card = event.target.closest && event.target.closest(statusCardSelector());
        const interactive = event.target.closest && event.target.closest("button,input,select,textarea,a,summary,details,[contenteditable=true]");
        if (card && !interactive) {
          event.preventDefault();
          showStatusCardContextMenu(card, event.clientX, event.clientY);
          return;
        }
        hidePinContextMenu();
        return;
      }
      const spec = actionSpecFromButton(button);
      if (!spec) return;
      event.preventDefault();
      showButtonActionContextMenu(spec, event.clientX, event.clientY);
    });
    window.addEventListener("blur", () => hidePinContextMenu());
    window.addEventListener("resize", () => scheduleGpuHistoryDraw());
    window.addEventListener("scroll", () => hidePinContextMenu(), true);
    document.addEventListener("pointermove", (event) => {
      const canvas = event.target && event.target.closest ? event.target.closest("canvas.gpuHistoryCanvas") : null;
      updateGpuHistoryTooltip(canvas, event);
    });
    el("planFileInput").addEventListener("input", (event) => {
      const value = event.target.value || "";
      if (lastState) lastState.planFileInput = value;
      refreshPlanActionButtons(lastState || {}, el("planQuickGrid"));
      refreshContextualActionButtons(lastState || {}, el("workbenchInspector"));
      refreshContextualActionButtons(lastState || {}, el("pinnedActionsHost"));
    });
    el("planFileInput").addEventListener("change", (event) => {
      vscode.postMessage({ command: "selectPlan", planFile: event.target.value });
    });
    el("layoutEditToggle").addEventListener("click", () => {
      if (!layoutEdit && currentMainView === "settings") switchMainView("workspace");
      layoutEdit = !layoutEdit;
      document.body.classList.toggle("layout-edit", layoutEdit);
      refreshCardDecorations();
      updateLayoutToggle();
    });
    document.addEventListener("dragstart", (event) => {
      const treeChild = event.target.closest && event.target.closest("[data-tree-child-section][data-tree-child-anchor]");
      if (treeChild) {
        draggedResourceTreeChild = {
          section: treeChild.dataset.treeChildSection || "",
          anchor: treeChild.dataset.treeChildAnchor || ""
        };
        treeChild.classList.add("tree-dragging");
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", draggedResourceTreeChild.section + "::" + draggedResourceTreeChild.anchor);
        return;
      }
      const treeItem = event.target.closest && event.target.closest("[data-tree-order-section]");
      if (treeItem) {
        draggedResourceTreeSection = treeItem.dataset.treeOrderSection || "";
        treeItem.classList.add("tree-dragging");
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", draggedResourceTreeSection);
        return;
      }
      const handle = event.target.closest(".dragHandle");
      const card = handle ? handle.closest("[data-section]") : undefined;
      if (!layoutEdit || !card) {
        event.preventDefault();
        return;
      }
      draggedSection = card.dataset.section || "";
      card.classList.add("dragging");
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", draggedSection);
    });
    document.addEventListener("dragover", (event) => {
      if (draggedResourceTreeChild) {
        const target = event.target.closest && event.target.closest("[data-tree-child-section][data-tree-child-anchor]");
        clearResourceTreeDropMarkers();
        if (!target || target.dataset.treeChildSection !== draggedResourceTreeChild.section || target.dataset.treeChildAnchor === draggedResourceTreeChild.anchor) return;
        event.preventDefault();
        const box = target.getBoundingClientRect();
        const before = event.clientY < box.top + box.height / 2;
        target.classList.add(before ? "tree-drop-before" : "tree-drop-after");
        return;
      }
      if (draggedResourceTreeSection) {
        const target = event.target.closest && event.target.closest("[data-tree-order-section]");
        clearResourceTreeDropMarkers();
        if (!target || target.dataset.treeOrderSection === draggedResourceTreeSection) return;
        event.preventDefault();
        const box = target.getBoundingClientRect();
        const before = event.clientY < box.top + box.height / 2;
        target.classList.add(before ? "tree-drop-before" : "tree-drop-after");
        return;
      }
      if (!layoutEdit || !draggedSection) return;
      const target = event.target.closest("[data-section]");
      const dragged = document.querySelector('[data-section="' + cssEscape(draggedSection) + '"]');
      if (!target || !dragged || target === dragged) return;
      event.preventDefault();
      const deck = el("mainColumn") || el("cardDeck");
      const box = target.getBoundingClientRect();
      const before = event.clientY < box.top + box.height / 2;
      deck.insertBefore(dragged, before ? target : target.nextSibling);
    });
    document.addEventListener("drop", (event) => {
      if (draggedResourceTreeChild) {
        const target = event.target.closest && event.target.closest("[data-tree-child-section][data-tree-child-anchor]");
        clearResourceTreeDropMarkers();
        if (target && target.dataset.treeChildSection === draggedResourceTreeChild.section && target.dataset.treeChildAnchor !== draggedResourceTreeChild.anchor) {
          event.preventDefault();
          const box = target.getBoundingClientRect();
          const before = event.clientY < box.top + box.height / 2;
          moveResourceTreeChild(draggedResourceTreeChild.section, draggedResourceTreeChild.anchor, target.dataset.treeChildAnchor || "", before);
        }
        return;
      }
      if (draggedResourceTreeSection) {
        const target = event.target.closest && event.target.closest("[data-tree-order-section]");
        clearResourceTreeDropMarkers();
        if (target && target.dataset.treeOrderSection !== draggedResourceTreeSection) {
          event.preventDefault();
          const box = target.getBoundingClientRect();
          const before = event.clientY < box.top + box.height / 2;
          moveResourceTreeSection(draggedResourceTreeSection, target.dataset.treeOrderSection || "", before);
        }
        return;
      }
      if (!layoutEdit || !draggedSection) return;
      event.preventDefault();
      saveUiLayout();
    });
    document.addEventListener("dragend", () => {
      document.querySelectorAll(".section-card.dragging").forEach((card) => card.classList.remove("dragging"));
      document.querySelectorAll(".tree-item.tree-dragging,.tree-object.tree-dragging").forEach((node) => node.classList.remove("tree-dragging"));
      clearResourceTreeDropMarkers();
      draggedSection = "";
      draggedResourceTreeSection = "";
      draggedResourceTreeChild = null;
    });
    document.addEventListener("toggle", (event) => {
      const popover = event.target.closest && event.target.closest("details.statusInfoPopover");
      if (popover && popover === event.target) {
        if (popover.open) scheduleStatusInfoPopoverClose(popover);
        else clearStatusInfoPopoverClose(popover);
        return;
      }
      const details = event.target.closest && event.target.closest("details[data-task-log-key]");
      if (details) {
        if (details.open) expandedTaskLogs[details.dataset.taskLogKey] = true;
        else delete expandedTaskLogs[details.dataset.taskLogKey];
      }
      const keyed = event.target.closest && event.target.closest("details[data-details-key]");
      if (keyed && keyed === event.target) {
        const key = keyed.dataset.detailsKey;
        detailsOpenState[key] = keyed.open;
        if (["project-rule-editor", "result-parse-previews", "config-inspector"].includes(key)) {
          renderSectionIfVisible(lastState || {}, "plans", { force: true });
        }
      }
      const historyDetails = event.target.closest && event.target.closest("details[data-gpu-history-scope]");
      if (historyDetails && historyDetails === event.target) {
        const scope = historyDetails.dataset.gpuHistoryScope || "";
        if (scope === "overview") {
          const wasOpen = gpuHistoryOverviewOpen;
          gpuHistoryOverviewOpen = historyDetails.open;
          if (historyDetails.open && !wasOpen) requestGpuHistory({ maxPoints: 96 });
        } else if (scope === "gpu") {
          const serverId = historyDetails.dataset.serverId || "";
          const gpuId = historyDetails.dataset.gpuId || "";
          const key = gpuHistorySeriesKey(serverId, gpuId);
          const wasOpen = expandedGpuHistoryKeys.has(key);
          if (historyDetails.open) {
            expandedGpuHistoryKeys.add(key);
            while (expandedGpuHistoryKeys.size > GPU_HISTORY_SERIES_CACHE_LIMIT) expandedGpuHistoryKeys.delete(expandedGpuHistoryKeys.values().next().value);
            if (!wasOpen) requestGpuHistory({ serverId, gpuId, maxPoints: 288 });
          } else {
            expandedGpuHistoryKeys.delete(key);
          }
        }
        if (historyDetails.open) scheduleGpuHistoryDraw();
      }
    }, true);
    document.addEventListener("focusin", (event) => {
      const input = event.target;
      if (input && input.dataset && input.dataset.configInput) {
        updateConfigDraft(input);
        serverConfigEditLockUntil = Date.now() + 30000;
      }
      if (isPlanPreviewEditor(input)) planPreviewEditLockUntil = Date.now() + 45000;
    });
    document.addEventListener("paste", (event) => {
      const input = event.target;
      if (isPlanPreviewEditor(input)) {
        setTimeout(() => { planPreviewEditLockUntil = Date.now() + 45000; }, 0);
        return;
      }
      if (!input || !input.dataset || !input.dataset.configInput || input.tagName !== "INPUT") return;
      setTimeout(() => {
        updateConfigDraft(input);
        updateServerDestinationPreview(input);
        serverConfigEditLockUntil = Date.now() + 45000;
      }, 0);
    }, true);
    document.addEventListener("input", (event) => {
      const input = event.target;
      if (input && input.dataset && input.dataset.configInput) {
        updateConfigDraft(input);
        updateServerDestinationPreview(input);
        serverConfigEditLockUntil = Date.now() + 30000;
      }
      if (isPlanPreviewEditor(input)) planPreviewEditLockUntil = Date.now() + 45000;
      if (input && input.id === "resourceTreeSearch") {
        resourceTreeFilter = String(input.value || "").trim().toLowerCase();
        renderResourceTree(lastState || {});
      }
    });
    document.addEventListener("pointerdown", (event) => {
      if (event.target && event.target.closest && event.target.closest("#workbenchInspector")) markWorkbenchInspectorInteraction(2200);
      const handle = event.target.closest("[data-resize-column]");
      if (!handle) return;
      beginLayoutResize(handle.dataset.resizeColumn || "", event);
    });
    document.addEventListener("wheel", (event) => {
      if (event.target && event.target.closest && event.target.closest("#workbenchInspector")) markWorkbenchInspectorInteraction(1800);
    }, { capture: true, passive: true });
    document.addEventListener("scroll", (event) => {
      if (event.target && event.target.closest && event.target.closest("#workbenchInspector")) markWorkbenchInspectorInteraction(1600);
      if (event.target && event.target.id === "mainColumn") scheduleMainColumnSidePanelSync();
    }, true);
    window.addEventListener("pointermove", (event) => updateLayoutResize(event));
    window.addEventListener("pointerup", () => finishLayoutResize());
    document.addEventListener("change", (event) => {
      const input = event.target;
      if (input && input.matches && input.matches('input[type="checkbox"][data-command="selectExperiment"]')) {
        event.stopPropagation();
        handleTaskSelectionChange(input);
        return;
      }
      if (input && input.dataset && input.dataset.configInput) {
        updateConfigDraft(input);
        updateServerDestinationPreview(input);
        serverConfigEditLockUntil = Date.now() + 30000;
      }
      if (!input || input.dataset?.key !== "savedSessionPath") return;
      const scope = input.dataset.configInput || "";
      const target = scope ? document.querySelector('[data-port-pair-scope="' + cssEscape(scope) + '"]') : null;
      if (!target) return;
      const info = sessionForPath(input.value);
      const localKey = scope === "hub" ? "localForwardPort" : "localForwardPort";
      const remoteKey = scope === "hub" ? "remoteAgentPort" : "remoteTelemetryPort";
      target.outerHTML = configPortPair(scope, "隧道端口对", localKey, remoteKey, "", "", info, "savedSessionForwardIndex", undefined);
    });
    window.addEventListener("message", (event) => {
      handleIncomingWebviewMessage(event.data);
    });
    setupResourceTreeObserver();
    el("initialStateRetry").addEventListener("click", requestInitialPanelState);
    requestInitialPanelState();

    function requestInitialPanelState() {
      const notice = el("initialStateNotice");
      const retry = el("initialStateRetry");
      if (notice) notice.hidden = false;
      if (retry) retry.hidden = true;
      el("initialStateMessage").textContent = "正在读取本地面板状态...";
      document.body.setAttribute("aria-busy", "true");
      vscode.postMessage({ command: "webviewReady" });
      if (initialStateTimer) clearTimeout(initialStateTimer);
      initialStateTimer = window.setTimeout(() => {
        el("initialStateMessage").textContent = "尚未收到本地面板状态。";
        if (retry) retry.hidden = false;
        document.body.removeAttribute("aria-busy");
      }, 8000);
    }

    function completeInitialPanelState() {
      if (initialStateTimer) clearTimeout(initialStateTimer);
      initialStateTimer = 0;
      const notice = el("initialStateNotice");
      if (notice) notice.hidden = true;
      document.body.removeAttribute("aria-busy");
    }

    function handleIncomingWebviewMessage(message) {
      if (!message) return;
      const messages = flattenIncomingWebviewMessages(message);
      let latestStateMessage = null;
      let latestNavigationMessage = null;
      for (const item of messages) {
        if (!item) continue;
        if (item.type === "uiCommandStatus") {
          handleUiCommandStatus(item);
          continue;
        }
        if (item.type === "state") latestStateMessage = item;
        if (item.type === "navigate") latestNavigationMessage = item;
      }
      if (latestStateMessage) {
        completeInitialPanelState();
        lastState = latestStateMessage.state || {};
        rememberGpuHistoryState(lastState.gpuHistory);
        invalidateSelectedTaskPayload();
        clearCompletedPendingButtons(lastState);
        render(lastState);
      }
      if (latestNavigationMessage) {
        if (PLAN_VIEW_SCOPE_VALUES.includes(latestNavigationMessage.taskPlanScope)) setTaskPlanScope(latestNavigationMessage.taskPlanScope);
        navigateToResourceTarget(latestNavigationMessage.section, latestNavigationMessage.anchor, { force: true });
      }
    }

    function flattenIncomingWebviewMessages(message, output) {
      const items = output || [];
      if (!message) return items;
      if (message.type === "batch" && Array.isArray(message.messages)) {
        message.messages.forEach((item) => flattenIncomingWebviewMessages(item, items));
        return items;
      }
      items.push(message);
      return items;
    }

    function render(state) {
      try {
        el("renderError").textContent = "";
        renderProjectOnboardingNotice(state);
        const fastConfigEdit = shouldFastPathConfigEdit();
        if (fastConfigEdit) {
          renderResourceTree(state);
          updateResourceTreeActiveSection(activeResourceSection, activeResourceAnchor);
          applyPendingButtonStates();
          lastRenderErrorMessage = "";
          return;
        }
        applyUiLayout(state);
        renderResourceTree(state);
        renderWorkbenchInspector(state);
        updateResourceTreeActiveSection(activeResourceSection, activeResourceAnchor);
        renderVisibleSections(state);
        applyLayoutColumns();
        schedulePostRenderMaintenance();
        lastRenderErrorMessage = "";
      } catch (error) {
        const message = error && error.message ? String(error.message) : String(error);
        el("renderError").textContent = "UI 渲染失败：" + message;
        if (message !== lastRenderErrorMessage) {
          lastRenderErrorMessage = message;
          vscode.postMessage({ command: "webviewRenderError", error: message.slice(0, 480) });
        }
      }
    }

    function renderProjectOnboardingNotice(state) {
      const target = el("projectOnboardingNotice");
      if (!target) return;
      const item = (state && state.projectOnboarding) || {};
      const required = item.required === true;
      target.classList.toggle("is-visible", required);
      if (!required) {
        setHtmlIfChanged(target, "");
        return;
      }
      const projectName = String(item.projectName || ((state || {}).workspace || {}).name || "当前项目");
      const detail = String(item.detail || ("当前项目 " + projectName + " 尚未完成接入；首次上传前仍会确认本地与远端预期位置。"));
      setHtmlIfChanged(target,
        '<div class="projectOnboardingNoticeBody"><b>当前项目待接入</b><span>' + esc(detail) + '</span></div>' +
        '<button type="button" data-command="bootstrapProject" title="识别当前项目并继续接入">接入当前项目</button>'
      );
    }

    function schedulePostRenderMaintenance(force) {
      const key = postRenderMaintenanceKey();
      if (!force && key === lastPostRenderMaintenanceKey && !Object.keys(pendingActions).length) return;
      lastPostRenderMaintenanceKey = key;
      if (postRenderMaintenanceScheduled) return;
      postRenderMaintenanceScheduled = true;
      const run = () => {
        postRenderMaintenanceScheduled = false;
        runPostRenderMaintenance();
      };
      if (typeof requestAnimationFrame === "function") requestAnimationFrame(run);
      else setTimeout(run, 0);
    }

    function postRenderMaintenanceKey() {
      const collapseSig = Object.keys(currentUiLayout.collapsed || {}).sort().map((key) => key + "=" + (currentUiLayout.collapsed[key] ? "1" : "0")).join("|");
      return [
        String(postRenderDomVersion),
        Object.keys(pendingActions).sort().join("|"),
        layoutEdit ? "layout" : "view",
        normalizeUiLayout(currentUiLayout).order.join("|"),
        collapseSig
      ].join("::");
    }

    function runPostRenderMaintenance() {
      cleanupDetachedStatusInfoPopoverTimers();
      const nextCardDecorationKey = cardDecorationKey();
      if (nextCardDecorationKey !== lastCardDecorationKey) {
        refreshCardDecorations(nextCardDecorationKey);
      }
      if (postRenderButtonDomVersion !== lastButtonDecorationVersion) {
        lastButtonDecorationVersion = postRenderButtonDomVersion;
        decorateCommandTooltips();
        disableUnsupportedCommandButtons();
      }
      syncRunModeActionLabels(document);
      updateLayoutToggle();
      applyStatusCardCollapseState();
      compactNativeTitleAttributes();
      if (pendingButtonKeys.size || loadingButtonCount > 0) applyPendingButtonStates();
    }

    function cardDecorationKey() {
      const collapseSig = Object.keys(currentUiLayout.collapsed || {}).sort().map((key) => key + "=" + (currentUiLayout.collapsed[key] ? "1" : "0")).join("|");
      return [
        String(postRenderCardDomVersion),
        layoutEdit ? "layout" : "view",
        normalizeUiLayout(currentUiLayout).order.join("|"),
        collapseSig
      ].join("::");
    }

    function refreshCardDecorations(nextKey) {
      lastCardDecorationKey = nextKey || cardDecorationKey();
      decorateCards();
    }

    function renderVisibleSections(state) {
      preserveMainColumnAnchor(() => {
        ["overview", "servers", "settings", "plans", "results", "sync", "gpu", "tasks", "operations", "diagnostics"].forEach((section) => renderSectionIfVisible(state, section));
      });
    }

    function renderSectionIfVisible(state, section, options) {
      if (sectionIsCollapsed(section)) return;
      const force = Boolean(options && options.force);
      const preKey = sectionPreRenderKey(state, section);
      if (!force && lastSectionPreRenderKeys[section] === preKey && lastRenderedSectionSignatures[section]) return;
      const signature = sectionRenderSignature(state, section);
      if (!force && lastRenderedSectionSignatures[section] === signature) {
        lastSectionPreRenderKeys[section] = preKey;
        return;
      }
      if (section === "overview") {
        renderSummary(state);
        renderOpsFlow(state);
      } else if (section === "sync") {
        renderActionSections(state);
      } else if (section === "servers") {
        renderServerCards(state);
        renderHubWorkerAndPorts(state);
      } else if (section === "settings") {
        if (!shouldKeepServerConfigDraft()) renderServerSettings(state);
      } else if (section === "plans") {
        renderPlanSection(state);
      } else if (section === "results") {
        renderTraceSection(state);
        renderResultSummary(state);
      } else if (section === "gpu") {
        renderGpuSection(state);
      } else if (section === "tasks") {
        renderTaskSection(state);
      } else if (section === "operations") {
        renderOperationSection(state);
      } else if (section === "diagnostics") {
        renderDiagnosticSection(state);
      }
      applyResourceTreeChildLayout(section);
      lastRenderedSectionSignatures[section] = signature;
      lastSectionPreRenderKeys[section] = preKey;
    }

    function sectionPreRenderKey(state, section) {
      const data = state || {};
      return [section, sectionLocalPreKey(section), sectionDependencyKey(data, section)].join("::");
    }

    function sectionDependencyKey(data, section) {
      if (section === "overview") return refListKey(data.connectionMode, data.localEndpoint, data.lastError, data.extensionVersion, data.integrations, data.setup, data.agentSessions, data.health, data.probe, data.workerProbes, data.realtime, data.endpointRegistry, data.diagnostics, data.schedulerConfig, data.schedulerStates, data.operations, data.planFileInput, data.selection, data.plans, data.recentPlans, data.codeSync, data.gpu, data.workerTelemetryStatus, data.capabilities, data.realtimeDiagnostics, data.tunnelPortConflicts, data.detectedProject, data.resultsSummary);
      if (section === "servers" || section === "settings") return refListKey(data.setup, data.agentSessions, data.xshellSessions, data.endpointRegistry, data.tunnelPortAssignments, data.tunnelPortConflicts, data.health, data.probe, data.workerProbes, data.workerTelemetry, data.capabilities, data.realtimeDiagnostics, data.remotePathConfirmations, data.pptPathConfirmations);
      if (section === "plans") return refListKey(data.planFileInput, data.selection, data.selectedPlan, data.plans, data.localPlans, data.detectedProject, data.projectConfig, data.adapterRules, data.integrations, data.setup, data.agentSessions, data.health, data.probe, data.workerProbes, data.codeSync, data.operations, data.resultsSummary, data.schedulerStates, data.capabilities, data.extensionVersion);
      if (section === "results") return refListKey(data.planFileInput, data.plans, data.resultsSummary, data.operations, data.schedulerStates, data.experimentTraces, data.selection, data.planArchive, data.pptPlotConfig, data.pptAutomation);
      if (section === "sync") return refListKey(data.codeSync, data.capabilities, data.setup, data.health, data.probe, data.workerProbes);
      if (section === "gpu") return refListKey(data.gpu, data.gpuHistory, data.setup, data.gpuOwnerConfig);
      if (section === "tasks") return refListKey(data.schedulerStates, data.selection, data.selectedLogRunKey, data.capabilities, data.workerTelemetry, data.resultsSummary);
      if (section === "operations") return refListKey(data.operations);
      if (section === "diagnostics") return refListKey(data.diagnostics, data.capabilities, data.actionErrors, data.endpointRegistry, data.tunnelPortAssignments, data.tunnelPortConflicts, data.realtimeDiagnostics, data.health);
      return refListKey(data);
    }

    function sectionLocalPreKey(section) {
      if (section === "plans") return stableSectionJson({ configParamFilter, configLevel1Filter, configLevel2Filter, selectedConfigIndex, detailsOpenState });
      if (section === "settings") return shouldKeepServerConfigDraft() ? "draft" : "stable";
      if (section === "tasks") return stableSectionJson({ expandedTaskLogs, taskPlanScope });
      if (section === "results") return stableSectionJson({ pptDraft: shouldKeepConfigDraftScope("ppt"), tracePlanScope });
      if (section === "diagnostics") return diagnosticDetailsOpen() ? "details-open" : "details-closed";
      return "";
    }

    function refListKey() {
      return Array.from(arguments).map(objectReferenceKey).join("|");
    }

    function objectReferenceKey(value) {
      if (value === null || value === undefined) return "";
      const type = typeof value;
      if (type !== "object" && type !== "function") return type + ":" + String(value);
      if (!objectReferenceIds.has(value)) objectReferenceIds.set(value, nextObjectReferenceId++);
      return "ref:" + objectReferenceIds.get(value);
    }

    function sectionRenderSignature(state, section) {
      return htmlSignature(section + "::" + sectionDataSignature(state, section) + "::" + sectionLocalSignature(section, state));
    }

    function sectionDataSignature(state, section) {
      const cacheState = state || null;
      if (sectionDataSignatureCacheState !== cacheState) {
        sectionDataSignatureCacheState = cacheState;
        sectionDataSignatureCache = {};
      }
      if (Object.prototype.hasOwnProperty.call(sectionDataSignatureCache, section)) return sectionDataSignatureCache[section];
      const signature = stableSectionSignature(sectionRenderModel(state, section));
      sectionDataSignatureCache[section] = signature;
      return signature;
    }

    function stableSectionSignature(value) {
      const digest = { length: 0, hash: 0 };
      stableSectionHashValue(value || null, digest, new WeakSet(), true);
      return String(digest.length) + ":" + String(digest.hash);
    }

    function stableSectionHashToken(digest, token) {
      const text = String(token || "");
      digest.length += text.length;
      for (let i = 0; i < text.length; i += 1) digest.hash = ((digest.hash << 5) - digest.hash + text.charCodeAt(i)) | 0;
    }

    function stableSectionHashValue(value, digest, seen, forceNull) {
      if (value === null || value === undefined) {
        if (forceNull) stableSectionHashToken(digest, "null");
        return forceNull;
      }
      const type = typeof value;
      if (type === "string") {
        stableSectionHashToken(digest, JSON.stringify(value));
        return true;
      }
      if (type === "number") {
        stableSectionHashToken(digest, Number.isFinite(value) ? JSON.stringify(value) : "null");
        return true;
      }
      if (type === "boolean") {
        stableSectionHashToken(digest, value ? "true" : "false");
        return true;
      }
      if (type === "bigint") {
        stableSectionHashToken(digest, JSON.stringify(String(value)));
        return true;
      }
      if (type !== "object") {
        if (forceNull) stableSectionHashToken(digest, "null");
        return forceNull;
      }
      if (seen.has(value)) {
        stableSectionHashToken(digest, JSON.stringify("[Circular]"));
        return true;
      }
      seen.add(value);
      if (Array.isArray(value)) {
        stableSectionHashToken(digest, "[");
        for (let i = 0; i < value.length; i += 1) {
          if (i > 0) stableSectionHashToken(digest, ",");
          stableSectionHashValue(value[i], digest, seen, true);
        }
        stableSectionHashToken(digest, "]");
        seen.delete(value);
        return true;
      }
      const keys = Object.keys(value).sort();
      stableSectionHashToken(digest, "{");
      let count = 0;
      keys.forEach((key) => {
        const item = value[key];
        const itemType = typeof item;
        if (itemType === "undefined" || itemType === "function" || itemType === "symbol") return;
        if (count > 0) stableSectionHashToken(digest, ",");
        stableSectionHashToken(digest, JSON.stringify(key) + ":");
        stableSectionHashValue(item, digest, seen, true);
        count += 1;
      });
      stableSectionHashToken(digest, "}");
      seen.delete(value);
      return true;
    }

    function stableSectionJson(value) {
      try {
        return JSON.stringify(value || null);
      } catch (error) {
        return String(value);
      }
    }

    function sectionLocalSignature(section, state) {
      if (section === "plans") {
        return stableSectionJson({
          configParamFilter,
          configLevel1Filter,
          configLevel2Filter,
          selectedConfigIndex,
          detailsOpenState
        });
      }
      if (section === "settings") return shouldKeepServerConfigDraft() ? "draft" : "stable";
      if (section === "tasks") return stableSectionJson({ expandedTaskLogs: pruneExpandedTaskLogs(state || {}), taskPlanScope });
      if (section === "results") return stableSectionJson({ pptDraft: shouldKeepConfigDraftScope("ppt"), tracePlanScope });
      if (section === "diagnostics") return diagnosticDetailsOpen() ? "details-open" : "details-closed";
      return "";
    }

    function pruneExpandedTaskLogs(state) {
      const entries = Object.entries(expandedTaskLogs || {}).filter((entry) => Boolean(entry[1]));
      if (entries.length <= TASK_LOG_EXPANSION_LIMIT) return expandedTaskLogs;
      const visible = new Set();
      const rows = schedulerRowsForState(state || {});
      const selected = taskSelectionSetsForState(state);
      const taskView = taskRowsViewModel(rows, selected);
      taskView.visibleRows.forEach((row) => visible.add(taskLogKey(row)));
      taskView.activeRows.forEach((row) => visible.add(taskLogKey(row)));
      const next = {};
      entries.forEach(([key, value]) => { if (visible.has(key)) next[key] = value; });
      for (const [key, value] of entries) {
        if (Object.keys(next).length >= TASK_LOG_EXPANSION_LIMIT) break;
        if (!(key in next)) next[key] = value;
      }
      expandedTaskLogs = next;
      return expandedTaskLogs;
    }

    function sectionRenderModel(state, section) {
      const data = state || {};
      if (section === "overview") {
        return {
          connectionMode: data.connectionMode,
          localEndpoint: data.localEndpoint,
          lastError: data.lastError,
          extensionVersion: data.extensionVersion,
          integrations: data.integrations,
          workspace: data.workspace,
          topology: data.topology,
          setup: compactOverviewSetupForSignature(data.setup),
          agentDestinations: compactAgentDestinationsForSignature(data.agentSessions),
          health: compactOverviewHealthForSignature(data.health),
          realtime: compactOverviewRealtimeForSignature(data.realtime),
          endpointRegistry: compactOverviewEndpointRegistryForSignature(data.endpointRegistry),
          diagnostics: compactOverviewDiagnosticsForSignature(data.diagnostics),
          schedulerConfig: compactRecordForSignature(data.schedulerConfig || {}, ["pollSeconds", "jitterSeconds", "workerStatusTtlSeconds", "localAvailabilityPushSeconds", "workerAvailabilityPushSeconds", "operationEventMaxDelayMs", "workerActionMinIntervalMs", "workerActionMaxConcurrent"]),
          scheduler: overviewTaskStatsForSignature(data),
          operations: overviewOperationStatsForSignature(data),
          codeSync: compactOverviewCodeSyncForSignature(data.codeSync),
          gpu: overviewGpuStatsForSignature(data),
          workerTelemetryStatus: compactOverviewWorkerStatusForSignature(data.workerTelemetryStatus),
          capabilities: compactOverviewCapabilitiesForSignature(data.capabilities),
          realtimeDiagnostics: compactOverviewRealtimeDiagnosticsForSignature(data.realtimeDiagnostics),
          tunnelPortConflicts: compactRowsForSignature(data.tunnelPortConflicts, SECTION_SIGNATURE_ROW_LIMIT, ["id", "endpointId", "localForwardPort", "port", "severity"]),
          detectedProject: compactOverviewProjectForSignature(data.detectedProject),
          projectReadiness: compactOverviewProjectReadinessForSignature(data),
          resultsSummary: compactOverviewResultsForSignature(data.resultsSummary)
        };
      }
      if (section === "servers") {
        return {
          topology: data.topology,
          setup: compactSetupForSignature(data.setup),
          agentDestinations: compactAgentDestinationsForSignature(data.agentSessions),
          xshellSessions: compactXshellSessionsForSignature(data.xshellSessions),
          endpointRegistry: compactEndpointRegistryForSignature(data.endpointRegistry),
          tunnelPortAssignments: compactRowsForSignature(data.tunnelPortAssignments, SECTION_SIGNATURE_ROW_LIMIT, ["id", "endpointId", "role", "localForwardPort", "remoteForwardPort", "status", "message"]),
          tunnelPortConflicts: compactRowsForSignature(data.tunnelPortConflicts, SECTION_SIGNATURE_ROW_LIMIT, ["id", "endpointId", "localForwardPort", "port", "message", "severity"]),
          health: compactHealthForSignature(data.health),
          probe: compactRecordForSignature(data.probe || {}, ["status", "schedulerDependencies"]),
          workerProbes: compactObjectMapForSignature(data.workerProbes, SECTION_SIGNATURE_ROW_LIMIT, ["status", "schedulerDependencies"]),
          workerTelemetry: compactWorkerTelemetryForSignature(data.workerTelemetry),
          capabilities: compactCapabilitiesForSignature(data.capabilities),
          realtimeDiagnostics: compactRealtimeDiagnosticsForSignature(data.realtimeDiagnostics),
          remotePathConfirmations: data.remotePathConfirmations,
          pptPathConfirmations: data.pptPathConfirmations
        };
      }
      if (section === "plans") {
        const selectedPlanFile = data.planFileInput || ((data.selection || {}).selectedPlanId) || "";
        return {
          planFileInput: data.planFileInput,
          selectedPlanId: (data.selection || {}).selectedPlanId,
          selectedPlan: compactPlanRecordForSignature(data.selectedPlan),
          plans: compactPlansForSignature(data.plans),
          localPlans: compactPlansForSignature(data.localPlans),
          projectConfig: compactProjectConfigForSignature(data.projectConfig),
          adapterRules: compactAdapterRulesForSignature(data.adapterRules),
          integrations: data.integrations,
          workspace: data.workspace,
          setup: compactSetupForSignature(data.setup),
          agentDestinations: compactAgentDestinationsForSignature(data.agentSessions),
          health: compactHealthForSignature(data.health),
          probe: compactRecordForSignature(data.probe || {}, ["status", "projectRoot", "expectedProjectRoot", "schedulerDependencies"]),
          workerProbes: compactObjectMapForSignature(data.workerProbes, SECTION_SIGNATURE_ROW_LIMIT, ["status", "projectRoot", "expectedProjectRoot", "schedulerDependencies"]),
          codeSync: data.codeSync,
          executionStage: selectedPlanFile ? planExecutionStage(data, selectedPlanFile) : undefined,
          resultsSummary: compactResultsSummaryForSignature(data.resultsSummary),
          outputContractCheck: compactOutputContractCheckForSignature(currentResultOutputContractCheck(data)),
          capabilities: compactCapabilitiesForSignature(data.capabilities),
          detectedProject: compactDetectedProjectForSignature(data.detectedProject),
          extensionVersion: data.extensionVersion
        };
      }
      if (section === "results") {
        return {
          planFileInput: data.planFileInput,
          selectedPlan: compactSelectedResultPlanForSignature(data),
          resultsSummary: compactResultsSummaryForSignature(data.resultsSummary),
          autoParseReadiness: resultAutoParseReadinessForState(data, data.resultsSummary || {}),
          outputContractCheck: compactOutputContractCheckForSignature(currentResultOutputContractCheck(data)),
          analysisArtifacts: resultAnalysisArtifactsForState(data, data.resultsSummary || {}),
          pptPlotConfig: compactRecordForSignature(data.pptPlotConfig || {}, ["presentationPath", "chartType", "styleMode"]),
          pptAutomation: compactRecordForSignature(data.pptAutomation || {}, ["state", "ready", "message", "actionCommand", "actionLabel", "schemaVersion", "endpoint"]),
          traces: compactTracesForSignature(data),
          selection: compactResultSelectionForSignature(data.selection),
          planArchive: compactPlanArchiveForSignature(data.planArchive)
        };
      }
      if (section === "gpu") {
        return {
          gpu: compactGpuForSignature(data),
          gpuHistory: compactGpuHistoryForSignature(data.gpuHistory),
          setup: compactSetupForSignature(data.setup),
          gpuOwnerConfig: data.gpuOwnerConfig
        };
      }
      if (section === "tasks") {
        return {
          minuteBucket: Math.floor(Date.now() / 60000),
          scheduler: compactSchedulerForSignature(data),
          selection: data.selection,
          selectedLogRunKey: data.selectedLogRunKey,
          capabilities: compactCapabilitiesForSignature(data.capabilities),
          workerTelemetry: compactWorkerTelemetryForSignature(data.workerTelemetry)
        };
      }
      if (section === "sync") {
        return {
          codeSync: data.codeSync,
          capabilities: compactCapabilitiesForSignature(data.capabilities)
        };
      }
      if (section === "operations") {
        return {
          operations: compactOperationSectionForSignature(data)
        };
      }
      if (section === "diagnostics") {
        return {
          diagnostics: compactDiagnosticsForSignature(data.diagnostics),
          capabilities: compactCapabilitiesForSignature(data.capabilities),
          actionErrors: compactActionErrorsForSignature(data.actionErrors),
          endpointRegistry: compactEndpointRegistryForSignature(data.endpointRegistry),
          tunnelPortAssignments: compactRowsForSignature(data.tunnelPortAssignments, SECTION_SIGNATURE_ROW_LIMIT, ["id", "endpointId", "role", "localForwardPort", "remoteForwardPort", "status", "message"]),
          tunnelPortConflicts: compactRowsForSignature(data.tunnelPortConflicts, SECTION_SIGNATURE_ROW_LIMIT, ["id", "endpointId", "localForwardPort", "port", "message", "severity"]),
          realtimeDiagnostics: compactRealtimeDiagnosticsForSignature(data.realtimeDiagnostics),
          health: compactHealthForSignature(data.health)
        };
      }
      return data;
    }

    function compactRowsForSignature(rows, limit, keys) {
      const source = rows && typeof rows === "object" ? rows : EMPTY_OUTPUT_DERIVATION_VALUES;
      const cacheKey = String(limit) + "|" + asArray(keys).join("|");
      let variants = compactRowsForSignatureCache.get(source);
      if (variants && variants.has(cacheKey)) {
        const cached = variants.get(cacheKey);
        variants.delete(cacheKey);
        variants.set(cacheKey, cached);
        return cached;
      }
      const list = asArray(source);
      const value = {
        count: list.length,
        rows: list.slice(0, limit).map((row) => compactRecordForSignature(row, keys))
      };
      if (!variants) {
        variants = new Map();
        compactRowsForSignatureCache.set(source, variants);
      }
      variants.set(cacheKey, value);
      while (variants.size > SIGNATURE_COMPACTION_VARIANT_LIMIT) variants.delete(variants.keys().next().value);
      return value;
    }

    function compactAgentDestinationsForSignature(agentSessions) {
      const agent = agentSessions && typeof agentSessions === "object" ? agentSessions : {};
      return {
        hub: compactRecordForSignature(agent.hub || {}, ["configured", "actualWorkRoot", "installDir", "workDir", "projectName"]),
        workers: compactRowsForSignature(agent.workers, SECTION_SIGNATURE_ROW_LIMIT, ["id", "displayName", "enabled", "configured", "actualWorkRoot", "installDir", "workDir", "projectName"])
      };
    }

    function compactRecordForSignature(row, keys) {
      const item = row && typeof row === "object" ? row : {};
      const out = {};
      (keys || []).forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(item, key)) out[key] = item[key];
      });
      return out;
    }

    function compactObjectMapForSignature(value, limit, keys) {
      const source = value && typeof value === "object" ? value : EMPTY_OUTPUT_DERIVATION_SOURCE;
      const cacheKey = String(limit) + "|" + asArray(keys).join("|");
      let variants = compactObjectMapForSignatureCache.get(source);
      if (variants && variants.has(cacheKey)) {
        const cached = variants.get(cacheKey);
        variants.delete(cacheKey);
        variants.set(cacheKey, cached);
        return cached;
      }
      const entries = Object.entries(source);
      const compacted = {
        count: entries.length,
        rows: entries.slice(0, limit).map(([id, row]) => Object.assign({ id }, compactRecordForSignature(row, keys)))
      };
      if (!variants) {
        variants = new Map();
        compactObjectMapForSignatureCache.set(source, variants);
      }
      variants.set(cacheKey, compacted);
      while (variants.size > SIGNATURE_COMPACTION_VARIANT_LIMIT) variants.delete(variants.keys().next().value);
      return compacted;
    }

    function compactOverviewSetupForSignature(setup) {
      const item = setup && typeof setup === "object" ? setup : {};
      const workers = asArray(item.workerTunnels || item.workers || []);
      const enabledWorkers = workers.filter((worker) => worker && worker.enabled !== false);
      return {
        mode: item.mode,
        configSource: item.configSource,
        hubDisplayName: item.hubDisplayName || item.hubHost || (item.hub || {}).displayName || (item.hub || {}).host,
        hubPort: item.localForwardPort || (item.hub || {}).localForwardPort,
        workerCount: workers.length,
        enabledWorkerCount: enabledWorkers.length
      };
    }

    function compactOverviewHealthForSignature(health) {
      return compactRecordForSignature(health || {}, ["state", "message", "hubStatus", "workerStatus", "paused"]);
    }

    function compactOverviewRealtimeForSignature(realtime) {
      return compactRecordForSignature(realtime || {}, ["streamStatus", "lastError"]);
    }

    function compactOverviewEndpointRegistryForSignature(registry) {
      const rows = asArray(registry);
      const counts = { total: rows.length, ok: 0, warn: 0, failed: 0 };
      rows.forEach((row) => {
        const status = String((row || {}).status || (row || {}).capabilityStatus || "").toLowerCase();
        if (status.includes("ok") || status.includes("ready") || status.includes("agent_ok")) counts.ok += 1;
        else if (status.includes("fail") || status.includes("error")) counts.failed += 1;
        else counts.warn += 1;
      });
      return counts;
    }

    function compactOverviewDiagnosticsForSignature(diagnostics) {
      const item = diagnostics && typeof diagnostics === "object" ? diagnostics : {};
      return {
        paused: Boolean(item.requests && item.requests.paused),
        requestState: item.requests && item.requests.state,
        lastError: item.lastError,
        errorCount: asArray(item.errors).length,
        warningCount: asArray(item.warnings).length
      };
    }

    function compactOverviewCodeSyncForSignature(codeSync) {
      const item = codeSync && typeof codeSync === "object" ? codeSync : {};
      return compactRecordForSignature(item, ["hub", "workers", "fingerprint", "status", "error"]);
    }

    function overviewGpuStatsForSignature(state) {
      const stats = overviewGpuStats(state || {});
      return {
        total: stats.total,
        busy: stats.busy,
        free: stats.free,
        mine: stats.mine
      };
    }

    function overviewTaskStatsForSignature(state) {
      const stats = overviewTaskStats(state || {});
      return {
        running: stats.running,
        queued: stats.queued,
        failed: stats.failed,
        completed: stats.completed
      };
    }

    function overviewOperationStatsForSignature(state) {
      const rows = operationRowsForState(state || {});
      const counts = operationStatusCounts(rows);
      const latest = rows[0] || {};
      return {
        count: rows.length,
        counts,
        latestStatus: latest.status || latest.state || "",
        latestType: latest.type || latest.action || ""
      };
    }

    function compactOverviewWorkerStatusForSignature(statusRows) {
      const rows = asArray(statusRows);
      const counts = { total: rows.length, ok: 0, warn: 0, failed: 0 };
      rows.forEach((row) => {
        const status = String((row || {}).status || (row || {}).state || "").toLowerCase();
        if (status.includes("ok") || status.includes("online") || status.includes("ready")) counts.ok += 1;
        else if (status.includes("fail") || status.includes("error") || status.includes("offline")) counts.failed += 1;
        else counts.warn += 1;
      });
      return counts;
    }

    function compactOverviewCapabilitiesForSignature(capabilities) {
      const caps = capabilities && typeof capabilities === "object" ? capabilities : {};
      const actions = caps.actions && typeof caps.actions === "object" ? Object.values(caps.actions) : [];
      return {
        actionApiVersion: caps.actionApiVersion,
        realActionRuntime: caps.realActionRuntime,
        actionCount: actions.length,
        unsupportedActionCount: actions.filter((item) => item && (item.supported === false || item.enabled === false)).length,
        endpoints: compactRecordForSignature(caps.endpoints || {}, ["actions", "websocketEvents", "sseEvents", "resultsSummary"])
      };
    }

    function compactOverviewRealtimeDiagnosticsForSignature(value) {
      const item = value && typeof value === "object" ? value : {};
      const endpoints = item.endpoints && typeof item.endpoints === "object" ? Object.values(item.endpoints) : [];
      return {
        paused: item.paused,
        status: item.status,
        lastError: item.lastError,
        endpointCount: endpoints.length,
        connectedCount: endpoints.filter((row) => {
          const status = String((row || {}).status || (row || {}).state || "").toLowerCase();
          return status.includes("connected") || status.includes("ok") || status.includes("ready");
        }).length
      };
    }

    function compactOverviewProjectForSignature(project) {
      const stats = overviewProjectStats({ detectedProject: project || {} });
      const item = project && typeof project === "object" ? project : {};
      return {
        adapterConfig: Boolean(item.adapterConfig),
        missingOnboardingCount: asArray(item.missingOnboarding).length,
        plans: stats.plans,
        resultSignals: stats.resultSignals,
        ready: stats.ready
      };
    }

    function compactOverviewResultsForSignature(summary) {
      const item = summary && typeof summary === "object" ? summary : {};
      const claimEvidence = item.claimEvidence || item.claim_evidence || {};
      return {
        parseFailed: pick(item, ["parseFailed", "parse_failed"], ""),
        missingResults: pick(item, ["missingResults", "missing_results"], ""),
        claimCount: pick(item, ["claimCount", "claim_count"], pick(claimEvidence, ["claimCount", "claim_count"], "")),
        claimUnsupportedCount: pick(item, ["claimUnsupportedCount", "claim_unsupported_count"], pick(claimEvidence, ["unsupportedCount", "unsupported_count"], "")),
        resultCount: asArray(item.results).length,
        leaderboardCount: asArray(item.leaderboard).length
      };
    }

    function compactSetupForSignature(setup) {
      const item = setup && typeof setup === "object" ? setup : {};
      return {
        mode: item.mode,
        configSource: item.configSource,
        hub: compactRecordForSignature(item.hub || {}, ["enabled", "displayName", "host", "workerHost", "localForwardPort", "remoteForwardPort", "agentProjectDir", "savedSessionPath"]),
        workers: compactRowsForSignature(item.workerTunnels || item.workers, SECTION_SIGNATURE_ROW_LIMIT, ["id", "enabled", "displayName", "host", "workerHost", "localForwardPort", "remoteForwardPort", "agentProjectDir", "savedSessionPath", "maxConcurrentGpus", "allowedGpuIds"])
      };
    }

    function compactHealthForSignature(health) {
      return compactRecordForSignature(health || {}, ["state", "message", "updatedAt", "hubStatus", "workerStatus", "paused"]);
    }

    function compactCapabilitiesForSignature(capabilities) {
      const caps = capabilities && typeof capabilities === "object" ? capabilities : {};
      return {
        actionApiVersion: caps.actionApiVersion,
        realActionRuntime: caps.realActionRuntime,
        endpoints: compactRecordForSignature(caps.endpoints || {}, ["actions", "websocketEvents", "sseEvents", "resultsSummary", "fileList", "fileDownload", "fileUploadChunk"]),
        actions: compactObjectMapForSignature(caps.actions, SECTION_SIGNATURE_ROW_LIMIT, ["supported", "enabled", "reason", "missing", "requiresUpgrade"])
      };
    }

    function compactEndpointRegistryForSignature(registry) {
      return compactRowsForSignature(registry, SECTION_SIGNATURE_ROW_LIMIT, ["id", "role", "displayName", "localPort", "localForwardPort", "status", "capabilityStatus", "version"]);
    }

    function compactXshellSessionsForSignature(sessions) {
      return compactRowsForSignature(sessions, SECTION_SIGNATURE_ROW_LIMIT, ["id", "name", "filePath", "displayName", "localForwardPort", "remoteForwardPort", "role", "enabled", "status"]);
    }

    function compactRealtimeDiagnosticsForSignature(value) {
      const item = value && typeof value === "object" ? value : {};
      return {
        paused: item.paused,
        status: item.status,
        lastError: item.lastError,
        updatedAt: item.updatedAt,
        endpoints: compactObjectMapForSignature(item.endpoints, SECTION_SIGNATURE_ROW_LIMIT, ["status", "state", "lastEventAt", "lastError", "seq", "transport"])
      };
    }

    function compactWorkerTelemetryForSignature(value) {
      return compactObjectMapForSignature(value, SECTION_SIGNATURE_ROW_LIMIT, ["workerId", "status", "state", "available", "updatedAt", "message", "lastError"]);
    }

    function compactPlanRecordForSignature(plan) {
      return compactRecordForSignature(plan || {}, ["id", "name", "file", "planFile", "revision", "status", "updatedAt", "caseCount", "runCount", "archived", "parseStatus", "outputReady", "restoreVersion", "restoreOutputNamespace", "restoreEnvironmentDir"]);
    }

    function compactPlansForSignature(plans) {
      return compactRowsForSignature(plans, PLAN_RENDER_LIMIT, ["id", "name", "file", "planFile", "revision", "status", "updatedAt", "caseCount", "runCount", "archived", "outputReady", "parseStatus", "restoreVersion", "restoreOutputNamespace", "restoreEnvironmentDir"]);
    }

    function compactSelectedResultPlanForSignature(state) {
      const data = state || {};
      const planFile = data.planFileInput || (data.selection || {}).selectedPlanId || "";
      return compactPlanRecordForSignature(planFromContext(data, { planFile }));
    }

    function compactResultSelectionForSignature(selection) {
      const item = selection && typeof selection === "object" ? selection : {};
      return {
        selectedPlanId: item.selectedPlanId,
        selectedRunKey: item.selectedRunKey,
        selectedRunKeys: asArray(item.selectedRunKeys),
        selectedArchiveKeys: asArray(item.selectedArchiveKeys)
      };
    }

    function compactPlanArchiveForSignature(archive) {
      const item = archive && typeof archive === "object" ? archive : {};
      return {
        updatedAt: item.updatedAt,
        plans: compactRowsForSignature(item.plans, ARCHIVED_PLAN_RENDER_LIMIT, ["name", "file", "planFile", "originalFile", "archivedFile", "archivedAt", "status", "archiveConfigCount", "archiveEnvironmentCount", "archiveParameterCount", "archiveParameterReviewCount", "archiveEntryScriptCount", "archiveEvidenceCount", "archiveEvidenceSourceMode", "archiveResultSelectionFile", "archiveResultSelectionIncludedCount", "archiveResultSelectionNotIncludedCount", "archiveConfigMigratedCount", "archiveResultMigratedCount"])
      };
    }

    function compactDetectedProjectForSignature(project) {
      const item = project && typeof project === "object" ? project : {};
      return {
        adapterConfig: Boolean(item.adapterConfig),
        root: item.root,
        updatedAt: item.updatedAt,
        missingOnboarding: item.missingOnboarding,
        environmentFiles: asArray(item.environmentFiles).slice(0, SECTION_SIGNATURE_ROW_LIMIT).map(String),
        plans: compactRowsForSignature(item.plans, PLAN_RENDER_LIMIT, ["id", "name", "file", "path", "status", "caseCount"]),
        configSummaries: compactRowsForSignature(item.configSummaries, SECTION_SIGNATURE_ROW_LIMIT, ["path", "name", "type", "level", "status"]),
        entryCandidates: item.entryCandidates,
        factoryFiles: compactRowsForSignature(item.factoryFiles, SECTION_SIGNATURE_ROW_LIMIT, ["path", "name", "status"]),
        resultFiles: compactRowsForSignature(item.resultFiles, SECTION_SIGNATURE_ROW_LIMIT, ["path", "name", "status", "parseable"]),
        outputContractFiles: compactRowsForSignature(item.outputContractFiles, SECTION_SIGNATURE_ROW_LIMIT, ["path", "name", "status"]),
        resultParsePreviews: compactRowsForSignature(item.resultParsePreviews, SECTION_SIGNATURE_ROW_LIMIT, ["path", "status", "parseable", "metricCount", "rowCount", "warning"]),
        adapterRules: compactAdapterRulesForSignature(item.adapterRules)
      };
    }

    function compactProjectConfigForSignature(config) {
      const item = config && typeof config === "object" ? config : {};
      return {
        path: item.path,
        updatedAt: item.updatedAt,
        status: item.status,
        output: item.output,
        metrics: item.metrics,
        plans: compactRowsForSignature(item.plans, PLAN_RENDER_LIMIT, ["id", "name", "file", "status"])
      };
    }

    function compactAdapterRulesForSignature(rules) {
      const item = rules && typeof rules === "object" ? rules : {};
      return {
        updatedAt: item.updatedAt,
        outputRules: item.outputRules,
        metricRules: item.metricRules,
        resultCandidates: compactRowsForSignature(item.resultCandidates, SECTION_SIGNATURE_ROW_LIMIT, ["path", "pattern", "status"])
      };
    }

    function compactGpuForSignature(state) {
      const model = gpuViewModelForState(state || {});
      const servers = model.servers;
      const ownerConfig = model.ownerConfig;
      const budget = model.budget;
      return {
        serverCount: servers.length,
        gpuCount: model.gpuCount,
        busyCount: model.busyCount,
        mineCount: model.mineCount,
        omittedServerCount: budget.omittedServerCount,
        omittedGpuRowCount: budget.omittedGpuRowCount,
        servers: budget.visibleServers.map((server) => ({
          serverId: server.serverId,
          workerId: server.workerId,
          status: server.status,
          updatedAt: server.updatedAt,
          gpuCount: server.gpuRows.length,
          myGpuCount: server.gpuRows.filter((gpu) => isMyGpu(gpu, ownerConfig)).length,
          rows: budgetGpuRowsForRender(server.gpuRows, ownerConfig).visibleRows.map((gpu) => ({
            index: gpu.index,
            id: gpu.id,
            name: gpu.name,
            busy: gpu.busy,
            memoryPercent: gpu.memoryPercent,
            utilizationPercent: gpu.utilizationPercent,
            temperature: gpu.temperature,
            processCount: gpu.processCount,
            processOmittedCount: gpu.processOmittedCount,
            runKey: gpu.runKey,
            staleFromCache: gpu.staleFromCache,
            mine: isMyGpu(gpu, ownerConfig),
            processes: asArray(gpu.processes).slice(0, GPU_PROCESS_SIGNATURE_LIMIT).map((proc) => compactRecordForSignature(proc, ["pid", "name", "memoryMb", "user", "command"]))
          }))
        }))
      };
    }

    function compactGpuHistoryForSignature(history) {
      const item = history && typeof history === "object" ? history : {};
      const data = item.data && typeof item.data === "object" ? item.data : {};
      return {
        status: item.status,
        query: item.query,
        requestedQuery: item.requestedQuery,
        error: item.error,
        fetchedAt: item.fetchedAt,
        updatedAt: data.updatedAt,
        seriesCount: asArray(data.series).length,
        totalPointCount: data.totalPointCount,
        seriesOmittedCount: data.seriesOmittedCount,
        pointOmittedCount: data.pointOmittedCount
      };
    }

    function compactSchedulerForSignature(state) {
      const view = taskSectionViewModelForState(state);
      const selected = view.selected;
      const hiddenLegacyTaskUiKeys = selected.hiddenLegacyTaskUiKeys;
      const rows = view.rows;
      const taskView = view.taskView;
      return {
        count: rows.length,
        totalCount: view.scope.totalCount,
        selectedPlanCount: view.scope.selectedCount,
        hiddenLegacyCount: hiddenLegacyTaskUiKeys.size,
        counts: taskView.counts,
        selectedCount: taskView.selectedRows.length,
        visibleRows: compactTaskRowsForSignature(taskView.visibleRows),
        activeRows: compactTaskRowsForSignature(taskView.activeRows),
        detailRow: taskView.detailRow ? compactTaskRowsForSignature([taskView.detailRow]).rows[0] : null
      };
    }

    function compactTaskRowsForSignature(rows) {
      return compactRowsForSignature(rows, TASK_RENDER_LIMIT, ["uiKey", "status", "plan", "experimentName", "runKey", "experimentId", "experimentIndex", "archiveKey", "actionArchiveKey", "artifactPath", "resultPath", "logPath", "serverId", "gpuIds", "startedAt", "updatedAt", "duration", "progress", "primaryMetric", "workerLiveStatus", "workerTelemetryWarning", "logTail", "consoleTail", "liveOutput", "finalLog", "finalOutput", "stdout", "stderr"]);
    }

    function compactTracesForSignature(state) {
      const traceModel = experimentTraceViewModelForState(state);
      const rows = traceModel.rows;
      const visibleRows = traceModel.visibleRows;
      const selectedRow = traceModel.selectedRow;
      return {
        count: rows.length,
        scope: compactRecordForSignature(traceModel.scope || {}, ["scoped", "selectedPlanFile", "selectedPlanRevision", "selectedCount", "unscopedCount", "totalCount"]),
        visibleRows: compactRowsForSignature(visibleRows, TRACE_RENDER_LIMIT, ["id", "archiveKey", "planFile", "planRevision", "artifactPath", "resultPath", "status", "reviewState", "reviewReason", "deleteStatus", "resultStatus", "tags", "workerId", "updatedAt"]),
        selectedRow: selectedRow ? compactRecordForSignature(selectedRow, ["id", "archiveKey", "planFile", "planRevision", "artifactPath", "resultPath", "status", "reviewState", "reviewReason", "deleteStatus", "resultStatus", "tags", "workerId", "updatedAt"]) : null
      };
    }

    function compactResultsSummaryForSignature(summary) {
      const item = summary && typeof summary === "object" ? summary : {};
      const claimEvidence = item.claimEvidence || item.claim_evidence || {};
      return {
        planFile: pick(item, ["planFile", "plan_file"], ""),
        planRevision: pick(item, ["planRevision", "plan_revision"], ""),
        lastParsedAt: pick(item, ["lastParsedAt", "last_parsed_at"], ""),
        parseFailed: pick(item, ["parseFailed", "parse_failed"], ""),
        qualityWarnings: pick(item, ["qualityWarnings", "quality_warnings"], ""),
        qualityGatePath: pick(item, ["qualityGatePath", "quality_gate_path"], ""),
        qualityGateResultCount: pick(item, ["qualityGateResultCount", "quality_gate_result_count"], ""),
        previewCsvPath: pick(item, ["previewCsvPath", "preview_csv_path"], ""),
        previewResultCount: pick(item, ["previewResultCount", "preview_result_count", "resultCount", "result_count"], ""),
        effectiveResultsCsvPath: pick(item, ["effectiveResultsCsvPath", "effective_results_csv_path"], ""),
        effectiveArchivedResultCount: pick(item, ["effectiveArchivedResultCount", "effective_archived_result_count", "finalResultCount", "final_result_count"], ""),
        pendingReviewCount: pick(item, ["pendingReviewCount", "pending_review_count"], ""),
        excludedResultCount: pick(item, ["excludedResultCount", "excluded_result_count"], ""),
        statisticsUpdatedAt: pick(item, ["statisticsUpdatedAt", "statistics_updated_at"], ""),
        statisticsPath: pick(item, ["statisticsPath", "statistics_path"], ""),
        statisticsResultCount: pick(item, ["statisticsResultCount", "statistics_result_count"], ""),
        paperTablePath: pick(item, ["paperTablePath", "paper_table_path", "exportPath"], ""),
        paperTableResultCount: pick(item, ["paperTableResultCount", "paper_table_result_count"], ""),
        missingResults: pick(item, ["missingResults", "missing_results"], ""),
        leakageStatus: pick(item, ["leakageStatus", "leakage_status"], ""),
        inclusionPolicy: pick(item, ["inclusionPolicy", "inclusion_policy"], ""),
        significanceStatus: pick(item, ["significanceStatus", "significance_status"], ""),
        stalePlanVersionSuppressed: item.stalePlanVersionSuppressed,
        incompleteAggregate: item.incompleteAggregate,
        aggregateCoverage: item.aggregateCoverage,
        expectedWorkerIds: asArray(item.expectedWorkerIds),
        availableWorkerIds: asArray(item.availableWorkerIds),
        unavailableWorkerIds: asArray(item.unavailableWorkerIds),
        message: item.message,
        claimEvidenceStatus: pick(item, ["claimEvidenceStatus", "claim_evidence_status"], pick(claimEvidence, ["status"], "")),
        claimEvidencePath: pick(item, ["claimEvidencePath", "claim_evidence_path"], pick(claimEvidence, ["path"], "")),
        claimCount: pick(item, ["claimCount", "claim_count"], pick(claimEvidence, ["claimCount", "claim_count"], "")),
        claimSupportedCount: pick(item, ["claimSupportedCount", "claim_supported_count"], pick(claimEvidence, ["supportedCount", "supported_count"], "")),
        claimUnsupportedCount: pick(item, ["claimUnsupportedCount", "claim_unsupported_count"], pick(claimEvidence, ["unsupportedCount", "unsupported_count"], "")),
        claimNeedsExperimentCount: pick(item, ["claimNeedsExperimentCount", "claim_needs_experiment_count"], pick(claimEvidence, ["needsExperimentCount", "needs_experiment_count"], "")),
        results: compactRowsForSignature(item.results, 40, ["experiment_id", "experimentId", "suite", "method", "dataset", "split", "seed", "metric", "value", "status"]),
        leaderboard: compactRowsForSignature(item.leaderboard, 40, ["method", "dataset", "metric", "mean", "std", "rank", "status"]),
        pairedComparisons: compactRowsForSignature(item.pairedComparisons || item.paired_comparisons, 20, ["baseline", "candidate", "metric", "pValue", "p_value", "effect", "status"]),
        claimEvidencePreview: compactRowsForSignature(item.claimEvidencePreview || item.claim_evidence_preview || (item.claimEvidence || {}).preview || (item.claim_evidence || {}).preview, 20, ["text", "claim", "status", "evidence", "reason", "evidenceRefs", "evidence_refs", "matchedKeys", "matched_keys", "missingRefs", "missing_refs", "line"])
      };
    }

    function compactDiagnosticsForSignature(diagnostics) {
      const item = diagnostics && typeof diagnostics === "object" ? diagnostics : {};
      const base = {
        requests: compactRecordForSignature(item.requests || {}, ["paused", "state", "message", "updatedAt"]),
        lastError: item.lastError,
        debugBundlePath: item.debugBundlePath,
        updatedAt: item.updatedAt,
        errors: compactRowsForSignature(item.errors, 20, ["command", "message", "timestamp", "suggestion"]),
        warnings: compactRowsForSignature(item.warnings, 20, ["message", "timestamp", "suggestion"])
      };
      if (diagnosticDetailsOpen()) base["detailsPreviewHash"] = htmlSignature(diagnosticJsonPreview(item));
      return base;
    }

    function compactOperationsForSignature(rows) {
      const normalized = operationRowsForInput(rows || {});
      if (normalized === operationSignatureCacheRows && operationSignatureCacheValue) return operationSignatureCacheValue;
      operationSignatureCacheRows = normalized;
      operationSignatureCacheValue = compactOperationRowsForSignature(normalized);
      return operationSignatureCacheValue;
    }

    function compactOperationSectionForSignature(state) {
      const view = operationViewModelForState(state || {});
      const minuteBucket = Math.floor(Date.now() / 60000);
      if (view.rows === operationSectionSignatureCacheRows && minuteBucket === operationSectionSignatureCacheMinute && operationSectionSignatureCacheValue) return operationSectionSignatureCacheValue;
      operationSectionSignatureCacheRows = view.rows;
      operationSectionSignatureCacheMinute = minuteBucket;
      operationSectionSignatureCacheValue = {
        count: view.rows.length,
        minuteBucket,
        hiddenCount: view.hiddenCount,
        statusCounts: view.statusCounts,
        visibleRows: compactOperationRowsForSignature(view.visibleRows)
      };
      return operationSectionSignatureCacheValue;
    }

    function compactOperationRowsForSignature(rows) {
      return asArray(rows).slice(0, OPERATION_RENDER_LIMIT).map((row) => ({
        id: row.id || row.operationId || row.opId,
        operationId: row.operationId,
        type: row.type,
        action: row.action,
        status: row.status || row.state,
        updatedAt: row.updatedAt || row.generatedAt || row.finishedAt,
        message: row.message,
        progress: row.progress,
        error: row.error,
        targetCount: row.targetCount,
        fileCount: row.fileCount,
        deletedCount: row.deletedCount,
        skippedCount: row.skippedCount,
        residueCount: row.residueCount,
        missingCount: row.missingCount,
        missingFiles: row.missingFiles,
        unparseableCount: row.unparseableCount,
        unparseableFiles: row.unparseableFiles,
        parseableResultCount: row.parseableResultCount,
        debugMode: row.debugMode,
        debugRunId: row.debugRunId,
        debugOutputDir: row.debugOutputDir,
        contractReportPath: row.contractReportPath,
        unarchivedCount: row.unarchivedCount,
        workerId: row.workerId,
        manifestPath: row.manifestPath
      }));
    }

    function compactActionErrorsForSignature(rows) {
      return asArray(rows).slice(0, 20).map((row) => ({
        command: row.command,
        action: row.action,
        message: row.message,
        timestamp: row.timestamp || row.updatedAt
      }));
    }

    function renderDiagnosticSection(state) {
      renderTargetCompletionMatrix(state);
      renderFeatureReadiness(state);
      renderCapabilities(state);
      renderActionErrors(state);
      renderDiagnosticDetailsJson(state);
    }

    function renderDiagnosticDetailsJson(state) {
      const details = el("details");
      if (!details) return;
      if (diagnosticDetailsOpen()) setTextIfChanged(details, diagnosticJsonPreview((state || {}).diagnostics || {}));
      else setTextIfChanged(details, "高级诊断按需生成。");
    }

    function diagnosticJsonPreview(value) {
      const preview = diagnosticJsonPreviewValue(value, 0, new Set());
      let text = "";
      try {
        text = JSON.stringify(preview, null, 2);
      } catch (error) {
        text = String(error && error.message ? error.message : error);
      }
      if (text.length <= DIAGNOSTIC_JSON_PREVIEW_LIMIT) return text;
      return text.slice(0, DIAGNOSTIC_JSON_PREVIEW_LIMIT) + "\\n... 已省略 " + (text.length - DIAGNOSTIC_JSON_PREVIEW_LIMIT) + " 个字符；完整诊断请导出调试包。";
    }

    function diagnosticJsonPreviewValue(value, depth, seen) {
      if (value === null || value === undefined) return value;
      const type = typeof value;
      if (type === "string") return value.length > DIAGNOSTIC_JSON_STRING_LIMIT ? value.slice(0, DIAGNOSTIC_JSON_STRING_LIMIT) + "... 已截断 " + (value.length - DIAGNOSTIC_JSON_STRING_LIMIT) + " 字符" : value;
      if (type === "number" || type === "boolean") return value;
      if (type !== "object") return String(value);
      if (seen.has(value)) return "[循环引用已省略]";
      if (depth >= DIAGNOSTIC_JSON_MAX_DEPTH) return "[深层对象已省略]";
      seen.add(value);
      if (Array.isArray(value)) {
        const rows = value.slice(0, DIAGNOSTIC_JSON_ARRAY_LIMIT).map((item) => diagnosticJsonPreviewValue(item, depth + 1, seen));
        if (value.length > DIAGNOSTIC_JSON_ARRAY_LIMIT) rows.push("[另有 " + (value.length - DIAGNOSTIC_JSON_ARRAY_LIMIT) + " 项已省略]");
        seen.delete(value);
        return rows;
      }
      const out = {};
      const keys = Object.keys(value).slice(0, DIAGNOSTIC_JSON_OBJECT_KEY_LIMIT);
      keys.forEach((key) => { out[key] = diagnosticJsonPreviewValue(value[key], depth + 1, seen); });
      const omitted = Object.keys(value).length - keys.length;
      if (omitted > 0) out["__omittedKeys"] = omitted;
      seen.delete(value);
      return out;
    }

    function sectionIsCollapsed(section) {
      const card = document.querySelector('[data-section="' + cssEscape(section) + '"]');
      if (card) return card.classList.contains("is-collapsed");
      return Boolean((currentUiLayout.collapsed || {})[section]);
    }

    function diagnosticDetailsOpen() {
      const details = el("details");
      const container = details && details.closest("details.advanced");
      return Boolean(container && container.open);
    }

    function commandNeedsLoading(command) {
      return !["selectPlan", "selectExperiment", "selectLogRunKey", "openPlan", "status"].includes(String(command || ""));
    }

    function createClientActionId(command, pendingKey) {
      return [String(command || "command"), String(Date.now()), String(Math.random()).slice(2), String(pendingKey || "")].join("|");
    }

    function pendingKeyForButton(button, command, payload) {
      if (button && (button.dataset.contextAction === "true" || button.dataset.batchSelected === "true")) return pendingKeyForAction(command, payload || {});
      return button.dataset.pendingKey || pendingKeyForAction(command, payload || {});
    }

    function pendingKeyFromButtonDataset(button) {
      const payload = {};
      ["runKey", "taskUiKey", "experimentId", "archiveKey", "experimentIndex", "gpuId", "endpointId", "remotePath", "file", "planFile", "workerId", "configScope", "savePlan", "sourcePath", "sourceLabel", "presentationPath", "chartType", "styleMode"].forEach((key) => {
        if (button.dataset[key]) payload[key] = button.dataset[key];
      });
      if (button.dataset.batchSelected === "true") payload.batchSelected = "true";
      return button.dataset.pendingKey || pendingKeyForAction(button.dataset.command, payload);
    }

    function pendingKeyForAction(command, payload) {
      const parts = [command];
      ["runKey", "taskUiKey", "experimentId", "archiveKey", "experimentIndex", "gpuId", "endpointId", "remotePath", "file", "planFile", "workerId", "configScope", "savePlan", "sourcePath", "sourceLabel", "presentationPath", "chartType", "styleMode", "batchSelected"].forEach((key) => {
        const value = payload && payload[key];
        if (value) parts.push(key + "=" + String(value));
      });
      return parts.join("|");
    }

    function commandActionName(command) {
      return COMMAND_ACTION_NAMES[command] || command;
    }

    function operationIsActive(status) {
      const value = String(status || "").toLowerCase();
      return ["accepted", "submitted", "pending", "queued", "running", "in_progress", "started", "progress"].some((item) => value.includes(item));
    }

    function operationIsFailureLike(status) {
      const value = String(status || "").toLowerCase();
      return ["failed", "failure", "stalled", "timeout", "unsupported", "error"].some((item) => value.includes(item));
    }

    function operationIsCancelled(status) {
      const value = String(status || "").toLowerCase();
      return value.includes("cancel") || value.includes("stop");
    }

    function operationIsCompleted(status) {
      const value = String(status || "").toLowerCase();
      return !operationIsFailureLike(value) && !operationIsCancelled(value) && (value.includes("complete") || value === "done" || value === "succeeded");
    }

    function operationRowsForState(state) {
      const input = ((state || {}).operations || {});
      return operationRowsForInput(input);
    }

    function operationRowsForInput(input) {
      if (input === operationRowsCacheInput) return operationRowsCacheRows;
      operationRowsCacheInput = input;
      operationRowsCacheRows = normalizeOperationRows(input || {});
      operationViewCacheRows = null;
      operationViewCacheValue = null;
      operationSignatureCacheRows = null;
      operationSignatureCacheValue = null;
      operationSectionSignatureCacheRows = null;
      operationSectionSignatureCacheValue = null;
      return operationRowsCacheRows;
    }

    function isTerminalUiStatus(status) {
      return ["completed", "submitted", "failed", "cancelled", "stalled"].includes(String(status || "").toLowerCase());
    }

    function handleUiCommandStatus(data) {
      const clientActionId = String(data.clientActionId || "");
      const item = clientActionId ? pendingActionsById[clientActionId] : undefined;
      const pendingKey = String((item && item.pendingKey) || data.pendingKey || "");
      if (!item && !isTerminalUiStatus(data.status)) return;
      if (item) {
        if (isTerminalUiStatus(item.status) && !isTerminalUiStatus(data.status)) return;
        item.status = data.status || item.status;
        item.message = data.message || item.message;
      }
      if (isTerminalUiStatus(data.status)) {
        if (String(data.status).toLowerCase() === "completed") clearConfigDraftsForCommand(data.command, item || {});
        if (String(data.command || "") === "savePlan" && String(data.status).toLowerCase() === "completed") planPreviewEditLockUntil = 0;
        if (pendingKey) {
          delete pendingActions[pendingKey];
          pendingButtonKeys.delete(pendingKey);
        }
        if (clientActionId) {
          delete pendingActionsById[clientActionId];
          clearPendingActionTimeout(clientActionId);
        }
        clearButtonsForPending(clientActionId, pendingKey, data.command);
        if (lastState && !isConfigSaveCommand(data.command)) {
          refreshTerminalUi(data.command);
        } else applyPendingButtonStates();
        const submittedTarget = submittedCommandTarget(data.command, data.status);
        if (submittedTarget) {
          setTaskPlanScope(String(data.command || "") === "runAllPlans" ? "all" : "selected");
          setTracePlanScope("selected");
          navigateToResourceTarget(submittedTarget.section, submittedTarget.anchor, { force: true });
        }
      }
    }

    function submittedCommandTarget(command, status) {
      const normalizedCommand = String(command || "");
      const normalizedStatus = String(status || "").toLowerCase();
      if (normalizedStatus === "submitted" && ["runPlan", "reproducePlan", "runAllPlans"].includes(normalizedCommand)) {
        return { section: "tasks", anchor: "tasks-list" };
      }
      if (normalizedStatus === "completed" && normalizedCommand === "restoreArchivedPlan") {
        return { section: "plans", anchor: "plans-list" };
      }
      return null;
    }

    function navigateToResourceTarget(section, anchor, options) {
      const nextSection = section || activeResourceSection || "overview";
      const nextAnchor = anchor || nextSection;
      applyMainViewForSection(nextSection);
      expandResourceSection(nextSection);
      const targetChanged = nextSection !== activeResourceSection || nextAnchor !== activeResourceAnchor;
      activeResourceSection = nextSection;
      activeResourceAnchor = nextAnchor;
      updateResourceTreeActiveSection(activeResourceSection, activeResourceAnchor);
      scrollToResourceTarget(activeResourceSection, activeResourceAnchor);
      if (targetChanged || (options && options.force)) {
        forceWorkbenchInspectorRender();
        renderWorkbenchInspector(lastState || {}, { force: true });
      }
    }

    function refreshTerminalUi(command) {
      const state = lastState || {};
      applyPendingButtonStates();
      refreshPlanActionButtons(state, el("planQuickGrid"));
      refreshContextualActionButtons(state, el("workbenchInspector"));
      refreshContextualActionButtons(state, el("pinnedActionsHost"));
      refreshContextualActionButtons(state, el("taskBatchActions"));
      renderSectionIfVisible(state, "operations", { force: true });
      refreshWorkbenchInspectorAfterTerminal(state);
      schedulePostRenderMaintenance(false);
    }

    function refreshWorkbenchInspectorAfterTerminal(state) {
      const target = el("workbenchInspector");
      if (target && workbenchInspectorScrolledAway(target)) {
        renderWorkbenchInspector(state, { statusRefresh: true });
        return;
      }
      forceWorkbenchInspectorRender();
      renderWorkbenchInspector(state, { force: true });
    }

    function isConfigSaveCommand(command) {
      return ["saveTopologyMode", "saveHubConfig", "saveWorkerConfig", "saveSchedulerConfig", "saveProjectAdapterRules"].includes(String(command || ""));
    }

    function clearPendingActionTimeout(clientActionId) {
      const timer = clientActionId ? pendingActionTimeouts[clientActionId] : 0;
      if (timer) clearTimeout(timer);
      if (clientActionId) delete pendingActionTimeouts[clientActionId];
    }

    function clearButtonsForPending(clientActionId, pendingKey, command) {
      pendingButtonCandidates(clientActionId, pendingKey, command).forEach((button) => {
        const key = pendingKeyFromButtonDataset(button);
        if ((clientActionId && button.dataset.clientActionId === clientActionId) ||
          (pendingKey && key === pendingKey) ||
          (command && button.dataset.command === command && !buttonHasPendingScope(button))) {
          clearButtonLoading(button);
        }
      });
    }

    function clearCompletedPendingButtons(state) {
      const activeActions = new Set(operationRowsForState(state)
        .filter((row) => operationIsActive(row.status))
        .map((row) => String(row.type || "")));
      const now = Date.now();
      Object.keys(pendingActions).forEach((key) => {
        const item = pendingActions[key] || {};
        const age = now - Number(item.startedAt || 0);
        const action = commandActionName(item.command);
        const active = activeActions.has(action) || activeActions.has(String(item.command || ""));
        if (age > 30000 || (!active && item.seenState && age > 1200)) {
          delete pendingActions[key];
          if (item.clientActionId) {
            delete pendingActionsById[item.clientActionId];
            clearPendingActionTimeout(item.clientActionId);
          }
          pendingButtonKeys.delete(key);
        } else {
          item.seenState = true;
        }
      });
      pendingButtonKeys = new Set(Object.keys(pendingActions));
      Object.keys(pendingActionsById).forEach((id) => {
        const item = pendingActionsById[id];
        if (!item || !pendingActions[item.pendingKey]) {
          delete pendingActionsById[id];
          clearPendingActionTimeout(id);
        }
      });
    }

    function setButtonLoading(button, key) {
      if (!button) return;
      const alreadyLoading = button.classList.contains("is-loading");
      button.dataset.pendingKey = key;
      const item = pendingActions[key] || {};
      if (item.clientActionId) button.dataset.clientActionId = item.clientActionId;
      if (!alreadyLoading) button.dataset.wasDisabled = button.disabled ? "1" : "0";
      button.disabled = true;
      if (!alreadyLoading) {
        button.classList.add("is-loading");
        loadingButtonCount += 1;
      }
      button.setAttribute("aria-busy", "true");
      if (!button.querySelector(".loading-spinner")) {
        const spinner = document.createElement("span");
        spinner.className = "loading-spinner";
        spinner.setAttribute("aria-hidden", "true");
        button.prepend(spinner);
      }
    }

    function clearButtonLoading(button) {
      if (!button || !button.classList.contains("is-loading")) return;
      button.classList.remove("is-loading");
      loadingButtonCount = Math.max(0, loadingButtonCount - 1);
      button.removeAttribute("aria-busy");
      const spinner = button.querySelector(".loading-spinner");
      if (spinner) spinner.remove();
      if (button.dataset.wasDisabled !== "1") button.disabled = false;
      delete button.dataset.wasDisabled;
      delete button.dataset.pendingKey;
      delete button.dataset.clientActionId;
    }

    function applyPendingButtonStates() {
      let visited = 0;
      const fallbackByCommand = pendingFallbackCommandMap();
      pendingButtonCandidates().forEach((button) => {
        visited += 1;
        const key = pendingKeyFromButtonDataset(button);
        const fallback = buttonHasPendingScope(button) ? "" : fallbackByCommand.get(String(button.dataset.command || ""));
        const pendingKey = pendingActions[key] ? key : fallback;
        if (pendingKey) setButtonLoading(button, pendingKey);
        else clearButtonLoading(button);
      });
      if (!visited && !pendingButtonKeys.size) loadingButtonCount = 0;
    }

    function pendingFallbackCommandMap() {
      const map = new Map();
      Object.keys(pendingActions).forEach((key) => {
        const item = pendingActions[key] || {};
        const command = String(item.command || "");
        if (command && !pendingActionIsScoped(item) && !map.has(command)) map.set(command, key);
      });
      return map;
    }

    function pendingButtonCandidates(clientActionId, pendingKey, command) {
      const selectors = new Set(["button[data-command].is-loading"]);
      const addPendingKey = (key) => {
        if (key) selectors.add('button[data-command][data-pending-key="' + cssEscape(key) + '"]');
      };
      addPendingKey(pendingKey);
      Object.keys(pendingActions).forEach((key) => {
        addPendingKey(key);
        const item = pendingActions[key] || {};
        const scopedSelector = pendingActionSelector(item);
        if (scopedSelector) selectors.add(scopedSelector);
        if (item.command && !pendingActionIsScoped(item)) {
          selectors.add('button[data-command="' + cssEscape(item.command) + '"]:not([data-run-key]):not([data-experiment-id]):not([data-archive-key])');
        }
      });
      if (clientActionId) selectors.add('button[data-command][data-client-action-id="' + cssEscape(clientActionId) + '"]');
      if (command) selectors.add('button[data-command="' + cssEscape(command) + '"]:not([data-run-key]):not([data-experiment-id]):not([data-archive-key]):not([data-endpoint-id]):not([data-plan-file]):not([data-file]):not([data-remote-path]):not([data-config-scope])');
      const selector = Array.from(selectors).join(",");
      return selector ? Array.from(document.querySelectorAll(selector)) : [];
    }

    function pendingScopeKeys() {
      return ["runKey", "taskUiKey", "experimentId", "archiveKey", "experimentIndex", "gpuId", "endpointId", "remotePath", "file", "planFile", "workerId", "configScope", "savePlan", "batchSelected"];
    }

    function pendingActionIsScoped(item) {
      return pendingScopeKeys().some((key) => item && item[key]);
    }

    function buttonHasPendingScope(button) {
      return pendingScopeKeys().some((key) => button && button.dataset && button.dataset[key]);
    }

    function pendingActionSelector(item) {
      if (!item || !item.command || !pendingActionIsScoped(item)) return "";
      let selector = 'button[data-command="' + cssEscape(item.command) + '"]';
      pendingScopeKeys().forEach((key) => {
        if (item[key]) selector += '[' + dataAttributeName(key) + '="' + cssEscape(String(item[key])) + '"]';
      });
      return selector;
    }

    function dataAttributeName(key) {
      return "data-" + String(key || "").replace(/[A-Z]/g, (match) => "-" + match.toLowerCase());
    }

    function loadingPrefix(active) {
      return active ? '<span class="loading-spinner" aria-hidden="true"></span>' : "";
    }

    function clearResourceTreeDropMarkers() {
      document.querySelectorAll(".tree-drop-before,.tree-drop-after").forEach((node) => node.classList.remove("tree-drop-before", "tree-drop-after"));
    }

    function moveResourceTreeSection(source, target, before) {
      const layout = normalizeUiLayout(currentUiLayout);
      if (!source || !target || source === target || !layout.order.includes(source) || !layout.order.includes(target)) return;
      const nextOrder = layout.order.filter((section) => section !== source);
      const targetIndex = nextOrder.indexOf(target);
      nextOrder.splice(targetIndex + (before ? 0 : 1), 0, source);
      currentUiLayout = Object.assign({}, layout, { order: nextOrder, manual: true });
      preserveScroll(() => applyUiLayout({ uiLayout: currentUiLayout }));
      activeResourceSection = source;
      activeResourceAnchor = source;
      resourceTreeRenderKey = "";
      renderResourceTree(lastState || {});
      updateResourceTreeActiveSection(activeResourceSection, activeResourceAnchor);
      forceWorkbenchInspectorRender();
      renderWorkbenchInspector(lastState || {}, { force: true });
      saveUiLayout();
    }

    function moveResourceTreeChild(section, sourceAnchor, targetAnchor, before) {
      const layout = normalizeUiLayout(currentUiLayout);
      const children = resourceTreeChildrenForSection(section);
      if (!section || !sourceAnchor || !targetAnchor || sourceAnchor === targetAnchor || !children.includes(sourceAnchor) || !children.includes(targetAnchor)) return;
      const nextChildren = children.filter((anchor) => anchor !== sourceAnchor);
      const targetIndex = nextChildren.indexOf(targetAnchor);
      nextChildren.splice(targetIndex + (before ? 0 : 1), 0, sourceAnchor);
      currentUiLayout = Object.assign({}, layout, {
        resourceTreeChildren: Object.assign({}, layout.resourceTreeChildren || {}, { [section]: nextChildren }),
        manual: true
      });
      activeResourceSection = section;
      activeResourceAnchor = sourceAnchor;
      resourceTreeRenderKey = "";
      renderResourceTree(lastState || {});
      applyResourceTreeChildLayout(section);
      updateResourceTreeActiveSection(activeResourceSection, activeResourceAnchor);
      forceWorkbenchInspectorRender();
      renderWorkbenchInspector(lastState || {}, { force: true });
      saveUiLayout();
    }

    function applyResourceTreeChildLayout(section) {
      if (!resourceTreeSectionHasCustomChildOrder(section)) return;
      const card = document.querySelector('#mainColumn > [data-section="' + cssEscape(section || "") + '"]');
      if (!card) return;
      const order = resourceTreeChildrenForSection(section);
      if (!order.length) return;
      const rank = new Map(order.map((anchor, index) => [String(anchor || ""), index]));
      const nodes = Array.from(card.querySelectorAll("[data-anchor]")).filter((node) => {
        if (!node || node === card) return false;
        return rank.has(String(node.getAttribute("data-anchor") || ""));
      });
      const byParent = new Map();
      nodes.forEach((node) => {
        const parent = node.parentElement;
        if (!parent) return;
        if (!byParent.has(parent)) byParent.set(parent, []);
        byParent.get(parent).push(node);
      });
      byParent.forEach((items, parent) => {
        const sorted = [...items].sort((a, b) => (rank.get(String(a.getAttribute("data-anchor") || "")) || 0) - (rank.get(String(b.getAttribute("data-anchor") || "")) || 0));
        if (items.every((node, index) => node === sorted[index])) return;
        const boundary = items[items.length - 1].nextSibling;
        sorted.forEach((node) => parent.insertBefore(node, boundary));
      });
    }

    function applyUiLayout(state) {
      const nextLayout = normalizeUiLayout((state && state.uiLayout) || currentUiLayout);
      const nextLayoutKey = uiLayoutApplyKey(nextLayout);
      currentUiLayout = nextLayout;
      const deck = el("mainColumn") || el("cardDeck");
      if (!deck) return;
      if (nextLayoutKey === lastAppliedUiLayoutKey) return;
      lastAppliedUiLayoutKey = nextLayoutKey;
      const cards = Array.from(deck.querySelectorAll(":scope > [data-section]"));
      const byId = new Map(cards.map((card) => [card.dataset.section, card]));
      const ordered = currentUiLayout.order.map((section) => byId.get(section)).filter(Boolean)
        .concat(cards.filter((card) => !currentUiLayout.order.includes(card.dataset.section)));
      const currentOrder = cards.map((card) => card.dataset.section).join("|");
      const nextOrder = ordered.map((card) => card.dataset.section).join("|");
      if (currentOrder !== nextOrder) {
        let cursor = deck.firstElementChild;
        ordered.forEach((card) => {
          if (card !== cursor) deck.insertBefore(card, cursor);
          cursor = card.nextElementSibling;
        });
      }
      Array.from(deck.querySelectorAll(":scope > [data-section]")).forEach((card) => {
        const section = card.dataset.section;
        card.classList.toggle("is-collapsed", Boolean(currentUiLayout.collapsed[section]));
      });
      if (resourceTreeChildOrderSignature(currentUiLayout)) currentUiLayout.order.forEach((section) => applyResourceTreeChildLayout(section));
      applyLayoutColumns();
    }

    function uiLayoutApplyKey(layout) {
      const normalized = normalizeUiLayout(layout || {});
      const collapsed = Object.keys(normalized.collapsed || {}).sort().map((key) => key + "=" + (normalized.collapsed[key] ? "1" : "0")).join("|");
      const columns = normalizeLayoutColumns(normalized.columns || {});
      return [normalized.order.join("|"), collapsed, columns.tree, columns.inspector, normalized.treePinned ? "tree-pinned" : "tree-drawer", normalized.inspectorPinned ? "inspector-pinned" : "inspector-drawer", resourceTreeChildOrderSignature(normalized)].join("::");
    }

    function preserveScroll(work) {
      const x = window.scrollX || document.documentElement.scrollLeft || document.body.scrollLeft || 0;
      const y = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
      const main = el("mainColumn");
      const mainTop = main ? main.scrollTop : 0;
      work();
      const restore = () => {
        window.scrollTo(x, y);
        if (main) main.scrollTop = mainTop;
      };
      if (typeof requestAnimationFrame === "function") requestAnimationFrame(restore);
      else setTimeout(restore, 0);
    }

    function preserveMainColumnAnchor(work) {
      const main = el("mainColumn");
      if (!main || Date.now() < resourceTreeScrollLockUntil) {
        work();
        return;
      }
      if (Number(main.scrollTop || 0) <= 2) {
        work();
        return;
      }
      const anchor = mainVisibleAnchor(main);
      const beforeScrollTop = main.scrollTop;
      work();
      restoreMainColumnAnchor(main, anchor, beforeScrollTop);
      if (typeof requestAnimationFrame === "function") requestAnimationFrame(() => restoreMainColumnAnchor(main, anchor, beforeScrollTop));
    }

    function mainVisibleAnchor(main) {
      const node = visibleMainColumnNode(main);
      if (!node) return null;
      const box = node.getBoundingClientRect();
      return {
        node,
        anchor: node.dataset.anchor || "",
        section: node.dataset.section || "",
        top: box.top
      };
    }

    function restoreMainColumnAnchor(main, anchor, fallbackScrollTop) {
      if (!main || !anchor) {
        if (main && Number.isFinite(fallbackScrollTop)) main.scrollTop = fallbackScrollTop;
        return;
      }
      let node = anchor.node && anchor.node.isConnected ? anchor.node : null;
      if (!node) node = findMainColumnAnchor(main, anchor);
      if (!node) {
        if (Number.isFinite(fallbackScrollTop)) main.scrollTop = fallbackScrollTop;
        return;
      }
      const delta = node.getBoundingClientRect().top - anchor.top;
      if (Math.abs(delta) > 1) main.scrollTop += delta;
    }

    function findMainColumnAnchor(main, anchor) {
      const selectors = [];
      if (anchor.anchor) selectors.push('[data-anchor="' + cssEscape(anchor.anchor) + '"]');
      if (anchor.section) selectors.push('[data-section="' + cssEscape(anchor.section) + '"]');
      for (const selector of selectors) {
        const node = main.querySelector(selector);
        if (node) return node;
      }
      return null;
    }

    function visibleMainColumnNode(main) {
      const mainBox = main.getBoundingClientRect();
      if (document.elementFromPoint) {
        const x = Math.max(mainBox.left + 8, Math.min(mainBox.right - 8, mainBox.left + Math.min(160, Math.max(8, mainBox.width / 2))));
        const y = Math.max(mainBox.top + 8, Math.min(mainBox.bottom - 8, mainBox.top + 12));
        const hit = document.elementFromPoint(x, y);
        const current = hit && hit.closest ? hit.closest("[data-anchor], [data-section]") : null;
        if (current && main.contains(current)) return current;
      }
      return Array.from(main.querySelectorAll("[data-anchor], [data-section]")).find((node) => {
        const box = node.getBoundingClientRect();
        return box.bottom >= mainBox.top + 8 && box.top <= mainBox.bottom - 8;
      }) || null;
    }

    function scheduleMainColumnSidePanelSync() {
      if (Date.now() < resourceTreeScrollLockUntil) return;
      if (mainColumnSyncFrame) return;
      mainColumnSyncFrame = requestAnimationFrame(() => {
        mainColumnSyncFrame = 0;
        const main = el("mainColumn");
        const node = main ? visibleMainColumnNode(main) : null;
        syncSidePanelsFromMainColumn(node, { statusRefresh: true });
      });
    }

    function syncSidePanelsFromMainColumn(node, options) {
      if (!node) return;
      const card = node.closest && node.closest("[data-section]");
      const section = (card && card.dataset.section) || node.dataset.section || activeResourceSection || "overview";
      const anchor = node.dataset.anchor || (card && card.dataset.anchor) || section;
      if (!section || (section === activeResourceSection && anchor === activeResourceAnchor && !options?.force)) return;
      activeResourceSection = section;
      activeResourceAnchor = anchor;
      updateResourceTreeActiveSection(section, anchor);
      scrollActiveResourceTreeNodeIntoView();
      renderWorkbenchInspector(lastState || {}, Object.assign({ statusRefresh: true }, options || {}));
    }

    function scrollActiveResourceTreeNodeIntoView() {
      const body = el("resourceTreeBody");
      const node = activeResourceNode;
      if (!body || !node || !body.contains(node) || Date.now() < resourceTreeScrollLockUntil) return;
      const bodyBox = body.getBoundingClientRect();
      const nodeBox = node.getBoundingClientRect();
      if (nodeBox.top < bodyBox.top + 8 || nodeBox.bottom > bodyBox.bottom - 8) {
        body.scrollTop += nodeBox.top - bodyBox.top - 12;
      }
    }

    function setHtmlIfChanged(targetOrId, html) {
      const target = typeof targetOrId === "string" ? el(targetOrId) : targetOrId;
      if (!target) return false;
      const next = String(html || "");
      const sig = htmlSignature(next);
      if (target.dataset.htmlSig === sig) return false;
      target.dataset.htmlSig = sig;
      target.innerHTML = next;
      markPostRenderDomChanged(next);
      return true;
    }

    function setTextIfChanged(targetOrId, text) {
      const target = typeof targetOrId === "string" ? el(targetOrId) : targetOrId;
      if (!target) return false;
      const next = String(text || "");
      const sig = htmlSignature(next);
      if (target.dataset.textSig === sig) return false;
      target.dataset.textSig = sig;
      target.textContent = next;
      return true;
    }

    function markPostRenderDomChanged(html) {
      postRenderDomVersion = (postRenderDomVersion + 1) % 1000000;
      if (htmlContainsButtonMarkup(html)) postRenderButtonDomVersion = (postRenderButtonDomVersion + 1) % 1000000;
      if (htmlContainsSectionMarkup(html)) postRenderCardDomVersion = (postRenderCardDomVersion + 1) % 1000000;
    }

    function htmlContainsButtonMarkup(html) {
      return String(html || "").toLowerCase().includes("<button");
    }

    function htmlContainsSectionMarkup(html) {
      return String(html || "").toLowerCase().includes("data-section=");
    }

    function htmlSignature(value) {
      const text = String(value || "");
      let hash = 0;
      for (let i = 0; i < text.length; i += 1) hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
      return String(text.length) + ":" + String(hash);
    }

    function decorateCards() {
      document.querySelectorAll("[data-section]").forEach((card) => {
        const head = card.querySelector(".section-head");
        if (!head) return;
        let tools = head.querySelector(".cardTools");
        if (!tools) {
          tools = document.createElement("div");
          tools.className = "cardTools";
          head.appendChild(tools);
        }
        const section = card.dataset.section;
        const collapsed = card.classList.contains("is-collapsed");
        const nextSig = [section, collapsed ? "1" : "0", layoutEdit ? "1" : "0"].join("|");
        if (tools.dataset.cardToolsSig !== nextSig) {
          tools.dataset.cardToolsSig = nextSig;
          tools.innerHTML =
            '<span class="dragHandle" draggable="true" title="拖动排序">拖动</span>' +
            '<button class="collapseBtn" type="button" data-collapse-section="' + escAttr(section) + '">' + (collapsed ? "展开" : "折叠") + '</button>';
        }
        card.draggable = layoutEdit;
      });
    }

    function decorateCommandTooltips() {
      document.querySelectorAll("button:not([data-tooltip-ready='1'])").forEach((button) => {
        const existing = String(button.getAttribute("title") || "").trim();
        if (existing) {
          button.setAttribute("aria-label", existing);
          button.dataset.tooltipReady = "1";
          return;
        }
        const help = button.dataset.command ? commandHelp(button.dataset.command, button) : genericButtonHelp(button);
        if (!help) return;
        setNativeTitle(button, help);
        const label = String(button.textContent || button.dataset.command || "").replace(/\s+/g, " ").trim();
        button.setAttribute("aria-label", label ? label + "：" + help : help);
        button.dataset.tooltipReady = "1";
      });
    }

    function compactNativeTitleAttributes() {
      const compactKey = [postRenderDomVersion, nativeTitleMutationVersion].join("::");
      if (compactKey === lastNativeTitleCompactKey) return;
      lastNativeTitleCompactKey = compactKey;
      document.querySelectorAll("[title]").forEach((node) => {
        const raw = String(node.getAttribute("title") || "");
        const compact = compactNativeTitleText(raw);
        if (!compact) node.removeAttribute("title");
        else if (compact !== raw) node.setAttribute("title", compact);
      });
    }

    function compactNativeTitleText(value) {
      const text = String(value || "").replace(/\s+/g, " ").trim();
      if (!text) return "";
      if (LOW_VALUE_NATIVE_TITLES.has(text)) return "";
      const direct = compactDirectTitleValue(text);
      if (direct) return direct;
      const explanatory = text.length > 18 && EXPLANATORY_TITLE_PATTERN.test(text);
      const pieces = text.split(/[。；;\\n]/).map((item) => item.trim()).filter(Boolean);
      const first = (pieces.find((item) => !EXPLANATORY_TITLE_PATTERN.test(item) && !LOW_VALUE_NATIVE_TITLES.has(item)) || "").trim();
      if (explanatory && !first) return "";
      const base = explanatory ? first : text;
      if (LOW_VALUE_NATIVE_TITLES.has(base)) return "";
      return compactTitleLength(base);
    }

    function compactDirectTitleValue(text) {
      const pathMatch = text.match(/([A-Za-z]:[\\/][^；。\s]+|(?:^|[\s：:])(?:[\w.-]+[\\/])+[^；。\s]+|127\.0\.0\.1:\d+|localhost:\d+)/);
      if (pathMatch) return compactTitleLength(pathMatch[1].trim());
      const pairMatch = text.match(/^([^：:]{1,18}[：:]\s*[^；。]{1,80})/);
      if (pairMatch) {
        const label = pairMatch[1].split(/[：:]/)[0].trim();
        const value = pairMatch[1].split(/[：:]/).slice(1).join("：").trim();
        if (LOW_VALUE_NATIVE_TITLE_KEYS.has(label) || EXPLANATORY_TITLE_PATTERN.test(label) || EXPLANATORY_TITLE_PATTERN.test(value)) return "";
        return compactTitleLength(pairMatch[1].trim());
      }
      return "";
    }

    function compactTitleLength(text) {
      const value = String(text || "").replace(/\s+/g, " ").trim();
      if (value.length <= NATIVE_TITLE_MAX_CHARS) return value;
      return value.slice(0, Math.max(8, NATIVE_TITLE_MAX_CHARS - 1)).trimEnd() + "…";
    }

    function disableUnsupportedCommandButtons() {
      document.querySelectorAll("button[data-command]:not([data-handler-checked='1'])").forEach((button) => {
        const command = String(button.dataset.command || "");
        button.dataset.handlerChecked = "1";
        if (webviewHandledCommands.has(command)) return;
        const reason = "该按钮尚未接入 Extension handler，已自动禁用，避免点击无反应。";
        button.disabled = true;
        setNativeTitle(button, reason);
        button.setAttribute("aria-label", reason);
        button.dataset.tooltipReady = "1";
      });
    }

    function webviewDomCommandAudit() {
      const buttons = Array.from(document.querySelectorAll("button[data-command]"));
      const commands = Array.from(new Set(buttons.map((button) => String(button.dataset.command || "")).filter(Boolean))).sort();
      const missingHandler = commands.filter((command) => !webviewHandledCommands.has(command));
      const missingHelp = commands.filter((command) => !commandHelp(command));
      const withoutTooltip = buttons.filter((button) => !String(button.getAttribute("title") || "").trim() && !commandHelp(button.dataset.command)).length;
      const payloadWarnings = auditButtonPayloadWarnings(buttons);
      const directWorkerWarnings = payloadWarnings.filter((item) => /Worker/.test(item));
      const surfaceCounts = buttonSurfaceAudit(buttons);
      const disabledWithoutReason = buttons.filter((button) => button.disabled && !String(button.getAttribute("title") || "").trim() && !commandHelp(button.dataset.command)).map((button) => button.dataset.command || "unknown");
      return { buttonCount: buttons.length, commandCount: commands.length, missingHandler, missingHelp, withoutTooltip, payloadWarnings, directWorkerWarnings, surfaceCounts, disabledWithoutReason: uniqueText(disabledWithoutReason).slice(0, 12) };
    }

    function cachedWebviewDomCommandAudit(_state) {
      const now = Date.now();
      const stale = !webviewDomCommandAuditUpdatedAt || now - webviewDomCommandAuditUpdatedAt >= WEBVIEW_DOM_AUDIT_CACHE_MS;
      const cached = webviewDomCommandAuditCache || webviewDomCommandAuditEmptySnapshot();
      return Object.assign({}, cached, { cached: true, stale, updatedAt: webviewDomCommandAuditUpdatedAt });
    }

    function refreshWebviewDomCommandAudit(reason) {
      const now = Date.now();
      webviewDomCommandAuditCache = Object.assign({}, webviewDomCommandAudit(), { cached: false, stale: false, reason: reason || "manual", updatedAt: now });
      webviewDomCommandAuditCacheKey = webviewDomCommandAuditCacheKeyFor();
      webviewDomCommandAuditUpdatedAt = now;
      return webviewDomCommandAuditCache;
    }

    function webviewDomCommandAuditEmptySnapshot() {
      return {
        buttonCount: "未刷新",
        commandCount: "未刷新",
        missingHandler: [],
        missingHelp: [],
        withoutTooltip: 0,
        payloadWarnings: [],
        directWorkerWarnings: [],
        surfaceCounts: ["待手动刷新"],
        disabledWithoutReason: []
      };
    }

    function webviewDomCommandAuditCacheKeyFor() {
      const layout = normalizeUiLayout(currentUiLayout || {});
      const collapsed = Object.keys(layout.collapsed || {}).sort().map((key) => key + "=" + String(layout.collapsed[key])).join("|");
      return [layoutEdit ? "layout" : "view", layout.order.join("|"), collapsed, activeResourceSection, activeResourceAnchor].join("::");
    }

    function buttonSurfaceAudit(buttons) {
      const surfaces = [
        ["固定", (button) => Boolean(button.closest(".pinnedActions"))],
        ["右侧", (button) => Boolean(button.closest("#workbenchInspector"))],
        ["行级", (button) => button.classList.contains("taskActionButton")],
        ["发布", (button) => Boolean(button.closest(".publishActionDeck"))],
        ["主列", (button) => Boolean(button.closest("#mainColumn"))]
      ];
      const counts = surfaces.map(() => 0);
      asArray(buttons).forEach((button) => {
        surfaces.forEach((item, index) => {
          if (item[1](button)) counts[index] += 1;
        });
      });
      return surfaces.map((item, index) => item[0] + ":" + String(counts[index]));
    }

    function auditButtonPayloadWarnings(buttons) {
      const warnings = [];
      buttons.forEach((button) => {
        const command = String(button.dataset.command || "");
        const storedContextReason = scopedActionMissingContextReason(command, buttonDatasetActionPayload(button), {
          actionId: button.dataset.actionId || "",
          actionSection: button.dataset.actionSection || "",
          batch: button.dataset.batchSelected === "true",
          savedAction: Boolean(button.closest(".pinnedActions") || button.closest(".savedAction"))
        });
        if (storedContextReason) warnings.push(command + ": " + storedContextReason);
        if (command === "archivePlan" && !(button.dataset.planFile || button.dataset.file)) warnings.push(command + ": 缺少 planFile");
        if (["validatePlan", "dryRunPlan", "runPlan"].includes(command) && button.closest("#recentPlans") && !button.dataset.planFile) warnings.push(command + ": 缺少 planFile");
        if (!BUTTON_AUDIT_ROW_ACTION_COMMANDS.has(command) || !button.classList.contains("taskActionButton")) return;
        const hasOperationKey = Boolean(button.dataset.runKey || button.dataset.archiveKey || button.dataset.experimentId || button.dataset.actionKey);
        if (!hasOperationKey) warnings.push(command + ": 缺少可操作 key");
        if (["stopExperiment", "retryExperiment", "archiveArtifacts", "deleteArtifacts"].includes(command) && !button.dataset.workerId) {
          warnings.push(command + ": 缺少 Worker 标识");
        }
      });
      return uniqueText(warnings).slice(0, 12);
    }

    function genericButtonHelp(button) {
      if (button.id === "layoutEditToggle") return "管理布局";
      if (button.dataset.collapseSection) return "折叠/展开";
      const label = String(button.textContent || "").replace(/\s+/g, " ").trim();
      return label ? "执行：" + label : "";
    }

    const COMMAND_HELP_TEXT = Object.freeze({
        startAllConnections: "打开已配置的 Xshell 连接",
        prepareAgents: "部署 Agent、写入受管自启动命令、启动会话并检测全部",
        testAll: "检测全部",
        snapshot: "刷新快照",
        resetUiLayout: "恢复布局",
        bootstrapProject: "识别当前项目；缺少计划时生成 Plan 模板，输出门禁缺失时生成接入模板，已有配置不会重复写入",
        generatePlanGuide: "生成 Plan 模板",
        generateOutputAdapter: "生成输出接入模板",
        saveProjectAdapterRules: "保存 experiments/zlk_project.yaml",
        validatePlan: "校验计划",
        dryRunPlan: "预演计划",
        runPlan: "校验并提交运行",
        runAllPlans: "运行全部计划",
        archivePlan: "归档计划",
        publishGithub: "发布到 GitHub",
        syncGithub: "同步 GitHub",
        overwriteGithub: "GitHub 覆盖本机",
        uploadProjectToHub: "上传到 Hub",
        uploadProjectToWorkers: "上传到 Worker",
        distributeCodeToWorkers: "分发到 Worker",
        deployLatestAgent: "部署 Agent runtime",
        configureSftpIgnores: "配置 SFTP 忽略",
        resetRemotePathConfirmations: "恢复当前项目的上传路径确认提醒",
        saveTopologyMode: "保存项目拓扑模式",
        saveSchedulerConfig: "保存调度配置",
        saveHubConfig: "保存 Hub",
        saveWorkerConfig: "保存 Worker",
        addWorkerConfig: "新增 Worker",
        deleteWorkerConfig: "删除 Worker 配置",
        configureSessions: "选择 Xshell 会话",
        configureAgentSessions: "写入 Agent RemoteCommand",
        startTunnelEndpoint: "启动 Xshell 隧道",
        startAgentEndpoint: "启动 Xshell 隧道",
        startAgents: "启动全部隧道",
        writeAgentCommands: "写入 Agent RemoteCommand",
        test: "检测当前端点",
        pauseStream: "暂停实时流",
        resumeStream: "恢复实时流",
        pauseAll: "暂停网络",
        resumeNetwork: "恢复网络",
        stopExperiment: "停止任务",
        retryExperiment: "重试任务",
        reproducePlan: "复现实验",
        parseResults: "解析结果",
        refreshResults: "刷新结果",
        runQualityGate: "质量门禁",
        runStatistics: "统计汇总",
        exportPaperTable: "导出论文表格",
        checkClaimEvidence: "检查论文证据",
        checkOutputContract: "检查输出契约",
        parseCaseLevel: "解析样本级结果（Case）",
        runLeakageCheck: "泄漏检查",
        planCheckpointRetention: "检查点清理预案",
        inspectDataset: "检查数据集",
        exportPlottingContract: "导出绘图契约",
        plotResultsToPpt: "绘图到 PPT",
        refreshPptAutomation: "检测 PPT 插件",
        startPptAutomation: "启动 PowerPoint",
        openPptAutomationGuide: "查看 PPT 修复说明",
        choosePptPath: "选择 PPT",
        chooseNewPptPath: "新建 PPT 路径",
        savePptPlotConfig: "保存 PPT 配置",
        inferConfigFromRun: "反推配置",
        recoverPlanFromRun: "恢复 Plan",
        diagnoseResultAnomaly: "异常诊断",
        compareWithBestConfig: "对比最优配置",
        runSubgroupAnalysis: "子组分析",
        exportCaseAnalysis: "导出样本级分析",
        archiveArtifacts: "准备归档",
        excludeResults: "排除结果并保留预览",
        syncArtifacts: "检查同步清单",
        completeThreeWay: "校验三方一致",
        deleteArtifacts: "删除产物",
        clearLegacyTasks: "清除旧任务残留",
        reconcileDeletions: "校准删除状态",
        selfCheck: "自检",
        createDebugBundle: "生成调试包",
        downloadDebugBundle: "下载调试包",
        downloadRemoteResult: "下载并打开当前 Plan 的轻量远端结果副本",
        status: "状态详情",
        openAuditTail: "审计日志",
        quickSetup: "一键配置",
        openSetupGuide: "打开配置说明",
        openAdvancedCommandsSetting: "打开高级命令显示设置",
        resetPptPathConfirmations: "恢复当前项目的 PPT 路径确认提醒",
        configureWorkers: "配置 Worker",
        configurePorts: "配置端口",
        repairPorts: "检查端口冲突并选择新的 Worker 端口范围；不会自动改写 Xshell 会话",
        configure: "配置 Hub 隧道",
        startHub: "启动 Hub",
        startWorker: "启动 Worker",
        start: "启动 Hub",
        startAll: "启动全部",
        showRegistry: "端点清单",
        restart: "重启实时流",
        manualGpuSnapshot: "刷新 GPU",
        loadGpuHistory: "加载最近三天 GPU 历史曲线",
        manualSchedulerSnapshot: "刷新调度器",
        manualTracesSnapshot: "刷新 trace",
        script: "生成启动脚本",
        realCheck: "真实对接检测",
        offline: "导入离线包",
        openPlan: "打开文件",
        savePlan: "保存计划",
        selectPlan: "选择计划",
        selectExperiment: "选择任务",
        selectLogRunKey: "查看日志"
      });

    function commandHelp(command, context) {
      const base = COMMAND_HELP_TEXT[String(command || "")] || "";
      if (!base) return "";
      const endpoint = context && context.dataset && context.dataset.endpointId ? "端点：" + context.dataset.endpointId + "。" : "";
      return endpoint + base;
    }

    function saveUiLayout() {
      currentUiLayout.order = Array.from(document.querySelectorAll("#mainColumn > [data-section]")).map((card) => card.dataset.section);
      currentUiLayout.collapsed = Object.assign({}, currentUiLayout.collapsed, collapseStateFromDom());
      currentUiLayout.resourceTreeChildren = normalizeResourceTreeChildOrders(currentUiLayout.resourceTreeChildren || {});
      currentUiLayout.columns = normalizeLayoutColumns(currentUiLayout.columns || {});
      currentUiLayout.treePinned = Boolean(currentUiLayout.treePinned);
      currentUiLayout.inspectorPinned = Boolean(currentUiLayout.inspectorPinned);
      currentUiLayout.pinnedCommands = normalizePinnedCommands(currentUiLayout.pinnedCommands || pinnedCommandDefaults);
      currentUiLayout.detailActions = normalizeSavedButtonActions(currentUiLayout.detailActions, 40);
      currentUiLayout.pinnedActions = normalizeSavedButtonActions(currentUiLayout.pinnedActions, 16);
      vscode.postMessage({ command: "saveUiLayout", layout: currentUiLayout });
    }

    function collapseStateFromDom() {
      const out = {};
      document.querySelectorAll("#mainColumn > [data-section]").forEach((card) => {
        out[card.dataset.section] = card.classList.contains("is-collapsed");
      });
      return out;
    }

    function normalizeUiLayout(layout) {
      layout = layout || {};
      const defaults = ["overview", "gpu", "tasks", "plans", "results", "sync", "operations", "servers", "settings", "diagnostics"];
      const incoming = Array.isArray(layout.order) ? layout.order.map(String) : [];
      const order = incoming.filter((item) => defaults.includes(item)).concat(defaults.filter((item) => !incoming.includes(item)));
      const collapsed = Object.assign({ servers: true, settings: true, diagnostics: true }, layout.collapsed && typeof layout.collapsed === "object" ? layout.collapsed : {});
      const resourceTreeChildren = normalizeResourceTreeChildOrders(layout.resourceTreeChildren || {});
      const columns = normalizeLayoutColumns(layout.columns || {});
      const pinnedCommands = normalizePinnedCommands(Array.isArray(layout.pinnedCommands) ? layout.pinnedCommands : pinnedCommandDefaults);
      const detailActions = normalizeSavedButtonActions(layout.detailActions, 40);
      const pinnedActions = normalizeSavedButtonActions(layout.pinnedActions, 16);
      return { order, collapsed, resourceTreeChildren, manual: Boolean(layout.manual), columns, treePinned: Boolean(layout.treePinned), inspectorPinned: Boolean(layout.inspectorPinned), pinnedCommands, detailActions, pinnedActions };
    }

    function normalizeResourceTreeChildOrders(input) {
      const record = input && typeof input === "object" && !Array.isArray(input) ? input : {};
      const out = {};
      Object.keys(record).forEach((section) => {
        if (!RESOURCE_TREE_SECTION_KEYS.has(section) || !Array.isArray(record[section])) return;
        const unique = [];
        record[section].map((value) => String(value || "").trim()).filter(Boolean).forEach((anchor) => {
          if (!unique.includes(anchor)) unique.push(anchor);
        });
        if (unique.length) out[section] = unique.slice(0, 80);
      });
      return out;
    }

    function normalizeLayoutColumns(columns) {
      const tree = clampNumber(Number(columns.tree || 280), 220, 420);
      const inspector = clampNumber(Number(columns.inspector || 360), 280, 520);
      return { tree, inspector };
    }

    function clampNumber(value, min, max) {
      if (!Number.isFinite(value)) return min;
      return Math.max(min, Math.min(max, Math.round(value)));
    }

    function normalizePinnedCommands(commands) {
      const source = Array.isArray(commands) ? commands : null;
      const cached = source ? pinnedCommandsNormalizationCache.get(source) : undefined;
      if (cached) return cached;
      const unique = [];
      (source || []).forEach((command) => {
        const value = String(command || "");
        if (PINNED_COMMAND_VALUES.has(value) && !unique.includes(value)) unique.push(value);
      });
      const normalized = unique.slice(0, 8);
      if (source) pinnedCommandsNormalizationCache.set(source, normalized);
      return normalized;
    }

    function normalizeSavedButtonActions(actions, limit) {
      const source = Array.isArray(actions) ? actions : null;
      const normalizedLimit = limit || 24;
      const cacheKey = String(normalizedLimit) + ":" + normalizeActionSection(activeResourceSection || "overview");
      let variants = source ? savedButtonActionsNormalizationCache.get(source) : undefined;
      const cached = variants && variants.get(cacheKey);
      if (cached) {
        variants.delete(cacheKey);
        variants.set(cacheKey, cached);
        return cached;
      }
      const out = [];
      const seen = new Set();
      (source || []).forEach((item) => {
        const spec = normalizeSavedButtonAction(item);
        if (!spec || seen.has(spec.id)) return;
        seen.add(spec.id);
        out.push(spec);
      });
      const normalized = out.slice(0, normalizedLimit);
      if (source) {
        if (!variants) {
          variants = new Map();
          savedButtonActionsNormalizationCache.set(source, variants);
        }
        variants.set(cacheKey, normalized);
        while (variants.size > SAVED_BUTTON_ACTION_NORMALIZATION_VARIANT_LIMIT) {
          const oldestKey = variants.keys().next().value;
          if (oldestKey === undefined) break;
          variants.delete(oldestKey);
        }
      }
      return normalized;
    }

    function normalizeSavedButtonAction(item) {
      const source = item && typeof item === "object" ? item : {};
      const command = String(source.command || "");
      if (!command || !webviewHandledCommands.has(command)) return null;
      const section = normalizeActionSection(source.section || activeResourceSection || "overview");
      const payload = sanitizeActionPayload(source.payload || {});
      const label = compactText(String(source.label || featureCommandLabel(command) || command).replace(/\s+/g, " ").trim(), 40);
      const id = String(source.id || actionSpecId(command, section, payload, label)).slice(0, 240);
      return {
        id,
        command,
        label: label || command,
        section,
        payload,
        confirm: Boolean(source.confirm),
        danger: Boolean(source.danger),
        batch: Boolean(source.batch),
        configScope: String(source.configScope || payload.configScope || "").slice(0, 80)
      };
    }

    function normalizeActionSection(section) {
      const value = String(section || "overview");
      if (["overview", "servers", "settings", "gpu", "plans", "tasks", "results", "sync", "operations", "diagnostics"].includes(value)) return value;
      if (value.startsWith("server")) return "servers";
      return "overview";
    }

    function sanitizeActionPayload(payload) {
      const allowed = ["endpointId", "planFile", "planRevision", "planId", "file", "runKey", "taskUiKey", "experimentId", "archiveKey", "experimentIndex", "gpuId", "workerId", "remotePath", "confirmationPath", "artifactPath", "resultPath", "logPath", "savePlan", "batchSelected"];
      const out = {};
      allowed.forEach((key) => {
        const value = payload && payload[key];
        if (value === undefined || value === null || value === "") return;
        if (typeof value === "number" || typeof value === "boolean") out[key] = value;
        else out[key] = String(value).slice(0, 500);
      });
      return out;
    }

    function actionSpecId(command, section, payload, label) {
      const payloadKey = Object.keys(payload || {}).sort().map((key) => key + "=" + String(payload[key])).join("|");
      return [section || "overview", command, payloadKey, label || ""].join("|");
    }

    function savedActionSame(a, b) {
      if (!a || !b) return false;
      return a.id === b.id || actionSpecId(a.command, a.section, a.payload || {}, a.label) === actionSpecId(b.command, b.section, b.payload || {}, b.label);
    }

    function defaultPinnedSpec(command) {
      return normalizeSavedButtonAction({ command, label: featureCommandLabel(command), section: "overview", payload: {}, id: "legacy:" + command });
    }

    function detailActionsForSection(section) {
      const target = normalizeActionSection(section);
      return normalizeSavedButtonActions(currentUiLayout.detailActions, 40).filter((item) => normalizeActionSection(item.section) === target);
    }

    function isDetailActionSaved(spec) {
      return normalizeSavedButtonActions(currentUiLayout.detailActions, 40).some((item) => savedActionSame(item, spec));
    }

    function isPinnedActionSaved(spec) {
      if (!spec) return false;
      const payloadEmpty = !Object.keys(spec.payload || {}).length;
      if (payloadEmpty && normalizePinnedCommands(currentUiLayout.pinnedCommands || pinnedCommandDefaults).includes(spec.command)) return true;
      return normalizeSavedButtonActions(currentUiLayout.pinnedActions, 16).some((item) => savedActionSame(item, spec));
    }

    function toggleDetailAction(spec) {
      spec = normalizeSavedButtonAction(spec);
      if (!spec) return;
      const actions = normalizeSavedButtonActions(currentUiLayout.detailActions, 40);
      currentUiLayout.detailActions = actions.some((item) => savedActionSame(item, spec))
        ? actions.filter((item) => !savedActionSame(item, spec))
        : actions.concat(spec).slice(-40);
      saveUiLayout();
      forceWorkbenchInspectorRender();
      renderWorkbenchInspector(lastState || {}, { force: true });
    }

    function togglePinnedAction(spec) {
      spec = normalizeSavedButtonAction(spec);
      if (!spec) return;
      const payloadEmpty = !Object.keys(spec.payload || {}).length;
      const legacy = normalizePinnedCommands(currentUiLayout.pinnedCommands || pinnedCommandDefaults);
      if (payloadEmpty && legacy.includes(spec.command)) {
        currentUiLayout.pinnedCommands = legacy.filter((item) => item !== spec.command);
      } else {
        const actions = normalizeSavedButtonActions(currentUiLayout.pinnedActions, 16);
        currentUiLayout.pinnedActions = actions.some((item) => savedActionSame(item, spec))
          ? actions.filter((item) => !savedActionSame(item, spec))
          : actions.concat(spec).slice(-16);
      }
      saveUiLayout();
      forceWorkbenchInspectorRender();
      renderWorkbenchInspector(lastState || {}, { force: true });
    }

    function handleButtonActionMenu(action, spec) {
      if (!spec) return;
      if (action === "toggle-detail") toggleDetailAction(spec);
      if (action === "toggle-pin") togglePinnedAction(spec);
    }

    function applyLayoutColumns() {
      const deck = el("cardDeck");
      if (!deck) return;
      const columns = normalizeLayoutColumns(currentUiLayout.columns || {});
      deck.style.setProperty("--tree-col", columns.tree + "px");
      deck.style.setProperty("--inspector-col", columns.inspector + "px");
      applyDrawerPinState();
    }

    function toggleDrawerPinned(side) {
      if (side !== "tree" && side !== "inspector") return;
      const key = side === "tree" ? "treePinned" : "inspectorPinned";
      currentUiLayout[key] = !currentUiLayout[key];
      applyDrawerPinState();
      saveUiLayout();
    }

    function applyDrawerPinState() {
      const treePinned = Boolean(currentUiLayout.treePinned);
      const inspectorPinned = Boolean(currentUiLayout.inspectorPinned);
      document.body.classList.toggle("tree-pinned", treePinned);
      document.body.classList.toggle("inspector-pinned", inspectorPinned);
      document.querySelectorAll("[data-drawer-pin]").forEach((button) => {
        const pinned = button.dataset.drawerPin === "tree" ? treePinned : button.dataset.drawerPin === "inspector" ? inspectorPinned : false;
        const label = button.dataset.drawerPin === "tree" ? "左侧目录" : "右侧详情";
        button.classList.toggle("is-pinned", pinned);
        button.setAttribute("aria-pressed", String(pinned));
        setNativeTitle(button, (pinned ? "取消固定" : "固定") + label);
        button.setAttribute("aria-label", button.title);
      });
    }

    function setNativeTitle(node, value) {
      if (!node || !node.getAttribute || !node.setAttribute) return false;
      const next = String(value || "");
      const current = String(node.getAttribute("title") || "");
      if (current === next) return false;
      if (next) node.setAttribute("title", next);
      else node.removeAttribute("title");
      nativeTitleMutationVersion = (nativeTitleMutationVersion + 1) % 1000000;
      return true;
    }

    function setAllSectionsCollapsed(collapsed) {
      document.querySelectorAll("#mainColumn > [data-section]").forEach((card) => card.classList.toggle("is-collapsed", collapsed));
      currentUiLayout.collapsed = collapseStateFromDom();
      saveUiLayout();
      renderResourceTree(lastState || {});
    }

    function expandResourceSection(section) {
      const card = document.querySelector('#mainColumn [data-section="' + cssEscape(section) + '"]');
      if (!card || !card.classList.contains("is-collapsed")) return;
      currentUiLayout.collapsed = Object.assign({}, currentUiLayout.collapsed, { [section]: false });
      applyUiLayout({ uiLayout: currentUiLayout });
      renderSectionIfVisible(lastState || {}, section, { force: true });
      saveUiLayout();
    }

    function applyMainViewForSection(section) {
      const nextView = section === "settings" ? "settings" : "workspace";
      if (nextView === "settings" && currentMainView !== "settings" && activeResourceSection !== "settings") {
        lastWorkspaceResource = { section: activeResourceSection || "overview", anchor: activeResourceAnchor || activeResourceSection || "overview" };
      }
      currentMainView = nextView;
      document.body.classList.toggle("main-view-settings", currentMainView === "settings");
    }

    function switchMainView(view) {
      if (view === "settings") {
        applyMainViewForSection("settings");
        expandResourceSection("settings");
        activeResourceSection = "settings";
        activeResourceAnchor = "settings";
        renderSectionIfVisible(lastState || {}, "settings", { force: true });
      } else {
        currentMainView = "workspace";
        document.body.classList.remove("main-view-settings");
        activeResourceSection = lastWorkspaceResource.section || "overview";
        activeResourceAnchor = lastWorkspaceResource.anchor || activeResourceSection;
      }
      resourceTreeRenderKey = "";
      renderResourceTree(lastState || {});
      updateResourceTreeActiveSection(activeResourceSection, activeResourceAnchor);
      forceWorkbenchInspectorRender();
      renderWorkbenchInspector(lastState || {}, { force: true });
      requestAnimationFrame(() => scrollToResourceTarget(activeResourceSection, activeResourceAnchor));
    }

    function togglePinnedCommand(command) {
      if (!command) return;
      togglePinnedAction({ command, label: featureCommandLabel(command), section: activeResourceSection || "overview", payload: {} });
    }

    function showButtonActionContextMenu(spec, x, y) {
      const menu = el("pinContextMenu");
      if (!menu) return;
      activeButtonActionSpec = normalizeSavedButtonAction(spec);
      if (!activeButtonActionSpec) return;
      const detailSaved = isDetailActionSaved(activeButtonActionSpec);
      const pinned = isPinnedActionSaved(activeButtonActionSpec);
      menu.innerHTML =
        '<button type="button" data-pin-menu-action="toggle-detail" data-pin-command="' + escAttr(activeButtonActionSpec.command) + '" role="menuitem">' + esc(detailSaved ? "从当前工作详情移除" : "加入当前工作详情") + '</button>' +
        '<button type="button" data-pin-menu-action="toggle-pin" data-pin-command="' + escAttr(activeButtonActionSpec.command) + '" role="menuitem">' + esc(pinned ? "从右侧置顶移除" : "加入右侧置顶") + '</button>';
      setNativeTitle(menu, "右键操作：" + activeButtonActionSpec.label);
      menu.hidden = false;
      menu.classList.add("is-open");
      menu.dataset.open = "1";
      const width = 180;
      const height = 76;
      const left = Math.max(8, Math.min(x, window.innerWidth - width - 8));
      const top = Math.max(8, Math.min(y, window.innerHeight - height - 8));
      menu.style.left = left + "px";
      menu.style.top = top + "px";
    }

    function actionSpecFromButton(button) {
      if (!button) return null;
      const command = String(button.dataset.command || "");
      if (!command || !webviewHandledCommands.has(command)) return null;
      const sourceSection = button.dataset.actionSection || (button.closest("#mainColumn [data-section]") || {}).dataset?.section || activeResourceSection || "overview";
      const payload = buttonDatasetActionPayload(button);
      const label = cleanButtonLabel(button) || featureCommandLabel(command) || command;
      return normalizeSavedButtonAction({
        id: button.dataset.actionId || actionSpecId(command, normalizeActionSection(sourceSection), payload, label),
        command,
        label,
        section: sourceSection,
        payload,
        confirm: button.dataset.confirm === "true",
        danger: button.dataset.danger === "true",
        batch: button.dataset.batchSelected === "true",
        configScope: button.dataset.configScope || ""
      });
    }

    function cleanButtonLabel(button) {
      const clone = button.cloneNode(true);
      clone.querySelectorAll && clone.querySelectorAll(".loading-spinner").forEach((node) => node.remove());
      return String(clone.textContent || "").replace(/\s+/g, " ").trim();
    }

    function buttonDatasetActionPayload(button) {
      const payload = {};
      ["endpointId", "planFile", "planRevision", "planId", "file", "runKey", "taskUiKey", "experimentId", "archiveKey", "experimentIndex", "gpuId", "workerId", "remotePath", "confirmationPath", "artifactPath", "resultPath", "logPath", "savePlan"].forEach((key) => {
        if (button.dataset[key]) payload[key] = button.dataset[key];
      });
      if (button.dataset.batchSelected === "true") payload.batchSelected = "true";
      return payload;
    }

    function showStatusCardContextMenu(card, x, y) {
      const menu = el("pinContextMenu");
      if (!menu || !card) return;
      const key = statusCardKey(card);
      const collapsed = Boolean(collapsedStatusCards[key]);
      const label = statusCardLabel(card);
      menu.innerHTML =
        '<button type="button" data-card-menu-action="' + escAttr(collapsed ? "expand" : "collapse") + '" data-card-key="' + escAttr(key) + '" role="menuitem">' + esc(collapsed ? "展开此卡片" : "折叠此卡片") + '</button>' +
        '<button type="button" data-card-menu-action="expand" data-card-key="__all__" role="menuitem">展开全部状态卡片</button>';
      setNativeTitle(menu, "右键状态卡片：" + label);
      menu.hidden = false;
      menu.classList.add("is-open");
      menu.dataset.open = "1";
      const width = 190;
      const height = 76;
      menu.style.left = Math.max(8, Math.min(x, window.innerWidth - width - 8)) + "px";
      menu.style.top = Math.max(8, Math.min(y, window.innerHeight - height - 8)) + "px";
    }

    function setStatusCardCollapsed(key, collapsed) {
      if (!key) return;
      if (key === "__all__") collapsedStatusCards = {};
      else {
        const current = Boolean(collapsedStatusCards[key]);
        const next = collapsed === undefined ? !current : collapsed;
        if (next) collapsedStatusCards[key] = true;
        else delete collapsedStatusCards[key];
      }
      statusCardCollapseVersion = (statusCardCollapseVersion + 1) % 1000000;
      applyStatusCardCollapseState();
    }

    function applyStatusCardCollapseState() {
      const collapsedKey = Object.keys(collapsedStatusCards).sort().join("|");
      const scanKey = [postRenderDomVersion, statusCardCollapseVersion, collapsedKey].join("::");
      if (scanKey === lastStatusCollapseScanKey) return;
      lastStatusCollapseScanKey = scanKey;
      const cards = Array.from(document.querySelectorAll(statusCardSelector()));
      const nextKey = [
        cards.length,
        cards.filter((card) => !card.dataset.statusCardKey).length,
        collapsedKey
      ].join("::");
      if (nextKey === lastStatusCollapseKey) return;
      lastStatusCollapseKey = nextKey;
      cards.forEach((card) => {
        const key = statusCardKey(card);
        card.dataset.statusCardKey = key;
        card.classList.toggle("statusCardCollapsed", Boolean(collapsedStatusCards[key]));
      });
    }

    function statusCardSelector() {
      return "#mainColumn .overviewStatusCard, #mainColumn .planRunRow, #mainColumn .task-card, #mainColumn .traceCard, #mainColumn .operationItem, #mainColumn .endpointStatusCard, #mainColumn .serverObjectCard, #mainColumn .resultEvidenceRow, #mainColumn .objectTile, #mainColumn .taskProgressCard, #mainColumn .gpuServer, #mainColumn .targetMatrixRow, #mainColumn .featureAuditPill, #mainColumn .capabilityItem";
    }

    function statusCardKey(card) {
      return String(card.dataset.statusCardKey || card.dataset.anchor || card.id || (Array.from(card.classList || []).filter((name) => name !== "statusCardCollapsed").join(".") + ":" + statusCardLabel(card))).slice(0, 180);
    }

    function statusCardLabel(card) {
      const text = (card.querySelector("h3,h4,b,.objectTileHead,.gpuServerTitle") || card).textContent || "状态卡片";
      return text.replace(/\s+/g, " ").trim().slice(0, 80) || "状态卡片";
    }

    function hidePinContextMenu() {
      const menu = el("pinContextMenu");
      if (!menu) return;
      if (menu.dataset.open !== "1" && menu.hidden) return;
      menu.classList.remove("is-open");
      menu.hidden = true;
      delete menu.dataset.open;
      menu.innerHTML = "";
    }

    function beginLayoutResize(kind, event) {
      activeLayoutResize = { kind, startX: event.clientX, start: normalizeLayoutColumns(currentUiLayout.columns || {}) };
      document.body.classList.add("resizing-layout");
      event.preventDefault();
    }

    function updateLayoutResize(event) {
      if (!activeLayoutResize) return;
      const delta = event.clientX - activeLayoutResize.startX;
      const columns = normalizeLayoutColumns(activeLayoutResize.start);
      if (activeLayoutResize.kind === "tree") columns.tree = clampNumber(activeLayoutResize.start.tree + delta, 220, 420);
      if (activeLayoutResize.kind === "inspector") columns.inspector = clampNumber(activeLayoutResize.start.inspector - delta, 280, 520);
      currentUiLayout.columns = columns;
      applyLayoutColumns();
    }

    function finishLayoutResize() {
      if (!activeLayoutResize) return;
      activeLayoutResize = null;
      document.body.classList.remove("resizing-layout");
      saveUiLayout();
    }

    function updateLayoutToggle() {
      const button = el("layoutEditToggle");
      if (button) button.textContent = layoutEdit ? "完成布局" : "管理布局";
    }

    function renderResourceTree(_state) {
      const order = [...new Set(normalizeUiLayout(currentUiLayout).order.concat(["sync"]))];
      const nextRenderKey = resourceTreeNextRenderKey(order);
      if (!resourceTreeNeedsRerender(nextRenderKey)) {
        updateResourceTreeActiveSection(activeResourceSection, activeResourceAnchor);
        return;
      }
      const groupsBySection = resourceTreeStaticModelCached();
      const groups = order.map((section) => {
        const entry = groupsBySection[section];
        return entry ? { label: entry.label, tone: normalizeTreeTone(entry.node.tone), items: [entry.node] } : null;
      }).filter(Boolean);
      resourceTreeMeta = {};
      registerResourceTreeNodes(groups.flatMap((group) => group.items));
      updateResourceTreeHead("");
      const query = resourceTreeFilter;
      const filtered = groups.map((group) => {
        if (!query) return group;
        const items = group.items.filter((node) => resourceTreeSearchText(node).includes(query));
        return Object.assign({}, group, { items });
      }).filter((group) => group.items.length);
      const body = el("resourceTreeBody");
      if (!body) return;
      setHtmlIfChanged(body, filtered.length ? filtered.map((group) =>
        '<div class="tree-group ' + escAttr(group.tone || "") + '"><div class="tree-group-label" title="' + escAttr(resourceTreeGroupToneHelp(group.tone)) + '">' + esc(group.label) + '</div>' + group.items.map(renderResourceTreeNode).join("") + '</div>'
      ).join("") : '<div class="tree-empty">没有匹配条目。可以搜索“GPU / 任务 / GitHub / SFTP / Agent / 删除 / 归档”。</div>');
      const search = el("resourceTreeSearch");
      if (search && search.value !== resourceTreeFilter) search.value = resourceTreeFilter;
      updateResourceTreeActiveSection(activeResourceSection, activeResourceAnchor);
      renderResourceTreeInspector(activeResourceSection, activeResourceAnchor);
    }

    function resourceTreeStaticModelCached() {
      if (!resourceTreeStaticModelCache) resourceTreeStaticModelCache = resourceTreeStaticModel();
      return resourceTreeStaticModelCache;
    }

    function resourceTreeStaticModel() {
      const item = (section, label, title, icon, detail, searchText, anchor) => {
        return treeItem(section, label, title, icon, "", "", searchText, anchor, detail);
      };
      return {
        overview: { label: "总览", node: withResourceTreeChildren(item("overview", "总览", "总览", "⌘", "状态/摘要", "集群 概览 状态 实时 摘要"), overviewTreeObjects()) },
        servers: { label: "基础设施", node: withResourceTreeChildren(item("servers", "服务器管理", "服务器管理", "▦", "Hub/Worker/端口", "Hub Worker Xshell 端口 调度"), serverTreeObjects()) },
        settings: { label: "基础设施", node: withResourceTreeChildren(item("settings", "设置", "服务器与调度设置", "⚙", "服务器、隧道与调度参数", "设置 服务器 Hub Worker Xshell 端口 调度 参数"), settingsTreeObjects()) },
        gpu: { label: "资源", node: withResourceTreeChildren(item("gpu", "GPU 状态", "GPU 总览", "◫", "GPU 总览", "GPU 显卡 显存 温度 利用率 我的任务 进程"), gpuTreeObjects()) },
        plans: { label: "实验", node: withResourceTreeChildren(item("plans", "实验计划", "实验计划", "◇", "计划/校验/运行", "计划 参数 校验 预演 运行"), planTreeObjects()) },
        tasks: { label: "实验", node: withResourceTreeChildren(item("tasks", "任务运行状态", "任务状态", "▣", "任务/日志/操作", "任务 日志 停止 重试 删除 归档 排队 运行"), taskTreeObjects()) },
        results: { label: "实验", node: withResourceTreeChildren(item("results", "结果分析", "结果分析", "▤", "结果/统计/论文", "结果 统计 质量门禁 论文 表格 CSV JSON"), resultTreeObjects()) },
        sync: { label: "发布", node: withResourceTreeChildren(item("sync", "发布与同步", "发布同步", "⇅", "GitHub/SFTP/Agent", "Git GitHub SFTP 上传 分发 Agent 部署 发布 同步"), syncTreeObjects()) },
        operations: { label: "运维", node: withResourceTreeChildren(item("operations", "操作进度", "操作进度", "◷", "操作终态", "操作 进度 已提交 执行中 失败 卡住 已完成 accepted running failed stalled completed"), operationTreeObjects()) },
        diagnostics: { label: "运维", node: withResourceTreeChildren(item("diagnostics", "诊断", "诊断", "⌁", "能力/端口/审计", "诊断 自检 调试 审计 能力 端口"), diagnosticTreeObjects()) }
      };
    }

    function resourceTreeNextRenderKey(order) {
      const normalizedOrder = (order || []).join("|");
      const collapsed = Object.entries((currentUiLayout && currentUiLayout.collapsed) || {}).sort(([a], [b]) => naturalCompare(a, b)).map(([key, value]) => key + ":" + (value ? "1" : "0")).join("|");
      return [normalizedOrder, collapsed, resourceTreeChildOrderSignature(), resourceTreeFilter].join("::");
    }

    function resourceTreeChildOrderSignature(layout) {
      const source = layout || currentUiLayout || {};
      const orders = normalizeResourceTreeChildOrders(source.resourceTreeChildren || {});
      return Object.keys(orders).sort((a, b) => naturalCompare(a, b)).map((section) => section + "=" + orders[section].join("|")).join(";");
    }

    function resourceTreeNeedsRerender(nextKey) {
      if (nextKey === resourceTreeRenderKey) return false;
      resourceTreeRenderKey = nextKey;
      return true;
    }

    function resourceTreeNode(input) {
      const node = input || {};
      const section = String(node.section || node.id || "");
      const anchor = String(node.anchor || section);
      const label = String(node.label || section || "对象");
      const tooltip = String(node.tooltip || node.title || node.detail || label);
      const status = node.status == null ? "" : String(node.status);
      const count = node.count == null ? "" : String(node.count);
      const children = normalizeResourceTreeChildren(node.children);
      const kind = String(node.kind || "object");
      return {
        id: String(node.id || anchor || section),
        label,
        kind,
        icon: String(node.icon || (kind === "object" ? defaultTreeObjectIcon(section) : "")),
        tone: normalizeTreeTone(node.tone),
        status,
        count,
        section,
        anchor,
        tooltip,
        title: tooltip,
        detail: String(node.detail || tooltip),
        searchText: [section, anchor, label, status, count, tooltip, node.searchText || "", children.map(resourceTreeSearchText).join(" ")].join(" ").toLowerCase(),
        children
      };
    }

    function normalizeResourceTreeChildren(children) {
      return asArray(children || []).filter(Boolean).map((child) => resourceTreeNode(child));
    }

    function withResourceTreeChildren(node, children) {
      return resourceTreeNode(Object.assign({}, node, { children: normalizeResourceTreeChildren(children) }));
    }

    function treeItem(section, label, title, icon, count, tone, searchText, anchor, detail) {
      return resourceTreeNode({ id: anchor || section, label, kind: "section", icon, tone, count, status: count || "", section, anchor: anchor || section, tooltip: title, detail: detail || title, searchText });
    }

    function treeChildList(children) {
      const rows = normalizeResourceTreeChildren(children);
      const ordered = orderedResourceTreeChildren(rows, rows[0] ? rows[0].section : "");
      return ordered.length ? '<div class="tree-child-list">' + ordered.map(renderResourceTreeNode).join("") + '</div>' : "";
    }

    function treeObjectItem(section, label, status, tone, title, anchor, icon, searchExtra) {
      return resourceTreeNode({ id: anchor || section, label, kind: "object", icon, tone, status: "", count: "", section, anchor: anchor || section, tooltip: title || label, detail: title || "", searchText: [status || "", searchExtra || ""].join(" ") });
    }

    function orderedResourceTreeChildren(children, section) {
      const rows = normalizeResourceTreeChildren(children);
      const saved = resourceTreeCustomChildOrder(section);
      if (!saved.length) return rows;
      const byAnchor = new Map(rows.map((row) => [row.anchor, row]));
      return saved.map((anchor) => byAnchor.get(anchor)).filter(Boolean)
        .concat(rows.filter((row) => !saved.includes(row.anchor)));
    }

    function resourceTreeCustomChildOrder(section) {
      return normalizeResourceTreeChildOrders((currentUiLayout && currentUiLayout.resourceTreeChildren) || {})[section] || [];
    }

    function resourceTreeSectionHasCustomChildOrder(section) {
      return resourceTreeCustomChildOrder(section).length > 0;
    }

    function resourceTreeChildrenForSection(section) {
      const model = resourceTreeStaticModelCached();
      const entry = model[String(section || "")];
      return orderedResourceTreeChildren(entry && entry.node ? entry.node.children : [], section).map((node) => node.anchor);
    }

    function defaultTreeObjectIcon(section) {
      const map = { overview: "◌", servers: "▧", gpu: "◫", plans: "◇", tasks: "▣", results: "▤", sync: "⇅", operations: "◷", diagnostics: "⌁" };
      return map[section] || "•";
    }

    function renderResourceTreeNode(node) {
      const normalized = resourceTreeNode(node);
      const isSection = normalized.kind === "section";
      const current = normalized.section === activeResourceSection && normalized.anchor === activeResourceAnchor ? " is-current" : "";
      if (isSection) {
        const hot = normalized.tone ? " is-hot " + normalized.tone : "";
        return '<button type="button" class="tree-item' + hot + current + '" draggable="true" data-tree-order-section="' + escAttr(normalized.section) + '" data-section-target="' + escAttr(normalized.section) + '" data-anchor-target="' + escAttr(normalized.anchor) + '" data-search-text="' + escAttr(resourceTreeSearchText(normalized)) + '" title="' + escAttr(normalized.tooltip) + '" aria-current="' + (current ? "true" : "false") + '">' +
          '<span class="tree-icon" aria-hidden="true">' + esc(normalized.icon) + '</span><span class="tree-label">' + esc(normalized.label) + '</span>' +
        '</button>' + treeChildList(normalized.children);
      }
      return '<button type="button" class="tree-object ' + escAttr(normalized.tone) + current + '" draggable="true" data-tree-child-section="' + escAttr(normalized.section) + '" data-tree-child-anchor="' + escAttr(normalized.anchor) + '" data-section-target="' + escAttr(normalized.section) + '" data-anchor-target="' + escAttr(normalized.anchor) + '" data-search-text="' + escAttr(resourceTreeSearchText(normalized)) + '" title="' + escAttr(normalized.tooltip) + '">' +
        '<span class="tree-object-icon" aria-hidden="true">' + esc(normalized.icon) + '</span><span class="tree-object-label">' + esc(normalized.label) + '</span>' +
      '</button>';
    }

    function registerResourceTreeNodes(nodes) {
      normalizeResourceTreeChildren(nodes).forEach((node) => {
        const meta = { id: node.id, kind: node.kind, section: node.section, anchor: node.anchor, label: node.label, title: node.tooltip, icon: node.icon, count: node.count || node.status || "", status: node.status || "", tone: node.tone, detail: node.detail || node.tooltip, searchText: resourceTreeSearchText(node) };
        resourceTreeMeta[resourceTreeMetaKey(node.section, node.anchor)] = meta;
        if (!resourceTreeMeta[node.anchor]) resourceTreeMeta[node.anchor] = meta;
        if (!resourceTreeMeta[node.section]) resourceTreeMeta[node.section] = meta;
        registerResourceTreeNodes(node.children);
      });
    }

    function resourceTreeMetaKey(section, anchor) {
      return String(section || "") + "::" + String(anchor || section || "");
    }

    function normalizeTreeTone(tone) {
      const value = String(tone || "").toLowerCase();
      return ["good", "info", "warn", "error", "mine"].includes(value) ? value : "";
    }

    function resourceTreeDominantTone(tones) {
      const rank = { error: 5, warn: 4, mine: 3, good: 2, info: 1 };
      return (tones || []).map(normalizeTreeTone).filter(Boolean).sort((a, b) => (rank[b] || 0) - (rank[a] || 0))[0] || "";
    }

    function updateResourceTreeHead(tone) {
      const head = el("resourceTreeHead");
      if (!head) return;
      const normalizedTone = normalizeTreeTone(tone);
      head.className = "tree-head" + (normalizedTone ? " " + normalizedTone : "");
      setNativeTitle(head, resourceTreeGroupToneHelp(normalizedTone));
    }

    function resourceTreeGroupToneHelp(tone) {
      const map = {
        good: "绿色：当前区域状态正常或数据新鲜。",
        info: "蓝色：当前区域有运行中或信息类状态。",
        warn: "黄色：当前区域需要检查、等待配置或存在非终态问题。",
        error: "红色：当前区域存在失败、冲突或不可用问题。",
        mine: "紫色：当前区域包含我的任务或重点关注对象。"
      };
      return map[normalizeTreeTone(tone)] || "浅灰色：当前区域无需要分级的状态。";
    }

    function resourceTreeSearchText(html) {
      if (html && typeof html === "object") {
        const node = html;
        const cached = resourceTreeSearchTextCache.get(node);
        if (typeof cached === "string") return cached;
        const value = [node.id, node.label, node.kind, node.icon, node.tone, node.status, node.count, node.section, node.anchor, node.tooltip, node.searchText, asArray(node.children || []).map(resourceTreeSearchText).join(" ")].join(" ").toLowerCase();
        resourceTreeSearchTextCache.set(node, value);
        return value;
      }
      const values = [];
      String(html || "").replace(/data-search-text="([^"]*)"/g, (_match, value) => {
        values.push(String(value || ""));
        return "";
      });
      return values.join(" ").toLowerCase();
    }

    function treeAnchorId(prefix, value) {
      const body = String(value || "")
        .toLowerCase()
        .replace(/[^a-z0-9\u4e00-\u9fa5_-]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 64);
      return prefix + (body ? "-" + body : "");
    }

    function overviewTreeObjects() {
      return [
        treeObjectItem("overview", "运维状态", "入口", "", "运维状态", "overview-status", "", "状态 总览 Hub Worker GPU 任务"),
        treeObjectItem("overview", "集群运行态", "入口", "", "集群运行态", "overview-flow", "", "工作流 阶段 接入 同步 运行 解析 集群运行态"),
        treeObjectItem("overview", "发布同步摘要", "入口", "", "发布同步", "sync-publish", "", "发布 GitHub SFTP Hub Worker Agent"),
        treeObjectItem("overview", "阻塞项", "入口", "", "阻塞项", "overview-blockers", "", "阻塞 failed stalled 操作进度")
      ];
    }

    function overviewHealthText(state) {
      const health = String((state.health || {}).state || "").toLowerCase();
      if (["agent_ok", "ok", "online"].includes(health)) return "正常";
      if (health) return labelStatus(health);
      return "待检测";
    }

    function workflowStageText(state) {
      const project = state.detectedProject || {};
      if (asArray(project.resultFiles || []).length) return "结果";
      if (schedulerRowsForState(state).length) return "运行";
      if (asArray(project.plans || []).length) return "计划";
      return "接入";
    }

    function serverTreeObjects() {
      return [
        treeObjectItem("servers", "Xshell 会话", "配置", "", "检查 Hub/Worker 隧道会话；Agent 由隧道会话登录后命令启动。", "servers-sessions", "", "Xshell .xsh 隧道 Agent 自动启动"),
        treeObjectItem("servers", "服务器状态", "入口", "", "查看 Hub、Worker、端口和通信拓扑。", "servers-list", "", "Hub Worker 端口 通信拓扑")
      ];
    }

    function settingsTreeObjects() {
      return [
        treeObjectItem("settings", "界面布局", "设置", "", "管理卡片顺序、折叠状态和默认布局。", "settings-layout", "", "布局 排序 折叠 展开 恢复默认"),
        treeObjectItem("settings", "调度与上报", "设置", "", "配置 scheduler poll、jitter、TTL、可用性上报和 Worker 控制节流。", "servers-scheduler", "", "pollSeconds jitterSeconds workerStatusTtlSeconds workerActionMinIntervalMs workerActionMaxConcurrent"),
        treeObjectItem("settings", "Hub 设置", "设置", "", "配置 Hub 控制面、隧道、Agent 和项目父目录。", "servers-hub", "", "Hub 隧道 Agent 端口 项目父目录"),
        treeObjectItem("settings", "Worker 设置", "设置", "", "配置 Worker、GPU 上限、会话和端口。", "settings-servers", "", "Worker GPU 上限 allowedGpuIds localForwardPort")
      ];
    }

    function gpuTreeObjects() {
      return [
        treeObjectItem("gpu", "GPU 总览", "入口", "", "GPU 总览", "gpu-summary", "", "空闲 占用 我在用 高显存 高负载 GPU 显存 利用率 温度 服务器 进程 currentUser")
      ];
    }

    function planTreeObjects() {
      return [
        treeObjectItem("plans", "项目识别", "入口", "", "查看当前项目、配置、输出捕获和指标接入状态。", "plans-detected", "", "分类 指标 CSV JSON 控制台 输出接入"),
        treeObjectItem("plans", "计划操作", "入口", "", "定位到计划文件输入和运行按钮。", "plans-actions", "", "validate dry-run runPlan"),
        treeObjectItem("plans", "参数预览", "入口", "", "查看实验计划参数展开、配置预览和运行前检查。", "plans-list", "", "参数 预览 config plan")
      ];
    }

    function taskTreeObjects() {
      return [
        treeObjectItem("tasks", "任务摘要", "入口", "", "任务运行状态汇总。", "tasks-summary", "", "任务 运行 排队 失败"),
        treeObjectItem("tasks", "操作进度", "入口", "", "查看任务对应的操作状态和 loading 终态。", "tasks-progress", "", "按钮 loading 终态"),
        treeObjectItem("tasks", "任务列表", "入口", "", "查看运行中、排队、失败、停止、取消和已完成任务。", "tasks-list", "", "running testing queued pending failed stalled stopped cancelled completed"),
        treeObjectItem("tasks", "任务日志", "入口", "", "展开任务行查看最新日志摘要，完整日志按任务详情入口查看。", "tasks-logs", "", "日志 tail openLog")
      ];
    }

    function resultTreeObjects() {
      return [
        treeObjectItem("results", "结果摘要", "入口", "", "CSV、JSON、summary 或日志中发现的结果文件。", "results-summary", "", "结果 解析 统计 质量门禁"),
        treeObjectItem("results", "输出契约", "入口", "", "metrics_summary.csv 或输出接入模板线索。", "results-contract", "", "输出接入 adapter metrics_summary.csv"),
        treeObjectItem("results", "数据集画像", "入口", "", "检查 CSV 的类别分布、数据划分、patient_id/case_id 泄漏和文件存在性。", "results-dataset", "", "dataset split patient_id case_id leakage profile"),
        treeObjectItem("results", "检查点清理预案", "入口", "", "生成检查点清理预演和保留报告。", "results-checkpoints", "", "checkpoint manifest delete_plan retention_report dry-run"),
        treeObjectItem("results", "配置反推", "入口", "", "从 run 目录、日志、manifest 和 snapshot 反推出可复现实验配置与 recovered plan。", "results-recovery", "", "recovered plan config snapshot env_snapshot command"),
        treeObjectItem("results", "异常定位", "入口", "", "把异常结果与同组最优 run/config 对比，输出排序原因和配置差异。", "results-anomaly", "", "anomaly best config diff OOM NaN Traceback"),
        treeObjectItem("results", "实验记录", "入口", "", "查看实验记录、归档终态和删除状态。", "results-traces", "", "trace archive delete manifest"),
        treeObjectItem("results", "PPT 绘图契约", "入口", "", "查看结果索引、统计结果、论文表格、样本级结果和数据集画像稳定字段。", "results-plotting", "", "PPT plotting contract my_ppt_app statistics paper table case level")
      ];
    }

    function syncTreeObjects() {
      return [
        treeObjectItem("sync", "一键发布当前项目", "入口", "", "发布当前工作区到 GitHub；无 remote 时通过 GitHub CLI 创建仓库。", "sync-publish-github", "", "publishGithub GitHub remote 创建 仓库"),
        treeObjectItem("sync", "同步到 GitHub", "入口", "", "提交并推送当前工作区改动到已配置 GitHub remote。", "sync-github-push", "", "syncGithub git add commit push"),
        treeObjectItem("sync", "从 GitHub 覆盖本机", "入口", "", "执行前需要确认；用于从 GitHub 覆盖本机工作区。", "sync-github-overwrite", "", "overwriteGithub reset clean 覆盖"),
        treeObjectItem("sync", "首次上传到 Hub", "入口", "", "通过 SimpleSFTP 上传轻量项目代码到 Hub 项目父目录下自动追加项目名的目录。", "sync-upload-hub", "", "uploadProjectToHub SFTP Hub fingerprint"),
        treeObjectItem("sync", "首次上传到 Worker", "入口", "", "通过 SimpleSFTP 上传轻量项目代码到一个或多个 Worker。", "sync-upload-workers", "", "uploadProjectToWorkers SFTP Worker"),
        treeObjectItem("sync", "分发代码到所有 Worker", "入口", "", "把当前项目轻量代码包同步到所有启用 Worker。", "sync-distribute-workers", "", "distributeCodeToWorkers 所有 Worker"),
        treeObjectItem("sync", "部署最新版 Agent", "runtime", "", "上传 VSIX 内置 cluster_agent.py 和 cluster_scheduler.py 到 Hub/Worker 的 zlk_agent runtime。", "sync-deploy-agent", "", "deployLatestAgent runtime agent_version_mismatch"),
        treeObjectItem("sync", "配置 SFTP 忽略", "入口", "", "配置代码同步忽略规则，避免上传权重、数据集、checkpoint 和大产物。", "sync-sftp-ignore", "", "configureSftpIgnores ignore checkpoint weights datasets")
      ];
    }

    function diagnosticTreeObjects() {
      return [
        treeObjectItem("diagnostics", "目标验收矩阵", "目标模式", "", "目标验收", "diagnostics-targets", "", "目标 计划 验收 矩阵"),
        treeObjectItem("diagnostics", "功能可用性审计", "入口", "", "按钮审计", "diagnostics-audit", "", "按钮 handler payload fake frontend"),
        treeObjectItem("diagnostics", "最近错误", "入口", "", "最近错误", "diagnostics-errors", "", "错误 actionErrors 失败 建议"),
        treeObjectItem("diagnostics", "Hub 控制面", "入口", "", "查看 Hub Agent action runtime、调度入口和归档权威状态。", "diagnostics-hub-control", "", "Hub Agent action runtime"),
        treeObjectItem("diagnostics", "Worker 实时观测", "入口", "", "查看 Worker Agent WebSocket/SSE 推送能力和 fallback 状态。", "diagnostics-worker-telemetry", "", "Worker SSE WebSocket telemetry push"),
        treeObjectItem("diagnostics", "端口分配", "入口", "", "查看 Hub/Worker 本地 127.0.0.1 端口分配。", "diagnostics-ports", "", "端口 localForwardPort 127.0.0.1"),
        treeObjectItem("diagnostics", "端口冲突", "入口", "", "查看已启用端点是否重复使用同一个本机端口。", "diagnostics-conflicts", "", "端口冲突 localForwardPort"),
        treeObjectItem("diagnostics", "能力状态", "入口", "", "能力状态", "diagnostics-capabilities", "", "capabilities actionApiVersion realActionRuntime"),
        treeObjectItem("diagnostics", "诊断 JSON", "详情", "", "查看脱敏后的当前状态 JSON，用于排查配置和运行问题。", "diagnostics-json", "", "JSON 诊断 脱敏")
      ];
    }

    function operationTreeObjects() {
      return [
        treeObjectItem("operations", "操作列表", "入口", "", "查看已提交、执行中、已完成和异常操作。", "operations-list", "", "已提交 执行中 已完成 异常 accepted running completed failed stalled"),
        treeObjectItem("operations", "异常操作", "入口", "", "失败或卡住的操作需要查看错误和残留。", "operations-failed", "", "失败 卡住 failed stalled"),
        treeObjectItem("operations", "按钮终态", "入口", "", "确认耗时按钮在完成、失败、取消或超时后恢复可点击。", "operations-terminal", "", "按钮 加载 终态 loading terminal uiCommandStatus completed failed cancelled stalled")
      ];
    }

    function updateResourceTreeActiveSection(section, anchor) {
      activeResourceSection = section || activeResourceSection || "overview";
      activeResourceAnchor = anchor || activeResourceSection;
      if (activeResourceNode && !activeResourceNode.isConnected) activeResourceNode = null;
      const nextNode = document.querySelector(resourceTreeActiveSelector(activeResourceSection, activeResourceAnchor));
      if (activeResourceNode && activeResourceNode !== nextNode) setResourceTreeNodeCurrent(activeResourceNode, false);
      if (nextNode) setResourceTreeNodeCurrent(nextNode, true);
      activeResourceNode = nextNode || null;
    }

    function resourceTreeActiveSelector(section, anchor) {
      return '#resourceTree [data-section-target="' + cssEscape(section || "overview") + '"][data-anchor-target="' + cssEscape(anchor || section || "overview") + '"]';
    }

    function setResourceTreeNodeCurrent(node, current) {
      node.classList.toggle("is-current", Boolean(current));
      node.setAttribute("aria-current", current ? "true" : "false");
    }

    function renderResourceTreeInspector() {
      const target = el("resourceTreeInspector");
      if (!target) return;
      if (target.dataset.staticRendered === "true") return;
      target.dataset.staticRendered = "true";
      target.innerHTML =
        '<div class="tree-inspector-title"><span>静态导航</span></div>' +
        '<div class="tree-inspector-line">定位</div>';
      markPostRenderDomChanged();
    }

    function resourceTreeFact(label, value, title) {
      return '<div class="tree-inspector-fact" title="' + escAttr(title || value || "") + '"><span>' + esc(label) + '</span><b>' + esc(value || "-") + '</b></div>';
    }

    function resourceTreeNextStep(section, tone, meta) {
      if (tone === "warn") return "处理提示";
      if (meta && meta.anchor && meta.anchor !== section) return "已定位：" + (meta.label || "对象");
      return RESOURCE_TREE_NEXT_STEPS[section] || "查看详情";
    }

    function renderWorkbenchInspector(state, options) {
      options = options || { statusRefresh: true };
      const target = el("workbenchInspector");
      if (!target) return;
      const section = activeResourceSection || "overview";
      const meta = resourceTreeMeta[resourceTreeMetaKey(section, activeResourceAnchor)] || resourceTreeMeta[activeResourceAnchor] || resourceTreeMeta[section] || resourceTreeMeta.overview || { label: "概览", title: "运维总览", count: "", tone: "", detail: "选择左侧资源后查看当前对象详情。" };
      const renderKey = section + "::" + (meta.anchor || activeResourceAnchor || section);
      const sameInspectorTarget = target.dataset.inspectorRenderKey === renderKey;
      const now = Date.now();
      const force = Boolean(options.force || now < workbenchInspectorForceRenderUntil);
      if (!force && sameInspectorTarget && options.statusRefresh && workbenchInspectorShouldFreeze(target, sameInspectorTarget, now)) return;
      const liveSignature = workbenchInspectorLiveSignature(state || {}, section, meta);
      const statusRefresh = Boolean(options.statusRefresh && sameInspectorTarget && liveSignature !== workbenchInspectorLastLiveSignature);
      if (!force && options.statusRefresh && sameInspectorTarget && !statusRefresh) return;
      if (!force && !statusRefresh && workbenchInspectorShouldFreeze(target, sameInspectorTarget, now)) return;
      const previousBodyTop = sameInspectorTarget ? Number(target.querySelector(".inspectorBody")?.scrollTop || 0) : 0;
      const previousPinnedTop = Number(target.querySelector(".pinnedActions")?.scrollTop || 0);
      const tone = meta.tone || inspectorToneForSection(state || {}, section);
      const status = tone === "good" ? "正常" : tone === "warn" ? "需检查" : tone === "error" ? "异常" : tone === "mine" ? "我的任务" : "待查看";
      const facts = workbenchInspectorFacts(state || {}, section, meta);
      const actions = workbenchInspectorActions(section, meta);
      const customActions = detailActionsForSection(section);
      const visibleActions = budgetInspectorActions(actions, section, meta);
      const visibleCustomActions = customActions.slice(0, INSPECTOR_CUSTOM_ACTION_RENDER_LIMIT);
      const actionRows = visibleActions.map((item) => inspectorActionButton(item[0], item[1], Object.assign({ actionSection: section }, item[2] || {}))).join("") +
        visibleCustomActions.map((item) => inspectorSavedActionButton(item)).join("") +
        inspectorBudgetNotice("当前操作", actions.length + customActions.length, visibleActions.length + visibleCustomActions.length, "个");
      const events = workbenchInspectorEvents(state || {}, meta, section);
      const nextStep = resourceTreeNextStep(section, tone, meta);
      ensureWorkbenchInspectorShell(target);
      renderPinnedActions();
      const nextHtml =
        '<div class="inspectorHeader" title="' + escAttr(meta.detail || meta.title || "") + '">' +
          '<div class="inspectorEyebrow">工作详情</div>' +
          '<div class="inspectorTitle"><b>' + esc(meta.label || "概览") + '</b><span class="inspectorStatus ' + escAttr(tone || "") + '">' + esc(status) + '</span></div>' +
          '<div class="inspectorSummary">' + esc(meta.title || "选择左侧资源树对象后，这里会显示当前区域的状态、下一步和常用操作。") + '</div>' +
        '</div>' +
        '<div class="inspectorGrid">' + facts.map((item) => inspectorFact(item[0], item[1], item[2])).join("") + '</div>' +
        '<div class="inspectorHint" title="' + escAttr(nextStep) + '">' + esc(nextStep) + '</div>' +
        '<div class="inspectorActions" title="常用操作"><div class="inspectorEyebrow">当前操作</div><div class="workflowActions">' + actionRows + '</div></div>' +
        renderInspectorActionReadiness(section, visibleActions) +
        renderInspectorTimeline(events);
      if (sameInspectorTarget && nextHtml === workbenchInspectorLastHtml) {
        workbenchInspectorLastRenderAt = now;
        workbenchInspectorLastLiveSignature = liveSignature;
        return;
      }
      const body = target.querySelector(".inspectorBody");
      setHtmlIfChanged(body, nextHtml);
      workbenchInspectorLastHtml = nextHtml;
      workbenchInspectorLastRenderAt = now;
      workbenchInspectorLastLiveSignature = liveSignature;
      target.dataset.inspectorRenderKey = renderKey;
      const pinned = target.querySelector(".pinnedActions");
      if (body) body.scrollTop = previousBodyTop;
      if (pinned) pinned.scrollTop = previousPinnedTop;
      requestAnimationFrame(() => {
        const currentBody = target.querySelector(".inspectorBody");
        const currentPinned = target.querySelector(".pinnedActions");
        if (currentBody) currentBody.scrollTop = previousBodyTop;
        if (currentPinned) currentPinned.scrollTop = previousPinnedTop;
      });
    }

    function ensureWorkbenchInspectorShell(target) {
      if (!target) return;
      if (target.querySelector("#pinnedActionsHost") && target.querySelector(".inspectorBody")) {
        applyDrawerPinState();
        return;
      }
      const shell = '<button type="button" class="drawerPinButton" data-drawer-pin="inspector" title="固定右侧详情" aria-label="固定右侧详情" aria-pressed="false">&#128204;</button><div id="pinnedActionsHost" class="pinnedActions" title="固定操作"></div><div class="inspectorBody"></div>';
      target.innerHTML = shell;
      applyDrawerPinState();
      markPostRenderDomChanged(shell);
      workbenchInspectorLastHtml = "";
    }

    function markWorkbenchInspectorInteraction(ms) {
      workbenchInspectorInteractionLockUntil = Math.max(workbenchInspectorInteractionLockUntil, Date.now() + (ms || 1600));
    }

    function forceWorkbenchInspectorRender() {
      workbenchInspectorForceRenderUntil = Date.now() + 500;
    }

    function workbenchInspectorShouldFreeze(target, sameInspectorTarget, now) {
      if (!sameInspectorTarget) return false;
      if (now < workbenchInspectorInteractionLockUntil) return true;
      if (workbenchInspectorScrolledAway(target)) return true;
      return now - workbenchInspectorLastRenderAt < 800;
    }

    function workbenchInspectorLiveSignature(state, section, meta) {
      const operations = workbenchInspectorOperationSignatureRows(state, section, meta);
      const pending = workbenchInspectorPendingSignatureRows(section, meta);
      const facts = workbenchInspectorFactSignature(state || {}, section, meta);
      return stableSectionSignature({ section, anchor: meta && (meta.anchor || meta.id), tone: inspectorToneForSection(state || {}, section), operations, pending, facts });
    }

    function workbenchInspectorPendingSignatureRows(section, meta) {
      const actionSection = inspectorActionSection(section, meta);
      return Object.values(pendingActions)
        .filter((item) => pendingActionMatchesInspectorSection(item || {}, section, actionSection))
        .slice(0, 20)
        .map((item) => compactRecordForSignature(item || {}, ["command", "status", "message", "runKey", "archiveKey", "planFile", "workerId", "actionSection"]));
    }

    function pendingActionMatchesInspectorSection(item, section, actionSection) {
      const command = String((item || {}).command || "");
      const explicitRaw = String((item || {}).actionSection || "");
      const explicit = explicitRaw ? normalizeActionSection(explicitRaw) : "";
      const inferred = commandInspectorSection(command);
      return Boolean((explicit && (explicit === section || explicit === actionSection)) || inferred === section || inferred === actionSection);
    }

    function commandInspectorSection(command) {
      const text = String(command || "");
      return COMMAND_INSPECTOR_SECTIONS[text] || "overview";
    }

    function workbenchInspectorOperationSignatureRows(state, section, meta) {
      const actionSection = inspectorActionSection(section, meta);
      if (!["tasks", "operations"].includes(section) && !["tasks", "operations"].includes(actionSection)) return [];
      return operationRowsForState(state).slice(0, section === "operations" || actionSection === "operations" ? 12 : 6)
        .map((op) => compactRecordForSignature(op || {}, ["operationId", "type", "status", "message", "error", "updatedAt", "workerId"]));
    }

    function workbenchInspectorFactSignature(state, section, meta) {
      const setup = state.setup || {};
      const workers = asArray(setup.workerTunnels || []);
      const enabledWorkers = enabledWorkerTunnelsForState(state);
      const conflicts = asArray(state.tunnelPortConflicts || []);
      const project = state.detectedProject || {};
      const summary = state.resultsSummary || {};
      const scheduler = state.schedulerConfig || {};
      const object = meta && meta.anchor && meta.anchor !== section ? [
        meta.anchor || "",
        meta.count || meta.status || "",
        inspectorActionGroupLabel(inspectorActionSection(section, meta))
      ] : [];
      if (section === "servers") return [object, setup.localForwardPort || "", enabledWorkers.length, workers.length, overviewSchedulerRange(scheduler), conflicts.length];
      if (section === "gpu") return [object, overviewGpuStats(state)];
      if (section === "plans") return [object, overviewProjectStats(state), overviewProjectReadiness(state), pick(project.adapterRules || {}, ["primaryMetric"], "AUC")];
      if (section === "tasks") return [object, overviewTaskStats(state), asArray((state.selection || {}).selectedRunKeys || []).length, (state.selection || {}).selectedRunKey || ""];
      if (section === "results") return [object, asArray(project.resultFiles || []).length, pick(summary, ["lastParsedAt", "last_parsed_at"], "-"), pick(summary, ["claimUnsupportedCount", "claim_unsupported_count"], 0), pick(summary, ["claimNeedsExperimentCount", "claim_needs_experiment_count"], 0)];
      if (section === "sync") return [object, (state.codeSync || {}).hub || "", (state.codeSync || {}).workers || "", (state.codeSync || {}).fingerprint || "", (state.health || {}).agentVersionStatus || ""];
      if (section === "operations") return [object, overviewOperationStats(state)];
      if (section === "diagnostics") return [object, state.extensionVersion || "", hasCapability(state, "endpoints.actions"), hasCapability(state, "endpoints.fileDownload"), asArray(state.actionErrors || []).length];
      return [object, (state.health || {}).state || "", (state.realtime || {}).streamStatus || "", enabledWorkers.length, workers.length, conflicts.length];
    }

    function workbenchInspectorScrolledAway(target) {
      const body = target && target.querySelector ? target.querySelector(".inspectorBody") : null;
      const pinned = target && target.querySelector ? target.querySelector(".pinnedActions") : null;
      return Number((body && body.scrollTop) || 0) > 2 || Number((pinned && pinned.scrollTop) || 0) > 2;
    }

    function budgetInspectorActions(actions, section, meta) {
      const rows = Array.isArray(actions) ? actions : [];
      if (rows.length <= INSPECTOR_ACTION_RENDER_LIMIT) return rows;
      const actionSection = inspectorActionSection(section, meta);
      const priority = inspectorActionPriority(actionSection);
      return rows.map((item, index) => {
        const command = String(item && item[1] || "");
        return { item, index, rank: priority.has(command) ? priority.get(command) : 1000 + index };
      }).sort((a, b) => a.rank - b.rank || a.index - b.index)
        .slice(0, INSPECTOR_ACTION_RENDER_LIMIT)
        .sort((a, b) => a.index - b.index)
        .map((entry) => entry.item);
    }

    function inspectorActionPriority(section) {
      const common = ["prepareAgents", "startAllConnections", "testAll", "snapshot", "pauseAll"];
      const bySection = {
        overview: common,
        servers: ["saveSchedulerConfig", "prepareAgents", "startAll", "startAllConnections", "testAll"],
        gpu: ["snapshot", "testAll"],
        plans: ["validatePlan", "dryRunPlan", "runPlan", "runAllPlans", "archivePlan", "generateOutputAdapter"],
        tasks: ["stopExperiment", "retryExperiment", "archiveArtifacts", "deleteArtifacts"],
        results: ["parseResults", "refreshResults", "runQualityGate", "checkOutputContract", "runStatistics", "checkClaimEvidence", "exportPaperTable", "exportPlottingContract", "plotResultsToPpt"],
        sync: ["publishGithub", "syncGithub", "uploadProjectToHub", "uploadProjectToWorkers", "distributeCodeToWorkers", "deployLatestAgent", "configureSftpIgnores"],
        operations: ["selfCheck", "createDebugBundle", "downloadDebugBundle", "openAuditTail"],
        diagnostics: ["selfCheck", "createDebugBundle", "downloadDebugBundle", "openAuditTail"]
      };
      return new Map((bySection[section] || common).map((command, index) => [command, index]));
    }

    function inspectorBudgetNotice(label, total, visible, unit) {
      const hidden = Math.max(0, Number(total || 0) - Number(visible || 0));
      if (!hidden) return "";
      const text = "已省略 " + hidden + " " + (unit || "项") + (label || "内容") + "；可通过中间列对应卡片、资源树定位或置顶常用按钮继续使用。";
      return '<div class="inspectorBudgetNotice" title="' + escAttr(text) + '">' + esc(text) + '</div>';
    }

    function renderInspectorActionReadiness(section, actions) {
      const input = Array.isArray(actions) ? actions : [];
      const visible = input.slice(0, INSPECTOR_READINESS_RENDER_LIMIT);
      const rows = visible.map((item) => {
        const label = item[0];
        const command = item[1];
        const options = item[2] || {};
        const context = inspectorActionContext(lastState || {}, command, options);
        const reason = disableReason(lastState, command, context);
        return '<div class="inspectorReadinessRow ' + (reason ? "warn" : "good") + '" title="' + escAttr(reason || commandHelp(command) || "可执行") + '"><b>' + esc(label) + '</b><span>' + esc(reason ? compactText(reason, 48) : "可执行") + '</span></div>';
      }).join("");
      return '<div class="inspectorReadiness" title="可用性"><div class="inspectorEyebrow">可用性</div>' + rows + inspectorBudgetNotice("可用性检查", input.length, visible.length, "项") + '</div>';
    }

    function inspectorActionContext(state, command, options) {
      if (!(options && options.batch)) return sanitizeActionPayload(options && options.payload || {});
      const payload = Object.assign({ batchSelected: "true" }, selectedTaskPayloadFromState(state || {}));
      if (command === "retryExperiment") payload.suppressGlobalPlan = true;
      return payload;
    }

    function workbenchInspectorFacts(state, section, meta) {
      const setup = state.setup || {};
      const scheduler = state.schedulerConfig || {};
      const workers = asArray(setup.workerTunnels || []);
      const enabledWorkers = enabledWorkerTunnelsForState(state);
      const gpuStats = overviewGpuStats(state);
      const taskStats = overviewTaskStats(state);
      const operationStats = overviewOperationStats(state);
      const projectStats = overviewProjectStats(state);
      const projectReadiness = overviewProjectReadiness(state);
      const project = state.detectedProject || {};
      const summary = state.resultsSummary || {};
      const conflicts = asArray(state.tunnelPortConflicts || []);
      const facts = {
        overview: [
          ["Hub", labelStatus((state.health || {}).state || "unknown"), "Hub Agent 健康状态"],
          ["实时流", labelStatus((state.realtime || {}).streamStatus || "disconnected"), "WebSocket、SSE 或快照备用状态"],
          ["Worker", String(enabledWorkers.length) + "/" + String(workers.length), "启用 Worker / 已配置 Worker"],
          ["风险", conflicts.length ? String(conflicts.length) + " 个" : "无阻塞", "端口冲突、暂停网络或最近错误"]
        ],
        servers: [
          ["Hub 端口", String(setup.localForwardPort || "-"), "插件访问的 Hub 本地隧道端口"],
          ["Worker", String(enabledWorkers.length), "启用后参与观测、同步和调度目标"],
          ["调度", overviewSchedulerRange(scheduler), "pollSeconds + random(0, jitterSeconds)"],
          ["端口冲突", String(conflicts.length), "必须先修复本机端口冲突"]
        ],
        gpu: [
          ["总卡", String(gpuStats.total), "当前可见 GPU 总数"],
          ["空闲", String(gpuStats.free), "无进程或无占用的 GPU"],
          ["占用", String(gpuStats.busy), "已有任务或进程占用的 GPU"],
          ["我的任务", String(gpuStats.mine), "按 currentUser、aliases 或命令关键词判断"]
        ],
        plans: [
          ["Plan", String(projectReadiness.planCount), "识别到的实验计划数量"],
          ["接入", projectReadiness.status, projectReadiness.detail],
          ["结果线索", String(projectStats.resultSignals), "CSV、JSON、summary 或 stdout 等结果线索"],
          ["主指标", pick(project.adapterRules || {}, ["primaryMetric"], "AUC"), "默认分类任务主指标"]
        ],
        tasks: [
          ["运行中", String(taskStats.running), "Hub scheduler 当前运行中任务"],
          ["排队", String(taskStats.queued), "等待可用性上报或 GPU 资源租约"],
          ["失败", String(taskStats.failed), "需要查看日志或重试的任务"],
          ["选中", String(asArray((state.selection || {}).selectedRunKeys || []).length || (state.selection || {}).selectedRunKey || "-"), "用于批量停止、归档或删除"]
        ],
        results: [
          ["结果文件", String(asArray(project.resultFiles || []).length), "识别到的轻量结果文件"],
          ["最近解析", compactText(pick(summary, ["lastParsedAt", "last_parsed_at"], "-"), 18), "Hub 最近一次解析时间"],
          ["缺证据", String(pick(summary, ["claimUnsupportedCount", "claim_unsupported_count"], 0)), "缺少本地证据的论文声明数量（unsupported）"],
          ["需实验", String(pick(summary, ["claimNeedsExperimentCount", "claim_needs_experiment_count"], 0)), "仍需实验验证的论文声明数量（needs experiment）"]
        ],
        sync: [
          ["Hub 同步", labelStatus((state.codeSync || {}).hub || "待同步"), "本地项目到 Hub 的轻量代码同步状态"],
          ["Worker 同步", labelStatus((state.codeSync || {}).workers || "待同步"), "本地项目到启用 Worker 的轻量代码同步状态"],
          ["代码指纹", compactText((state.codeSync || {}).fingerprint || "-", 18), "提交运行前自动核验的代码指纹（fingerprint）"],
          ["Agent", labelStatus((state.health || {}).agentVersionStatus || "待检测"), "部署最新版 Agent 后需要重启会话生效"]
        ],
        operations: [
          ["进行中", String(operationStats.running), "已提交、排队、执行中等非终态操作（accepted/submitted/queued/running）"],
          ["失败", String(operationStats.failed), "失败、卡住、不支持或错误等终态（failed/stalled/unsupported/error）"],
          ["已完成", String(operationStats.completed), "已成功进入终态的操作"],
          ["最近状态", operationStatusLabel(operationStats.latestStatus), operationTypeLabel(operationStats.latestType || "暂无操作")]
        ],
        diagnostics: [
          ["插件版本", String(state.extensionVersion || "-"), "当前 Webview/Extension 版本"],
          ["Hub 操作", hasCapability(state, "endpoints.actions") ? "可用" : "待升级", "Hub Agent 操作接口能力（action endpoint）"],
          ["文件下载", hasCapability(state, "endpoints.fileDownload") ? "可用" : "待升级", "仅用于调试包或轻量文件"],
          ["错误", String(asArray(state.actionErrors || []).length), "最近 UI/action 错误数量"],
          ["目标矩阵", "可展开", "查看完成项、待验收项和真实集群烟测"]
        ]
      };
      return workbenchInspectorObjectFacts(section, meta).concat(facts[section] || facts.overview).slice(0, 8);
    }

    function workbenchInspectorObjectFacts(section, meta) {
      if (!meta || !meta.anchor || meta.anchor === section) return [];
      return [
        ["当前对象", meta.label || "-", "资源树当前选中的精确对象，不再只显示大卡片级信息。"],
        ["锚点", meta.anchor || "-", "中间列滚动目标 data-anchor；用于排查定位不精准。"],
        ["对象状态", meta.count || meta.status || "待查看", meta.detail || meta.title || "当前对象状态。"],
        ["操作组", inspectorActionGroupLabel(inspectorActionSection(section, meta)), "右侧按钮根据对象类型选择对应操作组。"]
      ];
    }

    function inspectorActionGroupLabel(section) {
      const labels = {
        overview: "总览",
        servers: "服务器",
        settings: "设置",
        gpu: "GPU",
        plans: "计划",
        tasks: "任务",
        results: "结果",
        sync: "发布同步",
        operations: "操作进度",
        diagnostics: "诊断"
      };
      return labels[section] || section || "总览";
    }

    function inspectorActionSection(section, meta) {
      if (section === "settings") return "settings";
      const anchor = String((meta || {}).anchor || "");
      if (anchor.startsWith("sync-")) return "sync";
      if (anchor.startsWith("task-") || anchor.startsWith("tasks-")) return "tasks";
      if (anchor.startsWith("operation-") || anchor.startsWith("operations-")) return "operations";
      if (anchor.startsWith("result") || anchor.startsWith("results-")) return "results";
      if (anchor.startsWith("plan") || anchor.startsWith("plans-")) return "plans";
      if (anchor.startsWith("server") || anchor.startsWith("servers-")) return "servers";
      if (anchor.startsWith("diagnostic") || anchor.startsWith("diagnostics-")) return "diagnostics";
      if (anchor.startsWith("gpu")) return "gpu";
      return section || "overview";
    }

    function workbenchInspectorActions(section, meta) {
      const actionSection = inspectorActionSection(section, meta);
      const actions = {
        overview: [["准备 Agent 并启动", "prepareAgents"], ["启动连接", "startAllConnections"], ["检测全部", "testAll"], ["刷新数据", "snapshot"], ["暂停网络", "pauseAll"]],
        servers: [["保存策略", "saveSchedulerConfig", { configScope: "scheduler" }], ["准备 Agent 并启动", "prepareAgents"], ["启动全部隧道", "startAll"], ["启动连接", "startAllConnections"], ["检测全部", "testAll"]],
        settings: [["保存策略", "saveSchedulerConfig", { configScope: "scheduler" }], ["准备 Agent 并启动", "prepareAgents"], ["启动全部隧道", "startAll"], ["启动连接", "startAllConnections"], ["检测全部", "testAll"]],
        gpu: [["刷新数据", "snapshot"], ["检测全部", "testAll"]],
        plans: [["单独校验", "validatePlan"], ["单独预演", "dryRunPlan"], ["校验并提交运行", "runPlan", { confirm: true }], ["运行全部计划", "runAllPlans", { confirm: true }], ["归档计划", "archivePlan", { confirm: true }], ["生成接入模板", "generateOutputAdapter"]],
        tasks: [["停止选中", "stopExperiment", { confirm: true, batch: true }], ["重试", "retryExperiment", { confirm: true, batch: true }], ["归档", "archiveArtifacts", { confirm: true, batch: true }], ["删除", "deleteArtifacts", { confirm: true, danger: true, batch: true }]],
        results: [["解析结果", "parseResults"], ["刷新结果", "refreshResults"], ["检查输出契约", "checkOutputContract"], ["反推配置", "inferConfigFromRun"], ["恢复 Plan", "recoverPlanFromRun"], ["异常诊断", "diagnoseResultAnomaly"], ["对比最优配置", "compareWithBestConfig"], ["数据集画像", "inspectDataset"], ["检查点清理预案", "planCheckpointRetention"], ["样本级解析", "parseCaseLevel"], ["泄漏检查", "runLeakageCheck"], ["子组分析", "runSubgroupAnalysis"], ["导出样本级分析", "exportCaseAnalysis"], ["运行质量门禁", "runQualityGate"], ["运行统计", "runStatistics"], ["检查论文证据", "checkClaimEvidence"], ["导出论文表格", "exportPaperTable"], ["PPT 绘图契约", "exportPlottingContract"], ["绘图到 PPT", "plotResultsToPpt"]],
        sync: [["一键发布当前项目", "publishGithub", { confirm: true }], ["同步到 GitHub", "syncGithub", { confirm: true }], ["从 GitHub 覆盖本机", "overwriteGithub", { danger: true }], ["首次上传到 Hub", "uploadProjectToHub", { confirm: true }], ["首次上传到 Worker", "uploadProjectToWorkers", { confirm: true }], ["分发代码到所有 Worker", "distributeCodeToWorkers", { confirm: true }], ["部署最新版 Agent 到全部服务器", "deployLatestAgent", { confirm: true }], ["配置 SFTP 忽略", "configureSftpIgnores"]],
        operations: [["运行自检", "selfCheck"], ["调试包", "createDebugBundle"], ["下载调试包", "downloadDebugBundle"], ["审计尾部", "openAuditTail"]],
        diagnostics: [["运行自检", "selfCheck"], ["调试包", "createDebugBundle"], ["下载调试包", "downloadDebugBundle"], ["审计尾部", "openAuditTail"]]
      };
      if (actions[actionSection]) actions[actionSection] = orderInspectorActionsByResourceTree(actionSection, actions[actionSection]);
      return actions[actionSection] || actions.overview;
    }

    function orderInspectorActionsByResourceTree(section, actions) {
      const order = resourceTreeChildrenForSection(section);
      if (!order.length) return actions;
      const rank = new Map(order.map((anchor, index) => [String(anchor || ""), index]));
      return actions.map((item, index) => ({ item, index, rank: rank.has(actionResourceAnchor(section, item[1])) ? rank.get(actionResourceAnchor(section, item[1])) : 999 + index }))
        .sort((a, b) => a.rank - b.rank || a.index - b.index)
        .map((entry) => entry.item);
    }

    function actionResourceAnchor(section, command) {
      const text = String(command || "");
      if (section === "sync") return syncCommandAnchor(text);
      return ACTION_RESOURCE_ANCHORS[text] || section || "";
    }

    function inspectorActionButton(label, command, options) {
      return '<span class="inspectorActionRow" title="右键固定">' + actionButton(label, command, options || {}) + '</span>';
    }

    function inspectorSavedActionButton(spec) {
      spec = normalizeSavedButtonAction(spec);
      if (!spec) return "";
      const options = Object.assign({}, spec, { payload: spec.payload || {}, actionId: spec.id, actionSection: spec.section });
      return '<span class="inspectorActionRow savedAction" title="右键管理">' + actionButton(spec.label, spec.command, options) + '</span>';
    }

    function renderPinnedActions() {
      const legacy = normalizePinnedCommands(currentUiLayout.pinnedCommands || pinnedCommandDefaults).map(defaultPinnedSpec).filter(Boolean);
      const custom = normalizeSavedButtonActions(currentUiLayout.pinnedActions, 16);
      const specs = [];
      legacy.concat(custom).forEach((spec) => {
        if (!spec || specs.some((item) => savedActionSame(item, spec))) return;
        specs.push(spec);
      });
      const buttons = specs.slice(0, 16).map((spec) => {
        const inferredConfirm = spec.confirm || spec.command === "runPlan" || spec.command === "runAllPlans" || spec.command.includes("Github") || spec.command.includes("Project") || spec.command.includes("Agent");
        return inspectorSavedActionButton(Object.assign({}, spec, { confirm: inferredConfirm }));
      }).join("");
      const html = '<div class="inspectorEyebrow">固定操作</div><div class="workflowActions">' + buttons + '</div>';
      const target = el("pinnedActionsHost");
      if (target) {
        setHtmlIfChanged(target, html);
        return "";
      }
      return '<div id="pinnedActionsHost" class="pinnedActions" title="固定操作">' + html + '</div>';
    }

    function scrollToResourceTarget(section, anchor) {
      const main = el("mainColumn");
      const target = stableResourceScrollTarget(resolveResourceScrollTarget(section, anchor));
      if (!target || !main) return;
      resourceTreeScrollLockUntil = Date.now() + 650;
      if (main && main.contains(target)) {
        const mainBox = main.getBoundingClientRect();
        const targetBox = target.getBoundingClientRect();
        const top = main.scrollTop + targetBox.top - mainBox.top - 8;
        if (Math.abs(main.scrollTop - Math.max(0, top)) > 1) main.scrollTo({ top: Math.max(0, top), behavior: "auto" });
      }
    }

    function resolveResourceScrollTarget(section, anchor) {
      const main = el("mainColumn");
      if (!main) return null;
      const anchorId = anchor || section || "overview";
      const sectionId = section || "overview";
      const fallbackSection = main.querySelector('[data-section="' + cssEscape(sectionId) + '"]');
      const exactInSection = fallbackSection && ((fallbackSection.getAttribute("data-anchor") === anchorId ? fallbackSection : null) || fallbackSection.querySelector('[data-anchor="' + cssEscape(anchorId) + '"]'));
      if (exactInSection) return exactInSection;
      const syncFallback = sectionId === "sync" ? main.querySelector('[data-anchor="sync-publish"]') : null;
      if (syncFallback) return syncFallback;
      const exact = main.querySelector('[data-anchor="' + cssEscape(anchorId) + '"]');
      // Landing on a same-named anchor that lives in a different section reads as if the tree
      // selection was ignored; the requested section is the better answer when both exist.
      if (exact && fallbackSection && anchorOutsideSection(exact, sectionId)) return fallbackSection;
      return exact || fallbackSection;
    }

    function anchorOutsideSection(target, sectionId) {
      if (!target || !target.closest) return false;
      const owner = target.closest("[data-section]");
      return Boolean(owner && owner.getAttribute("data-section") !== sectionId);
    }

    function stableResourceScrollTarget(target) {
      if (!target || !target.closest) return target;
      const card = target && target.closest ? target.closest("[data-section]") : null;
      if (card && card.classList.contains("is-collapsed")) return card;
      let details = target.closest("details");
      while (details) {
        if (!details.open) return details.querySelector("summary") || details;
        details = details.parentElement && details.parentElement.closest ? details.parentElement.closest("details") : null;
      }
      return target;
    }

    function expandResourceAncestors(target) {
      return stableResourceScrollTarget(target);
    }

    function workbenchInspectorEvents(state, meta, section) {
      const actionSection = inspectorActionSection(section, meta);
      if (!["tasks", "operations"].includes(section) && !["tasks", "operations"].includes(actionSection)) {
        return [];
      }
      const rows = operationRowsForState(state);
      if (rows.length) {
        const scoped = firstMatchingOperationRows(rows, meta, section, 4);
        return scoped.length ? scoped : rows.slice(0, 4);
      }
      return [];
    }

    function renderInspectorTimeline(events) {
      const rows = asArray(events);
      if (!rows.length) return "";
      return '<div class="inspectorTimeline" title="最近操作"><div class="inspectorEyebrow">最近操作</div>' + rows.map(renderInspectorEvent).join("") + '</div>';
    }

    function firstMatchingOperationRows(rows, meta, section, limit) {
      const out = [];
      const max = Math.max(1, Number(limit) || 4);
      const matches = operationResourceMatcher(meta, section);
      for (const row of asArray(rows)) {
        if (!matches(operationSearchHaystack(row))) continue;
        out.push(row);
        if (out.length >= max) break;
      }
      return out;
    }

    function operationSearchHaystack(row) {
      if (!row || typeof row !== "object") return "";
      const cached = operationSearchHaystackCache.get(row);
      if (cached !== undefined) return cached;
      const haystack = [row.operationId, row.id, row.type, row.action, row.status, row.message, row.error, row.searchText].join(" ").toLowerCase();
      operationSearchHaystackCache.set(row, haystack);
      return haystack;
    }

    function operationResourceMatcher(meta, section) {
      const anchor = String((meta || {}).anchor || "");
      if (!anchor || anchor === section) {
        if (section === "operations") return MATCH_EVERY_OPERATION;
        const pattern = OPERATION_SECTION_MATCH_PATTERNS.get(section);
        return pattern ? (haystack) => pattern.test(haystack) : MATCH_NO_OPERATION;
      }
      const label = String((meta || {}).label || "");
      const parts = [anchor, label, section, (meta || {}).searchText || ""].join(" ").toLowerCase().split(/\s+/).filter((part) => part.length > 2);
      return (haystack) => parts.some((part) => haystack.includes(part));
    }

    function operationMatchesResource(row, meta, section) {
      return operationResourceMatcher(meta, section)(operationSearchHaystack(row));
    }

    function renderInspectorEvent(row) {
      const status = String(row.status || "idle").toLowerCase();
      const message = operationDisplayMessage(row);
      return '<div class="inspectorEvent ' + escAttr(status) + '" title="' + escAttr(message) + '">' +
        '<b title="' + escAttr("原始操作：" + (row.type || row.action || row.operationId || "operation")) + '">' + esc(operationTypeLabel(row.type || row.action || row.operationId || "operation")) + '</b>' +
        '<span>' + esc(labelStatus(status) + " · " + (row.updatedAt || row.startedAt || "-")) + '</span>' +
        '<span>' + esc(compactText(message, 88)) + '</span>' +
      '</div>';
    }

    function inspectorFact(label, value, title) {
      return '<div class="inspectorFact" title="' + escAttr(title || value || "") + '"><span>' + esc(label) + '</span><b>' + esc(value || "-") + '</b></div>';
    }

    function inspectorToneForSection(state, section) {
      if (section === "gpu" && overviewGpuStats(state).mine) return "mine";
      if (section === "tasks" && overviewTaskStats(state).failed) return "error";
      if (section === "operations" && overviewOperationStats(state).failed) return "error";
      if (section === "servers" && asArray(state.tunnelPortConflicts || []).length) return "warn";
      if (section === "plans") return overviewProjectReadiness(state).tone || "good";
      if (section === "results" && !asArray((state.detectedProject || {}).resultFiles || []).length) return "warn";
      return "good";
    }

    function setupResourceTreeObserver() {
      return;
    }

    function renderOpsFlow(state) {
      const target = el("opsFlow");
      if (target) {
        setHtmlIfChanged(target, "");
        target.className = "ops-flow is-hidden";
      }
    }

    function opsStep(index, title, status, desc, tone) {
      const cls = tone === "warn" ? " status-warning" : (tone === "good" ? " status-completed" : "");
      return '<div class="ops-step" title="' + escAttr(desc) + '"><b>' + esc(index + ". " + title) + ' <span class="' + cls + '">' + esc(status) + '</span></b><span>' + esc(desc) + '</span></div>';
    }

    function renderSummary(state) {
      const health = state.health || {};
      const realtime = state.realtime || {};
      const setup = state.setup || {};
      const paused = state.diagnostics && state.diagnostics.requests && state.diagnostics.requests.paused;
      const rows = [
        row("连接模式", labelStatus(state.connectionMode)),
        row("本地端点", state.localEndpoint || "-"),
        row("Hub", setup.hubDisplayName || setup.hubHost || "-"),
        row("Agent 端口", setup.remoteAgentPort || "-"),
        row("隧道健康", labelStatus(health.state || "unknown"), health.state === "agent_ok" ? "status-completed" : "status-warning"),
        row("实时流", labelStatus(realtime.streamStatus || "disconnected")),
        row("心跳", realtime.lastHeartbeatAt || "-"),
        row("最后错误", state.lastError || "-")
      ];
      if (paused) rows.splice(rows.length - 1, 0, row("网络状态", "已暂停", "status-warning"));
      setHtmlIfChanged("summary", renderOverviewOpsWorkbench(state, rows));
    }

    function renderCommandCenter(state, summary) {
      return '<section id="workbenchCommandCenter" class="commandCenter" data-anchor="overview-command-center" title="工作台命令中心">' +
        '<div class="commandCenterHead"><b>实验工作台</b><span class="muted">连接、同步、运行、结果</span></div>' +
        '<div class="statusLegend" aria-label="状态图例"><span class="legendItem"><span class="legendDot good"></span>正常</span><span class="legendItem"><span class="legendDot info"></span>运行 / 信息</span><span class="legendItem"><span class="legendDot warn"></span>等待 / 注意</span><span class="legendItem"><span class="legendDot error"></span>异常 / 失败</span></div>' +
        renderWorkbenchObjectStrip(state) +
        renderWorkflowStageRail(state, summary) +
        renderWorkflowBlockerBar(state, summary) +
      '</section>';
    }

    function renderWorkflowStageRail(state, summary) {
      const realtime = state.realtime || {};
      const stream = String(realtime.streamStatus || "").toLowerCase();
      const streamOk = ["websocket", "sse", "connected"].some((part) => stream.includes(part));
      const sync = overviewSyncReadiness(state);
      const evidence = overviewResultEvidenceReadiness(state);
      const projectReadiness = summary.projectReadiness || overviewProjectReadiness(state);
      const automaticSyncPending = !projectReadiness.blocking && projectReadiness.status === "可提交" && !sync.ready;
      const runGateTone = projectReadiness.blocking ? projectReadiness.tone : sync.failure ? "error" : automaticSyncPending ? "info" : projectReadiness.tone || "good";
      const runGateStatus = projectReadiness.blocking ? projectReadiness.status : sync.failure ? "同步失败" : automaticSyncPending ? "运行时自动同步" : projectReadiness.status;
      const runGateDetail = automaticSyncPending ? projectReadiness.detail + "；确认运行后会自动生成代码指纹，并同步 Hub 与参与 Worker。" : projectReadiness.detail;
      const rows = [
        ["1", "Xshell 隧道", summary.hubOk && !summary.conflicts.length ? "good" : "warn", summary.hubOk ? "可达" : "待检测", "本机只访问 127.0.0.1:<localPort>，Hub/Worker 远端访问都由 Xshell 已保存会话提供。"],
        ["2", "实时推送", streamOk ? "good" : "warn", streamOk ? labelStatus(realtime.streamStatus) : "待连接", "Agent 通过 WebSocket/SSE 长连接推送 GPU、任务、日志和操作事件；不会用高频短轮询代替。"],
        ["3", "运行门禁", runGateTone, runGateStatus, runGateDetail],
        ["4", "调度执行", summary.failed ? "error" : (summary.running ? "info" : summary.queued ? "warn" : ""), summary.running ? (summary.running + " 运行") : summary.queued ? (summary.queued + " 排队") : "空闲", "Hub 只负责调度和索引；Worker 本机执行任务并推送终态，排队不受 GPU 总任务数限制。"],
        ["5", "结果证据", evidence.tone, evidence.status, evidence.detail]
      ];
      return '<div class="workflowStageRail" title="工作流">' +
        rows.map((row) => workflowStage(row[0], row[1], row[2], row[3], row[4])).join("") +
        '</div>';
    }

    function workflowStage(index, title, tone, status, detail) {
      return '<article class="workflowStage ' + escAttr(tone || "") + '" title="' + escAttr(detail) + '">' +
        '<span class="workflowStageIndex">' + esc(index) + '</span>' +
        '<span class="workflowStageBody"><b>' + esc(title) + '</b><span>' + esc(detail) + '</span><span class="workflowStageStatus">' + esc(status || "-") + '</span></span>' +
        '</article>';
    }

    function workflowCard(title, tone, status, detail) {
      return '<article class="workflowCard ' + escAttr(tone || "") + '" title="' + escAttr(detail || status || title) + '"><b>' + esc(title) + '</b><span>' + esc(status || "-") + '</span></article>';
    }

    function renderWorkflowBlockerBar(state, summary) {
      const sync = overviewSyncReadiness(state);
      const projectReadiness = summary.projectReadiness || overviewProjectReadiness(state);
      const blockers = [];
      if (!summary.hubOk) blockers.push(["待检测 Hub", "先点击检测全部，确认 Hub Agent 经 Xshell 本地端口可达。", "status-warning"]);
      if (summary.conflicts.length) blockers.push(["端口冲突 " + summary.conflicts.length, "先修复本机端口冲突，避免 Xshell 会话覆盖同一 localPort。", "status-failed"]);
      if (projectReadiness.blocking) blockers.push([projectReadiness.status, projectReadiness.detail, projectReadiness.tone === "error" ? "status-failed" : "status-warning"]);
      if (sync.failure) blockers.push(["代码同步失败", "查看发布同步状态和最近操作错误；修复后可重新提交，运行流程会再次自动同步。", "status-failed"]);
      if (summary.failed) blockers.push(["任务异常 " + summary.failed, "查看任务详情、日志和操作进度后再重试或删除。", "status-failed"]);
      if (summary.failedOps) blockers.push(["操作异常 " + summary.failedOps, "failed/stalled 操作需要查看错误、残留和目标路径。", "status-failed"]);
      const rows = blockers.length ? blockers : [["当前无首屏阻塞", "仍需以真实集群检测和操作进度终态为准。", "status-completed"]];
      return '<div class="workflowBlockerBar" title="阻塞提示">' +
        rows.map((row) => '<span class="pill ' + escAttr(row[2]) + '" title="' + escAttr(row[1]) + '">' + esc(row[0]) + '</span>').join("") +
        '</div>';
    }

    function renderWorkbenchObjectStrip(state) {
      const health = state.health || {};
      const workers = enabledWorkerTunnelsForState(state);
      const tasks = schedulerRowsForState(state);
      const project = state.detectedProject || {};
      const gpuStats = overviewGpuStats(state);
      const taskStats = overviewTaskStats(state);
      const operationStats = overviewOperationStats(state);
      const plans = asArray(project.plans || []);
      const resultFiles = asArray(project.resultFiles || []);
      const claims = asArray(((state.resultSummary || {}).claimEvidencePreview || {}).claims || []);
      const unsupportedClaims = claims.filter((row) => String(row.status || "").toLowerCase() !== "supported").length;
      const tiles = [
        objectTile("Hub", "H", ["agent_ok", "ok"].includes(String(health.state || "").toLowerCase()) ? "good" : "warn", labelStatus(health.state || "待检测")),
        objectTile("Worker", "W", workers.length ? "good" : "warn", String(workers.length)),
        objectTile("GPU", "G", gpuStats.mine ? "mine" : (gpuStats.total ? "good" : "warn"), gpuStats.total ? (gpuStats.free + "/" + gpuStats.total) : "待检测"),
        objectTile("任务", "T", taskStats.failed ? "error" : (taskStats.running ? "good" : taskStats.queued ? "warn" : "good"), taskStats.running ? (taskStats.running + " 运行") : taskStats.queued ? (taskStats.queued + " 排队") : "空闲"),
        objectTile("计划", "P", plans.length ? "good" : "warn", plans.length ? (plans.length + " 个") : "待接入"),
        objectTile("结果", "R", resultFiles.length ? "good" : "warn", resultFiles.length ? (resultFiles.length + " 个") : "待解析"),
        objectTile("操作", "O", operationStats.failed ? "error" : operationStats.running ? "info" : "good", operationStats.failed ? (operationStats.failed + " 失败") : operationStats.running ? (operationStats.running + " 进行中") : "空闲")
      ];
      return '<div class="objectStrip" title="对象状态">' + tiles.join("") + '</div>';
    }

    function objectTile(label, glyph, tone, status) {
      return '<article class="objectTile ' + escAttr(tone || "") + '" title="' + escAttr(label + "：" + (status || "-")) + '">' +
        '<span class="objectGlyph" aria-hidden="true">' + esc(glyph) + '</span>' +
        '<span class="objectTileBody"><span class="objectTileHead"><b>' + esc(label) + '</b><span class="objectTileStatus">' + esc(status || "-") + '</span></span></span>' +
      '</article>';
    }

    function renderOverviewOpsWorkbench(state, legacyRows) {
      const setup = state.setup || {};
      const health = state.health || {};
      const realtime = state.realtime || {};
      const diagnostics = state.diagnostics || {};
      const scheduler = state.schedulerConfig || {};
      const workers = asArray(setup.workerTunnels || []);
      const enabledWorkers = enabledWorkerTunnelsForState(state);
      const workerTelemetry = asArray(state.workerTelemetryStatus || []);
      const workerOk = workerTelemetry.filter((item) => String(item.status || "").toLowerCase().includes("ok") || String(item.status || "").toLowerCase().includes("online")).length;
      const gpuStats = overviewGpuStats(state);
      const taskStats = overviewTaskStats(state);
      const projectStats = overviewProjectStats(state);
      const projectReadiness = overviewProjectReadiness(state);
      const operationStats = overviewOperationStats(state);
      const paused = diagnostics.requests && diagnostics.requests.paused;
      const conflicts = asArray(state.tunnelPortConflicts || []);
      const hubOk = String(health.state || "").toLowerCase() === "agent_ok" || String(health.state || "").toLowerCase() === "ok";
      const streamStatus = String(realtime.streamStatus || "disconnected");
      const streamOk = ["websocket", "sse", "connected"].some((item) => streamStatus.toLowerCase().includes(item));
      const schedulerRange = overviewSchedulerRange(scheduler);
      const workflowSummary = {
        hubOk,
        conflicts,
        projectReadiness,
        running: taskStats.running,
        queued: taskStats.queued,
        failed: taskStats.failed,
        failedOps: operationStats.failed,
      };
      const cards = [
        overviewStatusCard("Xshell 隧道", hubOk && !conflicts.length ? "good" : "warn", hubOk ? "Hub 可达" : "待检测", [
          ["本地端点", state.localEndpoint || ("127.0.0.1:" + (setup.localForwardPort || "-")), "当前 Hub 本地隧道地址"],
          ["端口冲突", String(conflicts.length), conflicts.length ? "存在重复本机端口，请改为唯一端口" : "未报告冲突"]
        ]),
        overviewStatusCard("Hub 控制面", hubOk ? "good" : "warn", labelStatus(health.state || "unknown"), [
          ["显示名", setup.hubDisplayName || setup.hubHost || "Hub", "Hub 在面板中的显示名"],
          ["Agent 端口", setup.remoteAgentPort || "-", "Hub 远端本机 Agent 端口"]
        ]),
        overviewStatusCard("Worker 状态", enabledWorkers.length && workerOk >= enabledWorkers.length ? "good" : (enabledWorkers.length ? "warn" : "error"), enabledWorkers.length ? (workerOk + "/" + enabledWorkers.length + " 可用") : "未配置", [
          ["启用", String(enabledWorkers.length), "启用后参与观测、同步和调度目标"],
          ["总数", String(workers.length), "已配置 Worker 数"]
        ]),
        overviewStatusCard("GPU 资源", gpuStats.mine ? "mine" : (gpuStats.total ? "good" : "warn"), gpuStats.total ? (gpuStats.free + "/" + gpuStats.total + " 空闲") : "暂无数据", [
          ["占用", String(gpuStats.busy), "当前有进程或 runKey 的 GPU"],
          ["我的任务", String(gpuStats.mine), "按 currentUser、aliases 或命令关键词识别"]
        ]),
        overviewStatusCard("任务队列", taskStats.failed ? "error" : (taskStats.running ? "info" : (taskStats.queued ? "warn" : "")), taskStats.running ? (taskStats.running + " 运行中") : (taskStats.queued ? (taskStats.queued + " 排队") : "空闲"), [
          ["排队", String(taskStats.queued), "等待 availability 和并发上限释放"],
          ["失败", String(taskStats.failed), "失败任务需要查看详情和日志"]
        ]),
        overviewStatusCard("项目接入", projectReadiness.tone, projectReadiness.status, [
          ["Plan", String(projectReadiness.planCount), "已识别计划或可生成计划"],
          ["当前计划", projectReadiness.planFile ? compactPath(projectReadiness.planFile) : "未选择", projectReadiness.detail],
          ["输出门禁", projectReadiness.outputReady ? "已通过" : "待处理", projectReadiness.outputReady ? "当前 Plan 已声明可解析输出" : projectReadiness.detail],
          ["结果线索", String(projectStats.resultSignals), "CSV/JSON/summary/stdout 等结果线索"]
        ]),
        overviewStatusCard("操作进度", operationStats.failed ? "error" : operationStats.running ? "info" : "good", operationStats.failed ? (operationStats.failed + " 失败") : operationStats.running ? (operationStats.running + " 进行中") : "空闲", [
          ["进行中", String(operationStats.running), "accepted、submitted、queued、running 等等待终态的操作"],
          ["失败", String(operationStats.failed), "failed、stalled、unsupported、error 等失败终态"],
          ["已完成", String(operationStats.completed), "已成功结束的操作"],
          ["最近", operationStatusLabel(operationStats.latestStatus), operationTypeLabel(operationStats.latestType || "暂无操作")]
        ]),
        overviewStatusCard("调度策略", "", schedulerRange, [
          ["TTL", String(configDefault(scheduler.workerStatusTtlSeconds, 180)) + "s", "Hub 本地 availability cache 过期阈值，不是轮询间隔"],
          ["控制", String(configDefault(scheduler.workerActionMaxConcurrent, 1)) + " 并发", "停止、删除、归档、重试等手动控制动作并发上限"]
        ])
      ];
      const risks = [];
      if (paused) risks.push(overviewRiskItem("网络已暂停", "status-warning", "暂停全部网络活动后不会自动刷新远端状态，需要手动恢复。"));
      if (!streamOk) risks.push(overviewRiskItem("实时流 " + labelStatus(streamStatus), "status-warning", "实时流未连接时，面板会依赖较慢的快照或缓存。"));
      if (state.lastError) risks.push(overviewRiskItem("最近错误", "status-failed", state.lastError));
      if (conflicts.length) risks.push(overviewRiskItem("端口冲突 " + conflicts.length, "status-failed", "先修复本机端口冲突，避免 Xshell 会话绑定失败。"));
      if (!risks.length) risks.push(overviewRiskItem("未发现阻塞风险", "status-completed", "概览未发现端口冲突、暂停状态或最近错误。"));
      return '<div class="overviewOpsWorkbench" title="运维总览">' +
        renderCommandCenter(state, workflowSummary) +
        renderClusterRuntimeOverview(state, workflowSummary, cards, risks) +
        renderCommunicationMatrix(state) +
        '<details class="advanced"><summary>基础摘要</summary><div class="overviewLegacyRows">' + legacyRows.join("") + '</div></details>' +
      '</div>';
    }

    function renderClusterRuntimeOverview(state, summary, cards, risks) {
      const realtime = state.realtime || {};
      const stream = String(realtime.streamStatus || "").toLowerCase();
      const streamOk = ["websocket", "sse", "connected"].some((part) => stream.includes(part));
      const sync = overviewSyncReadiness(state);
      const chips = [
        overviewRuntimeChip("隧道", summary.hubOk && !summary.conflicts.length ? "good" : "warn", summary.hubOk ? "Hub 可达" : "待检测"),
        overviewRuntimeChip("实时", streamOk ? "good" : "warn", streamOk ? labelStatus(realtime.streamStatus) : "待连接"),
        overviewRuntimeChip("同步", sync.failure ? "error" : sync.ready ? "good" : "info", sync.status),
        overviewRuntimeChip("任务", summary.failed ? "error" : (summary.running ? "good" : summary.queued ? "warn" : ""), summary.running ? summary.running + " 运行" : summary.queued ? summary.queued + " 排队" : "空闲"),
        overviewRuntimeChip("操作", "", "看进度区")
      ];
      return '<section class="clusterRuntimeOverview" data-anchor="overview-flow" title="集群运行态">' +
        '<div class="runtimeOverviewHead"><div class="runtimeOverviewTitle"><b>集群运行态</b></div><div class="runtimeOverviewChips">' + chips.join("") + '</div></div>' +
        '<div class="overviewStatusGrid">' + cards.join("") + '</div>' +
        '<div class="overviewRiskBand compact" data-anchor="overview-blockers">' + risks.join("") + '</div>' +
      '</section>';
    }

    function overviewRuntimeChip(label, tone, value) {
      return '<span class="runtimeOverviewChip ' + escAttr(tone || "") + '" title="' + escAttr(label + "：" + value) + '">' + esc(label + " " + value) + '</span>';
    }

    function overviewStatusCard(title, tone, value, items) {
      const summary = title + "：" + (value || "-");
      return '<article class="overviewStatusCard ' + escAttr(tone || "") + '" data-overview-card="' + escAttr(title) + '" title="' + escAttr(summary) + '">' +
        '<div class="overviewCardHead"><div class="overviewCardTitle"><b>' + esc(title) + '</b></div><div class="overviewCardValue">' + esc(value) + '</div>' + statusInfoPopover(summary) + '</div>' +
        '<div class="overviewMiniGrid">' + (items || []).map((item) => overviewMini(item[0], item[1], item[2])).join("") + '</div>' +
      '</article>';
    }

    function statusInfoPopover(text, label) {
      const body = String(text || "").trim();
      if (!body) return "";
      return '<details class="statusInfoPopover"><summary title="' + escAttr(label || "详情") + '">i</summary><div class="statusInfoPopoverBody">' + esc(body) + '</div></details>';
    }

    function overviewMini(label, value, title) {
      return '<div class="overviewMini" title="' + escAttr(label + "：" + (value || "-")) + '"><span>' + esc(label) + '</span><b>' + esc(value) + '</b></div>';
    }

    function overviewRiskItem(label, klass, title) {
      return '<span class="pill ' + escAttr(klass || "") + '" title="' + escAttr(label) + '">' + esc(label) + '</span>';
    }

    function renderCommunicationMatrix(state) {
      const scheduler = state.schedulerConfig || {};
      const poll = Number(configDefault(scheduler.pollSeconds, 60));
      const jitter = Number(configDefault(scheduler.jitterSeconds, 30));
      const localPush = Number(configDefault(scheduler.localAvailabilityPushSeconds, 60));
      const workerPush = Number(configDefault(scheduler.workerAvailabilityPushSeconds, 60));
      const eventDelay = Number(configDefault(scheduler.operationEventMaxDelayMs, 1000));
      const paths = [
        communicationPath("本机 -> Hub", "", "127.0.0.1 本地隧道", ["手动触发", "Hub 权威"]),
        communicationPath("本机 -> Worker", "", "127.0.0.1 本地隧道", ["用户点击", "Worker 本机权威"]),
        communicationPath("Worker -> 本机", "", "WebSocket/SSE 推送", ["长连接", "事件实时"]),
        communicationPath("Worker -> Hub", "", workerPush + "-" + (workerPush + Math.max(0, jitter)) + "s 可用性", ["低频抖动", "终态上报"]),
        communicationPath("Hub 调度轮询", "warn", poll + "-" + (poll + Math.max(0, jitter)) + "s", ["cache 读取", "无短轮询"]),
        communicationPath("实时事件合并", "", "最多 " + eventDelay + "ms", ["删除/停止/归档", "快速终态"])
      ];
      return '<div class="communicationMatrix" title="通信矩阵">' +
        '<div class="communicationMatrixHead"><b>通信矩阵</b></div>' +
        '<div class="communicationMatrixGrid">' + paths.join("") + '</div>' +
      '</div>';
    }

    function communicationPath(title, tone, status, tags) {
      const meta = (tags || []).map((tag) => '<span class="pill">' + esc(tag) + '</span>').join("");
      return '<article class="communicationPathCard ' + escAttr(tone || "info") + '" title="' + escAttr(title + "：" + status) + '">' +
        '<b>' + esc(title) + '</b>' +
        '<span>' + esc(status) + '</span>' +
        '<div class="communicationPathMeta">' + meta + '</div>' +
      '</article>';
    }

    function overviewSchedulerRange(scheduler) {
      const poll = Number(configDefault(scheduler.pollSeconds, 60));
      const jitter = Number(configDefault(scheduler.jitterSeconds, 30));
      return String(poll) + "-" + String(poll + Math.max(0, jitter)) + "s";
    }

    function overviewGpuStats(state) {
      const source = state && state.gpu;
      const setupSource = state && state.setup;
      const ownerSource = state && state.gpuOwnerConfig;
      if (overviewGpuStatsCacheState === state && overviewGpuStatsCacheSource === source && overviewGpuStatsCacheSetup === setupSource && overviewGpuStatsCacheOwner === ownerSource && overviewGpuStatsCacheValue) {
        return overviewGpuStatsCacheValue;
      }
      const model = gpuViewModelForState(state || {});
      overviewGpuStatsCacheState = state;
      overviewGpuStatsCacheSource = source;
      overviewGpuStatsCacheSetup = setupSource;
      overviewGpuStatsCacheOwner = ownerSource;
      overviewGpuStatsCacheValue = { total: model.gpuCount, busy: model.busyCount, free: model.freeCount, mine: model.mineCount };
      return overviewGpuStatsCacheValue;
    }

    function overviewTaskStats(state) {
      const rows = schedulerRowsForState(state);
      if (rows === overviewTaskStatsCacheRows && overviewTaskStatsCacheValue) return overviewTaskStatsCacheValue;
      const stats = { running: 0, queued: 0, failed: 0, completed: 0 };
      rows.forEach((row) => {
        const status = String(row.status || "").toLowerCase();
        if (status === "running" || status === "testing") stats.running += 1;
        else if (status === "queued" || status === "pending") stats.queued += 1;
        else if (taskFailureLikeStatus(status)) stats.failed += 1;
        else if (status === "completed" || status === "done") stats.completed += 1;
      });
      overviewTaskStatsCacheRows = rows;
      overviewTaskStatsCacheValue = stats;
      return stats;
    }

    function overviewOperationStats(state) {
      const rows = operationRowsForState(state);
      if (rows === overviewOperationStatsCacheRows && overviewOperationStatsCacheValue) return overviewOperationStatsCacheValue;
      const latest = rows[0] || {};
      const stats = {
        total: rows.length,
        running: 0,
        failed: 0,
        completed: 0,
        latest: latest.updatedAt || "-",
        latestStatus: String(latest.status || latest.state || ""),
        latestType: String(latest.type || latest.action || ""),
      };
      rows.forEach((row) => {
        const status = String(row.status || row.state || "").toLowerCase();
        if (operationIsActive(status)) stats.running += 1;
        else if (operationIsFailureLike(status)) stats.failed += 1;
        else if (operationSucceeded(row)) stats.completed += 1;
      });
      overviewOperationStatsCacheRows = rows;
      overviewOperationStatsCacheValue = stats;
      return stats;
    }

    function overviewProjectStats(state) {
      const project = state.detectedProject || {};
      const planSource = state.plans && state.plans.length ? state.plans : (state.recentPlans && state.recentPlans.length ? state.recentPlans : project.plans);
      if (project === overviewProjectStatsCacheProject && planSource === overviewProjectStatsCachePlans && overviewProjectStatsCacheValue) return overviewProjectStatsCacheValue;
      const plans = asArray(planSource);
      const resultFiles = asArray(project.resultFiles || []);
      const outputContracts = asArray(project.outputContractFiles || []);
      const rules = project.adapterRules || {};
      const resultSignals = resultFiles.length + outputContracts.length + adapterRuleResultCandidates(rules).length;
      const ready = Boolean(plans.length || project.adapterConfig || outputContracts.length || resultSignals);
      overviewProjectStatsCacheProject = project;
      overviewProjectStatsCachePlans = planSource;
      overviewProjectStatsCacheValue = { plans: plans.length, resultSignals, ready };
      return overviewProjectStatsCacheValue;
    }

    function enabledWorkerTunnelsForState(state) {
      const setup = (state || {}).setup || {};
      const source = Array.isArray(setup.workerTunnels) ? setup.workerTunnels : EMPTY_WORKER_TUNNELS_FOR_ALIAS;
      if (source === enabledWorkerTunnelsCacheSource) return enabledWorkerTunnelsCacheValue;
      enabledWorkerTunnelsCacheSource = source;
      enabledWorkerTunnelsCacheValue = source.filter((worker) => worker && worker.enabled !== false);
      return enabledWorkerTunnelsCacheValue;
    }

    function simpleSftpReadinessForState(state) {
      const item = (((state || {}).integrations || {}).simpleSftp);
      const source = item && typeof item === "object" ? item : EMPTY_SIMPLE_SFTP_INTEGRATION;
      if (source === simpleSftpReadinessCacheSource && simpleSftpReadinessCacheValue) return simpleSftpReadinessCacheValue;
      simpleSftpReadinessCacheSource = source;
      simpleSftpReadinessCacheValue = source === EMPTY_SIMPLE_SFTP_INTEGRATION
        ? DEFAULT_SIMPLE_SFTP_READINESS
        : {
          ready: source.ready === true,
          installed: source.installed === true,
          version: String(source.version || ""),
          missingCommands: asArray(source.missingCommands),
          legacyInstalled: source.legacyInstalled === true,
          legacyVersion: String(source.legacyVersion || ""),
          message: String(source.message || "配套 SimpleSFTP 未就绪。")
        };
      return simpleSftpReadinessCacheValue;
    }

    function legacySftpNoticeForState(state) {
      const simpleSftp = simpleSftpReadinessForState(state);
      if (!simpleSftp.ready || !simpleSftp.legacyInstalled) return "";
      return '<div class="notice warning legacySftpNotice" title="旧版扩展可能保留旧状态栏按钮；卸载旧版后请执行 Developer: Reload Window。"><b>检测到旧版 SFTP</b> 新版 SimpleSFTP 已可用，但旧版仍安装' + (simpleSftp.legacyVersion ? "（" + esc(simpleSftp.legacyVersion) + "）" : "") + '。卸载旧版并重载窗口后只保留新版界面。 <button class="mini secondary" type="button" data-command="openSetupGuide">查看处理说明</button></div>';
    }

    function simpleSftpCommandDisableReason(state, command) {
      if (!SIMPLE_SFTP_GATED_COMMANDS.has(String(command || ""))) return "";
      const simpleSftp = simpleSftpReadinessForState(state);
      return simpleSftp.ready ? "" : simpleSftp.message;
    }

    function overviewProjectReadiness(state) {
      state = state || {};
      if (overviewProjectReadinessCacheState === state && overviewProjectReadinessCacheValue) return overviewProjectReadinessCacheValue;
      const project = state.detectedProject || {};
      const stats = overviewProjectStats(state);
      const plans = asArray(state.plans && state.plans.length ? state.plans : (state.recentPlans && state.recentPlans.length ? state.recentPlans : project.plans));
      const planCount = Math.max(stats.plans, plans.length);
      const selectedPlan = planFromContext(state, {});
      const planFile = String((selectedPlan || {}).planFile || (selectedPlan || {}).file || (selectedPlan || {}).path || state.planFileInput || ((state.selection || {}).selectedPlanId) || "");
      const serverReadiness = serverSetupReadiness(state);
      const workerReadiness = executionWorkerReadiness(state);
      const endpointReadiness = projectEndpointReadiness(state);
      const outputGate = projectOutputGateDiagnostics(project, {}, selectedPlan);
      const result = (status, detail, options) => {
        const value = Object.assign({
          ready: false,
          blocking: true,
          tone: "warn",
          status,
          detail,
          planFile,
          planCount,
          outputReady: Boolean(outputGate.ok)
        }, options || {});
        overviewProjectReadinessCacheState = state;
        overviewProjectReadinessCacheValue = value;
        return value;
      };
      const activeRun = selectedPlan ? planActiveRunEvidence(state, planFile, selectedPlan) : { active: false };
      if (activeRun.active) {
        if (activeRun.historicalOnly) {
          return result("旧版本运行中", "同一路径的旧 Plan revision 仍有 " + activeRun.taskCount + " 个任务和 " + activeRun.operationCount + " 个提交操作未结束；为保护旧任务，当前版本暂不能提交。", { ready: false, blocking: true, tone: "warn" });
        }
        const activeStage = planExecutionStage(state, planFile);
        return result(activeRun.taskCount > 0 ? "运行中" : "提交中", activeStage.status || "当前 Plan 已有未结束运行；查看现有进度，避免重复提交。", { ready: true, blocking: false, tone: "info" });
      }
      const terminalStage = selectedPlan ? planExecutionStage(state, planFile) : undefined;
      const terminalPhase = String((terminalStage || {}).phase || "");
      if (["results", "debug-review", "review"].includes(terminalPhase)) {
        const terminalTone = terminalPhase === "review" ? "error" : terminalPhase === "results" ? "good" : "info";
        const terminalStatus = terminalPhase === "results"
          ? "结果待处理"
          : terminalPhase === "debug-review"
            ? "Debug 待复核"
            : "任务需处理";
        return result(terminalStatus, terminalStage.status || "当前 Plan 已进入任务终态；查看对应入口。", { ready: true, blocking: terminalPhase === "review", tone: terminalTone });
      }
      const simpleSftp = simpleSftpReadinessForState(state);
      if (!simpleSftp.ready) return result("待安装 SimpleSFTP", simpleSftp.message, { tone: "error" });
      if (!serverReadiness.ready) return result("待配置服务器", serverReadiness.summary || "配置 Hub/Worker 的 Xshell 会话和项目父目录。");
      if (!selectedPlan) {
        return planCount
          ? result("待选择 Plan", "已发现 " + planCount + " 个 Plan；必须明确选择本次运行目标。")
          : result("待创建 Plan", "当前项目尚无实验 Plan；使用“接入当前项目”创建首个可运行计划。");
      }
      const contractStage = currentPlanRuntimeContractStage(state, planFile);
      if (contractStage) {
        const tone = contractStage.section === "operations" ? "info" : "warn";
        return result(runtimeContractStageBadge(contractStage), runtimeContractStageMessage(contractStage, project), { tone });
      }
      if (!outputGate.ok) return result("待补输出", "当前 Plan 输出门禁缺少：" + outputGate.missing.join("、") + "。");
      if (!workerReadiness.ready) return result("待添加 Worker", workerReadiness.summary || "正式运行至少需要一个启用的执行 Worker。");
      const preparationBlockers = agentPreparationBlockersFromState(state);
      if (preparationBlockers.length) return result("服务器配置冲突", preparationBlockers[0], { tone: "error" });
      if (endpointReadiness.versionMismatch) return result("Agent 需升级", endpointReadiness.summary || "Agent 版本与插件不兼容；部署后重启 Xshell 会话。");
      if (endpointReadiness.projectMismatch) return result("Agent 项目不匹配", endpointReadiness.summary || "当前 Agent 仍指向其他项目；重新准备 Agent。");
      if (endpointReadiness.restartRequired) return result("Agent 待重启", endpointReadiness.summary || "最新版 Agent 已部署；重启 Xshell 会话后再次检测。", { tone: "info" });
      if (!endpointReadiness.ready) return result("Agent 待检测", endpointReadiness.summary || "检测 Hub 与全部启用 Worker 的当前项目状态。");
      const stage = terminalStage || planExecutionStage(state, planFile);
      const phase = String(stage.phase || "ready");
      if (["validating", "dry-running", "submitting", "monitor"].includes(phase)) {
        const status = phase === "validating" ? "校验中" : phase === "dry-running" ? "预演中" : phase === "submitting" ? "提交中" : "运行中";
        return result(status, stage.status, { ready: true, blocking: false, tone: "info" });
      }
      if (phase === "debug-review") return result("Debug 待复核", stage.status, { ready: true, blocking: false, tone: "info" });
      if (phase === "results") return result("结果待处理", stage.status, { ready: true, blocking: false, tone: "good" });
      if (phase === "review") return result("任务需处理", stage.status, { ready: true, blocking: true, tone: "error" });
      if (phase === "validate") return result("校验待修复", stage.status, { tone: "error" });
      if (phase === "dry-run") return result("预演待处理", stage.status, { tone: String(stage.status || "").includes("失败") ? "error" : "info" });
      if (phase === "run" && String(stage.status || "").includes("失败")) return result("提交待修复", stage.status, { tone: "error" });
      return result("可提交", stage.status || "当前 Plan、服务器、Worker、Agent 与输出门禁均已就绪。", { ready: true, blocking: false, tone: "good" });
    }

    function serverStatusIndexesForState(state) {
      const data = state || {};
      const workerTelemetry = Array.isArray(data.workerTelemetryStatus) ? data.workerTelemetryStatus : EMPTY_SERVER_STATUS_ROWS;
      const assignments = Array.isArray(data.tunnelPortAssignments) ? data.tunnelPortAssignments : EMPTY_SERVER_STATUS_ROWS;
      const conflicts = Array.isArray(data.tunnelPortConflicts) ? data.tunnelPortConflicts : EMPTY_SERVER_STATUS_ROWS;
      const agentWorkers = Array.isArray(((data.agentSessions || {}).workers)) ? data.agentSessions.workers : EMPTY_SERVER_STATUS_ROWS;
      const cached = serverStatusIndexCacheSources;
      if (cached && cached.workerTelemetry === workerTelemetry && cached.assignments === assignments && cached.conflicts === conflicts && cached.agentWorkers === agentWorkers) {
        return serverStatusIndexCacheValue;
      }
      serverStatusIndexCacheSources = { workerTelemetry, assignments, conflicts, agentWorkers };
      serverStatusIndexCacheValue = {
        assignments,
        conflicts,
        workerStatus: new Map(workerTelemetry.map((item) => [String(item.workerId), item])),
        assignmentById: new Map(assignments.map((item) => [String(item.endpointId), item])),
        conflictById: new Map(conflicts.map((item) => [String(item.endpointId), item])),
        agentWorkerById: new Map(agentWorkers.map((item) => [String(item.id), item]))
      };
      return serverStatusIndexCacheValue;
    }

    function renderServerObjectOverview(state) {
      const setup = state.setup || {};
      const topology = state.topology || {};
      const hubParticipates = topology.hubAllowed === true;
      const scheduler = state.schedulerConfig || {};
      const indexes = serverStatusIndexesForState(state);
      const conflicts = indexes.conflicts;
      const workers = setup.workerTunnels || [];
      const enabledWorkers = enabledWorkerTunnelsForState(state);
      const workerStatus = indexes.workerStatus;
      const assignmentById = indexes.assignmentById;
      const conflictById = indexes.conflictById;
      const hubName = setup.hubDisplayName || setup.sshConfigAlias || setup.hubHost || "Hub";
      const hubAssignment = assignmentById.get("hub") || {};
      const hubStatus = (state.health || {}).state || "未检测";
      const goodWorkers = enabledWorkers.filter((worker) => serverObjectStatusClass((workerStatus.get(String(worker.id)) || {}).status || "已配置", conflictById.get(String(worker.id)), worker.enabled !== false) === "ok").length;
      const summary = [
        serverObjectSummaryItem("模式", topology.modeLabel || topologyModeLabel(topology.mode), topology.schedulerOwner || "尚未确认"),
        serverObjectSummaryItem("端点", (hubParticipates ? 1 : 0) + workers.length, "当前模式参与的端点总数"),
        serverObjectSummaryItem("启用 Worker", enabledWorkers.length + "/" + workers.length, "Worker"),
        serverObjectSummaryItem("健康 Worker", goodWorkers + "/" + enabledWorkers.length, "健康"),
        serverObjectSummaryItem("端口冲突", conflicts.length, "冲突")
      ].join("");
      const cards = [];
      if (hubParticipates) cards.push(serverObjectCard({
          kind: "hub",
          role: "Hub 对象",
          name: hubName,
          id: "hub",
          status: hubStatus,
          statusClass: serverObjectStatusClass(hubStatus, conflictById.get("hub"), true),
          detail: "Hub",
          meta: [
            "控制面",
            "127.0.0.1:" + (setup.localForwardPort || hubAssignment.localForwardPort || "-"),
            serverSessionConfiguredLabel(setup.savedSessionPath, "隧道会话"),
            "Agent 随隧道"
          ],
          stats: [
            ["本地隧道", "127.0.0.1:" + (setup.localForwardPort || hubAssignment.localForwardPort || "-"), "插件访问的本机端口"],
            ["远端 Agent", "127.0.0.1:" + (setup.remoteAgentPort || hubAssignment.remoteServicePort || "-"), "Hub 服务器本机 Agent 端口"],
            ["项目父目录", compactPath(setup.agentProjectDir || "-"), setup.agentProjectDir || "未配置"],
            ["会话来源", setup.savedSessionPath ? "Xshell .xsh" : "未选择", setup.savedSessionPath || "未选择 Xshell 隧道会话"]
          ]
        }));
      workers.forEach((worker) => {
        const assignment = assignmentById.get(String(worker.id)) || {};
        const probe = workerStatus.get(String(worker.id)) || {};
        const status = worker.enabled === false ? "禁用" : (probe.status || "已配置");
        const localPort = worker.localForwardPort || assignment.localForwardPort || "-";
        const remotePort = worker.remoteTelemetryPort || worker.remoteAgentPort || assignment.remoteServicePort || "-";
        const allowed = Array.isArray(worker.allowedGpuIds) && worker.allowedGpuIds.length ? worker.allowedGpuIds.join(",") : "不限";
        cards.push(serverObjectCard({
          kind: "worker",
          role: "Worker 对象",
          name: worker.displayName || worker.id,
          id: worker.id,
          status,
          statusClass: serverObjectStatusClass(status, conflictById.get(String(worker.id)), worker.enabled !== false),
          detail: "Worker",
          meta: [
            worker.enabled === false ? "禁用" : "启用",
            "127.0.0.1:" + localPort,
            serverSessionConfiguredLabel(worker.savedSessionPath, "隧道会话"),
            "Agent 随隧道"
          ],
          stats: [
            ["本地隧道", "127.0.0.1:" + localPort, "插件访问的 Worker 本机端口"],
            ["远端 Agent", "127.0.0.1:" + remotePort, "Worker 服务器本机 Agent 端口"],
            ["GPU 上限", worker.maxConcurrentGpus || 1, "只限制并发占卡，不限制排队总量"],
            ["允许 GPU", compactText(allowed, 28), allowed]
          ]
        }));
      });
      if (!workers.length) {
        cards.push(serverObjectCard({
          kind: "worker",
          role: "Worker 对象",
          name: "暂无 Worker",
          id: "-",
          status: "未配置",
          statusClass: "warn",
          detail: "Worker 未配置",
          meta: ["待接入"],
          stats: [["下一步", "新增服务器", "添加 Worker 配置卡片"], ["端口范围", "18766-18999", "本机 Worker 隧道端口建议范围"]]
        }));
      }
      const jitter = configDefault(scheduler.jitterSeconds, 30);
      const poll = configDefault(scheduler.pollSeconds, 60);
      const riskBand = [
        '<span class="pill" title="调度所有者">' + esc(topology.schedulerOwner || "拓扑待确认") + '</span>',
        '<span class="pill" title="状态与结果位置">' + esc(topology.stateOwner || "保存位置待确认") + '</span>',
        '<span class="pill" title="策略基准">策略基准 ' + esc(poll) + '-' + esc(Number(poll) + Number(jitter || 0)) + 's</span>',
        '<span class="pill" title="TTL">TTL ' + esc(configDefault(scheduler.workerStatusTtlSeconds, 180)) + 's</span>',
        '<span class="pill" title="事件延迟">实时事件 <= ' + esc(configDefault(scheduler.operationEventMaxDelayMs, 1000)) + 'ms</span>',
        '<span class="pill" title="' + escAttr("控制：" + configDefault(scheduler.workerActionMaxConcurrent, 1) + "/" + configDefault(scheduler.workerActionMinIntervalMs, 1500) + "ms") + '">控制 ' + esc(configDefault(scheduler.workerActionMaxConcurrent, 1)) + ' 并发 / ' + esc(configDefault(scheduler.workerActionMinIntervalMs, 1500)) + 'ms</span>'
      ];
      if (conflicts.length) riskBand.push('<span class="pill status-failed" title="端口冲突">端口冲突 ' + esc(conflicts.length) + '</span>');
      else riskBand.push('<span class="pill status-completed" title="端口无冲突">端口无冲突</span>');
      return '<div class="serverObjectWorkbench" title="服务器管理">' +
        '<div class="serverObjectSummary">' + summary + '</div>' +
        '<div class="serverObjectGrid">' + cards.join("") + '</div>' +
        '<div class="serverRiskBand">' + riskBand.join("") + '</div>' +
      '</div>';
    }

    function serverObjectSummaryItem(label, value, detail) {
      return '<div class="serverObjectSummaryItem" title="' + escAttr(detail) + '"><span>' + esc(label) + '</span><b>' + esc(value) + '</b></div>';
    }

    function serverObjectCard(options) {
      const klass = "serverObjectCard " + (options.kind || "") + " " + (options.statusClass || "warn");
      const meta = (options.meta || []).map((item) => '<span class="pill">' + esc(item) + '</span>').join("");
      const stats = (options.stats || []).map((item) => '<div class="serverObjectStat" title="' + escAttr(item[2] || item[1] || "") + '"><span>' + esc(item[0]) + '</span><b>' + esc(item[1]) + '</b></div>').join("");
      return '<article class="' + escAttr(klass) + '" title="' + escAttr(options.detail || "") + '">' +
        '<div class="serverObjectHead"><div><div class="serverObjectRole">' + esc(options.role || "端点") + '</div><h4 title="' + escAttr(options.name || options.id || "-") + '">' + esc(options.name || options.id || "-") + '</h4></div>' +
        '<span class="' + statusClass(options.status) + '">' + esc(serverObjectStatusLabel(options.status, options.statusClass)) + '</span></div>' +
        '<div class="serverObjectMeta">' + meta + '</div>' +
        '<div class="serverObjectStats">' + stats + '</div>' +
      '</article>';
    }

    function serverObjectStatusClass(status, conflict, enabled) {
      if (conflict) return conflict.severity === "error" ? "error" : "warn";
      if (enabled === false) return "disabled";
      const value = String(status || "").toLowerCase();
      if (value.includes("ok") || value.includes("online") || value.includes("connected") || value.includes("agent_ok") || value.includes("已配置")) return "ok";
      if (value.includes("mismatch") || value.includes("unreachable") || value.includes("closed") || value.includes("failed") || value.includes("error") || value.includes("不可达")) return "error";
      return "warn";
    }

    function serverObjectStatusLabel(status, statusClassValue) {
      if (statusClassValue === "error") return "异常";
      if (statusClassValue === "warn") return "待处理";
      if (statusClassValue === "disabled") return "禁用";
      return labelStatus(status || "正常");
    }

    function serverSessionConfiguredLabel(value, label) {
      return label + (value ? "已选" : "未选");
    }

    function renderServerTopologyMap(state) {
      const setup = state.setup || {};
      const topology = state.topology || {};
      const workers = asArray(setup.workerTunnels || []);
      const enabledWorkers = enabledWorkerTunnelsForState(state);
      const scheduler = state.schedulerConfig || {};
      const hubPort = setup.localForwardPort || 18765;
      const workerPorts = workers.map((worker) => worker.localForwardPort).filter(Boolean);
      const enabledCount = enabledWorkers.length;
      const jitter = Number(configDefault(scheduler.jitterSeconds, 30));
      const poll = Number(configDefault(scheduler.pollSeconds, 60));
      const hubParticipates = topology.hubAllowed === true;
      const nodes = [topologyNode("local", "本机 VS Code", "127.0.0.1")];
      if (hubParticipates) nodes.push(topologyNode("hub", "Hub Agent", "全局调度/汇总"));
      nodes.push(topologyNode("worker", "Worker Agent", topology.mode === "worker_pool" ? "独立分片调度" : topology.mode === "single_worker" ? "本机调度" : "GPU/任务"));
      nodes.push(topologyNode("sftp", "SimpleSFTP", "显式文件传输"));
      const lanes = hubParticipates
        ? [
            ["本机 -> Hub", "127.0.0.1:" + hubPort],
            ["本机 -> Worker", workerPorts.length ? workerPorts.join(", ") : "未配置"],
            ["Worker -> Hub", "可用性批量上报"],
            ["Worker -> 本机", "实时日志/GPU/任务（WebSocket/SSE；快照备用）"],
            ["SFTP 文件", "低频代码/配置/结果/日志包"]
          ]
        : [
            ["本机 -> Worker", workerPorts.length ? workerPorts.join(", ") : "未配置"],
            ["Worker 调度", topology.mode === "worker_pool" ? "各 Worker 独立处理确定性任务分片" : "Worker 本机处理完整 Plan"],
            ["Worker -> 本机", "有界状态与事件；至少 60 秒采样"],
            ["SFTP 文件", "仅用户触发上传或下载；无自动备份"],
            ["Hub 链路", "当前模式不访问 Hub"]
          ];
      return '<div class="serverTopologyMap" data-anchor="servers-sessions" title="通信拓扑">' +
        '<div class="topologyHeader"><b>' + esc(topology.modeLabel || topologyModeLabel(topology.mode)) + '</b><span>' + esc(topology.schedulerOwner || "拓扑待确认") + ' · 自动周期 ' + esc(poll) + '-' + esc(poll + jitter) + 's · Worker ' + esc(enabledCount) + '/' + esc(workers.length) + '</span></div>' +
        '<div class="topologyGrid">' + nodes.join("") + '</div>' +
        '<div class="topologyLanes">' + lanes.map((lane) => '<div class="topologyLane" title="' + escAttr(lane[1]) + '"><b>' + esc(lane[0]) + '</b><span>' + esc(lane[1]) + '</span></div>').join("") + '</div>' +
      '</div>';
    }

    function topologyModeLabel(mode) {
      if (mode === "single_worker") return "单 Worker模式";
      if (mode === "worker_pool") return "仅多 Worker模式";
      if (mode === "hub_worker") return "Hub 可用模式";
      return "拓扑待确认";
    }

    function topologyNode(kind, title, detail) {
      return '<div class="topologyNode ' + escAttr(kind) + '" title="' + escAttr(detail) + '"><b>' + esc(title) + '</b><span>' + esc(detail) + '</span></div>';
    }

    function normalizeRemoteDestinationRoot(value) {
      let text = String(value || "").trim().split("\\\\").join("/");
      while (text.includes("//")) text = text.split("//").join("/");
      while (text.length > 1 && text.endsWith("/")) text = text.slice(0, -1);
      return !text || text === "/" || text === "." || text === ".." ? "" : text;
    }

    function remoteDestinationRootIssue(root, projectName) {
      if (!root) return "请填写项目父目录";
      const segments = root.split("/").filter(Boolean);
      const lowerSegments = segments.map((item) => item.toLowerCase());
      if (lowerSegments.includes("zlk_agent")) return "不要填写 zlk_agent；请填写它的父目录";
      return "";
    }

    function remoteDestinationRootWarning(root, projectName) {
      if (!root || !String(projectName || "").trim()) return "";
      const segments = root.split("/").filter(Boolean);
      const suggestedRoot = remoteDestinationParentRoot(root);
      return segments.length && segments[segments.length - 1].toLowerCase() === String(projectName).toLowerCase()
        ? "路径末级与项目名相同；" + (suggestedRoot ? "建议改为 " + suggestedRoot : "请改填项目父目录") + "，否则项目名会重复"
        : "";
    }

    function remoteDestinationParentRoot(value) {
      const root = normalizeRemoteDestinationRoot(value);
      const separator = root.lastIndexOf("/");
      return separator > 0 ? normalizeRemoteDestinationRoot(root.slice(0, separator)) : "";
    }

    function updateServerDestinationPreview(input) {
      if (!input || !input.dataset || input.dataset.key !== "agentProjectDir") return;
      const scope = String(input.dataset.configInput || "");
      const preview = Array.from(document.querySelectorAll("[data-destination-preview]")).find((item) => String(item.dataset.destinationPreview || "") === scope);
      if (!preview) return;
      const root = normalizeRemoteDestinationRoot(input.value);
      const projectName = String(preview.dataset.projectName || "");
      const issue = remoteDestinationRootIssue(root, projectName);
      const warning = remoteDestinationRootWarning(root, projectName);
      const codePath = root && projectName ? root + "/" + projectName : root ? "打开本地项目后显示" : "保存项目父目录后显示";
      const runtimePath = root ? root + "/zlk_agent/zlk_cluster/runtime" : "保存项目父目录后显示";
      const code = preview.querySelector('[data-destination-kind="code"]');
      const runtime = preview.querySelector('[data-destination-kind="runtime"]');
      const status = preview.querySelector("[data-destination-status]");
      if (code) code.textContent = codePath;
      if (runtime) runtime.textContent = runtimePath;
      if (status) status.textContent = issue || warning || (!projectName ? "未保存预览；打开本地项目后计算代码目录" : "未保存预览；点击保存服务器后生效");
      preview.classList.add("draft");
      preview.classList.toggle("error", Boolean(issue));
      setNativeTitle(preview, issue || warning || "当前为未保存预览；上传和 Agent 启动仍使用已保存配置");
    }

    function renderServerDestinationPreview(agentState, scope) {
      const item = agentState && typeof agentState === "object" ? agentState : {};
      const codePath = meaningfulValue(item.workDir);
      const installDir = meaningfulValue(item.installDir).replace(/\\/+$/, "");
      const runtimePath = installDir ? installDir + "/zlk_cluster/runtime" : "";
      const projectName = meaningfulValue(item.projectName);
      const hasRoot = Boolean(meaningfulValue(item.actualWorkRoot));
      const codeMissing = hasRoot && !projectName ? "打开本地项目后显示" : "保存项目父目录后显示";
      const runtimeMissing = "保存项目父目录后显示";
      const title = projectName ? "按当前本地项目名计算；修改项目父目录后需先保存服务器配置" : "已保存项目父目录；打开本地项目后再计算代码上传位置";
      return '<div class="serverDestinationPreview" data-destination-preview="' + escAttr(scope || "") + '" data-project-name="' + escAttr(projectName) + '" title="' + escAttr(title) + '">' +
        '<span>当前项目代码</span><code data-destination-kind="code">' + esc(codePath || codeMissing) + '</code>' +
        '<span>Agent runtime</span><code data-destination-kind="runtime">' + esc(runtimePath || runtimeMissing) + '</code>' +
        '<span class="destinationPreviewStatus" data-destination-status>' + esc(hasRoot && !projectName ? "已保存服务器根目录；等待打开本地项目" : "基于已保存配置") + '</span>' +
      '</div>';
    }

    function renderServerCardsV2(state) {
      const setup = state.setup || {};
      const topology = state.topology || {};
      const hubParticipates = topology.hubAllowed === true;
      const scheduler = state.schedulerConfig || {};
      const agent = state.agentSessions || {};
      const indexes = serverStatusIndexesForState(state);
      const conflicts = indexes.conflicts;
      const workerStatus = indexes.workerStatus;
      const assignmentById = indexes.assignmentById;
      const conflictById = indexes.conflictById;
      const hubName = setup.hubDisplayName || setup.sshConfigAlias || setup.hubHost || "Hub";
      const hubAssignment = assignmentById.get("hub") || {};
      const hubAgent = agent.hub || {};
      const hubSession = sessionForPath(setup.savedSessionPath);
      const cards = [];
      const topologyIssues = asArray(topology.issues || []);
      cards.push(
        '<div class="server-card" data-anchor="settings-topology">' +
          '<div class="serverHead"><div class="serverTitle"><h3>服务器拓扑</h3><div class="muted">项目级模式；不会迁移已有任务或结果</div></div>' +
          '<div class="serverBadges"><span class="pill ' + (topology.valid ? "status-completed" : "status-warning") + '">' + esc(topology.valid ? "配置一致" : "待确认或修复") + '</span></div></div>' +
          '<div class="configGrid">' +
            configSelect("topology", "mode", "拓扑模式", topology.mode || "", [["", "请选择"], ["single_worker", "单 Worker"], ["worker_pool", "仅多 Worker"], ["hub_worker", "Hub 可用"]]) +
          '</div>' +
          '<div class="taskDetailMeta">' +
            taskDetailLine("调度所有者", esc(topology.schedulerOwner || "尚未确认")) +
            taskDetailLine("状态与结果", esc(topology.stateOwner || "尚未确认")) +
            taskDetailLine("自动备份", esc(topology.hubAllowed ? "沿用 Hub 归档链路" : "不创建 Hub 或跨节点副本")) +
            taskDetailLine("启用 Worker", esc(String(topology.workerCount || 0))) +
          '</div>' +
          (topologyIssues.length ? '<div class="status-warning">' + esc(topologyIssues.join("；")) + '</div>' : '') +
          '<div class="toolbar"><button data-command="saveTopologyMode" data-config-scope="topology">保存拓扑</button></div>' +
          '<div class="muted">模式变更会显示强确认。仅 Worker 旧项目必须明确选择；旧 Hub 配置在无 Hub 模式下保留但不参与运行。</div>' +
        '</div>'
      );
      cards.push(
        '<div class="server-card" data-anchor="servers-scheduler">' +
          '<div class="serverHead"><div class="serverTitle"><h3>调度与上报策略</h3><div class="muted">低频稳态、随机抖动与实时事件边界</div></div>' +
          '<div class="serverBadges">' +
            '<span class="pill">调度 ' + esc(configDefault(scheduler.pollSeconds, 60)) + 's</span>' +
            '<span class="pill">抖动 0-' + esc(configDefault(scheduler.jitterSeconds, 30)) + 's</span>' +
            '<span class="pill">TTL ' + esc(configDefault(scheduler.workerStatusTtlSeconds, 180)) + 's</span>' +
          '</div></div>' +
          '<div class="configGrid">' +
            configInput("scheduler", "pollSeconds", "调度轮询基准(秒)", configDefault(scheduler.pollSeconds, 60), "number") +
            configInput("scheduler", "jitterSeconds", "正向随机抖动(秒)", configDefault(scheduler.jitterSeconds, 30), "number") +
            configInput("scheduler", "workerStatusTtlSeconds", "可用性缓存 TTL(秒)", configDefault(scheduler.workerStatusTtlSeconds, 180), "number") +
            configInput("scheduler", "localAvailabilityPushSeconds", "本机汇总上报间隔(秒)", configDefault(scheduler.localAvailabilityPushSeconds, 60), "number") +
            configInput("scheduler", "workerAvailabilityPushSeconds", "Worker 上报间隔(秒)", configDefault(scheduler.workerAvailabilityPushSeconds, 60), "number") +
            configInput("scheduler", "operationEventMaxDelayMs", "实时事件最多等待(毫秒)", configDefault(scheduler.operationEventMaxDelayMs, 1000), "number") +
            configInput("scheduler", "workerActionMinIntervalMs", "Worker 操作防连点间隔(毫秒)", configDefault(scheduler.workerActionMinIntervalMs, 1500), "number") +
            configInput("scheduler", "workerActionMaxConcurrent", "Worker 操作同时执行数", configDefault(scheduler.workerActionMaxConcurrent, 1), "number") +
          '</div>' +
          renderSchedulerGlossary() +
          '<div class="toolbar">' +
            '<button data-command="saveSchedulerConfig" data-config-scope="scheduler">保存策略</button>' +
            '<button data-command="snapshot" class="secondary">刷新数据</button>' +
          '</div>' +
          '<div class="muted">所有自动轮询和可用性上报都使用正向随机抖动。TTL 表示 Hub 本地缓存有效期，不是轮询频率。实时事件延迟只影响停止、删除、归档和任务状态推送聚合。</div>' +
        '</div>'
      );
      if (hubParticipates) cards.push(
        '<div class="server-card" data-anchor="servers-hub">' +
          '<div class="serverHead"><div class="serverTitle"><h3>' + esc(hubName) + '</h3><div class="muted">Hub 控制面</div></div>' +
          '<div class="serverBadges">' +
            '<span class="pill">127.0.0.1:' + esc(setup.localForwardPort || hubAssignment.localForwardPort || "-") + '</span>' +
            '<span class="pill">Agent ' + esc(setup.remoteAgentPort || hubAssignment.remoteServicePort || "-") + '</span>' +
            sessionStatusCell(conflictById.get("hub"), (state.health || {}).state || "未检测") +
          '</div></div>' +
          '<div class="configGrid">' +
            configInput("hub", "hubDisplayName", "显示名称", hubName) +
            configInput("hub", "hubHost", "服务器地址", setup.hubHost || "") +
            configInput("hub", "transferHost", "SFTP 传输地址", setup.transferHost || "", "text", "wide") +
            configInput("hub", "hubUser", "登录用户", setup.hubUser || "") +
            configInput("hub", "condaEnv", "Conda 环境（可选）", setup.condaEnv || "") +
            configInput("hub", "sshConfigAlias", "登录别名", setup.sshConfigAlias || "") +
            configInput("hub", "agentProjectDir", "项目父目录", setup.agentProjectDir || "", "text", "wide") +
            configSessionSelect("hub", "savedSessionPath", "Xshell 隧道会话", setup.savedSessionPath || "") +
            configPortPair("hub", "隧道端口对", "localForwardPort", "remoteAgentPort", setup.localForwardPort || hubAssignment.localForwardPort || "", setup.remoteAgentPort || hubAssignment.remoteServicePort || "", hubSession, "savedSessionForwardIndex", setup.savedSessionForwardIndex) +
          '</div>' +
          renderServerDestinationPreview(hubAgent, "hub") +
          renderSchedulerDependencyStatus(((state.probe || {}).schedulerDependencies), hubName) +
          '<div class="toolbar">' +
            '<button data-command="saveHubConfig" data-config-scope="hub">保存 Hub</button>' +
            '<button data-command="configureSessions" class="secondary">扫描选择会话</button>' +
            '<button data-command="startTunnelEndpoint" data-endpoint-id="hub" data-confirm="true" class="secondary">启动隧道</button>' +
            '<button data-command="test" class="secondary">检测</button>' +
          '</div>' +
        '</div>'
      );
      else cards.push(
        '<div class="server-card" data-anchor="servers-hub">' +
          '<div class="serverHead"><div class="serverTitle"><h3>Hub 不参与当前模式</h3><div class="muted">旧 Hub 配置保持只读兼容，不会清除或迁移</div></div></div>' +
          '<div class="taskDetailMeta">' +
            taskDetailLine("当前模式", esc(topology.modeLabel || topologyModeLabel(topology.mode))) +
            taskDetailLine("调度", esc(topology.schedulerOwner || "尚未确认")) +
            taskDetailLine("Hub 请求", "禁用") +
            taskDetailLine("自动备份", "禁用") +
          '</div>' +
          '<div class="muted">切换并保存为 Hub 可用模式后，原 Hub 字段和操作会重新显示。</div>' +
        '</div>'
      );
      (setup.workerTunnels || []).forEach((worker) => {
        const assignment = assignmentById.get(String(worker.id)) || {};
        const status = worker.enabled === false ? "禁用" : ((workerStatus.get(String(worker.id)) || {}).status || "已配置");
        const workerAgent = indexes.agentWorkerById.get(String(worker.id)) || {};
        const scope = "worker:" + String(worker.id);
        const workerSession = sessionForPath(worker.savedSessionPath);
        cards.push(
          '<div class="server-card" data-anchor="' + escAttr(treeAnchorId("servers-worker", worker.id || worker.displayName)) + '">' +
            '<div class="serverHead"><div class="serverTitle"><h3>' + esc(worker.displayName || worker.id) + '</h3><div class="muted">Worker 实时观测 · ' + esc(worker.id) + '</div></div>' +
            '<div class="serverBadges">' +
              '<span class="pill">127.0.0.1:' + esc(worker.localForwardPort || assignment.localForwardPort || "-") + '</span>' +
              '<span class="pill">Telemetry ' + esc(worker.remoteTelemetryPort || worker.remoteAgentPort || assignment.remoteServicePort || "-") + '</span>' +
              sessionStatusCell(conflictById.get(String(worker.id)), status) +
            '</div></div>' +
            '<div class="configGrid">' +
              configInput(scope, "displayName", "显示名称", worker.displayName || worker.id) +
            configInput(scope, "workerHost", "服务器地址", worker.workerHost || worker.hubHost || "") +
            configInput(scope, "transferHost", "SFTP 传输地址", worker.transferHost || "", "text", "wide") +
            configInput(scope, "workerUser", "登录用户", worker.workerUser || worker.hubUser || "") +
            configInput(scope, "condaEnv", "Conda 环境（可选）", worker.condaEnv === undefined ? (setup.condaEnv || "") : worker.condaEnv) +
            configInput(scope, "sshConfigAlias", "登录别名", worker.sshConfigAlias || "") +
            configInput(scope, "agentProjectDir", "项目父目录", worker.agentProjectDir || "", "text", "wide") +
            configInput(scope, "maxConcurrentGpus", "并发占卡上限", worker.maxConcurrentGpus || 1, "number") +
            configInput(scope, "allowedGpuIds", "允许 GPU 列表", Array.isArray(worker.allowedGpuIds) ? worker.allowedGpuIds.join(", ") : "", "text", "wide") +
            configSessionSelect(scope, "savedSessionPath", "Xshell 隧道会话", worker.savedSessionPath || "") +
            configPortPair(scope, "隧道端口对", "localForwardPort", "remoteTelemetryPort", worker.localForwardPort || assignment.localForwardPort || "", worker.remoteTelemetryPort || worker.remoteAgentPort || assignment.remoteServicePort || "", workerSession, "savedSessionForwardIndex", worker.savedSessionForwardIndex) +
            configSelect(scope, "enabled", "启用状态", worker.enabled === false ? "false" : "true", [["true", "启用"], ["false", "禁用"]]) +
          '</div>' +
          renderServerDestinationPreview(workerAgent, scope) +
          renderSchedulerDependencyStatus((((state.workerProbes || {})[worker.id] || {}).schedulerDependencies), worker.displayName || worker.id) +
          '<div class="toolbar">' +
            '<button data-command="saveWorkerConfig" data-endpoint-id="' + escAttr(worker.id) + '" data-config-scope="' + escAttr(scope) + '">保存服务器</button>' +
            '<button data-command="startTunnelEndpoint" data-endpoint-id="' + escAttr(worker.id) + '" data-confirm="true" class="secondary">启动隧道</button>' +
            '<button data-command="deleteWorkerConfig" data-endpoint-id="' + escAttr(worker.id) + '" data-danger="true" class="secondary">删除</button>' +
            '</div><div class="muted">允许 GPU 列表留空表示不限制；多个 GPU ID 用逗号或空格分隔。并发占卡上限只限制同一台 Worker 同时占用的卡数，不限制排队总量。</div>' +
          '</div>'
        );
      });
      const pathConfirmationState = state.remotePathConfirmations || {};
      const pathConfirmationCount = Math.max(0, Number(pathConfirmationState.count || 0));
      const pathConfirmationStateFile = String(pathConfirmationState.stateFile || "zlk_cluster/ui/remote_path_confirmations.json");
      const pathConfirmationTools = '<div class="settingsLayoutTools" data-anchor="settings-path-confirmations" title="' + escAttr("当前项目状态文件：" + pathConfirmationStateFile) + '">' +
        '<b>上传路径提醒</b>' +
        '<span class="muted">' + (pathConfirmationCount
          ? '当前项目已记住 ' + esc(String(pathConfirmationCount)) + ' 个远端路径'
          : '当前项目没有关闭提醒的远端路径') + '</span>' +
        '<button type="button" class="secondary" data-command="resetRemotePathConfirmations"' + (pathConfirmationCount ? '' : ' disabled') + '>恢复提醒</button>' +
      '</div>';
      const pptPathConfirmationState = state.pptPathConfirmations || {};
      const pptPathConfirmationCount = Math.max(0, Number(pptPathConfirmationState.count || 0));
      const pptPathConfirmationStateFile = String(pptPathConfirmationState.stateFile || "zlk_cluster/ui/ppt_path_confirmations.json");
      const pptPathConfirmationTools = '<div class="settingsLayoutTools" data-anchor="settings-ppt-path-confirmations" title="' + escAttr("当前项目状态文件：" + pptPathConfirmationStateFile) + '">' +
        '<b>PPT 路径提醒</b>' +
        '<span class="muted">' + (pptPathConfirmationCount
          ? '当前项目已记住 ' + esc(String(pptPathConfirmationCount)) + ' 个 PPT 目标'
          : '当前项目没有关闭提醒的 PPT 目标') + '</span>' +
        '<button type="button" class="secondary" data-command="resetPptPathConfirmations"' + (pptPathConfirmationCount ? '' : ' disabled') + '>恢复提醒</button>' +
      '</div>';
      const conflictNote = conflicts.length
        ? '<div class="status-warning">存在 ' + conflicts.length + ' 个端口冲突。请检查 Xshell 会话里的本机端口对，确保所有已启用端点端口唯一。</div>'
        : "";
      const xshellBudgetNote = renderXshellSessionBudgetNote(state);
      setHtmlIfChanged("serverSettingsCards",
        '<div class="serverStack">' + cards.join("") + '</div>' +
        pathConfirmationTools +
        pptPathConfirmationTools +
        conflictNote +
        xshellBudgetNote +
        '<div class="muted">Xshell 会话文件配置源。</div>');
    }

    function renderServerCards(state) {
      setHtmlIfChanged("serverCards",
        renderServerTopologyMap(state) +
        renderServerObjectOverview(state) +
        '<div class="toolbar">' +
          '<button type="button" data-section-target="settings" data-anchor-target="settings-servers">设置</button>' +
          '<button data-command="addWorkerConfig">新增服务器</button>' +
          '<button data-command="startAll" class="secondary">启动全部隧道</button>' +
          '<button data-command="prepareAgents">准备 Agent 并启动</button>' +
          '<button data-command="startAllConnections" class="secondary">启动连接</button>' +
          '<button data-command="testAll" class="secondary">检测全部</button>' +
        '</div>');
    }

    function renderSchedulerDependencyStatus(dependency, label) {
      if (!dependency || typeof dependency !== "object") return '<div class="schedulerDependencyStatus warn"><b>Scheduler 依赖待检测</b><span class="muted">点击“检测全部”读取 ' + esc(label || "端点") + ' 的 Python 与 PyYAML 状态。</span></div>';
      const environment = dependency.environment || {};
      const environmentLabel = environment.label || (environment.name ? "Conda " + environment.name : "系统 Python");
      const installCommand = String(dependency.installCommand || "").trim();
      const ready = dependency.ok === true;
      return '<div class="schedulerDependencyStatus ' + (ready ? "" : "warn") + '" title="' + escAttr(dependency.message || "") + '">' +
        '<b>' + esc(ready ? "Scheduler 依赖已就绪" : "Scheduler 依赖缺失") + '</b>' +
        '<span>' + esc(environmentLabel) + (environment.python ? ' · <span title="' + escAttr(environment.python) + '">' + esc(compactPath(environment.python)) + '</span>' : '') + '</span>' +
        (!ready && dependency.message ? '<span class="muted">' + esc(dependency.message) + '</span>' : '') +
        (installCommand ? '<code title="' + escAttr(installCommand) + '">' + esc(installCommand) + '</code>' : '') +
      '</div>';
    }

    function renderServerSettings(state) {
      return renderServerCardsV2(state);
    }

    function updateConfigDraft(input) {
      const scope = String((input && input.dataset && input.dataset.configInput) || "");
      const key = String((input && input.dataset && input.dataset.key) || "");
      if (!scope || !key) return;
      if (!configDrafts[scope]) configDrafts[scope] = {};
      configDrafts[scope][key] = configInputValue(input);
    }

    function configDraftValue(scope, key, fallback) {
      const draft = configDrafts[String(scope || "")] || {};
      return Object.prototype.hasOwnProperty.call(draft, key) ? draft[key] : fallback;
    }

    function activeConfigScope() {
      const active = document.activeElement;
      return active && active.dataset && active.dataset.configInput ? String(active.dataset.configInput || "") : "";
    }

    function configScopeHasDraft(scope) {
      const draft = configDrafts[String(scope || "")] || {};
      return Object.keys(draft).length > 0;
    }

    function shouldKeepConfigDraftScope(scope) {
      const key = String(scope || "");
      if (!key) return false;
      if (activeConfigScope() === key) return true;
      return configScopeHasDraft(key);
    }

    function isServerConfigScope(scope) {
      const key = String(scope || "");
      return key === "topology" || key === "hub" || key === "scheduler" || key.startsWith("worker:");
    }

    function shouldKeepServerConfigDraft() {
      const activeScope = activeConfigScope();
      if (isServerConfigScope(activeScope)) return true;
      const hasServerDraft = Object.keys(configDrafts).some((scope) => isServerConfigScope(scope) && configScopeHasDraft(scope));
      if (Date.now() < serverConfigEditLockUntil && hasServerDraft) return true;
      return hasServerDraft;
    }

    function shouldFastPathConfigEdit() {
      const active = document.activeElement;
      return Boolean(active && active.dataset && (active.dataset.configInput || active.dataset.planPreview || active.dataset.configFilter));
    }

    function isPlanPreviewEditor(input) {
      return Boolean(input && input.dataset && input.dataset.planPreview);
    }

    function shouldKeepPlanPreviewDraft(state) {
      const editor = document.querySelector('textarea[data-plan-preview="true"]');
      if (!editor) return false;
      const selectedPlan = String((state && (state.planFileInput || ((state.selection || {}).selectedPlanId))) || "");
      if (!selectedPlan || !samePlanSelection(editor.dataset.planFile || "", selectedPlan)) return false;
      if (document.activeElement === editor) return true;
      return Date.now() < planPreviewEditLockUntil;
    }

    function clearConfigDraftsForCommand(command, context) {
      const value = String(command || "");
      const scope = String((context && context.configScope) || "");
      const endpointId = String((context && context.endpointId) || "");
      if (scope) {
        delete configDrafts[scope];
        if (!hasConfigDrafts()) serverConfigEditLockUntil = 0;
        return;
      }
      if (value === "saveHubConfig") delete configDrafts.hub;
      if (value === "saveTopologyMode") delete configDrafts.topology;
      if (value === "saveSchedulerConfig") delete configDrafts.scheduler;
      if (value === "saveProjectAdapterRules") delete configDrafts.projectAdapterRules;
      if (value === "savePptPlotConfig" || value === "choosePptPath" || value === "chooseNewPptPath") delete configDrafts.ppt;
      if (value === "saveWorkerConfig" && endpointId) delete configDrafts["worker:" + endpointId];
      if (!hasConfigDrafts()) serverConfigEditLockUntil = 0;
    }

    function hasConfigDrafts() {
      return Object.keys(configDrafts).some((scope) => Object.keys(configDrafts[scope] || {}).length);
    }

    function detailsOpenAttr(key, defaultOpen) {
      const stored = detailIsOpen(key, defaultOpen);
      return stored ? " open" : "";
    }

    function detailIsOpen(key, defaultOpen) {
      return Object.prototype.hasOwnProperty.call(detailsOpenState, key) ? detailsOpenState[key] : defaultOpen;
    }

    function scheduleStatusInfoPopoverClose(details) {
      clearStatusInfoPopoverClose(details);
      const timer = setTimeout(() => {
        if (!details.isConnected) {
          statusInfoPopoverTimers.delete(details);
          return;
        }
        details.open = false;
        statusInfoPopoverTimers.delete(details);
      }, 10000);
      statusInfoPopoverTimers.set(details, timer);
    }

    function clearStatusInfoPopoverClose(details) {
      const timer = statusInfoPopoverTimers.get(details);
      if (timer) clearTimeout(timer);
      statusInfoPopoverTimers.delete(details);
    }

    function cleanupDetachedStatusInfoPopoverTimers() {
      statusInfoPopoverTimers.forEach((timer, details) => {
        if (details && details.isConnected) return;
        clearTimeout(timer);
        statusInfoPopoverTimers.delete(details);
      });
    }

    function configInput(scope, key, label, value, type, cls) {
      const help = configHelp(scope, key);
      const title = help ? ' title="' + escAttr(help) + '"' : "";
      const bounds = configInputBounds(scope, key);
      value = configDraftValue(scope, key, value);
      // min/max attributes alone are advisory: the save path reads input.value directly, so an
      // out-of-range value saves silently and the allowed range is never stated anywhere.
      const hint = configBoundsHint(bounds);
      const violation = configBoundsViolation(bounds, value);
      const hintHtml = hint ? '<span class="configBoundsHint" title="' + escAttr(hint) + '">' + esc(hint) + '</span>' : "";
      const violationHtml = violation ? '<span class="configBoundsError" title="' + escAttr(label + "：" + violation) + '">' + esc(violation) + '</span>' : "";
      return '<div class="field ' + escAttr(cls || "") + (violation ? " is-invalid" : "") + '"' + title + '><label' + title + '>' + esc(label) + helpBadge(help) + hintHtml + '</label><input' + title + configBoundsAttrs(bounds) + ' data-config-input="' + escAttr(scope) + '" data-key="' + escAttr(key) + '" type="' + escAttr(type || "text") + '" value="' + escAttr(displayValue(value)) + '"' + (violation ? ' aria-invalid="true"' : "") + '>' + violationHtml + '</div>';
    }

    function configBoundsHint(bounds) {
      if (!bounds) return "";
      const hasMin = meaningfulValue(bounds.min) !== "";
      const hasMax = meaningfulValue(bounds.max) !== "";
      if (hasMin && hasMax) return bounds.min + "–" + bounds.max;
      if (hasMin) return "≥ " + bounds.min;
      if (hasMax) return "≤ " + bounds.max;
      return "";
    }

    function configBoundsViolation(bounds, value) {
      if (!bounds) return "";
      const bounded = meaningfulValue(bounds.min) !== "" || meaningfulValue(bounds.max) !== "";
      if (!bounded) return "";
      const text = String(value === undefined || value === null ? "" : value).trim();
      if (!text) return "";
      const number = Number(text);
      if (!Number.isFinite(number)) return "需要填写数字";
      if (meaningfulValue(bounds.min) !== "" && number < Number(bounds.min)) return "不得小于 " + bounds.min;
      if (meaningfulValue(bounds.max) !== "" && number > Number(bounds.max)) return "不得大于 " + bounds.max;
      return "";
    }

    function renderXshellSessionBudgetNote(state) {
      const xshell = (state || {}).xshellSessions || {};
      const omitted = Number(xshell.omittedCount || 0);
      if (!omitted) return "";
      const visible = Number(xshell.visibleCount || asArray(xshell.sessions || []).length || 0);
      const total = Number(xshell.totalCount || visible + omitted);
      return '<div class="taskRenderBudgetNotice" title="会话 ' + escAttr(String(visible)) + '/' + escAttr(String(total)) + '">Xshell 会话 ' + esc(String(visible)) + ' / ' + esc(String(total)) + '；省略 ' + esc(String(omitted)) + '</div>';
    }

    function configSessionSelect(scope, key, label, value) {
      const help = configHelp(scope, key);
      const title = help ? ' title="' + escAttr(help) + '"' : "";
      const sessions = (((lastState || {}).xshellSessions || {}).sessions || []);
      value = configDraftValue(scope, key, value);
      const known = sessions.some((session) => samePath(session.filePath, value));
      const options = [];
      if (value && !known) options.push('<option value="' + escAttr(value) + '" selected>' + esc(value) + '</option>');
      options.push('<option value="">未选择</option>');
      sessions.forEach((session) => {
        const selected = samePath(session.filePath, value) ? " selected" : "";
        options.push('<option value="' + escAttr(session.filePath) + '"' + selected + '>' + esc(sessionLabel(session)) + '</option>');
      });
      return '<div class="field wide"' + title + '><label' + title + '>' + esc(label) + helpBadge(help) + '</label><select' + title + ' data-config-input="' + escAttr(scope) + '" data-key="' + escAttr(key) + '">' + options.join("") + '</select></div>';
    }

    function configPortPair(scope, label, localKey, remoteKey, localValue, remoteValue, session, indexKey, selectedIndex) {
      const localHelp = configHelp(scope, localKey);
      const remoteHelp = configHelp(scope, remoteKey);
      const pairHelp = [localHelp, remoteHelp].filter(Boolean).join("；");
      const title = pairHelp ? ' title="' + escAttr(pairHelp) + '"' : "";
      const forwards = (session && Array.isArray(session.forwards)) ? session.forwards : [];
      localValue = configDraftValue(scope, localKey, localValue);
      remoteValue = configDraftValue(scope, remoteKey, remoteValue);
      selectedIndex = configDraftValue(scope, indexKey || "savedSessionForwardIndex", selectedIndex);
      if (forwards.length) {
        const current = forwards.find((forward) => String(forward.index) === String(selectedIndex))
          || forwards.find((forward) => String(forward.localPort) === String(localValue) && String(forward.remotePort) === String(remoteValue))
          || forwards[0];
        return '<div class="field portPair" data-port-pair-scope="' + escAttr(scope) + '"' + title + '><label' + title + '>' + esc(label) + helpBadge(pairHelp) + '</label>' +
          '<select' + title + ' data-config-input="' + escAttr(scope) + '" data-key="' + escAttr(indexKey || "savedSessionForwardIndex") + '">' +
            forwards.map((forward) => '<option value="' + escAttr(forward.index) + '"' + (current && forward.index === current.index ? " selected" : "") + '>' + esc(forwardPairLabel(forward)) + '</option>').join("") +
          '</select><div class="muted">已读取 Xshell FwdReq。</div></div>';
      }
      return '<div class="field portPair" data-port-pair-scope="' + escAttr(scope) + '"' + title + '><label' + title + '>' + esc(label) + helpBadge(pairHelp) + '</label>' +
        '<div class="portPairBox">' +
          '<div class="portPairSide"><span class="portPairHost">127.0.0.1:</span><input' + (localHelp ? ' title="' + escAttr(localHelp) + '"' : "") + configBoundsAttrs(configInputBounds(scope, localKey)) + ' data-config-input="' + escAttr(scope) + '" data-key="' + escAttr(localKey) + '" type="number" value="' + escAttr(localValue || "") + '"></div>' +
          '<span class="portPairArrow">-></span>' +
          '<div class="portPairSide"><span class="portPairHost">127.0.0.1:</span><input' + (remoteHelp ? ' title="' + escAttr(remoteHelp) + '"' : "") + configBoundsAttrs(configInputBounds(scope, remoteKey)) + ' data-config-input="' + escAttr(scope) + '" data-key="' + escAttr(remoteKey) + '" type="number" value="' + escAttr(remoteValue || "") + '"></div>' +
        '</div><div class="muted">当前会话文件未解析到 FwdReq，才需要手动填写。</div></div>';
    }

    function configSelect(scope, key, label, value, options) {
      const help = configHelp(scope, key);
      const title = help ? ' title="' + escAttr(help) + '"' : "";
      value = configDraftValue(scope, key, value);
      return '<div class="field"' + title + '><label' + title + '>' + esc(label) + helpBadge(help) + '</label><select' + title + ' data-config-input="' + escAttr(scope) + '" data-key="' + escAttr(key) + '">' +
        options.map((option) => '<option value="' + escAttr(option[0]) + '"' + (String(value) === String(option[0]) ? " selected" : "") + '>' + esc(option[1]) + '</option>').join("") +
        '</select></div>';
    }

    function configInputBounds(scope, key) {
      const portBounds = { min: 1024, max: 65535, step: 1 };
      if (["localForwardPort", "remoteAgentPort", "remoteTelemetryPort"].includes(key)) return portBounds;
      if (key === "maxConcurrentGpus") return { min: 1, max: 16, step: 1 };
      if (scope === "scheduler") {
        const map = {
          pollSeconds: { min: 60, max: 3600, step: 1 },
          jitterSeconds: { min: 0, max: 1800, step: 1 },
          workerStatusTtlSeconds: { min: 60, max: 7200, step: 1 },
          localAvailabilityPushSeconds: { min: 60, max: 3600, step: 1 },
          workerAvailabilityPushSeconds: { min: 60, max: 3600, step: 1 },
          operationEventMaxDelayMs: { min: 100, max: 10000, step: 100 },
          workerActionMinIntervalMs: { min: 500, max: 60000, step: 100 },
          workerActionMaxConcurrent: { min: 1, max: 16, step: 1 }
        };
        return map[key] || {};
      }
      return {};
    }

    function configBoundsAttrs(bounds) {
      if (!bounds) return "";
      const attrs = [];
      if (meaningfulValue(bounds.min)) attrs.push(' min="' + escAttr(bounds.min) + '"');
      if (meaningfulValue(bounds.max)) attrs.push(' max="' + escAttr(bounds.max) + '"');
      if (meaningfulValue(bounds.step)) attrs.push(' step="' + escAttr(bounds.step) + '"');
      return attrs.join("");
    }

    function sessionPathKey(value) {
      return value ? String(value).replace(/\\\\/g, "/").toLowerCase() : "";
    }
    function xshellSessionPathIndex() {
      const rows = (((lastState || {}).xshellSessions || {}).sessions);
      const source = Array.isArray(rows) ? rows : EMPTY_XSHELL_SESSIONS;
      if (source === xshellSessionIndexCacheSource && xshellSessionIndexCacheValue) return xshellSessionIndexCacheValue;
      const index = new Map();
      source.forEach((session) => {
        const key = sessionPathKey(session && session.filePath);
        if (key && !index.has(key)) index.set(key, session);
      });
      xshellSessionIndexCacheSource = source;
      xshellSessionIndexCacheValue = index;
      return index;
    }
    function sessionForPath(value) {
      const key = sessionPathKey(value);
      return key ? xshellSessionPathIndex().get(key) : undefined;
    }
    function samePath(a, b) {
      if (!a || !b) return false;
      return sessionPathKey(a) === sessionPathKey(b);
    }
    function sessionLabel(session) {
      const forward = (session.forwards || []).map(forwardPairLabel).join("; ");
      const login = session.host ? ((session.userName || "-") + "@" + session.host + (session.port ? ":" + session.port : "")) : "";
      return [session.name || session.filePath, login, forward].filter(Boolean).join(" · ");
    }
    function forwardPairLabel(forward) {
      return "127.0.0.1:" + (forward.localPort || "-") + " -> " + (forward.remoteHost || "127.0.0.1") + ":" + (forward.remotePort || "-") + " (FwdReq_" + forward.index + ")";
    }

    function displayValue(value) {
      return value === undefined || value === null ? "" : String(value);
    }

    function configDefault(value, fallback) {
      return value === undefined || value === null || value === "" ? fallback : value;
    }

    function helpBadge(help) {
      return help ? '<span class="helpBadge" title="' + escAttr(help) + '">?</span>' : "";
    }

    function renderSchedulerGlossary() {
      const items = [
        ["实时事件最多等待", "停止、删除、归档、任务状态变化发生后，Worker 最多攒多久再推送；它不是轮询周期。", "数值越小越实时，但事件更多；默认 1000 毫秒。"],
        ["Worker 操作防连点间隔", "同一台 Worker 上两次手动控制动作的最小间隔，用来挡住重复点击。", "只影响停止、删除、归档、重试等手动操作。"],
        ["Worker 操作同时执行数", "允许多少个 Worker 控制动作同时在路上，不等于 GPU 任务并发。", "通常保持 1，避免同一时间堆积多个控制请求。"],
        ["可用性缓存 TTL", "Hub 认为 Worker 可用性快照还可信的时间窗口。", "TTL 过期后不再新派任务，但它不是刷新频率。"]
      ];
      return '<div class="schedulerGlossary" title="调度参数">' +
        items.map((item) => '<div class="schedulerGlossaryItem" title="' + escAttr(item[2]) + '"><b>' + esc(item[0]) + '</b><span>' + esc(item[1]) + '</span></div>').join("") +
      '</div>';
    }

    function configHelp(scope, key) {
      const schedulerHelp = {
        pollSeconds: "调度间隔(秒)",
        jitterSeconds: "随机抖动(秒)",
        workerStatusTtlSeconds: "Worker TTL(秒)",
        localAvailabilityPushSeconds: "Local 上报(秒)",
        workerAvailabilityPushSeconds: "Worker 上报(秒)",
        operationEventMaxDelayMs: "事件合并(ms)",
        workerActionMinIntervalMs: "Worker 操作间隔(ms)",
        workerActionMaxConcurrent: "Worker 操作并发"
      };
      const workerHelp = {
        displayName: "显示名",
        workerHost: "Worker 地址",
        transferHost: "SFTP 地址",
        workerUser: "Worker 用户",
        condaEnv: "留空使用系统 Python，不执行 Conda 激活",
        sshConfigAlias: "登录别名",
        agentProjectDir: "服务器上存放项目的父目录；插件自动追加当前项目名",
        savedSessionPath: "负责保持 127.0.0.1 本地端口转发的 Xshell 隧道会话文件",
        agentSessionPath: "Agent 会话",
        localForwardPort: "插件访问的 127.0.0.1 本地转发端口",
        remoteTelemetryPort: "Worker 上由 Agent 监听的远端端口",
        enabled: "启用",
        maxConcurrentGpus: "GPU 并发上限",
        allowedGpuIds: "允许 GPU ID"
      };
      const hubHelp = {
        hubDisplayName: "面板中显示的 Hub 名称；为空时使用 Xshell 会话名、SSH 别名或主机名",
        hubHost: "Hub 地址",
        transferHost: "SFTP 地址",
        hubUser: "Hub 用户",
        condaEnv: "留空使用系统 Python，不执行 Conda 激活",
        sshConfigAlias: "登录别名",
        agentProjectDir: "服务器上存放项目的父目录；插件自动追加当前项目名",
        savedSessionPath: "负责保持 127.0.0.1 本地端口转发的 Xshell 隧道会话文件",
        agentSessionPath: "Agent 会话",
        localForwardPort: "插件访问的 127.0.0.1 本地转发端口",
        remoteAgentPort: "Hub 上由 Agent 监听的远端端口"
      };
      if (scope === "scheduler") return schedulerHelp[key] || "";
      if (scope === "hub") return hubHelp[key] || "";
      if (String(scope || "").startsWith("worker:")) return workerHelp[key] || "";
      return "";
    }

    function sessionStatusCell(conflict, status) {
      if (conflict) {
        const klass = conflict.severity === "error" ? "status-failed" : "status-warning";
        const label = conflict.severity === "error" ? (conflict.conflictType || "端口冲突") : "注意";
        return '<span class="pill ' + klass + '" title="' + escAttr((conflict.suggestion || conflict.message || "") + "；原始级别：" + (conflict.severity || "warning")) + '">' + esc(label) + '</span>';
      }
      return '<span class="pill ' + statusClass(status) + '">' + esc(labelStatus(status || "-")) + '</span>';
    }

    function renderHubWorkerAndPorts(state) {
      const sources = state.configurationSources || {};
      setHtmlIfChanged("configurationSources", configurationSourceCards(sources));
      const hub = state.hubControlStatus || {};
      setHtmlIfChanged("hubControlStatus", '<div class="endpointCardGrid">' + hubControlCards(hub).join("") + '</div>');
      const workers = state.workerTelemetryStatus || [];
      setHtmlIfChanged("workerTelemetryStatus", workers.length ? diagnosticBudgetedCardGrid(workers, DIAGNOSTIC_WORKER_CARD_LIMIT, workerTelemetryCard, "Worker 实时观测端点") : '<div class="muted">未配置 Worker 实时观测端点。</div>');
      const assignments = state.tunnelPortAssignments || [];
      setHtmlIfChanged("tunnelPortAssignments", assignments.length ? diagnosticBudgetedCardGrid(assignments, DIAGNOSTIC_PORT_ASSIGNMENT_LIMIT, (item) => portAssignmentCard(state, item), "隧道端口分配") : '<div class="muted">暂无端口分配。</div>');
      const conflicts = state.tunnelPortConflicts || [];
      setHtmlIfChanged("tunnelPortConflicts", conflicts.length ? '<div class="endpointConflictList">' + conflicts.slice(0, DIAGNOSTIC_PORT_CONFLICT_LIMIT).map(portConflictCard).join("") + diagnosticBudgetNotice("端口冲突", conflicts.length, DIAGNOSTIC_PORT_CONFLICT_LIMIT) + '</div>' : '<div class="muted">暂无端口冲突。</div>');
    }

    function diagnosticBudgetedCardGrid(items, limit, renderItem, label) {
      const visible = items.slice(0, limit);
      return '<div class="endpointCardGrid">' + visible.map(renderItem).join("") + '</div>' + diagnosticBudgetNotice(label, items.length, limit);
    }

    function diagnosticBudgetNotice(label, total, limit) {
      const hidden = Math.max(0, Number(total || 0) - Number(limit || 0));
      if (!hidden) return "";
      const unit = arguments.length >= 4 ? String(arguments[3] || "项") : "项";
      return '<div class="diagnosticBudgetNotice" title="' + escAttr("省略：" + hidden) + '">已省略 ' + esc(hidden) + ' ' + esc(unit) + esc(label || "诊断项") + '</div>';
    }

    function configurationSourceCards(sources) {
      const ignored = sources.workspaceWorkerConfigIgnored ? "已忽略空工作区 Worker 配置" : "未发现覆盖";
      return '<div class="endpointCardGrid">' +
        '<article class="endpointStatusCard ok" title="' + escAttr(sources.note || "服务器配置保存在 VS Code 全局扩展状态。") + '">' +
          '<div class="endpointCardHead"><div><b>主配置</b><div class="endpointCardSub">' + esc(sources.primary || "VS Code globalState") + '</div></div><span class="status-completed">' + esc(sources.endpointProfiles || "未导入") + '</span></div>' +
          '<div class="endpointMiniGrid">' +
            endpointMini("Hub 会话", sources.savedHubSession ? "已保存" : "未保存", "Hub Xshell 隧道会话是否已保存到全局状态") +
            endpointMini("Agent 会话", sources.savedHubAgentSession ? "已保存" : "未保存", "Hub Agent 启动会话是否已保存到全局状态") +
            endpointMini("Worker 档案", String(sources.savedWorkerCount || 0), "已保存的 Worker 全局端点档案数量") +
            endpointMini("工作区覆盖", ignored, "空 workerTunnels 设置不会覆盖已导入端点档案") +
          '</div>' +
        '</article>' +
      '</div>';
    }

    function hubControlCards(hub) {
      const apiCount = [hub.actionApi, hub.fileApi, hub.schedulerApi, hub.resultApi].filter(Boolean).length;
      const health = hub.health || "-";
      const endpoint = hub.localEndpoint || "-";
      return [
        '<article class="endpointStatusCard ' + endpointTone(health) + '" title="Hub 控制面">' +
          '<div class="endpointCardHead"><div><b>' + esc(hub.endpointId || "hub") + '</b><div class="endpointCardSub" title="' + escAttr(endpoint) + '">' + esc(endpoint) + '</div></div>' +
          '<span class="' + statusClass(health) + '">' + esc(labelStatus(health)) + '</span></div>' +
          '<div class="endpointMiniGrid">' +
            endpointMini("动作 API", hub.actionApi ? "可用" : "不可用", "actions") +
            endpointMini("调度 API", hub.schedulerApi ? "可用" : "不可用", "scheduler") +
            endpointMini("结果 API", hub.resultApi ? "可用" : "不可用", "results") +
            endpointMini("文件 API", hub.fileApi ? "可用" : "不可用", "file") +
          '</div>' +
        '</article>',
        '<article class="endpointStatusCard ' + (apiCount >= 3 ? "ok" : "warn") + '" title="Hub 能力">' +
          '<div class="endpointCardHead"><div><b>Hub 能力摘要</b><div class="endpointCardSub">action / scheduler / results / file</div></div>' +
          '<span class="' + (apiCount >= 3 ? "status-completed" : "status-warning") + '">' + esc(apiCount + "/4") + '</span></div>' +
          '<div class="endpointMiniGrid">' +
            endpointMini("最近心跳", hub.lastHeartbeat || "-", "Hub 心跳") +
            endpointMini("控制动作", hub.controlActionsEnabled ? "可用" : "不可用", "actions") +
            endpointMini("终态规则", "按钮恢复", "completed/failed/cancelled/stalled") +
            endpointMini("通信边界", "本机端口", "127.0.0.1") +
          '</div>' +
        '</article>'
      ];
    }

    function workerTelemetryCard(worker) {
      const cls = endpointTone(worker.status);
      const title = "Worker 端点";
      const rawEventStream = worker.eventStream || "-";
      return '<article class="endpointStatusCard ' + cls + '" title="' + escAttr(title) + '">' +
        '<div class="endpointCardHead"><div><b title="' + escAttr(worker.workerId) + '">' + esc(worker.workerId) + '</b><div class="endpointCardSub" title="' + escAttr(worker.localEndpoint || "") + '">' + esc(worker.localEndpoint || "-") + '</div></div>' +
        '<span class="' + statusClass(worker.status) + '">' + esc(labelStatus(worker.status || "-")) + '</span></div>' +
        '<div class="endpointMiniGrid">' +
          endpointMini("GPU", worker.gpuTelemetry ? "开启" : "关闭", "GPU") +
          endpointMini("任务观测", worker.workerTaskTelemetry ? "开启" : "关闭", "任务/日志") +
          endpointMini("事件流", labelStatus(rawEventStream), "原始事件流：" + rawEventStream) +
          endpointMini("心跳", worker.lastHeartbeat || "-", "Worker 心跳") +
          endpointMini("本地端口", worker.localPort || "-", "127.0.0.1") +
          endpointMini("策略", "推送优先", "推送优先") +
        '</div>' +
      '</article>';
    }

    function portAssignmentCard(state, item) {
      const status = probeStatus(state, item.endpointId);
      const cls = endpointEnabled(state, item.endpointId) ? endpointTone(status) : "disabled";
      const role = String(item.role || "").toLowerCase() === "hub" ? "Hub" : "Worker";
      const title = "端口分配";
      return '<article class="endpointStatusCard ' + cls + '" title="' + escAttr(title) + '">' +
        '<div class="endpointCardHead"><div><b>' + esc(role + " · " + item.endpointId) + '</b><div class="endpointCardSub">' + esc(item["s" + "shConfigAlias"] || "未填写登录别名") + '</div></div>' +
        '<span class="' + statusClass(status) + '">' + esc(labelStatus(status)) + '</span></div>' +
        '<div class="endpointMiniGrid">' +
          endpointMini("本机端口", "127.0.0.1:" + (item.localForwardPort || "-"), "本机端口") +
          endpointMini("远端端口", "127.0.0.1:" + (item.remoteServicePort || "-"), "远端端口") +
          endpointMini("启用", endpointEnabled(state, item.endpointId) ? "是" : "否", "启用") +
          endpointMini("检测", labelStatus(status), "检测") +
        '</div>' +
      '</article>';
    }

    function portConflictCard(item) {
      const cls = item.severity === "error" ? "error" : "warn";
      const suggestion = item.suggestion || item.message || "请在服务器卡片中选择唯一的 Xshell 本机端口对后保存。";
      return '<article class="endpointStatusCard ' + cls + '" title="' + escAttr(suggestion + "；原始级别：" + (item.severity || "warning")) + '">' +
        '<div class="endpointCardHead"><div><b>' + esc(item.endpointId || "unknown") + '</b><div class="endpointCardSub">' + esc(item.conflictType || "端口冲突") + '</div></div>' +
        '<span class="' + statusClass(item.severity) + '" title="原始级别：' + escAttr(item.severity || "warning") + '">' + esc(labelStatus(item.severity || "warning")) + '</span></div>' +
        '<div class="endpointMiniGrid">' +
          endpointMini("请求端口", item.requestedPort || "-", "冲突的本机端口") +
          endpointMini("建议", compactText(suggestion, 52), suggestion) +
        '</div>' +
      '</article>';
    }

    function endpointMini(label, value, title) {
      return '<div class="endpointMini" title="' + escAttr(title || value || "") + '"><span>' + esc(label) + '</span><b>' + esc(value) + '</b></div>';
    }

    function endpointTone(status) {
      const value = String(status || "").toLowerCase();
      if (value.includes("ok") || value.includes("online") || value.includes("agent_ok") || value.includes("connected")) return "ok";
      if (value.includes("closed") || value.includes("unreachable") || value.includes("failed") || value.includes("error") || value.includes("mismatch")) return "error";
      return "warn";
    }

    function renderAgentSessions(state) {
      const agent = state.agentSessions || {};
      const hub = agent.hub || {};
      const workers = agent.workers || [];
      const visibleWorkers = workers.slice(0, DIAGNOSTIC_AGENT_WORKER_CARD_LIMIT);
      const cards = [agentSessionCard("Hub", "hub", hub, "zlk-hub-agent")].concat(visibleWorkers.map((worker) => agentSessionCard("Worker", worker.displayName || worker.id, worker, "-")));
      setHtmlIfChanged("agentSessions", '<div class="toolbar">' +
        '<button data-command="prepareAgents">准备 Agent 并启动</button>' +
        '<button data-command="writeAgentCommands" class="secondary">写入自动启动命令</button>' +
        '<button data-command="startAllConnections" class="secondary">启动连接</button>' +
        '</div>' +
        '<div class="endpointCardGrid">' + cards.join("") + '</div>' +
        diagnosticBudgetNotice("Worker Agent 会话", workers.length, DIAGNOSTIC_AGENT_WORKER_CARD_LIMIT, "个") +
        '<div class="muted">RemoteCommand 仅由写入按钮修改；启动隧道只打开 .xsh；登录后进入当前项目代码目录。</div>' +
        '<pre>' + esc(hub.startupCommand || "Hub 自动启动命令会在配置后显示") + '</pre>');
    }

    function agentSessionCard(role, name, item, fallbackTmux) {
      const configured = Boolean(item.configured);
      const disabled = item.enabled === false;
      const status = disabled ? "禁用" : (configured ? "已配置" : "未配置");
      const cls = disabled ? "disabled" : (configured ? "ok" : "warn");
      const endpointId = role === "Hub" ? "hub" : (item.id || name);
      const action = configured && !disabled
        ? '<button class="mini" data-command="startTunnelEndpoint" data-endpoint-id="' + escAttr(endpointId) + '" data-confirm="true">启动隧道</button>'
        : '<span class="muted" title="不可启动">不可启动</span>';
      return '<article class="endpointStatusCard ' + cls + '" title="' + escAttr(role + "：" + status) + '">' +
        '<div class="endpointCardHead"><div><b>' + esc(role + " · " + (name || endpointId)) + '</b><div class="endpointCardSub" title="' + escAttr(item.sessionPath || "") + '">' + esc(compactPath(item.sessionPath || "未选择 Xshell 会话")) + '</div></div>' +
        '<span class="' + (cls === "ok" ? "status-completed" : "status-warning") + '">' + esc(status) + '</span></div>' +
        '<div class="endpointMiniGrid">' +
          endpointMini("tmux", item.tmuxSessionName || fallbackTmux || "-", item.tmuxSessionName || fallbackTmux || "-") +
          endpointMini("Xshell 隧道", item.sessionPath ? "已选择" : "未选择", item.sessionPath || "未选择") +
          endpointMini("启动方式", "随隧道启动", "随隧道启动") +
          endpointMini("端点", endpointId, "启动按钮会携带的端点 ID") +
        '</div>' +
        '<div class="toolbar">' + action + '</div>' +
      '</article>';
    }

    function renderPlanSection(state) {
      if (document.activeElement !== el("planFileInput")) el("planFileInput").value = state.planFileInput || (state.selection && state.selection.selectedPlanId) || "";
      refreshRunModeNote(state);
      const plans = (state.plans && state.plans.length ? state.plans : state.recentPlans) || [];
      const planProjectChanged = setHtmlIfChanged("planDetectedProject", renderPlanRunWorkbench(state, plans) + renderDetectedProject(state));
      const recentPlansChanged = shouldKeepPlanPreviewDraft(state) ? false : setHtmlIfChanged("recentPlans", renderPlanCards(state, plans));
      if (planProjectChanged) bindPlanInspectControls();
      if (recentPlansChanged) bindPlanSelectionControls();
    }

    function bindPlanSelectionControls() {
      const state = lastState || {};
      selectedPlanCheckbox = null;
      el("recentPlans").querySelectorAll('input[type="checkbox"][data-command="selectPlan"]').forEach((box) => {
        if (box.checked) selectedPlanCheckbox = box;
        if (box.dataset.boundSelectPlan === "1") return;
        box.dataset.boundSelectPlan = "1";
        box.addEventListener("click", (event) => event.stopPropagation());
        box.addEventListener("change", () => {
          const previous = selectedPlanCheckbox && selectedPlanCheckbox !== box ? selectedPlanCheckbox : null;
          if (box.checked) {
            if (previous) previous.checked = false;
            selectedPlanCheckbox = box;
            if (el("planFileInput")) el("planFileInput").value = box.dataset.planFile || "";
          } else if (selectedPlanCheckbox === box) {
            selectedPlanCheckbox = null;
          }
          vscode.postMessage({ command: "selectPlan", planFile: box.checked ? box.dataset.planFile : "", planId: box.checked ? box.dataset.planId : "" });
          const currentState = lastState || state || {};
          refreshPlanActionButtons(currentState, el("planQuickGrid"));
          refreshPlanActionButtons(currentState, box.closest(".task-card"));
          if (previous) refreshPlanActionButtons(currentState, previous.closest(".task-card"));
          refreshContextualActionButtons(currentState, el("workbenchInspector"));
          refreshContextualActionButtons(currentState, el("pinnedActionsHost"));
        });
      });
      refreshPlanActionButtons(state);
    }

    function refreshPlanActionButtons(state, scope) {
      const root = scope && scope.querySelectorAll ? scope : document.querySelector('[data-section="plans"]');
      if (!root) return;
      const signature = planActionRefreshSignature(state || {}, root);
      const cache = refreshRootDataset(root);
      if (cache && cache.planActionRefreshSig === signature) return;
      if (cache) cache.planActionRefreshSig = signature;
      ["validatePlan", "dryRunPlan", "runPlan", "runAllPlans"].forEach((command) => {
        root.querySelectorAll('button[data-command="' + command + '"]').forEach((button) => {
          const reason = planButtonDisableReason(state, command, button);
          button.disabled = Boolean(reason);
          const title = reason || commandHelp(command);
          setNativeTitle(button, title);
          button.setAttribute("aria-label", title);
        });
      });
      root.querySelectorAll('button[data-command="archivePlan"]').forEach((button) => {
        const planFile = button.dataset.planFile || (el("planFileInput") && el("planFileInput").value) || "";
        const hasPlan = Boolean(planFile);
        const readiness = hasPlan ? planArchiveUiReadiness(state || {}, planFile) : { ready: false, reason: "请先输入或选择 planFile" };
        const debugReason = debugModeDisableReason("archivePlan");
        button.disabled = Boolean(debugReason || !hasPlan || !readiness.ready);
        const title = debugReason || (readiness.ready ? commandHelp("archivePlan") : readiness.reason);
        setNativeTitle(button, title);
        button.setAttribute("aria-label", title);
      });
    }

    function refreshContextualActionButtons(state, scope) {
      const root = scope && scope.querySelectorAll ? scope : document;
      if (!root) return;
      const signature = contextActionRefreshSignature(state || {}, root);
      const cache = refreshRootDataset(root);
      if (cache && cache.contextActionRefreshSig === signature) return;
      if (cache) cache.contextActionRefreshSig = signature;
      root.querySelectorAll('button[data-context-action="true"], button[data-batch-selected="true"]').forEach((button) => {
        const command = button.dataset.command || "";
        if (!command) return;
        const options = {
          actionId: button.dataset.actionId || "",
          actionSection: button.dataset.actionSection || "",
          batch: button.dataset.batchSelected === "true",
          savedAction: Boolean(button.closest(".pinnedActions") || button.closest(".savedAction")),
          configScope: button.dataset.configScope || ""
        };
        const payload = contextRefreshPayloadFromButton(button, command, options);
        const reason = actionButtonDisableReason(command, payload, options);
        const pendingKey = pendingKeyForButton(button, command, payload);
        const pending = pendingButtonKeys.has(pendingKey);
        button.disabled = Boolean(reason || pending);
        button.dataset.pendingKey = pendingKey;
        const title = reason || (pending ? "执行中" : commandHelp(command));
        if (title) {
          setNativeTitle(button, title);
          button.setAttribute("aria-label", cleanButtonLabel(button) + "：" + title);
        }
      });
    }

    function refreshRootDataset(root) {
      if (root && root.dataset) return root.dataset;
      if (root && root.documentElement && root.documentElement.dataset) return root.documentElement.dataset;
      return null;
    }

    function planActionRefreshSignature(state, root) {
      return [
        contextActionRefreshSignature(state, root),
        "plan",
        planInputValueForRefresh(),
        String((state && state.planFileInput) || ""),
        compactPlansForSignature((state && (state.plans || state.recentPlans)) || [])
      ].map((item) => typeof item === "string" ? item : stableSectionSignature(item)).join("::");
    }

    function contextActionRefreshSignature(state, root) {
      return [
        String(postRenderButtonDomVersion),
        String(selectedTaskPayloadVersion),
        pendingButtonsRefreshSignature(),
        rootRefreshIdentity(root),
        contextActionStateSignature(state || {}),
        planInputValueForRefresh()
      ].join("::");
    }

    function pendingButtonsRefreshSignature() {
      const pending = Object.keys(pendingActions || {}).sort().map((key) => {
        const item = pendingActions[key] || {};
        return [key, item.command || "", item.status || ""].join(":");
      }).join("|");
      return Array.from(pendingButtonKeys || []).sort().join("|") + "::" + pending;
    }

    function rootRefreshIdentity(root) {
      if (!root) return "none";
      return [root.id || "", root.dataset && (root.dataset.section || root.dataset.anchor || root.dataset.actionSection || "") || "", root.className || ""].join("|");
    }

    function planInputValueForRefresh() {
      const input = el("planFileInput");
      return input ? String(input.value || "") : "";
    }

    function contextActionStateSignature(state) {
      const hostSignature = String((state && state.contextActionSignature) || "");
      if (hostSignature) return hostSignature;
      const version = [
        objectReferenceKey(state.capabilities),
        objectReferenceKey(state.fileCapabilities),
        objectReferenceKey(state.health),
        objectReferenceKey(state.realtime),
        objectReferenceKey(state.selection),
        objectReferenceKey(state.workerProbes),
        objectReferenceKey(state.detectedProject),
        objectReferenceKey(state.plans),
        objectReferenceKey(state.recentPlans),
        String(state.connectionMode || ""),
        String(state.lastSnapshotAt || ""),
        String(state.debugBundlePath || ""),
        stableSectionSignature(state.selection || {}),
        String((state && state.planFileInput) || ""),
        String(selectedTaskPayloadVersion)
      ].join("|");
      if (contextActionStateSignatureCacheState === state && contextActionStateSignatureCacheVersion === version) return contextActionStateSignatureCacheValue;
      const value = stableSectionSignature({
        connectionMode: state.connectionMode,
        health: compactHealthForSignature(state.health),
        realtime: compactOverviewRealtimeForSignature(state.realtime),
        lastSnapshotAt: state.lastSnapshotAt,
        capabilities: compactCapabilitiesForSignature(state.capabilities),
        fileCapabilities: compactRecordForSignature(state.fileCapabilities || {}, ["supportsList", "supportsDownload", "supportsUploadChunk"]),
        selection: state.selection || {},
        planFileInput: state.planFileInput,
        debugBundlePath: state.debugBundlePath,
        workerProbes: compactObjectMapForSignature(state.workerProbes, SECTION_SIGNATURE_ROW_LIMIT, ["status", "state", "lastError", "updatedAt"]),
        detectedProject: compactOverviewProjectForSignature(state.detectedProject),
        plans: compactPlansForSignature(state.plans || state.recentPlans)
      });
      contextActionStateSignatureCacheState = state;
      contextActionStateSignatureCacheVersion = version;
      contextActionStateSignatureCacheValue = value;
      return value;
    }

    function contextRefreshPayloadFromButton(button, command, options) {
      const payload = buttonDatasetActionPayload(button);
      if (button.dataset.configScope) payload.configScope = button.dataset.configScope;
      const planCommand = ["validatePlan", "dryRunPlan", "runPlan", "reproducePlan", "archivePlan", "savePlan"].includes(command);
      const storedAction = Boolean((options || {}).actionId || (options || {}).actionSection || (options || {}).savedAction);
      const requiresExplicitSavedPlanPayload = storedAction && (explicitPlanFileCommands.has(command) || explicitSavePlanCommands.has(command));
      if (!payload.planFile && planCommand && !requiresExplicitSavedPlanPayload && el("planFileInput")) payload.planFile = el("planFileInput").value;
      if (button.dataset.planId) payload.planId = button.dataset.planId;
      if (button.dataset.planRevision) payload.planRevision = button.dataset.planRevision;
      if (button.dataset.file) {
        payload.file = button.dataset.file;
        payload.planFile = payload.planFile || button.dataset.file;
      }
      if (button.dataset.batchSelected === "true") Object.assign(payload, selectedTaskPayload());
      if (["archiveArtifacts", "deleteArtifacts"].includes(command) && button.dataset.batchSelected === "true") {
        payload.selectedRunKeys = [];
        payload.selectedExperimentIds = [];
      }
      if (button.dataset.clearLegacyVisible === "true") {
        payload.selectedLegacyTaskUiKeys = cleanSelectedValues(String(button.dataset.legacyTaskUiKeys || "").split("|"), []);
        payload.selectedTaskUiKeys = payload.selectedLegacyTaskUiKeys;
      }
      return payload;
    }

    function planButtonDisableReason(state, command, button) {
      const context = button ? { planFile: button.dataset.planFile || "", planId: button.dataset.planId || "" } : {};
      const reason = disableReason(state, command, context);
      if (reason === "请先输入或选择 planFile" && button && (button.dataset.planFile || (el("planFileInput") && el("planFileInput").value))) return "";
      return reason;
    }

    function renderPlanRunWorkbench(state, plans) {
      const sync = state.codeSync || {};
      const project = state.detectedProject || {};
      const selection = state.selection || {};
      const selectedPlan = state.planFileInput || selection.selectedPlanId || "";
      const rows = schedulerRowsForState(state);
      const planCount = plans.length;
      const selectedPlanMeta = planFromContext(state, { planFile: selectedPlan }) || {};
      const taskScale = planTaskScaleSummary(selectedPlanMeta);
      const staticCapacity = planQueueCapacitySummary(state, selectedPlanMeta);
      const modeLabel = planModeLabel(selectedPlanMeta.mode);
      const syncReadiness = projectCodeSyncReadiness(state);
      const syncReady = syncReadiness.ready;
      const planOutputSignals = planOutputEvidenceSignals(selectedPlanMeta);
      const planEvidenceCandidates = planOutputSignals.length ? planOutputEvidenceCandidates(selectedPlanMeta) : [];
      const previewScope = planScopedResultParsePreviews(project.resultParsePreviews || [], selectedPlan ? selectedPlanMeta : undefined, project.adapterRules || {});
      const outputGate = projectOutputGateDiagnostics(project, { outputContractFiles: project.outputContractFiles || [], adapterRules: project.adapterRules || {}, resultParsePreviews: previewScope.items }, selectedPlanMeta);
      const outputReady = Boolean(outputGate.ok);
      const runtimeContractStage = currentPlanRuntimeContractStage(state, selectedPlan);
      const effectiveOutputReady = outputReady && !runtimeContractStage;
      const validPreviewCount = validResultPreviewCount(previewScope.items);
      const running = rows.filter((row) => ["running", "testing"].includes(row.status)).length;
      const queued = rows.filter((row) => ["queued", "pending"].includes(row.status)).length;
      const failed = rows.filter((row) => taskFailureLikeStatus(row.status)).length;
      const outputSummary = planEvidenceCandidates.length ? compactText(planEvidenceCandidates.join("、"), 44) : (planOutputSignals.length ? "命令/日志证据" : "未声明");
      const outputStatus = runtimeContractStage ? runtimeContractStageMessage(runtimeContractStage, project) : (outputReady ? "可运行 / " + outputSummary : "待规则 / " + outputSummary);
      const outputBadge = runtimeContractStage ? runtimeContractStageBadge(runtimeContractStage) : "预览 " + validPreviewCount;
      const outputTone = runtimeContractStage ? (runtimeContractStage.section === "operations" || runtimeContractStage.command === "parseResults" ? "info" : "warn") : (outputReady ? "good" : "warn");
      const executionStage = selectedPlan ? planExecutionStage(state, selectedPlan) : { phase: "select", status: "未选择计划" };
      const preflight = selectedPlan ? planPreflightSummary(state, selectedPlan) : { ready: false, tone: "warn", message: "未选择计划", badge: "待选择" };
      const rowsHtml = [
        planRunRow("当前计划", selectedPlan ? "good" : "warn", selectedPlan ? compactPath(selectedPlan) : "未选择", "计划 " + planCount + " / " + taskScale + (selectedPlan ? " / " + modeLabel : "")),
        planRunRow("运行前同步", syncReady ? "good" : "warn", "Hub " + labelStatus(sync.hub || "待同步") + " / Worker " + labelStatus(sync.workers || "待同步"), "代码指纹 " + compactIdentifier(sync.fingerprint || "-"), "原始 fingerprint：" + compactIdentifier(sync.fingerprint || "-")),
        planRunRow("校验与预演", preflight.tone, preflight.message, preflight.badge),
        planRunRow("执行阶段", executionStage.phase === "monitor" ? "info" : executionStage.phase === "results" ? "good" : executionStage.phase === "review" ? "warn" : ["ready", "run"].includes(executionStage.phase) ? "good" : "", executionStage.status, planExecutionPhaseLabel(executionStage.phase), "原始阶段：" + String(executionStage.phase || "未知")),
        planRunRow("调度队列", failed ? "error" : (running ? "info" : (queued ? "warn" : "")), "运行 " + running + " / 排队 " + queued + " / 失败 " + failed, running ? (running + " 运行中") : queued ? (queued + " 排队") : failed ? (failed + " 需处理") : staticCapacity),
        planRunRow("输出闭环", outputTone, outputStatus, outputBadge)
      ].join("");
      return '<div class="planRunWorkbench" title="计划运行">' +
        '<div class="planRunRows">' + rowsHtml + '</div>' +
        renderPlanGateList(selectedPlan, syncReady, effectiveOutputReady, preflight, runtimeContractStage) +
        renderPlanRunActions(state, selectedPlan, outputReady, project.adapterConfig, runtimeContractStage) +
      '</div>';
    }

    function planTaskScaleSummary(plan) {
      const source = plan && typeof plan === "object" ? plan : null;
      if (source && planTaskScaleSummaryCache.has(source)) return planTaskScaleSummaryCache.get(source);
      const item = source || {};
      const caseSource = item.cases;
      const seedSource = item.seeds;
      const cases = Array.isArray(caseSource) ? caseSource : [];
      const seeds = Array.isArray(seedSource) ? seedSource : [];
      const jobValue = Number(item.jobCount || item.job_count || 0);
      const jobCount = Number.isFinite(jobValue) && jobValue > 0 ? Math.trunc(jobValue) : 0;
      const expanded = cases.length && seeds.length ? cases.length * seeds.length : 0;
      const summary = !expanded
        ? (jobCount ? jobCount + " 个任务（实验项/随机种子待校验）" : "任务规模待校验")
        : cases.length + " 个实验项 × " + seeds.length + " 个随机种子 = " + expanded + " 个任务" + (jobCount && jobCount !== expanded ? "（记录 " + jobCount + " 个任务，校验为准）" : "");
      if (source) planTaskScaleSummaryCache.set(source, summary);
      return summary;
    }

    function planConfiguredWorkerCapacity(state) {
      const workers = enabledWorkerTunnelsForState(state);
      return workers.reduce((sum, worker) => {
        const limitValue = Number(worker.maxConcurrentGpus || worker.max_concurrent_gpus || 1);
        const limit = Number.isFinite(limitValue) && limitValue > 0 ? Math.trunc(limitValue) : 1;
        const allowed = Array.isArray(worker.allowedGpuIds) ? worker.allowedGpuIds : Array.isArray(worker.allowed_gpu_ids) ? worker.allowed_gpu_ids : [];
        const allowedCount = new Set(allowed.map((value) => String(value || "").trim()).filter(Boolean)).size;
        return sum + (allowedCount ? Math.min(limit, allowedCount) : limit);
      }, 0);
    }

    function planQueueCapacitySummary(state, plan) {
      const capacity = planConfiguredWorkerCapacity(state);
      if (!capacity) return "静态容量：未配置 Worker";
      const item = plan && typeof plan === "object" ? plan : {};
      const jobValue = Number(item.jobCount || item.job_count || 0);
      const explicitJobs = Number.isFinite(jobValue) && jobValue > 0 ? Math.trunc(jobValue) : 0;
      const cases = Array.isArray(item.cases) ? item.cases : [];
      const seeds = Array.isArray(item.seeds) ? item.seeds : [];
      const jobs = explicitJobs || (cases.length && seeds.length ? cases.length * seeds.length : 0);
      if (!jobs) return "静态容量：" + capacity + " 并发；任务数待校验";
      return "静态容量：" + capacity + " 并发；首轮最多 " + Math.min(jobs, capacity) + "；至少排队 " + Math.max(0, jobs - capacity);
    }

    function planModeLabel(mode) {
      const value = String(mode || "train_test").trim().toLowerCase().replace(/[\s-]+/g, "_");
      if (["train", "training", "train_only"].includes(value)) return "仅训练";
      if (["test", "eval", "evaluate", "evaluation", "test_only", "eval_only"].includes(value)) return "仅评估";
      return "训练并评估";
    }

    function planExecutionPhaseLabel(phase) {
      const raw = String(phase || "").trim();
      const labels = {
        select: "选择计划", ready: "可提交", validating: "校验中", validate: "校验待修复", "dry-running": "预演中", "dry-run": "预演待处理",
        submitting: "提交中", run: "提交待处理", monitor: "运行中", "debug-review": "Debug 待复核", results: "结果待处理", review: "任务需处理"
      };
      return labels[raw] || raw || "未知";
    }

    function renderPlanRunActions(state, selectedPlan, outputReady, adapterConfig, runtimeContractStage) {
      if (!selectedPlan) {
        return '<div class="planRunActions">' + projectNextAction("选择或创建实验计划", "接入当前项目", "bootstrapProject") + '</div>';
      }
      if (runtimeContractStage) {
        return '<div class="planRunActions">' + renderRuntimeContractRecoveryActions(runtimeContractStage, { adapterConfig }, selectedPlan) + '</div>';
      }
      if (!outputReady) {
        const adapterAction = adapterConfig
          ? projectPathButton("打开接入配置", adapterConfig)
          : '<button class="mini secondary" data-command="generateOutputAdapter">生成接入模板</button>';
        return '<div class="planRunActions">' + projectNextAction("补全输出后再运行", "打开 Plan", "openPlan", { file: selectedPlan }) + adapterAction + '</div>';
      }
      const executionStage = planExecutionStage(state || {}, selectedPlan);
      if (executionStage.phase === "debug-review") {
        return '<div class="planRunActions"><button class="mini secondary" type="button" data-section-target="tasks" data-anchor-target="tasks-list">查看 Debug 任务</button><button class="mini" data-command="runPlan" data-force-formal="true" data-debug-mode="false" data-plan-file="' + escAttr(selectedPlan) + '" data-confirm="true" title="确认 Debug 日志和配置后，重新同步、校验、预演并提交正式 Plan">正式运行</button></div>';
      }
      const plan = planFromContext(state || {}, { planFile: selectedPlan }) || {};
      const activity = planActiveRunEvidence(state || {}, selectedPlan, plan);
      if (activity.active) {
        const historicalOnly = activity.historicalOnly === true;
        const target = activity.taskCount ? "tasks" : "operations";
        const anchor = activity.taskCount ? "tasks-list" : "operations-list";
        const label = historicalOnly ? (activity.taskCount ? "查看全部任务" : "查看提交进度") : activity.taskCount ? "查看任务" : "查看提交进度";
        const summary = activity.taskCount
          ? (historicalOnly ? "旧 revision 的 " : "") + activity.taskCount + " 个任务仍在排队或运行"
          : (historicalOnly ? "旧 revision 的 " : "") + activity.operationCount + " 个运行提交仍未结束";
        const scopeAttr = historicalOnly && activity.taskCount ? ' data-task-plan-scope="all"' : "";
        return '<div class="planRunActions"><button class="mini" type="button" data-section-target="' + target + '" data-anchor-target="' + anchor + '"' + scopeAttr + '>' + label + '</button><span class="muted">' + esc(summary) + (historicalOnly ? "；为保护旧任务，当前版本暂不能提交。" : "，已阻止重复提交。") + '</span></div>';
      }
      if (planFirstRunRecommended(state || {}, selectedPlan, plan, executionStage, true)) {
        return '<div class="planRunActions">' + renderProjectFirstRunActions(true, selectedPlan) + '</div>';
      }
      return '<div class="planRunActions"><button class="mini" data-command="runPlan" data-plan-file="' + escAttr(selectedPlan) + '" data-confirm="true" title="同步代码、校验并预演，全部通过后提交调度">校验并提交运行</button><button class="mini secondary" data-command="validatePlan" data-plan-file="' + escAttr(selectedPlan) + '">单独校验</button><button class="mini secondary" data-command="dryRunPlan" data-plan-file="' + escAttr(selectedPlan) + '">单独预演</button></div>';
    }

    function planRunRow(label, tone, value, badge, badgeTitle) {
      return '<div class="planRunRow ' + escAttr(tone || "") + '" title="' + escAttr(label + "：" + (value || "-") + (badge ? " / " + badge : "")) + '">' +
        '<span class="planRunLabel">' + esc(label) + '</span>' +
        '<span class="planRunValue">' + esc(value || "-") + '</span>' +
        '<span class="planRunBadge ' + statusToneClass(tone) + '"' + (badgeTitle ? ' title="' + escAttr(badgeTitle) + '"' : "") + '>' + esc(badge || "-") + '</span>' +
      '</div>';
    }

    function statusToneClass(tone) {
      if (tone === "warn") return "status-warning";
      if (tone === "error") return "status-failed";
      if (tone === "good") return "status-completed";
      if (tone === "info") return "status-running";
      return "";
    }

    function renderPlanGateList(selectedPlan, syncReady, outputReady, preflight, runtimeContractStage) {
      const runtimeOutputTone = runtimeContractStage && (runtimeContractStage.section === "operations" || runtimeContractStage.command === "parseResults") ? "info" : "warn";
      const gates = [
        ["选择计划", selectedPlan ? "good" : "warn", selectedPlan ? "已选择" : "需要选择计划"],
        ["同步代码", syncReady ? "good" : "info", syncReady ? "代码指纹已确认" : "运行时自动同步"],
        ["输出接入", outputReady ? "good" : runtimeContractStage ? runtimeOutputTone : "warn", outputReady ? "可运行" : runtimeContractStage ? runtimeContractStageBadge(runtimeContractStage) : "待规则"],
        ["校验预演", (preflight || {}).tone || ((preflight || {}).ready ? "good" : "info"), (preflight || {}).badge || "运行时自动执行"]
      ];
      return '<div class="planGateList" title="运行门禁">' + gates.map((gate) => {
        const tone = gate[1];
        const statusClass = tone === "good" ? "status-completed" : tone === "error" ? "status-failed" : tone === "info" ? "status-running" : "status-warning";
        return '<div class="planGateItem ' + tone + '" title="' + escAttr(gate[0] + "：" + gate[2]) + '"><span class="planGateDot"></span><span class="planGateName">' + esc(gate[0]) + '</span><span class="' + statusClass + '">' + esc(gate[2]) + '</span></div>';
      }).join("") + '</div>';
    }

    function renderActionSections(state) {
      const sync = state.codeSync || {};
      setHtmlIfChanged("publishFlow", renderPublishFlow(state));
      el("publishActions").className = "publishActionDeck";
      setHtmlIfChanged("publishActions", workbenchInspectorActions("sync").map((item) =>
        '<span class="publishActionAnchor" data-anchor="' + escAttr(syncCommandAnchor(item[1])) + '">' + actionButton(item[0], item[1], item[2] || {}) + '</span>'
      ).join(""));
      setHtmlIfChanged("codeSyncState", '<div class="summaryLine">' + [
         '<span class="pill" title="' + escAttr("原始 fingerprint：" + compactIdentifier(sync.fingerprint || "-")) + '">代码指纹 ' + esc(compactIdentifier(sync.fingerprint || "-")) + '</span>',
        '<span class="pill" title="' + escAttr("Hub 原始状态：" + (sync.hub || "待同步")) + '">Hub ' + esc(labelStatus(sync.hub || "待同步")) + '</span>',
        '<span class="pill" title="' + escAttr("Worker 原始状态：" + (sync.workers || "待同步")) + '">Worker ' + esc(labelStatus(sync.workers || "待同步")) + '</span>',
        '<span class="pill" title="' + escAttr("更新：" + (sync.updatedAt || "-")) + '">更新 ' + esc(sync.updatedAt || "-") + '</span>'
      ].join("") + '</div>');
      el("experimentActions").className = "actionGrid statusOnly";
      setHtmlIfChanged("experimentActions", "计划/任务入口：校验、预演、运行、停止、重试");
      el("resultActions").className = "actionGrid statusOnly";
      setHtmlIfChanged("resultActions", "结果入口：解析、统计、质量、论文、导出");
      el("artifactActions").className = "actionGrid statusOnly";
      setHtmlIfChanged("artifactActions", "产物入口：归档、检查同步清单、删除、校准");
      el("diagnosticActions").className = "actionGrid statusOnly";
      setHtmlIfChanged("diagnosticActions", "诊断入口：自检、调试包、审计、校准");
    }

    function syncCommandAnchor(command) {
      return SYNC_COMMAND_ANCHORS[command] || "sync-publish";
    }

    function publishAgentReadiness(state) {
      const endpoint = projectEndpointReadiness(state || {});
      const status = endpoint.ready
        ? "已就绪"
        : endpoint.restartRequired
          ? "待重启"
          : endpoint.versionMismatch
            ? "需升级"
            : endpoint.projectMismatch
              ? "项目不匹配"
              : "待检测";
      return { ready: endpoint.ready, status, detail: endpoint.summary || "Hub/Worker Agent 状态未知" };
    }

    // A step that failed and a step that has not started yet used to render identically, and the
    // flow offered no way to act on the first blocker; both are resolved here.
    function publishFlowSteps(state) {
      const sync = (state || {}).codeSync || {};
      const agent = publishAgentReadiness(state);
      const hasFingerprint = hasText(sync.fingerprint);
      return [
        { title: "1. 本地代码", ok: hasFingerprint, status: hasFingerprint ? "已生成指纹" : "待生成", detail: "代码指纹 " + compactIdentifier(sync.fingerprint || "-"), failed: false, command: "syncGithub", action: "同步 GitHub" },
        { title: "2. 同步 Hub", ok: syncStatusOk(sync.hub), status: labelStatus(sync.hub || "待同步"), detail: "Hub 原始状态：" + (sync.hub || "待同步"), failed: syncStatusFailure(sync.hub), command: "uploadProjectToHub", action: "上传到 Hub" },
        { title: "3. 同步 Worker", ok: syncStatusOk(sync.workers), status: labelStatus(sync.workers || "待同步"), detail: "Worker 原始状态：" + (sync.workers || "待同步"), failed: syncStatusFailure(sync.workers), command: "distributeCodeToWorkers", action: "分发到 Worker" },
        { title: "4. Agent", ok: agent.ready, status: agent.status, detail: agent.detail, failed: false, command: "deployLatestAgent", action: "部署最新 Agent" }
      ];
    }

    function publishFlowBlocker(steps) {
      return asArray(steps).find((step) => step && (step.failed || !step.ok)) || null;
    }

    function renderPublishFlow(state) {
      const steps = publishFlowSteps(state);
      const blocker = publishFlowBlocker(steps);
      const blockerIndex = blocker ? steps.indexOf(blocker) : -1;
      const cards = steps.map((step, index) => onboardingStep(step.title, step.ok, step.status, step.detail, {
        pending: !step.ok && !step.failed && blockerIndex >= 0 && index > blockerIndex,
        current: index === blockerIndex && !step.failed
      })).join("");
      const next = blocker
        ? projectNextAction((blocker.failed ? "修复" : "完成") + blocker.title.replace(/^\d+\.\s*/, "") + "：" + blocker.status, blocker.action, blocker.command)
        : '<div class="projectQuickNext"><span>下一步</span><b>发布同步链路已就绪，可提交计划</b></div>';
      return '<div class="onboardingFlow" title="发布同步">' + cards + '</div>' + next;
    }

    function syncStatusOk(value) {
      const text = String(value || "").toLowerCase();
      return Boolean(text && !["-", "待同步", "pending", "running", "in_progress", "unknown", "同步中", "执行中", "已跳过", "未参与本次同步"].includes(text) && !text.includes("fail") && !text.includes("error") && !text.includes("失败") && !text.includes("错误") && !text.includes("未参与") && !text.includes("skip"));
    }

    function syncStatusFailure(value) {
      const text = String(value || "").trim().toLowerCase();
      return Boolean(text && (text.includes("fail") || text.includes("error") || text.includes("失败") || text.includes("错误")));
    }

    function overviewSyncReadiness(state) {
      const sync = (state || {}).codeSync || {};
      const workerRequired = enabledWorkerTunnelsForState(state).length > 0;
      const hubReady = syncStatusOk(sync.hub);
      const workerReady = !workerRequired || syncStatusOk(sync.workers);
      const fingerprintReady = hasText(sync.fingerprint);
      const failure = syncStatusFailure(sync.hub) || (workerRequired && syncStatusFailure(sync.workers));
      const ready = hubReady && workerReady && fingerprintReady;
      return {
        ready,
        failure,
        status: failure ? "失败" : ready ? "已确认" : "运行时自动同步",
      };
    }

    function compactOverviewProjectReadinessForSignature(state) {
      const readiness = overviewProjectReadiness(state || {});
      return {
        ready: readiness.ready,
        blocking: readiness.blocking,
        tone: readiness.tone,
        status: readiness.status,
        detail: readiness.detail,
        planFile: readiness.planFile,
        planCount: readiness.planCount,
        outputReady: readiness.outputReady
      };
    }

    function overviewResultEvidenceReadiness(state) {
      const summary = (state || {}).resultsSummary || {};
      const taskStats = overviewTaskStats(state || {});
      const previewCount = Number(pick(summary, ["previewResultCount", "preview_result_count", "resultCount", "result_count"], asArray(summary.results).length)) || 0;
      const archivedCount = Number(pick(summary, ["effectiveArchivedResultCount", "effective_archived_result_count", "finalResultCount", "final_result_count"], 0)) || 0;
      const pendingCount = Number(pick(summary, ["pendingReviewCount", "pending_review_count"], Math.max(0, previewCount - archivedCount))) || 0;
      const parseFailed = Number(pick(summary, ["parseFailed", "parse_failed"], 0)) || 0;
      const parsedAt = meaningfulValue(pick(summary, ["lastParsedAt", "last_parsed_at"], ""));
      if (parseFailed > 0) {
        return { tone: "error", status: "解析失败 " + parseFailed, detail: "存在无法解析的结果文件；请查看结果区的真实失败原因和文件位置。" };
      }
      if (archivedCount > 0 && pendingCount > 0) {
        return { tone: "warn", status: "有效 " + archivedCount + " / 待筛选 " + pendingCount, detail: "已归档结果可进入质量门禁和统计；其余预览记录需决定归档或排除。" };
      }
      if (archivedCount > 0) {
        return { tone: "good", status: "有效结果 " + archivedCount, detail: "已归档结果是质量门禁、统计、论文表格和 PPT 的唯一有效输入。" };
      }
      if (previewCount > 0 || pendingCount > 0) {
        const count = Math.max(previewCount, pendingCount);
        return { tone: "warn", status: "待筛选 " + count, detail: "完整预览已有结果，但尚未归档有效记录；后续分析不会读取这些临时记录。" };
      }
      if (taskStats.running || taskStats.queued) {
        return { tone: "info", status: "等待任务结果", detail: "任务仍在排队或运行；全部进入终态后会自动检查当前 Plan 输出并生成完整预览。" };
      }
      if (parsedAt) {
        return { tone: "warn", status: "未发现结果", detail: "已执行结果解析但没有可用记录；请检查输出契约和预期文件位置。" };
      }
      return { tone: "info", status: "待运行", detail: "尚无实验结果证据；提交并完成当前 Plan 后会自动进入结果预览流程。" };
    }

    function renderGpuSection(state) {
      const model = gpuViewModelForState(state || {});
      const servers = model.servers;
      const ownerConfig = model.ownerConfig;
      const budget = model.budget;
      const gpuCount = model.gpuCount;
      const busyCount = model.busyCount;
      const mineCount = model.mineCount;
      const freeCount = model.freeCount;
      const omittedHint = budget.omittedServerCount || budget.omittedGpuRowCount
        ? '<span class="pill status-warning" title="GPU 已省略">已省略 ' + esc(String(budget.omittedServerCount)) + ' 台服务器 / ' + esc(String(budget.omittedGpuRowCount)) + ' 张 GPU</span>'
        : "";
      const summaryHtml = servers.length
        ? '<div class="summaryLine"><span class="pill">服务器 ' + servers.length + '</span><span class="pill">GPU ' + gpuCount + '</span><span class="pill status-completed">空闲 ' + freeCount + '</span><span class="pill status-warning">占用 ' + busyCount + '</span><span class="gpuServerMineBadge">我的任务 ' + mineCount + '</span>' + omittedHint + '</div>'
        : '<div class="muted">暂无 GPU 数据。请确认 Xshell 隧道和 Hub Agent /api/events 或 /api/gpu 可用。</div>';
      setHtmlIfChanged("gpuHistoryOverview", renderGpuHistoryOverview(state, servers));
      setHtmlIfChanged("gpuSummary", summaryHtml);
      const gridHtml = budget.visibleServers.map((server) => {
        const myGpuCount = server.gpuRows.filter((gpu) => isMyGpu(gpu, ownerConfig)).length;
        const rowBudget = budgetGpuRowsForRender(server.gpuRows, ownerConfig);
        const rowOmitted = rowBudget.omittedCount
          ? '<div class="muted" title="GPU 未展开">本服务器还有 ' + esc(String(rowBudget.omittedCount)) + ' 张 GPU 未展开显示。</div>'
          : "";
        const rows = rowBudget.visibleRows.length ? rowBudget.visibleRows.map((gpu) => renderGpuRow(gpu, ownerConfig, server)).join("") + rowOmitted : '<div class="muted">该服务器暂无 GPU 行。</div>';
        const displayName = gpuServerDisplayName(state, server);
        const rawId = server.serverId && server.serverId !== displayName ? '<span class="gpuServerAlias">(' + esc(server.serverId) + ')</span>' : "";
        const mineBadge = myGpuCount ? '<span class="gpuServerMineBadge">我的任务 ' + myGpuCount + '</span>' : "";
        const statusText = labelStatus(server.status || "未知");
        const serverTitle = gpuMetaLine(server);
        const freshness = gpuServerFreshnessView(server);
        const freshnessPill = freshness.label
          ? '<span class="pill gpuServerFreshness' + (server.staleFromCache ? " stale" : "") + '" title="' + escAttr(freshness.title) + '">' + esc(freshness.label) + '</span>'
          : "";
        return '<div class="card gpuServer" data-anchor="' + escAttr(treeAnchorId("gpu-server", server.serverId || server.workerId)) + '" title="' + escAttr(serverTitle) + '">' +
          '<div class="gpuServerHead"><span class="gpuServerTitle">' + esc(displayName) + ' ' + rawId + mineBadge + '</span><span class="gpuServerStatusGroup"><span class="gpuServerStatus ' + escAttr(gpuServerStatusClass(server.status)) + '" title="原始服务器状态：' + escAttr(server.status) + '">' + esc(statusText) + '</span>' + freshnessPill + '</span></div>' +
          '<div class="gpuList">' + rows + '</div>' +
          '</div>';
      }).join("");
      setHtmlIfChanged("gpuGrid", gridHtml);
      scheduleGpuHistoryDraw();
    }

    function requestGpuHistory(query) {
      const payload = query && typeof query === "object" ? query : {};
      const key = gpuHistorySeriesKey(payload.serverId || "overview", payload.gpuId || "overview");
      const now = Date.now();
      const lastAt = Number(gpuHistoryRequestLastAt.get(key) || 0);
      if (now - lastAt < GPU_HISTORY_REQUEST_COOLDOWN_MS) return false;
      gpuHistoryRequestLastAt.set(key, now);
      while (gpuHistoryRequestLastAt.size > GPU_HISTORY_SERIES_CACHE_LIMIT) gpuHistoryRequestLastAt.delete(gpuHistoryRequestLastAt.keys().next().value);
      vscode.postMessage(Object.assign({ command: "loadGpuHistory" }, payload));
      return true;
    }

    function rememberGpuHistoryState(history) {
      const item = history && typeof history === "object" ? history : {};
      const status = String(item.status || "idle");
      gpuHistoryLastStateStatus = status;
      if (status === "idle") {
        gpuHistorySeriesCache.clear();
        gpuHistorySeriesRevision += 1;
        gpuHistoryMeta = {};
        expandedGpuHistoryKeys.clear();
        gpuHistoryRequestLastAt.clear();
        return;
      }
      gpuHistoryMeta = Object.assign({}, gpuHistoryMeta, {
        status,
        error: item.error || "",
        fetchedAt: item.fetchedAt || "",
        updatedAt: item.data && item.data.updatedAt || gpuHistoryMeta.updatedAt || "",
        bucketSeconds: item.data && item.data.bucketSeconds || gpuHistoryMeta.bucketSeconds || 300,
        retentionHours: item.data && item.data.retentionHours || gpuHistoryMeta.retentionHours || 72
      });
      if (!["ready", "stale"].includes(status) || !item.data || !Array.isArray(item.data.series)) return;
      const query = item.query || {};
      const detailed = Boolean(query.serverId || query.gpuId);
      if (!detailed) gpuHistorySeriesCache.clear();
      item.data.series.forEach((series) => {
        if (!series || !series.serverId || !series.gpuId) return;
        const key = gpuHistorySeriesKey(series.serverId, series.gpuId);
        gpuHistorySeriesCache.delete(key);
        gpuHistorySeriesCache.set(key, series);
      });
      while (gpuHistorySeriesCache.size > GPU_HISTORY_SERIES_CACHE_LIMIT) gpuHistorySeriesCache.delete(gpuHistorySeriesCache.keys().next().value);
      gpuHistorySeriesRevision += 1;
      gpuHistoryMeta.seriesOmittedCount = Number(item.data.seriesOmittedCount || 0);
      gpuHistoryMeta.pointOmittedCount = Number(item.data.pointOmittedCount || 0);
    }

    function gpuHistorySeriesKey(serverId, gpuId) {
      return String(serverId || "").trim() + "::" + String(gpuId || "").trim();
    }

    function gpuHistorySeriesFor(serverId, gpuId) {
      return gpuHistorySeriesCache.get(gpuHistorySeriesKey(serverId, gpuId));
    }

    function renderGpuHistoryOverview(state, servers) {
      const series = gpuHistoryOverviewSeries(state, servers);
      const status = gpuHistoryStatusText("overview");
      const body = series.length
        ? renderGpuHistoryChart("服务器 GPU 峰值", "overview", series, "每个时间桶显示服务器全部 GPU 的最高利用率")
        : '<div class="gpuHistoryStatus">展开后加载最近三天历史。当前实时状态不会自动携带三天原始数据。</div>';
      return '<details class="gpuHistoryPanel" data-gpu-history-scope="overview"' + (gpuHistoryOverviewOpen ? ' open' : '') + '>' +
        '<summary>历史状态曲线（最近三天）</summary>' +
        '<div class="gpuHistoryPanelBody">' +
          '<div class="gpuHistoryStatus ' + escAttr(gpuHistoryStatusClass()) + '">' + esc(status) + '</div>' +
          body +
        '</div>' +
      '</details>';
    }

    function renderGpuHistoryCard(serverId, gpuId, gpuName) {
      const series = gpuHistorySeriesFor(serverId, gpuId);
      const status = gpuHistoryStatusText("gpu");
      if (!series) return '<div class="gpuHistoryStatus ' + escAttr(gpuHistoryStatusClass()) + '">' + esc(status) + '</div>';
      return renderGpuHistoryChart("GPU " + gpuId + (gpuName && gpuName !== "-" ? " · " + gpuName : ""), "gpu", [series], "利用率与显存利用率，百分比坐标") +
        '<div class="gpuHistoryStatus ' + escAttr(gpuHistoryStatusClass()) + '">' + esc(status) + '</div>';
    }

    function gpuHistoryStatusText(scope) {
      const status = gpuHistoryLastStateStatus;
      if (status === "loading") return "正在加载历史数据…";
      if (status === "error") return gpuHistoryMeta.error || "历史查询失败";
      if (status === "stale") return "历史查询失败，显示上次成功数据（stale）" + (gpuHistoryMeta.error ? "：" + gpuHistoryMeta.error : "");
      if (status === "ready") {
        const updated = gpuHistoryMeta.updatedAt ? " · 数据更新 " + gpuHistoryMeta.updatedAt : "";
        return "已加载 " + (scope === "overview" ? "服务器峰值" : "GPU 双指标") + updated;
      }
      return "尚未加载";
    }

    function gpuHistoryStatusClass() {
      if (gpuHistoryLastStateStatus === "error") return "error";
      if (gpuHistoryLastStateStatus === "stale") return "stale";
      return "";
    }

    function gpuHistoryOverviewSeries(state, servers) {
      if (gpuHistoryOverviewCacheRevision === gpuHistorySeriesRevision && gpuHistoryOverviewCacheState === state && gpuHistoryOverviewCacheServers === servers) {
        return gpuHistoryOverviewCacheValue;
      }
      const byServer = new Map();
      gpuHistorySeriesCache.forEach((series) => {
        const serverId = String(series.serverId || "");
        if (!serverId) return;
        let server = byServer.get(serverId);
        if (!server) {
          server = { serverId, gpuCount: 0, points: new Map() };
          byServer.set(serverId, server);
        }
        server.gpuCount += 1;
        (series.points || []).forEach((point) => {
          const util = finiteHistoryPercent(point.gpuUtilPercent);
          if (util === null) return;
          const bucket = Number(point.bucketEpoch);
          if (!Number.isFinite(bucket)) return;
          const current = server.points.get(bucket);
          if (!current || util > current.gpuUtilPercent || (util === current.gpuUtilPercent && current.imputed && point.imputed !== true)) {
            server.points.set(bucket, { timestamp: point.timestamp, bucketEpoch: bucket, gpuUtilPercent: util, gpuId: series.gpuId, gapBefore: point.gapBefore === true, imputed: point.imputed === true, gpuCount: 0 });
          }
        });
      });
      const names = new Map(asArray(servers).map((server) => [String(server.serverId || server.workerId || ""), gpuServerDisplayName(state || {}, server)]));
      const value = Array.from(byServer.values()).map((server) => ({
        serverId: server.serverId,
        label: names.get(server.serverId) || server.serverId,
        gpuCount: server.gpuCount,
        points: Array.from(server.points.values()).sort((a, b) => a.bucketEpoch - b.bucketEpoch)
      })).filter((series) => series.points.length).sort((a, b) => String(a.serverId).localeCompare(String(b.serverId)));
      gpuHistoryOverviewCacheRevision = gpuHistorySeriesRevision;
      gpuHistoryOverviewCacheState = state;
      gpuHistoryOverviewCacheServers = servers;
      gpuHistoryOverviewCacheValue = value;
      return value;
    }

    function renderGpuHistoryChart(title, kind, series, description) {
      const chartId = "gpu-history-" + kind + "-" + gpuHistoryChartId(series);
      const chartSeries = asArray(series);
      const legend = kind === "gpu"
        ? '<button type="button" class="gpuLegendItem" data-gpu-history-focus="util"><span class="gpuLegendSwatch" style="background:#2563EB"></span>GPU 利用率</button><button type="button" class="gpuLegendItem" data-gpu-history-focus="memory"><span class="gpuLegendSwatch" style="background:#D97706"></span>显存利用率</button>'
        : chartSeries.map((item) => { const style = gpuHistoryServerStyle(item.serverId); return '<button type="button" class="gpuLegendItem" data-gpu-history-focus="' + escAttr(item.serverId) + '"><span class="gpuLegendSwatch" style="background:' + escAttr(style.color) + '"></span>' + esc(item.label || item.serverId) + '</button>'; }).join("");
      const summary = gpuHistoryTextSummary(chartSeries, kind);
      return '<div class="gpuHistoryChart" id="' + escAttr(chartId) + '" data-history-kind="' + escAttr(kind) + '">' +
        '<div class="gpuHistoryChartHead"><span class="gpuHistoryChartTitle">' + esc(title) + '</span><span class="gpuHistoryChartMeta">' + esc(description) + '</span></div>' +
        '<div class="gpuHistoryCanvasWrap"><canvas class="gpuHistoryCanvas" tabindex="0" role="img" aria-label="' + escAttr(title + "。" + description) + '" data-chart-kind="' + escAttr(kind) + '"></canvas><div class="gpuHistoryTooltip" role="status" aria-live="polite" hidden></div></div>' +
        '<div class="gpuHistoryLegend" aria-label="图例">' + legend + '</div>' +
        '<div class="gpuHistorySummary">' + esc(summary) + '</div>' +
      '</div>';
    }

    function gpuHistoryChartId(series) {
      return asArray(series).map((item) => String(item.serverId || "") + "-" + String(item.gpuId || "")).join("-").replace(/[^a-zA-Z0-9_-]+/g, "_").slice(0, 120) || "empty";
    }

    function gpuHistoryTextSummary(series, kind) {
      const stats = gpuHistorySeriesStats(series);
      if (!stats.pointCount) return "暂无历史点。";
      const prefix = kind === "overview" ? "服务器峰值" : "GPU 利用率 / 显存利用率";
      return prefix + "：" + stats.pointCount + " 个点，范围 " + new Date(stats.min * 1000).toLocaleString() + " 至 " + new Date(stats.max * 1000).toLocaleString() + "；" + stats.imputedCount + " 个缺失点按 0 补齐" + (stats.gapCount ? "，仍有 " + stats.gapCount + " 个异常缺口。" : "。 缺失补零仅用于连接曲线，不代表真实负载。");
    }

    function gpuHistorySeriesStats(series) {
      const stats = { pointCount: 0, imputedCount: 0, gapCount: 0, min: Number.POSITIVE_INFINITY, max: Number.NEGATIVE_INFINITY };
      asArray(series).forEach((item) => {
        const index = gpuHistoryPointIndex(item && item.points);
        if (!index.times.length) return;
        stats.pointCount += index.rows.length;
        stats.imputedCount += index.rows.reduce((count, point) => count + (point.imputed === true ? 1 : 0), 0);
        stats.gapCount += historyGapCountFromIndex(index);
        stats.min = Math.min(stats.min, index.times[0]);
        stats.max = Math.max(stats.max, index.times[index.times.length - 1]);
      });
      return stats;
    }

    function historyGapCount(points) {
      return historyGapCountFromIndex(gpuHistoryPointIndex(points));
    }

    function historyGapCountFromIndex(index) {
      const rows = index && index.rows || [];
      const expectedStep = Number(index && index.expectedStep || gpuHistoryMeta.bucketSeconds || 300);
      let count = 0;
      rows.forEach((point, rowIndex) => { if (rowIndex && historyPointStartsGap(point, rows[rowIndex - 1], expectedStep)) count += 1; });
      return count;
    }

    function historyExpectedStep(points) {
      const values = asArray(points).map((point) => Number(point.bucketEpoch)).filter(Number.isFinite).sort((a, b) => a - b);
      return historyExpectedStepFromSortedTimes(values);
    }

    function historyPointStartsGap(point, previous, expectedStep) {
      if (!point || !previous) return false;
      if (typeof point.gapBefore === "boolean") return point.gapBefore;
      const current = Number(point.bucketEpoch);
      const before = Number(previous.bucketEpoch);
      if (!Number.isFinite(current) || !Number.isFinite(before)) return false;
      return current - before > Math.max(Number(gpuHistoryMeta.bucketSeconds || 300), Number(expectedStep) || 0) * GPU_HISTORY_GAP_FACTOR;
    }

    function finiteHistoryPercent(value) {
      const number = Number(value);
      return Number.isFinite(number) ? Math.max(0, Math.min(100, number)) : null;
    }

    function scheduleGpuHistoryDraw() {
      if (gpuHistoryDrawFrame) return;
      const draw = () => {
        gpuHistoryDrawFrame = 0;
        document.querySelectorAll("canvas.gpuHistoryCanvas").forEach((canvas) => drawGpuHistoryCanvas(canvas));
      };
      if (typeof requestAnimationFrame === "function") gpuHistoryDrawFrame = requestAnimationFrame(draw);
      else gpuHistoryDrawFrame = setTimeout(draw, 0);
    }

    function gpuHistoryCanvasSeries(canvas) {
      const kind = canvas && canvas.dataset.chartKind || "overview";
      if (kind === "overview") return gpuHistoryOverviewSeries(lastState || {}, gpuViewModelForState(lastState || {}).servers);
      const details = canvas && canvas.closest('details[data-gpu-history-scope="gpu"]');
      return details ? [gpuHistorySeriesFor(details.dataset.serverId || "", details.dataset.gpuId || "")].filter(Boolean) : [];
    }

    function updateGpuHistoryTooltip(canvas, event) {
      const tooltip = canvas && canvas.parentElement && canvas.parentElement.querySelector(".gpuHistoryTooltip");
      if (activeGpuHistoryTooltip && activeGpuHistoryTooltip !== tooltip) activeGpuHistoryTooltip.hidden = true;
      activeGpuHistoryTooltip = null;
      if (!canvas || !event || !tooltip) return;
      tooltip.hidden = true;
      const series = gpuHistoryCanvasSeries(canvas);
      if (!series.length) return;
      const timeRange = gpuHistoryTimeRange(series);
      if (!timeRange) return;
      const rect = canvas.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, Number(event.clientX || 0) - rect.left));
      const ratio = rect.width > 0 ? x / rect.width : 0;
      const target = timeRange.min + (timeRange.max - timeRange.min) * ratio;
      const nearestTime = gpuHistoryNearestTimestamp(series, target);
      if (!Number.isFinite(nearestTime)) return;
      const kind = canvas.dataset.chartKind || "overview";
      const rows = series.flatMap((item) => {
        const point = nearestHistoryPoint(item.points || [], nearestTime);
        if (!point) return [];
        const label = esc(item.label || item.serverId || "GPU");
        if (kind === "overview") {
          return ['<span><b>' + label + '</b> ' + esc(historyPercentText(point.gpuUtilPercent)) + ' · 峰值 GPU ' + esc(point.gpuId || "-") + ' · ' + esc(String(item.gpuCount || 0)) + ' 张卡' + (point.imputed === true ? ' · 缺失补零' : '') + '</span>'];
        }
        return ['<span><b>' + label + ' / GPU ' + esc(item.gpuId || "-") + '</b> 利用率 ' + esc(historyPercentText(point.gpuUtilPercent)) + ' · 显存 ' + esc(historyPercentText(point.memoryUtilPercent)) + '（' + esc(historyMemoryText(point)) + '）' + (point.imputed === true ? ' · 缺失补零' : '') + '</span>'];
      });
      if (!rows.length) return;
      tooltip.innerHTML = '<b>' + esc(new Date(nearestTime * 1000).toLocaleString()) + '</b><br>' + rows.join("<br>");
      tooltip.hidden = false;
      activeGpuHistoryTooltip = tooltip;
      tooltip.style.left = x > rect.width / 2 ? "6px" : "auto";
      tooltip.style.right = x > rect.width / 2 ? "auto" : "6px";
    }

    function nearestHistoryPoint(points, target) {
      const index = gpuHistoryPointIndex(points);
      const nearest = nearestHistoryPointFromIndex(index, target);
      if (!nearest) return null;
      const threshold = Math.max(Number(gpuHistoryMeta.bucketSeconds || 300), index.expectedStep) * GPU_HISTORY_GAP_FACTOR;
      return Math.abs(Number(nearest.bucketEpoch) - target) <= threshold ? nearest : null;
    }

    function gpuHistoryPointIndex(points) {
      const source = asArray(points);
      const cached = gpuHistoryPointIndexCache.get(source);
      if (cached) return cached;
      const rows = source.filter((point) => Number.isFinite(Number(point.bucketEpoch))).slice().sort((a, b) => Number(a.bucketEpoch) - Number(b.bucketEpoch));
      const times = rows.map((point) => Number(point.bucketEpoch));
      const value = {
        rows,
        times,
        expectedStep: historyExpectedStepFromSortedTimes(times)
      };
      gpuHistoryPointIndexCache.set(source, value);
      return value;
    }

    function historyExpectedStepFromSortedTimes(times) {
      const values = asArray(times);
      const deltas = values.slice(1).map((value, index) => value - values[index]).filter((value) => value > 0).sort((a, b) => a - b);
      if (!deltas.length) return Number(gpuHistoryMeta.bucketSeconds || 300);
      return deltas[Math.floor(deltas.length / 2)];
    }

    function nearestHistoryPointFromIndex(index, target) {
      const times = index && index.times || [];
      if (!times.length) return null;
      let low = 0;
      let high = times.length;
      while (low < high) {
        const middle = (low + high) >>> 1;
        if (times[middle] < target) low = middle + 1;
        else high = middle;
      }
      const left = Math.max(0, low - 1);
      const right = Math.min(times.length - 1, low);
      const nearestIndex = Math.abs(times[right] - target) < Math.abs(times[left] - target) ? right : left;
      return index.rows[nearestIndex] || null;
    }

    function gpuHistoryTimeRange(series) {
      let min = Infinity;
      let max = -Infinity;
      asArray(series).forEach((item) => {
        const times = gpuHistoryPointIndex(item && item.points).times;
        if (!times.length) return;
        min = Math.min(min, times[0]);
        max = Math.max(max, times[times.length - 1]);
      });
      return Number.isFinite(min) && Number.isFinite(max) ? { min, max } : null;
    }

    function gpuHistoryNearestTimestamp(series, target) {
      let nearest = null;
      asArray(series).forEach((item) => {
        const point = nearestHistoryPointFromIndex(gpuHistoryPointIndex(item && item.points), target);
        const time = Number(point && point.bucketEpoch);
        if (!Number.isFinite(time)) return;
        if (nearest === null || Math.abs(time - target) < Math.abs(nearest - target)) nearest = time;
      });
      return nearest;
    }

    function historyPercentText(value) {
      const number = finiteHistoryPercent(value);
      return number === null ? "-" : String(Math.round(number * 10) / 10) + "%";
    }

    function historyMemoryText(point) {
      const used = Number(point && point.memoryUsedMb);
      const total = Number(point && point.memoryTotalMb);
      return Number.isFinite(used) && Number.isFinite(total) ? Math.round(used) + " / " + Math.round(total) + " MB" : "-";
    }

    function drawGpuHistoryCanvas(canvas) {
      if (!canvas) return;
      const kind = canvas.dataset.chartKind || "overview";
      const chart = canvas.closest(".gpuHistoryChart");
      const series = gpuHistoryCanvasSeries(canvas);
      const rect = canvas.getBoundingClientRect();
      const width = Math.max(320, Math.round(rect.width || (chart && chart.clientWidth) || 640));
      const height = Math.max(150, Math.round(rect.height || 190));
      const dpr = Math.max(1, Math.min(2, Number(window.devicePixelRatio || 1)));
      if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
      }
      const context = canvas.getContext("2d");
      if (!context) return;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, width, height);
      const padding = { left: 36, right: 12, top: 12, bottom: 24 };
      const plotWidth = Math.max(1, width - padding.left - padding.right);
      const plotHeight = Math.max(1, height - padding.top - padding.bottom);
      context.font = "10px sans-serif";
      context.fillStyle = getComputedStyle(canvas).getPropertyValue("--vscode-descriptionForeground") || "#64748B";
      context.strokeStyle = "rgba(127,127,127,.24)";
      context.lineWidth = 1;
      for (let tick = 0; tick <= 4; tick += 1) {
        const value = tick * 25;
        const y = padding.top + plotHeight - plotHeight * value / 100;
        context.beginPath(); context.moveTo(padding.left, y); context.lineTo(width - padding.right, y); context.stroke();
        context.fillText(String(value), 4, y + 3);
      }
      const timeRange = gpuHistoryTimeRange(series);
      if (!timeRange) {
        context.fillStyle = getComputedStyle(canvas).getPropertyValue("--vscode-descriptionForeground") || "#64748B";
        context.fillText("暂无有效历史点", padding.left + 8, padding.top + plotHeight / 2);
        return;
      }
      const minTime = timeRange.min;
      const maxTime = timeRange.max;
      const timeSpan = Math.max(1, maxTime - minTime);
      const focused = canvas.dataset.focusSeries || "";
      asArray(series).forEach((item) => {
        const serverStyle = gpuHistoryServerStyle(item.serverId);
        const pointIndex = gpuHistoryPointIndex(item.points || []);
        const lines = kind === "gpu"
          ? [{ field: "gpuUtilPercent", color: "#2563EB", dash: [], marker: "circle", focus: "util" }, { field: "memoryUtilPercent", color: "#D97706", dash: [6, 3], marker: "square", focus: "memory" }]
          : [{ field: "gpuUtilPercent", color: serverStyle.color, dash: serverStyle.dash, marker: serverStyle.marker, focus: item.serverId }];
        lines.forEach((line) => drawHistoryLine(context, pointIndex.rows, line, minTime, timeSpan, padding, plotWidth, plotHeight, focused, pointIndex.expectedStep));
      });
      context.fillStyle = getComputedStyle(canvas).getPropertyValue("--vscode-descriptionForeground") || "#64748B";
      context.fillText(new Date(minTime * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), padding.left, height - 7);
      const endLabel = new Date(maxTime * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const endWidth = context.measureText(endLabel).width;
      context.fillText(endLabel, width - padding.right - endWidth, height - 7);
    }

    function drawHistoryLine(context, points, line, minTime, timeSpan, padding, plotWidth, plotHeight, focused, expectedStep) {
      const dimmed = focused && focused !== line.focus;
      context.save();
      context.globalAlpha = dimmed ? 0.2 : 1;
      context.strokeStyle = line.color;
      context.fillStyle = line.color;
      context.lineWidth = dimmed ? 1 : 1.8;
      context.setLineDash(line.dash || []);
      let previousTime = null;
      let previousX = null;
      let previousY = null;
      let hasSegment = false;
      const markers = [];
      const markerStep = Math.max(1, Math.floor(points.length / 24));
      context.beginPath();
      points.forEach((point, index) => {
        const value = finiteHistoryPercent(point[line.field]);
        const time = Number(point.bucketEpoch);
        if (value === null || !Number.isFinite(time)) { previousTime = null; previousX = null; previousY = null; return; }
        const gap = previousTime !== null && historyPointStartsGap(point, { bucketEpoch: previousTime }, expectedStep);
        const x = padding.left + (time - minTime) / timeSpan * plotWidth;
        const y = padding.top + plotHeight - value / 100 * plotHeight;
        if (!gap && previousX !== null && previousY !== null) {
          context.lineTo(x, y);
          hasSegment = true;
        } else context.moveTo(x, y);
        if (index === points.length - 1 || gap || index % markerStep === 0) markers.push([x, y]);
        previousTime = time;
        previousX = x;
        previousY = y;
      });
      if (hasSegment) context.stroke();
      markers.forEach((point) => drawHistoryMarker(context, line.marker, point[0], point[1]));
      context.restore();
    }

    function drawHistoryMarker(context, marker, x, y) {
      const size = 3;
      context.beginPath();
      if (marker === "square") context.rect(x - size, y - size, size * 2, size * 2);
      else if (marker === "triangle") { context.moveTo(x, y - size); context.lineTo(x + size, y + size); context.lineTo(x - size, y + size); context.closePath(); }
      else if (marker === "diamond") { context.moveTo(x, y - size); context.lineTo(x + size, y); context.lineTo(x, y + size); context.lineTo(x - size, y); context.closePath(); }
      else context.arc(x, y, size, 0, Math.PI * 2);
      context.fill();
    }

    function loadGpuHistoryServerStyles() {
      try {
        const raw = window.localStorage && window.localStorage.getItem("simpleExperiment.gpuHistoryServerStyles");
        const parsed = raw ? JSON.parse(raw) : {};
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
        const entries = Object.entries(parsed).filter(([key, item]) => key && item && typeof item === "object" && typeof item.color === "string").slice(-GPU_HISTORY_SERVER_STYLE_LIMIT);
        return Object.fromEntries(entries);
      } catch (_) { return {}; }
    }

    function saveGpuHistoryServerStyles() {
      if (gpuHistoryServerStylesSaveTimer) return;
      gpuHistoryServerStylesSaveTimer = setTimeout(() => {
        gpuHistoryServerStylesSaveTimer = 0;
        try { if (window.localStorage) window.localStorage.setItem("simpleExperiment.gpuHistoryServerStyles", JSON.stringify(gpuHistoryServerStyles)); } catch (_) { /* webview storage may be unavailable */ }
      }, 0);
    }

    function gpuHistoryServerStyle(serverId) {
      const key = String(serverId || "").trim() || "unknown";
      if (gpuHistoryServerStyles[key] && gpuHistoryServerStyles[key].color) return gpuHistoryServerStyles[key];
      const used = new Set(Object.values(gpuHistoryServerStyles).map((item) => item && item.color).filter(Boolean));
      const available = GPU_HISTORY_COLORS.filter((candidate) => !used.has(candidate));
      let color = chooseGpuHistoryColor(available, Array.from(used));
      if (!color) {
        const reusable = Array.from(used).sort();
        color = reusable[gpuStableIndex(key) % reusable.length] || GPU_HISTORY_COLORS[gpuStableIndex(key) % GPU_HISTORY_COLORS.length];
      }
      const sameColor = Object.values(gpuHistoryServerStyles).filter((item) => item && item.color === color);
      const variant = sameColor.length;
      const style = { color, dash: lineDashForStyle(GPU_HISTORY_LINE_STYLES[variant % GPU_HISTORY_LINE_STYLES.length]), marker: GPU_HISTORY_MARKERS[Math.floor(variant / GPU_HISTORY_LINE_STYLES.length) % GPU_HISTORY_MARKERS.length] };
      const styleKeys = Object.keys(gpuHistoryServerStyles);
      while (styleKeys.length >= GPU_HISTORY_SERVER_STYLE_LIMIT) delete gpuHistoryServerStyles[styleKeys.shift()];
      gpuHistoryServerStyles[key] = style;
      saveGpuHistoryServerStyles();
      return style;
    }

    function chooseGpuHistoryColor(candidates, used) {
      if (!candidates.length) return "";
      if (!used.length) return candidates[0];
      let best = candidates[0];
      let bestDistance = -1;
      candidates.forEach((candidate) => {
        const distance = Math.min.apply(Math, used.map((color) => gpuHistoryColorDistance(candidate, color)));
        if (distance > bestDistance) { best = candidate; bestDistance = distance; }
      });
      return bestDistance >= GPU_HISTORY_MIN_COLOR_DISTANCE ? best : "";
    }

    function gpuHistoryColorDistance(left, right) {
      const a = gpuHistoryOklab(left);
      const b = gpuHistoryOklab(right);
      return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
    }

    // OKLab/OKLCH conversion keeps color choice perceptual and deterministic across themes.
    function gpuHistoryOklab(value) {
      const hex = String(value || "").replace("#", "");
      const cached = gpuHistoryOklabCache.get(hex);
      if (cached) {
        gpuHistoryOklabCache.delete(hex);
        gpuHistoryOklabCache.set(hex, cached);
        return cached;
      }
      const rgb = [0, 1, 2].map((index) => {
        const srgb = (parseInt(hex.slice(index * 2, index * 2 + 2), 16) || 0) / 255;
        return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
      });
      const [red, green, blue] = rgb;
      const l = Math.cbrt(0.4122214708 * red + 0.5363325363 * green + 0.0514459929 * blue);
      const m = Math.cbrt(0.2119034982 * red + 0.6806995451 * green + 0.1073969566 * blue);
      const s = Math.cbrt(0.0883024619 * red + 0.2817188376 * green + 0.6299787005 * blue);
      const converted = [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
      while (gpuHistoryOklabCache.size >= GPU_HISTORY_OKLAB_CACHE_LIMIT) gpuHistoryOklabCache.delete(gpuHistoryOklabCache.keys().next().value);
      gpuHistoryOklabCache.set(hex, converted);
      return converted;
    }

    function gpuHistoryOklchToHex(candidate) {
      const lightness = Number(candidate && candidate[0]);
      const chroma = Number(candidate && candidate[1]);
      const hue = Number(candidate && candidate[2]) * Math.PI / 180;
      const a = chroma * Math.cos(hue);
      const b = chroma * Math.sin(hue);
      const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
      const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
      const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
      const linearRgb = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
      return "#" + linearRgb.map((value) => {
        const clipped = Math.max(0, Math.min(1, value));
        const srgb = clipped <= 0.0031308 ? 12.92 * clipped : 1.055 * (clipped ** (1 / 2.4)) - 0.055;
        return Math.round(srgb * 255).toString(16).padStart(2, "0").toUpperCase();
      }).join("");
    }

    function gpuStableIndex(value) {
      let hash = 2166136261;
      String(value || "").split("").forEach((char) => { hash ^= char.charCodeAt(0); hash = Math.imul(hash, 16777619); });
      return Math.abs(hash >>> 0);
    }

    function lineDashForStyle(style) {
      if (style === "dash") return [7, 4];
      if (style === "dot") return [2, 3];
      if (style === "dashdot") return [7, 3, 2, 3];
      return [];
    }

    function renderGpuRow(gpu, ownerConfig, server) {
      const owner = gpuOwnerState(gpu, ownerConfig);
      const highMemory = Number(gpu.memoryPercent) > 90;
      const highUtilization = Number(gpu.utilizationPercent) > 95;
      const hotTemperature = Number(gpu.temperature) > 75;
      const dangerTemperature = Number(gpu.temperature) > 85;
      const highLoad = highUtilization || hotTemperature;
      const klass = ["gpu-row"];
      if (owner.isMine) klass.push("is-mine");
      else if (gpu.busy) klass.push("is-occupied");
      else klass.push("is-free");
      if (highMemory) klass.push("mem-danger");
      if (highLoad) klass.push("load-warning");
      if (gpu.staleFromCache) klass.push("is-stale");
      const fillClass = highMemory ? "danger" : "";
      const percentClass = highMemory ? " danger" : "";
      const experiment = gpu.runKey && gpu.runKey !== "-" ? ' · 实验 ' + esc(gpu.runKey) : "";
      const cached = gpu.staleFromCache ? '<span class="pill status-warning">沿用上次</span>' : "";
      const mineBadge = owner.isMine ? '<span class="myTaskBadge">我的任务</span>' : "";
      const status = gpuStatusText(gpu, owner, { highMemory, highLoad });
      const anchor = treeAnchorId("gpu", ((server && (server.serverId || server.workerId)) || "server") + "-" + gpu.index);
      const gpuTitleBits = [
        "GPU " + gpu.index,
        gpu.name,
        memoryText(gpu),
        "利用率 " + valuePercent(gpu.utilizationPercent),
        gpu.temperature === "-" ? "" : "温度 " + gpu.temperature + " C",
        "进程 " + gpu.processCount,
        status,
        gpu.runKey && gpu.runKey !== "-" ? "实验 " + gpu.runKey : ""
      ].filter(Boolean).join(" · ");
      const serverId = String((server && (server.serverId || server.workerId)) || "");
      const historyKey = gpuHistorySeriesKey(serverId, String(gpu.index));
      const historyOpen = expandedGpuHistoryKeys.has(historyKey);
      return '<div class="' + klass.join(" ") + '" data-anchor="' + escAttr(anchor) + '" title="' + escAttr(gpuTitleBits) + '">' +
        '<div class="gpu-main">' +
          '<div class="gpu-title"><b>GPU ' + esc(gpu.index) + '</b><span class="gpu-model">' + esc(gpu.name) + '</span><span class="gpu-id">' + esc(gpu.id) + '</span>' + mineBadge + cached + '</div>' +
          '<div class="progress-line"><div class="progress-bar"><div class="progress-fill ' + fillClass + '" style="width:' + progressWidth(gpu.memoryPercent) + '%"></div></div><span class="progressPercent' + percentClass + '">' + valuePercent(gpu.memoryPercent) + '</span></div>' +
          '<div class="line">显存 ' + esc(memoryText(gpu)) + experiment + '</div>' +
          '<details class="gpuHistoryDetails" data-gpu-history-scope="gpu" data-server-id="' + escAttr(serverId) + '" data-gpu-id="' + escAttr(String(gpu.index)) + '"' + (historyOpen ? ' open' : '') + '>' +
            '<summary>历史（最近三天）</summary>' +
            renderGpuHistoryCard(serverId, String(gpu.index), gpu.name) +
          '</details>' +
        '</div>' +
        '<div class="gpu-metrics">' +
          metric("利用率", valuePercent(gpu.utilizationPercent), highUtilization ? "warn" : "") +
          metric("温度", gpu.temperature === "-" ? "-" : gpu.temperature + " C", dangerTemperature ? "danger" : (hotTemperature ? "warn" : "")) +
          metric("进程", gpu.processCount) +
          metric("状态", status, "statusValue" + (owner.isMine ? " mine" : "") + (gpu.staleFromCache ? " stale" : "")) +
        '</div>' +
      '</div>';
    }

    // "空闲" read from a stale cache is indistinguishable from a fresh "空闲" unless the
    // staleness travels with the status itself, so it is appended here rather than only badged.
    function gpuStatusText(gpu, owner, flags) {
      const parts = [];
      if (owner.isMine) {
        parts.push("我在用");
        if (owner.shared) parts.push("共享");
      } else {
        parts.push(gpu.busy ? "占用" : "空闲");
      }
      if (flags.highMemory) parts.push("高显存");
      if (flags.highLoad) parts.push("高负载");
      if (gpu && gpu.staleFromCache) parts.push("数据陈旧");
      return parts.join(" · ");
    }

    function gpuOwnerState(gpu, config) {
      if (gpu && typeof gpu === "object") {
        const ownerSig = gpuOwnerConfigSignature(config);
        if (gpuOwnerStateCacheOwnerSig !== ownerSig) {
          gpuOwnerStateCacheOwnerSig = ownerSig;
          gpuOwnerStateCache = new WeakMap();
        }
        const processes = asArray(gpu.processes);
        const cacheKey = [objectReferenceKey(processes), processes.length, gpu.processCount || "", gpu.updatedAt || ""].join("|");
        const cached = gpuOwnerStateCache.get(gpu);
        if (cached && cached.key === cacheKey) return cached.value;
        const value = computeGpuOwnerState(processes, config);
        gpuOwnerStateCache.set(gpu, { key: cacheKey, value });
        return value;
      }
      return computeGpuOwnerState([], config);
    }

    function computeGpuOwnerState(processes, config) {
      const myCount = processes.filter((proc) => isMyGpuProcess(proc, config)).length;
      return { isMine: myCount > 0, myCount, otherCount: Math.max(0, processes.length - myCount), shared: myCount > 0 && processes.length > myCount };
    }

    function gpuOwnerConfigSignature(config) {
      const item = config || {};
      return [
        item.currentUser || "",
        asArray(item.currentUserAliases).join(","),
        asArray(item.myCommandKeywords).join(","),
        item.myProcessMatchMode || ""
      ].join("|");
    }

    function isMyGpu(gpu, config) {
      return gpuOwnerState(gpu, config).isMine;
    }

    function isMyGpuProcess(process, config) {
      const username = String(pick(process, ["username", "user", "owner"], "") || "");
      const command = String(pick(process, ["command", "cmd", "commandLine", "cmdline", "args"], "") || "");
      const userCandidates = [config.currentUser].concat(config.currentUserAliases || []).map((item) => String(item || "").trim()).filter(Boolean);
      const keywords = (config.myCommandKeywords || []).map((item) => String(item || "").trim()).filter(Boolean);
      const userMatched = userCandidates.some((name) => username === name);
      const keywordMatched = keywords.some((keyword) => command.includes(keyword));
      if (config.myProcessMatchMode === "username") return userMatched;
      if (config.myProcessMatchMode === "command_contains") return keywordMatched;
      return userMatched || keywordMatched;
    }

    function normalizeGpuOwnerConfig(value) {
      const config = value && typeof value === "object" ? value : {};
      const mode = ["username", "command_contains", "both"].includes(config.myProcessMatchMode) ? config.myProcessMatchMode : "both";
      const aliases = stringArray(config.currentUserAliases);
      const keywords = stringArray(config.myCommandKeywords);
      const currentUser = String(config.currentUser || "").trim();
      return {
        currentUser,
        currentUserAliases: aliases,
        myProcessMatchMode: mode,
        myCommandKeywords: keywords,
        localUserHint: String(config.localUserHint || "").trim(),
        hasUserRule: Boolean(currentUser || aliases.length),
        hasKeywordRule: Boolean(keywords.length)
      };
    }

    function gpuViewModelForState(state) {
      const data = state || {};
      const source = data.gpu;
      const setupSource = data.setup;
      const ownerSource = data.gpuOwnerConfig;
      if (gpuViewModelCacheState === data && gpuViewModelCacheSource === source && gpuViewModelCacheSetup === setupSource && gpuViewModelCacheOwner === ownerSource && gpuViewModelCacheValue) {
        return gpuViewModelCacheValue;
      }
      const incoming = Object.entries(data.gpu || {}).map(([serverId, rows]) => normalizeServerGpu(serverId, rows));
      const ownerConfig = normalizeGpuOwnerConfig(data.gpuOwnerConfig || {});
      const servers = sortGpuServers(data, mergeGpuServers(incoming, data));
      const budget = gpuRenderBudget(servers, ownerConfig);
      gpuViewModelCacheState = data;
      gpuViewModelCacheSource = source;
      gpuViewModelCacheSetup = setupSource;
      gpuViewModelCacheOwner = ownerSource;
      gpuViewModelCacheValue = {
        servers,
        ownerConfig,
        budget,
        gpuCount: budget.gpuCount,
        busyCount: budget.busyCount,
        mineCount: budget.mineCount,
        freeCount: Math.max(0, budget.gpuCount - budget.busyCount)
      };
      return gpuViewModelCacheValue;
    }

    function mergeGpuServers(incoming, state) {
      const now = new Date().toLocaleString();
      const nowMs = Date.now();
      const seen = new Set();
      const merged = [];
      pruneGpuServerCacheForConfiguredState(state || {}, seen);
      incoming.forEach((server) => {
        const key = cleanEndpointId(server.serverId || server.workerId);
        if (!key) return;
        seen.add(key);
        const cached = lastGpuServersById[key];
        if (server.gpuRows.length) {
          const nextRows = cached ? mergeGpuRows(cached.gpuRows || [], server.gpuRows) : sortGpuRows(server.gpuRows);
          const next = Object.assign({}, server, { gpuRows: nextRows, uiReceivedAt: now, uiReceivedMs: nowMs, staleFromCache: false });
          lastGpuServersById[key] = next;
          merged.push(next);
        } else if (cached && cached.gpuRows && cached.gpuRows.length) {
          merged.push(Object.assign({}, cached, { status: "stale", staleFromCache: true }));
        } else {
          lastGpuServersById[key] = Object.assign({}, server, { uiReceivedAt: now, uiReceivedMs: nowMs, staleFromCache: false });
          merged.push(lastGpuServersById[key]);
        }
      });
      pruneGpuServerCache(seen);
      Object.entries(lastGpuServersById).forEach(([key, cached]) => {
        if (!seen.has(key) && cached && cached.gpuRows && cached.gpuRows.length) {
          merged.push(Object.assign({}, cached, { status: "stale", staleFromCache: true }));
        }
      });
      return merged;
    }

    function pruneGpuServerCacheForConfiguredState(state, seen) {
      const setup = (state && state.setup) || {};
      const workers = asArray(setup.workerTunnels || []);
      if (!workers.length) return;
      const configured = new Set();
      enabledWorkerTunnelsForState(state).forEach((worker) => {
        [worker.id, worker.workerId, worker.worker_id, worker.displayName, worker.name, worker.workerHost, worker.host].forEach((value) => {
          const key = cleanEndpointId(value);
          if (key) configured.add(key);
        });
      });
      if (!configured.size) return;
      Object.keys(lastGpuServersById).forEach((key) => {
        if (!seen.has(key) && !configured.has(cleanEndpointId(key))) delete lastGpuServersById[key];
      });
    }

    function pruneGpuServerCache(activeKeys) {
      const entries = Object.entries(lastGpuServersById);
      if (entries.length <= GPU_CACHE_SERVER_LIMIT) return;
      const keep = new Set(activeKeys);
      entries
        .filter(([key]) => !keep.has(key))
        .sort((a, b) => Number(a[1].uiReceivedMs || 0) - Number(b[1].uiReceivedMs || 0))
        .slice(0, Math.max(0, entries.length - GPU_CACHE_SERVER_LIMIT))
        .forEach(([key]) => { delete lastGpuServersById[key]; });
    }

    function gpuRenderBudget(servers, ownerConfig) {
      const visibleServers = budgetGpuServersForRender(servers, ownerConfig);
      const visibleKeys = new Set(visibleServers.map((server) => cleanEndpointId(server.serverId || server.workerId)));
      const gpuCount = servers.reduce((sum, server) => sum + server.gpuRows.length, 0);
      const busyCount = servers.reduce((sum, server) => sum + server.gpuRows.filter((gpu) => gpu.busy).length, 0);
      const mineCount = servers.reduce((sum, server) => sum + server.gpuRows.filter((gpu) => isMyGpu(gpu, ownerConfig)).length, 0);
      const omittedServerCount = Math.max(0, servers.length - visibleServers.length);
      const omittedGpuRowCount = servers.reduce((sum, server) => {
        const key = cleanEndpointId(server.serverId || server.workerId);
        if (!visibleKeys.has(key)) return sum + server.gpuRows.length;
        return sum + budgetGpuRowsForRender(server.gpuRows, ownerConfig).omittedCount;
      }, 0);
      return { visibleServers, gpuCount, busyCount, mineCount, omittedServerCount, omittedGpuRowCount };
    }

    function budgetGpuServersForRender(servers, ownerConfig) {
      if (!Array.isArray(servers) || servers.length <= GPU_SERVER_RENDER_LIMIT) return servers || [];
      const selected = servers.slice(0, GPU_SERVER_RENDER_LIMIT);
      const selectedKeys = new Set(selected.map((server) => cleanEndpointId(server.serverId || server.workerId)));
      servers.slice(GPU_SERVER_RENDER_LIMIT).forEach((server) => {
        const key = cleanEndpointId(server.serverId || server.workerId);
        if (!key || selectedKeys.has(key) || !gpuServerHasMine(server, ownerConfig)) return;
        const replaceIndex = selected.findIndex((item) => !gpuServerHasMine(item, ownerConfig) && !gpuServerHasBusy(item));
        if (replaceIndex < 0) return;
        selectedKeys.delete(cleanEndpointId(selected[replaceIndex].serverId || selected[replaceIndex].workerId));
        selected[replaceIndex] = server;
        selectedKeys.add(key);
      });
      const order = new Map(servers.map((server, index) => [cleanEndpointId(server.serverId || server.workerId), index]));
      return selected.sort((a, b) => (order.get(cleanEndpointId(a.serverId || a.workerId)) || 0) - (order.get(cleanEndpointId(b.serverId || b.workerId)) || 0));
    }

    function budgetGpuRowsForRender(rows, ownerConfig) {
      const allRows = Array.isArray(rows) ? rows : [];
      if (allRows.length <= GPU_ROW_PER_SERVER_RENDER_LIMIT) return { visibleRows: allRows, omittedCount: 0 };
      const ranked = allRows.map((gpu, index) => ({ gpu, index, rank: gpuRenderPriority(gpu, ownerConfig) }))
        .sort((a, b) => a.rank - b.rank || gpuSortValue(a.gpu) - gpuSortValue(b.gpu) || a.index - b.index)
        .slice(0, GPU_ROW_PER_SERVER_RENDER_LIMIT)
        .map((item) => item.gpu);
      return { visibleRows: sortGpuRows(ranked), omittedCount: Math.max(0, allRows.length - ranked.length) };
    }

    function gpuRenderPriority(gpu, ownerConfig) {
      if (isMyGpu(gpu, ownerConfig)) return 0;
      if (Number(gpu.memoryPercent) > 90 || Number(gpu.utilizationPercent) > 95 || Number(gpu.temperature) > 75) return 1;
      if (gpu.busy) return 2;
      if (gpu.staleFromCache) return 4;
      return 3;
    }

    function gpuServerHasMine(server, ownerConfig) {
      return asArray(server.gpuRows).some((gpu) => isMyGpu(gpu, ownerConfig));
    }

    function gpuServerHasBusy(server) {
      return asArray(server.gpuRows).some((gpu) => gpu.busy);
    }

    function mergeGpuRows(cachedRows, incomingRows) {
      const seen = new Set();
      const rows = incomingRows.map((row) => {
        seen.add(gpuRowKey(row));
        return Object.assign({}, row, { staleFromCache: false });
      });
      cachedRows.forEach((row) => {
        if (!seen.has(gpuRowKey(row))) rows.push(Object.assign({}, row, { staleFromCache: true }));
      });
      return sortGpuRows(rows);
    }

    function sortGpuRows(rows) {
      return rows.slice().sort((a, b) => gpuSortValue(a) - gpuSortValue(b) || naturalCompare(gpuRowKey(a), gpuRowKey(b)));
    }

    function sortGpuServers(state, servers) {
      return servers.slice().sort((a, b) => {
        const ai = gpuServerConfigIndex(state, a);
        const bi = gpuServerConfigIndex(state, b);
        if (ai !== bi) return ai - bi;
        return naturalCompare(gpuServerSortLabel(state, a), gpuServerSortLabel(state, b));
      });
    }

    function gpuServerWorkerMatch(state, server) {
      const lookup = gpuWorkerLookupForState(state || {});
      if (lookup !== gpuServerWorkerMatchCacheLookup) {
        gpuServerWorkerMatchCacheLookup = lookup;
        gpuServerWorkerMatchCache = new WeakMap();
      }
      const cacheable = Boolean(server) && typeof server === "object";
      if (cacheable) {
        const cached = gpuServerWorkerMatchCache.get(server);
        if (cached) return cached;
      }
      const found = gpuServerAliases(server || {}).map((alias) => lookup.get(alias)).find(Boolean);
      const match = { index: found ? found.index : GPU_SERVER_UNCONFIGURED_INDEX, worker: (found && found.worker) || null };
      if (cacheable) gpuServerWorkerMatchCache.set(server, match);
      return match;
    }

    function gpuServerConfigIndex(state, server) {
      return gpuServerWorkerMatch(state, server).index;
    }

    function gpuServerSortLabel(state, server) {
      return gpuServerDisplayName(state, server) || server.serverId || server.workerId || "";
    }

    function gpuRowKey(row) {
      return String(row.id && row.id !== "-" ? row.id : row.index);
    }

    function gpuSortValue(row) {
      const value = Number(row.index);
      return Number.isFinite(value) ? value : 999;
    }

    function gpuServerDisplayName(state, server) {
      const found = gpuServerWorkerMatch(state, server).worker;
      return (found && (found.displayName || found.id)) || server.displayName || server.serverId || server.workerId || "Worker";
    }

    function gpuWorkerLookupForState(state) {
      const setup = (state && state.setup) || {};
      const source = Array.isArray(setup.workerTunnels) ? setup.workerTunnels : EMPTY_WORKER_TUNNELS_FOR_ALIAS;
      if (source === gpuWorkerLookupCacheSource && gpuWorkerLookupCacheValue) return gpuWorkerLookupCacheValue;
      const map = new Map();
      source.forEach((worker, index) => {
        [worker.id, worker.displayName, worker.workerId, worker.workerHost, worker.hubHost, worker.sshConfigAlias].forEach((value) => {
          const key = cleanEndpointId(value);
          if (!key) return;
          [key, key.replace(/^worker[:_-]/, "")].forEach((alias) => {
            if (alias && !map.has(alias)) map.set(alias, { worker, index });
          });
        });
      });
      gpuWorkerLookupCacheSource = source;
      gpuWorkerLookupCacheValue = map;
      return map;
    }

    function gpuServerAliases(server) {
      const raw = [server.serverId, server.workerId].map(cleanEndpointId).filter(Boolean);
      return Array.from(new Set(raw.concat(raw.map((value) => value.replace(/^worker[:_-]/, "")))));
    }

    function cleanEndpointId(value) {
      return String(value || "").trim().replace(/^worker:/, "");
    }

    // An "online" card whose snapshot is 40 minutes old must not read the same as a fresh
    // one, so the relative age sits next to the status instead of only inside the tooltip.
    function gpuServerFreshnessView(server) {
      const item = server || {};
      const raw = hasText(item.updatedAt) ? item.updatedAt : item.uiReceivedAt;
      if (!hasText(raw)) return { label: "", title: "" };
      const view = relativeTimestampView(raw, "更新");
      return { label: view.relative, title: "更新时间：" + view.raw + (item.staleFromCache ? "；沿用上次数据" : "") };
    }

    function gpuMetaLine(server) {
      const parts = ["GPU " + server.gpuRows.length];
      if (hasText(server.source)) parts.push("来源 " + server.source);
      const updatedAt = hasText(server.updatedAt) ? server.updatedAt : server.uiReceivedAt;
      if (hasText(updatedAt)) parts.push("更新 " + updatedAt);
      if (server.staleFromCache || server.gpuRows.some((gpu) => gpu.staleFromCache)) parts.push("沿用上次数据");
      return parts.join(" · ");
    }

    function hasText(value) {
      const text = String(value || "").trim();
      return Boolean(text && text !== "-");
    }

    function firstText() {
      for (const value of arguments) {
        const text = String(value || "").trim();
        if (text && text !== "-") return text;
      }
      return "";
    }

    function stringArray(value) {
      return Array.isArray(value) ? value.map((item) => String(item || "").trim()).filter(Boolean) : [];
    }

    function clippedCell(value, klass, displayValue) {
      const full = String(value === undefined || value === null || value === "" ? "-" : value);
      const shown = displayValue === undefined ? compactText(full, 42) : displayValue;
      return '<span class="clipCell ' + escAttr(klass || "") + '" title="' + escAttr(full) + '">' + esc(shown) + '</span>';
    }

    function compactText(value, maxLength) {
      const text = String(value === undefined || value === null || value === "" ? "-" : value);
      const limit = Math.max(8, Number(maxLength) || 42);
      return text.length > limit ? text.slice(0, limit - 1) + "…" : text;
    }

    function compactPath(value) {
      const text = String(value === undefined || value === null || value === "" ? "-" : value);
      const cached = compactPathCache.get(text);
      if (cached !== undefined) {
        compactPathCache.delete(text);
        compactPathCache.set(text, cached);
        return cached;
      }
      const parts = text.split(String.fromCharCode(92)).join("/").split("/").filter(Boolean);
      const compacted = parts.length > 2 ? "…/" + parts.slice(-2).join("/") : compactText(text, 44);
      while (compactPathCache.size >= COMPACT_PATH_CACHE_LIMIT) compactPathCache.delete(compactPathCache.keys().next().value);
      compactPathCache.set(text, compacted);
      return compacted;
    }

    function compactIdentifier(value) {
      const text = String(value === undefined || value === null || value === "" ? "-" : value);
      return text.length > 46 ? text.slice(0, 22) + "…" + text.slice(-18) : text;
    }

    function workerName(value) {
      const text = String(value === undefined || value === null || value === "" ? "-" : value).trim();
      const legacyPrefix = "s" + "sh" + "-config:";
      const lowered = text.toLowerCase();
      const noLegacy = lowered.startsWith(legacyPrefix) ? text.slice(legacyPrefix.length) : text;
      const resolved = resolveWorkerConfig(noLegacy);
      return (resolved && (resolved.displayName || resolved.id)) || noLegacy.replace(/^worker:/i, "") || "-";
    }

    function workerAliasKey(value) {
      const text = String(value === undefined || value === null ? "" : value).trim();
      if (!text || text === "-") return "";
      const name = text.split(String.fromCharCode(92)).join("/").split("/").pop() || text;
      const legacySessionPrefix = "s" + "sh" + "-config:";
      return name.replace(/\.xsh$/i, "").replace(/^worker:/i, "").replace(new RegExp("^" + legacySessionPrefix, "i"), "").trim().toLowerCase();
    }

    function workerAliasValues(worker) {
      const sessionName = String((worker && worker.savedSessionPath) || "").split(String.fromCharCode(92)).join("/").split("/").pop() || "";
      return uniqueText([
        worker && worker.id,
        worker && worker.displayName,
        worker && worker.workerHost,
        worker && worker.hubHost,
        worker && worker.sshConfigAlias,
        worker && worker.savedSessionPath,
        sessionName.replace(/\.xsh$/i, "")
      ].map((value) => String(value || "").trim()).filter(Boolean));
    }

    function resolveWorkerConfig(value) {
      const key = workerAliasKey(value);
      if (!key) return undefined;
      return workerAliasMap().get(key);
    }

    function workerAliasMap() {
      const setup = (lastState && lastState.setup) || {};
      const source = Array.isArray(setup.workerTunnels) ? setup.workerTunnels : EMPTY_WORKER_TUNNELS_FOR_ALIAS;
      if (source === workerAliasMapCacheSource && workerAliasMapCacheValue) return workerAliasMapCacheValue;
      const map = new Map();
      source.forEach((worker) => {
        workerAliasValues(worker).forEach((alias) => {
          const key = workerAliasKey(alias);
          if (key && !map.has(key)) map.set(key, worker);
        });
      });
      workerAliasMapCacheSource = source;
      workerAliasMapCacheValue = map;
      return map;
    }

    function resolveWorkerId(value) {
      const text = String(value || "").trim();
      return (resolveWorkerConfig(text) || {}).id || (text === "-" ? "" : text);
    }

    function naturalCompare(a, b) {
      return String(a || "").localeCompare(String(b || ""), undefined, { numeric: true, sensitivity: "base" });
    }

    function taskRowsForPlanScope(rows, selectedPlanFile, scope, selectedPlan) {
      const allRows = asArray(rows || []);
      const planFile = normalizePlanSelectionKey(selectedPlanFile);
      const plan = selectedPlan && typeof selectedPlan === "object" ? selectedPlan : {};
      const planRevision = String(plan.revision || "").trim();
      const planUpdatedAt = Date.parse(String(plan.updatedAt || ""));
      const selectedRows = planFile
        ? allRows.filter((row) => samePlanSelection(taskPlanFile(row), planFile)
          && taskMatchesPlanVersion(row, planRevision, planUpdatedAt))
        : [];
      const scoped = scope !== "all" && Boolean(planFile);
      return {
        rows: scoped ? selectedRows : allRows,
        scoped,
        selectedPlanFile: planFile,
        selectedPlanRevision: planRevision,
        selectedCount: selectedRows.length,
        totalCount: allRows.length
      };
    }

    function taskPlanResultCount(state, planFile) {
      const summary = (state || {}).resultsSummary || {};
      const summaryPlan = String(summary.planFile || summary.plan_file || "");
      if (summaryPlan && !samePlanSelection(summaryPlan, planFile)) return 0;
      const rows = asArray(summary.results || []);
      const matching = rows.filter((row) => {
        const record = row && typeof row === "object" ? row : {};
        const provenance = record.provenance && typeof record.provenance === "object" ? record.provenance : {};
        const rowPlan = record.planFile || record.plan_file || provenance.planFile || provenance.plan_file || "";
        return rowPlan ? samePlanSelection(rowPlan, planFile) : Boolean(summaryPlan && samePlanSelection(summaryPlan, planFile));
      });
      return matching.length || (summaryPlan && samePlanSelection(summaryPlan, planFile)
        ? Number(summary.resultCount || summary.result_count || 0)
        : 0);
    }

    function taskPlanCompletionState(state, scope) {
      if (!(scope || {}).scoped || !(scope || {}).rows.length) return undefined;
      const rows = scope.rows;
      if (!rows.every((row) => taskTerminalStatus((row || {}).status))) return undefined;
      const failedCount = rows.filter((row) => taskFailureLikeStatus((row || {}).status)).length;
      const allDebug = rows.every((row) => debugRunRecord(row));
      if (allDebug) {
        return failedCount > 0
          ? { kind: "review", message: "当前 Debug 任务已结束，" + failedCount + " 个失败、停止或取消；先查看日志并按需修正" }
          : { kind: "debug-review", message: "Debug 首跑已完成；先复核日志和输出，确认无误后再正式运行" };
      }
      const resultCount = taskPlanResultCount(state, scope.selectedPlanFile);
      if (resultCount > 0) {
        return {
          kind: "results",
          message: "当前 Plan 任务已结束" + (failedCount ? "，其中 " + failedCount + " 个异常" : "") + "；已解析 " + resultCount + " 条结果",
          label: "查看结果"
        };
      }
      if (failedCount > 0) {
        return {
          kind: "review",
          message: "当前 Plan 任务已结束，" + failedCount + " 个失败、停止或取消；先查看日志并按需重试"
        };
      }
      return {
        kind: "waiting",
        message: "当前 Plan 任务已完成，等待自动检查输出并解析结果",
        label: "查看结果状态"
      };
    }

    function renderTaskPlanCompletionNext(state, scope) {
      const outcome = taskPlanCompletionState(state, scope);
      if (!outcome) return "";
      if (outcome.kind === "debug-review") {
        const target = taskDebugLogTarget(scope);
        const logAction = target && target.runKey
          ? '<button class="mini" data-command="selectLogRunKey" data-run-key="' + escAttr(target.runKey) + '" data-worker-id="' + escAttr(target.workerId || "") + '" title="打开当前 Plan 的 Debug 首跑日志">打开 Debug 日志</button>'
          : '<span class="muted">Debug 任务缺少可定位日志标识，请先从任务卡检查输出</span>';
        const formalAction = '<button class="mini secondary" data-command="runPlan" data-debug-mode="false" data-force-formal="true" data-plan-file="' + escAttr((scope || {}).selectedPlanFile || "") + '" data-confirm="true" title="复核 Debug 日志后，同步、校验并预演，再提交完整正式 Plan">正式运行</button>';
        return '<div class="projectQuickNext"><span>Debug 复核</span><b>' + esc(outcome.message) + '</b><div class="projectQuickActions">' + logAction + formalAction + '</div></div>';
      }
      if (outcome.kind === "review") {
        const target = taskFailureLogTarget(scope);
        const action = target && target.runKey
          ? '<button class="mini" data-command="selectLogRunKey" data-run-key="' + escAttr(target.runKey) + '" data-worker-id="' + escAttr(target.workerId || "") + '" title="打开当前 Plan 首个失败、停止或取消任务的日志">打开失败日志</button>'
          : '<span class="muted">任务缺少可定位日志标识，请从任务卡检查 Worker、runKey 和日志路径</span>';
        return '<div class="projectQuickNext"><span>下一步</span><b>' + esc(outcome.message) + '</b><div class="projectQuickActions">' + action + '</div></div>';
      }
      return projectSectionNextAction(outcome.message, outcome.label, "results", "results");
    }

    function taskFailureLogTarget(scope) {
      const failedRows = asArray((scope || {}).rows).filter((row) => taskFailureLikeStatus((row || {}).status));
      for (const row of failedRows) {
        const runKey = taskLogActionKey(row);
        if (runKey) return { runKey, workerId: resolveWorkerId(row.serverId) };
      }
      return failedRows.length ? { manualReview: true } : undefined;
    }

    function taskDebugLogTarget(scope) {
      const debugRows = asArray((scope || {}).rows).filter((row) => debugRunRecord(row));
      for (const row of debugRows) {
        const runKey = taskLogActionKey(row);
        if (runKey) return { runKey, workerId: resolveWorkerId(row.serverId) };
      }
      return debugRows.length ? { manualReview: true } : undefined;
    }

    function taskSelectionSetsForState(state) {
      const data = state || {};
      const selection = data.selection && typeof data.selection === "object" ? data.selection : {};
      const selectedTaskUiKeys = Array.isArray(selection.selectedTaskUiKeys) ? selection.selectedTaskUiKeys : EMPTY_TASK_SELECTION_VALUES;
      const selectedRunKeys = Array.isArray(selection.selectedRunKeys) ? selection.selectedRunKeys : EMPTY_TASK_SELECTION_VALUES;
      const selectedExperimentIds = Array.isArray(selection.selectedExperimentIds) ? selection.selectedExperimentIds : EMPTY_TASK_SELECTION_VALUES;
      const selectedArchiveKeys = Array.isArray(selection.selectedArchiveKeys) ? selection.selectedArchiveKeys : EMPTY_TASK_SELECTION_VALUES;
      const selectedRunKey = String(selection.selectedRunKey || "");
      const hiddenLegacyTaskUiKeySource = Array.isArray(selection.hiddenLegacyTaskUiKeys)
        ? selection.hiddenLegacyTaskUiKeys
        : Array.isArray(data.hiddenLegacyTaskUiKeys) ? data.hiddenLegacyTaskUiKeys : EMPTY_TASK_SELECTION_VALUES;
      const cached = taskSelectionSetsCacheSources;
      if (cached && cached.selectedTaskUiKeys === selectedTaskUiKeys && cached.selectedRunKeys === selectedRunKeys && cached.selectedExperimentIds === selectedExperimentIds && cached.selectedArchiveKeys === selectedArchiveKeys && cached.selectedRunKey === selectedRunKey && cached.hiddenLegacyTaskUiKeys === hiddenLegacyTaskUiKeySource) {
        return taskSelectionSetsCacheValue;
      }
      taskSelectionSetsCacheSources = { selectedTaskUiKeys, selectedRunKeys, selectedExperimentIds, selectedArchiveKeys, selectedRunKey, hiddenLegacyTaskUiKeys: hiddenLegacyTaskUiKeySource };
      taskSelectionSetsCacheValue = {
        uiKeys: new Set(selectedTaskUiKeys.filter(Boolean).map(String)),
        operationKeys: new Set([...selectedRunKeys, ...selectedExperimentIds, ...selectedArchiveKeys, selectedRunKey].filter(Boolean).map(String)),
        hiddenLegacyTaskUiKeys: new Set(hiddenLegacyTaskUiKeySource.map(String))
      };
      return taskSelectionSetsCacheValue;
    }

    function taskSectionViewModelForState(state) {
      const data = state || {};
      if (taskSectionViewCacheState === data && taskSectionViewCacheScope === taskPlanScope && taskSectionViewCacheValue) return taskSectionViewCacheValue;
      const selection = data.selection || {};
      const selected = taskSelectionSetsForState(data);
      const hiddenLegacyTaskUiKeys = selected.hiddenLegacyTaskUiKeys;
      const allRows = schedulerRowsForState(data).filter((row) => !hiddenLegacyTaskUiKeys.has(String(row.uiKey || "")));
      const selectedPlanFile = data.planFileInput || selection.selectedPlanId || "";
      const selectedPlan = selectedPlanFile ? planFromContext(data, { planFile: selectedPlanFile }) || {} : {};
      const scope = taskRowsForPlanScope(allRows, selectedPlanFile, taskPlanScope, selectedPlan);
      const rows = scope.rows;
      taskSectionViewCacheState = data;
      taskSectionViewCacheScope = taskPlanScope;
      taskSectionViewCacheValue = {
        selection,
        selected,
        allRows,
        scope,
        rows,
        taskView: taskRowsViewModel(rows, selected)
      };
      return taskSectionViewCacheValue;
    }

    function renderTaskSection(state) {
      const view = taskSectionViewModelForState(state);
      const selected = view.selected;
      const scope = view.scope;
      const rows = view.rows;
      const taskView = view.taskView;
      const counts = taskView.counts;
      const scopeBar = scope.selectedPlanFile
        ? '<div class="taskScopeBar"><span class="muted">任务范围</span><div class="taskScopeSwitch" role="group" aria-label="任务范围">' +
            '<button type="button" data-task-plan-scope="selected" class="' + (scope.scoped ? "is-active" : "") + '" aria-pressed="' + (scope.scoped ? "true" : "false") + '">当前版本 ' + scope.selectedCount + '</button>' +
            '<button type="button" data-task-plan-scope="all" class="' + (!scope.scoped ? "is-active" : "") + '" aria-pressed="' + (!scope.scoped ? "true" : "false") + '">全部任务 ' + scope.totalCount + '</button>' +
          '</div><span class="muted" title="' + escAttr(scope.selectedPlanFile + (scope.selectedPlanRevision ? " · " + scope.selectedPlanRevision : "")) + '">' + esc(compactPath(scope.selectedPlanFile)) + (scope.selectedPlanRevision ? ' · ' + esc(compactIdentifier(scope.selectedPlanRevision)) : '') + '</span></div>'
        : '<div class="taskScopeBar"><span class="muted">未选择 Plan，显示全部任务。</span></div>';
      let taskSummaryHtml = scopeBar + renderTaskPlanCompletionNext(state, scope) + (rows.length
        ? '<div class="summaryLine">' + Object.keys(counts).map((key) => '<span class="pill ' + statusClass(key) + '" title="' + escAttr("原始状态：" + key) + '">' + esc(taskStatusLabel(key)) + ' ' + counts[key] + '</span>').join("") + '</div>'
        : '<div class="muted">' + (scope.scoped ? "当前 Plan 暂无任务，等待提交或调度状态回传。" : "暂无任务数据。") + '</div>');
      setHtmlIfChanged("taskSummary", taskSummaryHtml);
      const selectedRows = taskView.selectedRows;
      renderTaskBatchActions(state, rows, selectedRows);
      setHtmlIfChanged("taskProgressCards", "");
      const visibleRows = taskView.visibleRows;
      const taskTableChanged = setHtmlIfChanged("taskTable", rows.length
        ? renderTaskCards(state, visibleRows, selected, rows.length)
        : '<div class="muted">' + (scope.scoped ? "当前 Plan 尚无可显示任务；可切换“全部任务”查看历史记录。" : "暂无任务数据。") + '</div>');
      renderTaskDetailPane(state, rows, selectedRows, taskView.detailRow);
      if (taskTableChanged) invalidateSelectedTaskPayload();
    }

    function handleTaskPlanScopeClick(button) {
      const next = button.dataset.taskPlanScope === "all" ? "all" : "selected";
      if (!setTaskPlanScope(next)) return;
      renderTaskSection(lastState || {});
    }

    function handleTaskSelectionChange(box) {
      invalidateSelectedTaskPayload();
      refreshContextualActionButtons(lastState || {}, el("workbenchInspector"));
      refreshContextualActionButtons(lastState || {}, el("pinnedActionsHost"));
      refreshContextualActionButtons(lastState || {}, el("taskBatchActions"));
      vscode.postMessage({ command: "selectExperiment", taskUiKey: box.dataset.taskUiKey, runKey: box.dataset.actionKey || box.dataset.runKey, experimentId: box.dataset.experimentId, archiveKey: box.dataset.archiveKey, selected: box.checked });
    }

    function renderDetectedProject(state) {
      const project = state.detectedProject || {};
      const configs = project.configSummaries || [];
      const plans = project.plans || [];
      const entries = project.entryCandidates || {};
      const resultFiles = project.resultFiles || [];
      const outputContractFiles = project.outputContractFiles || [];
      const resultParsePreviews = project.resultParsePreviews || [];
      const adapterRules = project.adapterRules || {};
      const missingOnboarding = project.missingOnboarding || [];
      const selectedPlan = planFromContext(state, { planFile: state.planFileInput || ((state.selection || {}).selectedPlanId) || "" });
      const previewScope = planScopedResultParsePreviews(resultParsePreviews, selectedPlan, adapterRules);
      const projectMeta = {
        configs,
        plans,
        entries,
        resultFiles,
        outputContractFiles,
        resultParsePreviews: previewScope.items,
        resultParsePreviewScope: previewScope,
        parseablePreviewCount: validResultPreviewCount(previewScope.items),
        adapterRules,
        missingOnboarding,
        selectedPlan,
        serverReadiness: serverSetupReadiness(state),
        executionWorkerReadiness: executionWorkerReadiness(state),
        endpointReadiness: projectEndpointReadiness(state),
        codeSyncReadiness: projectCodeSyncReadiness(state)
      };
      const outputGate = projectOutputGateDiagnostics(project, projectMeta, selectedPlan);
      projectMeta.outputGate = outputGate;
      projectMeta.outputContractCheck = currentResultOutputContractCheck(state);
      const selectedPlanFile = selectedPlan && (selectedPlan.file || selectedPlan.planFile || selectedPlan.planId);
      projectMeta.outputContractStage = currentPlanRuntimeContractStage(state, selectedPlanFile);
      return renderProjectQuickAccess(state, project, projectMeta) +
      renderAdapterRules(adapterRules) +
      renderResultParsePreviews(previewScope) +
      renderConfigInspector(project, selectedPlan);
    }

    function projectUploadDestinationSummary(state) {
      const agentInput = (state || {}).agentSessions;
      const agent = agentInput && typeof agentInput === "object" ? agentInput : EMPTY_OUTPUT_DERIVATION_SOURCE;
      const hubInput = agent.hub;
      const hub = hubInput && typeof hubInput === "object" ? hubInput : EMPTY_OUTPUT_DERIVATION_SOURCE;
      const workers = Array.isArray(agent.workers) ? agent.workers : EMPTY_OUTPUT_DERIVATION_VALUES;
      const hubWorkDir = hub.workDir;
      const hubActualWorkRoot = hub.actualWorkRoot;
      const hubProjectName = hub.projectName;
      const cached = projectUploadDestinationSummaryCache.get(agent);
      if (cached
        && cached.hub === hub
        && cached.workers === workers
        && cached.hubWorkDir === hubWorkDir
        && cached.hubActualWorkRoot === hubActualWorkRoot
        && cached.hubProjectName === hubProjectName) return cached.value;
      const hubPath = meaningfulValue(hubWorkDir);
      const hubRoot = meaningfulValue(hubActualWorkRoot);
      const projectName = meaningfulValue(hubProjectName);
      const enabledWorkers = workers.filter((worker) => worker && worker.enabled !== false);
      const workerPaths = enabledWorkers.map((worker) => meaningfulValue(worker.workDir)).filter(Boolean);
      const missingWorkers = Math.max(0, enabledWorkers.length - workerPaths.length);
      let value;
      if (!hubPath) value = { ready: false, summary: hubRoot && !projectName ? "打开本地项目后显示上传位置" : "保存 Hub 项目父目录后显示" };
      else if (!enabledWorkers.length) value = { ready: false, summary: "Hub：" + compactPath(hubPath) + "；尚未配置 Worker" };
      else if (missingWorkers) value = { ready: false, summary: "Hub：" + compactPath(hubPath) + "；" + missingWorkers + " 个 Worker 路径待保存" };
      else {
        const distinctPaths = uniqueText([hubPath, ...workerPaths]);
        value = distinctPaths.length === 1
          ? { ready: true, summary: "Hub + " + enabledWorkers.length + " 个 Worker：" + compactPath(hubPath) }
          : { ready: true, summary: "Hub：" + compactPath(hubPath) + "；Worker " + enabledWorkers.length + " 个独立位置" };
      }
      projectUploadDestinationSummaryCache.set(agent, { hub, workers, hubWorkDir, hubActualWorkRoot, hubProjectName, value });
      return value;
    }

    function projectQuickLifecyclePresentation(stage, readyToStart, firstRunRecommended) {
      const item = stage || {};
      const phase = String(item.phase || "");
      const summary = String(item.status || "");
      const active = {
        validating: ["校验中", "status-running"],
        "dry-running": ["预演中", "status-running"],
        submitting: ["提交中", "status-running"],
        monitor: ["运行中", "status-running"]
      }[phase];
      if (active) return { badge: active[0], className: active[1], summary, preferStage: true };
      if (phase === "results") return { badge: "结果待处理", className: "status-running", summary, preferStage: true };
      if (phase === "debug-review") return { badge: "Debug 待复核", className: "status-warning", summary, preferStage: true };
      if (phase === "review") return { badge: "任务需处理", className: "status-failed", summary, preferStage: true };
      if (!readyToStart) return { badge: "待补齐", className: "status-warning", summary: "", preferStage: false };
      if (phase === "validate") return { badge: "校验需处理", className: "status-warning", summary, preferStage: true };
      if (phase === "dry-run") return { badge: "预演需处理", className: "status-warning", summary, preferStage: true };
      if (phase === "run" && /失败|异常|未完成/.test(summary)) return { badge: "提交需处理", className: "status-warning", summary, preferStage: true };
      if (firstRunRecommended) return { badge: "建议 Debug 首跑", className: "status-warning", summary: "当前 Plan revision 尚无运行证据，建议先验证首个任务", preferStage: true };
      return { badge: "可提交", className: "status-completed", summary, preferStage: true };
    }

    function renderProjectQuickAccess(state, project, meta) {
      const planDir = state.planDir || "experiments/plans";
      const selectedPlanFile = (meta.selectedPlan && (meta.selectedPlan.file || meta.selectedPlan.planFile)) || "";
      const availablePlanCount = asArray(meta.plans || project.plans || []).length;
      const simpleSftp = simpleSftpReadinessForState(state);
      const workspace = projectWorkspaceContext(state, project);
      const firstConfig = selectedPlanFile ? firstProjectConfig(project, meta, meta.selectedPlan) : "";
      const configAvailable = projectConfigAvailable(firstConfig, project, meta);
      const trainEntry = project.trainEntry || firstProjectPath((meta.entries || {}).trainEntries);
      const testEntry = project.testEntry || firstProjectPath((meta.entries || {}).testEntries);
      const adapterConfig = project.adapterConfig || "experiments/zlk_project.yaml";
      const outputGate = meta.outputGate || projectOutputGateDiagnostics(project, meta, meta.selectedPlan);
      const resultLocation = projectResultLocation(project, meta, meta.selectedPlan);
      const uploadDestination = projectUploadDestinationSummary(state);
      const existingResultPaths = uniqueText([
        ...asArray(project.outputContractFiles),
        ...asArray(project.resultFiles)
      ].map(String).filter(isParseableResultCandidate));
      const resultLocationExists = existingResultPaths.some((file) => file.toLowerCase() === resultLocation.path.toLowerCase());
      const accessSummary = project.adapterConfig
        ? project.adapterConfig
        : outputGate.ok && resultLocation.source === "当前 Plan"
          ? "当前 Plan 已声明输出，无需额外模板"
          : outputGate.ok && resultLocation.source
            ? "已识别" + resultLocation.source + "，可按需保存接入模板"
            : "未生成 experiments/zlk_project.yaml";
      const serverReadiness = meta.serverReadiness || serverSetupReadiness(state);
      const workerReadiness = meta.executionWorkerReadiness || executionWorkerReadiness(state);
      const endpointReadiness = meta.endpointReadiness || projectEndpointReadiness(state);
      const codeSyncReadiness = meta.codeSyncReadiness || projectCodeSyncReadiness(state);
      const environment = projectEnvironmentSummary(state, project);
      const executionStage = selectedPlanFile ? planExecutionStage(state, selectedPlanFile) : undefined;
      const readyToStart = Boolean(simpleSftp.ready) && Boolean(selectedPlanFile) && outputGate.ok && serverReadiness.ready && workerReadiness.ready && endpointReadiness.ready && !meta.outputContractStage;
      const firstRunRecommended = planFirstRunRecommended(state, selectedPlanFile, meta.selectedPlan, executionStage, readyToStart);
      const lifecycle = projectQuickLifecyclePresentation(executionStage, readyToStart, firstRunRecommended);
      const readinessSummary = meta.outputContractStage
        ? meta.outputContractStage.message
        : (!selectedPlanFile && availablePlanCount ? "缺少：明确选择本次运行计划" : projectReadinessStatusText(simpleSftp, serverReadiness, workerReadiness, endpointReadiness, outputGate));
      const statusSummary = lifecycle.preferStage && lifecycle.summary ? lifecycle.summary : readinessSummary;
      const missingItems = asArray(meta.missingOnboarding).map((item) => String(item || "").replace(/^下一步：/, "").trim()).filter(Boolean);
      const missing = missingItems.length
        ? '<div class="notice warning" title="' + escAttr(missingItems.join("；")) + '"><b>接入提示</b> ' + esc(missingItems[0]) + (missingItems.length > 1 ? '<span class="muted"> 另有 ' + esc(String(missingItems.length - 1)) + ' 项</span>' : '') + '</div>'
        : "";
      const primaryRows = [
        projectQuickRow("本地项目", workspace.summary, [], workspace.singleProject ? "status-completed" : "status-warning"),
        projectQuickRow("当前计划", selectedPlanFile || (availablePlanCount ? "未选择（发现 " + availablePlanCount + " 个）" : "尚未创建"), [
          projectPathButton("目录", planDir),
          projectPathButton(selectedPlanFile ? "打开计划" : "", selectedPlanFile),
          '<button class="mini projectPathButton secondary" data-command="generatePlanGuide">新建模板</button>'
        ]),
        projectQuickRow("当前配置", firstConfig ? (configAvailable ? firstConfig : firstConfig + "（缺失）") : (selectedPlanFile ? "未发现配置" : "选择 Plan 后显示"), [
          projectPathButton(configAvailable ? "打开配置" : "", firstConfig)
        ]),
        projectQuickRow("入口", "训练：" + (trainEntry || "未发现") + "；评估：" + (testEntry || "未发现"), [
          projectPathButton(trainEntry ? "训练" : "", trainEntry),
          projectPathButton(testEntry ? "评估" : "", testEntry)
        ]),
        projectQuickRow("接入", accessSummary, [
          project.adapterConfig ? projectPathButton("打开", adapterConfig) : '',
          project.adapterConfig || !outputGate.ok ? '<button class="mini projectPathButton secondary" data-command="generateOutputAdapter">' + (project.adapterConfig ? "更新模板" : "生成模板") + '</button>' : ''
        ], outputGate.ok ? "status-completed" : "status-warning"),
        projectQuickRow("结果位置", resultLocation.summary, [
          projectPathButton(resultLocationExists ? "打开" : "", resultLocationExists ? resultLocation.path : "")
        ], resultLocation.path && outputGate.ok ? "status-completed" : "status-warning"),
        renderProjectRuntimeContractRow(meta.outputContractStage, project, selectedPlanFile),
        projectQuickRow("状态", statusSummary, [])
      ].filter(Boolean);
      const infrastructureRows = [
        projectQuickRow("环境", environment.summary, [
          projectPathButton(environment.firstFile ? "依赖" : "", environment.firstFile),
          '<button class="mini projectPathButton secondary" type="button" data-section-target="settings" data-anchor-target="settings-servers" title="查看或修改 Hub/Worker 执行环境">环境</button>'
        ], environment.files.length ? "status-completed" : ""),
        projectQuickRow("服务器", serverReadiness.summary, [
          '<button class="mini projectPathButton secondary" type="button" data-section-target="settings" data-anchor-target="settings-servers">设置</button>'
        ], serverReadiness.ready ? "status-completed" : "status-warning"),
        projectQuickRow("上传位置", uploadDestination.summary, [
          '<button class="mini projectPathButton secondary" type="button" data-section-target="settings" data-anchor-target="settings-servers">查看</button>'
        ], uploadDestination.ready ? "status-completed" : "status-warning"),
        projectQuickRow("运行目标", workerReadiness.summary, [
          !workerReadiness.ready ? '<button class="mini projectPathButton secondary" type="button" data-section-target="settings" data-anchor-target="settings-servers">添加 Worker</button>' : ''
        ], workerReadiness.ready ? "status-completed" : "status-warning"),
        projectQuickRow("连接", endpointReadiness.summary, [
          endpointReadiness.projectMismatch
            ? '<button class="mini projectPathButton" data-command="prepareAgents">准备 Agent</button>'
            : endpointReadiness.versionMismatch
            ? '<button class="mini projectPathButton secondary" data-command="deployLatestAgent">部署 Agent</button>'
            : endpointReadiness.restartRequired
              ? '<button class="mini projectPathButton secondary" data-command="startAllConnections">启动会话</button><button class="mini projectPathButton secondary" data-command="testAll">检测全部</button>'
              : '<button class="mini projectPathButton" data-command="prepareAgents">准备 Agent</button><button class="mini projectPathButton secondary" data-command="testAll">检测全部</button>'
        ], endpointReadiness.ready ? "status-completed" : "status-warning"),
        projectQuickRow("代码同步", codeSyncReadiness.ready ? codeSyncReadiness.summary : "校验时自动同步 Hub；提交运行时自动同步 Hub/Worker", [
          !codeSyncReadiness.hubReady ? '<button class="mini projectPathButton secondary" data-command="uploadProjectToHub">上传 Hub</button>' : '',
          codeSyncReadiness.workerRequired && !codeSyncReadiness.workerReady ? '<button class="mini projectPathButton secondary" data-command="uploadProjectToWorkers">上传 Worker</button>' : ''
        ], codeSyncReadiness.ready ? "status-completed" : "status-warning")
      ].filter(Boolean);
      return '<div class="projectQuickNav" title="项目入口">' +
        '<div class="projectQuickHead"><b>项目关键入口</b><span class="' + escAttr(lifecycle.className) + '">' + esc(lifecycle.badge) + '</span></div>' +
        legacySftpNoticeForState(state) +
        renderProjectOnboardingFlow(state, project, meta) +
        renderProjectNextAction(state, project, meta, selectedPlanFile, outputGate, serverReadiness, workerReadiness, endpointReadiness) +
        '<div class="projectQuickRows">' + primaryRows.join("") + '</div>' +
        '<details class="projectQuickDetails"><summary>环境、服务器、连接与同步详情</summary><div class="projectQuickRows">' + infrastructureRows.join("") + '</div></details>' +
        renderOutputGateChecklist(project, meta, meta.selectedPlan) +
      '</div>' + missing;
    }

    function projectEnvironmentSummary(state, project) {
      const setupInput = (state || {}).setup;
      const setup = setupInput && typeof setupInput === "object" ? setupInput : EMPTY_SERVER_SETUP;
      const projectSource = project && typeof project === "object" && !Array.isArray(project) ? project : EMPTY_OUTPUT_DERIVATION_SOURCE;
      const environmentFiles = Array.isArray(projectSource.environmentFiles) ? projectSource.environmentFiles : EMPTY_OUTPUT_DERIVATION_VALUES;
      const workers = enabledWorkerTunnelsForState(state);
      const hubEnvInput = setup.condaEnv;
      const cached = projectEnvironmentSummaryCache.get(projectSource);
      if (cached
        && cached.setup === setup
        && cached.workers === workers
        && cached.environmentFiles === environmentFiles
        && cached.hubEnvInput === hubEnvInput) return cached.value;
      const hubEnv = meaningfulValue(setup.condaEnv);
      const hubEnvironment = executionEnvironmentText(hubEnv);
      const workerEnvironments = uniqueText(workers.map((worker) => executionEnvironmentText(worker.condaEnv === undefined ? hubEnv : worker.condaEnv)));
      const distinctWorkers = workerEnvironments.filter((item) => item !== hubEnvironment);
      const environmentText = distinctWorkers.length ? "Hub " + hubEnvironment + " · Worker " + distinctWorkers.join("/") : hubEnvironment;
      const files = environmentFiles.map(String).filter(Boolean);
      const firstFile = files[0] || "";
      const fileText = firstFile ? firstFile + (files.length > 1 ? " 等 " + files.length + " 个清单" : "") : "未发现依赖清单，请确认执行环境已安装项目依赖";
      const value = { files, firstFile, summary: environmentText + " · " + fileText };
      projectEnvironmentSummaryCache.set(projectSource, { setup, workers, environmentFiles, hubEnvInput, value });
      return value;
    }

    function projectWorkspaceContext(state, project) {
      const workspaceInput = (state || {}).workspace;
      const item = workspaceInput && typeof workspaceInput === "object" ? workspaceInput : EMPTY_OUTPUT_DERIVATION_SOURCE;
      const projectSource = project && typeof project === "object" && !Array.isArray(project) ? project : EMPTY_OUTPUT_DERIVATION_SOURCE;
      const mappingErrorInput = item.mappingError;
      const workspaceRootInput = item.root;
      const workspaceNameInput = item.name;
      const folderCountInput = item.folderCount;
      const singleProjectInput = item.singleProject;
      const containerPathInput = item.containerPath;
      const projectRootInput = projectSource.root;
      const cached = projectWorkspaceContextCache.get(item);
      if (cached
        && cached.mappingErrorInput === mappingErrorInput
        && cached.workspaceRootInput === workspaceRootInput
        && cached.workspaceNameInput === workspaceNameInput
        && cached.folderCountInput === folderCountInput
        && cached.singleProjectInput === singleProjectInput
        && cached.containerPathInput === containerPathInput
        && cached.projectRootInput === projectRootInput) return cached.value;
      const mappingError = meaningfulValue(mappingErrorInput);
      const fallbackRoot = mappingError ? "" : meaningfulValue(projectRootInput);
      const root = meaningfulValue(workspaceRootInput) || fallbackRoot;
      const name = meaningfulValue(workspaceNameInput) || (root ? root.split(/[\\/]/).filter(Boolean).pop() : "");
      const folderCount = Number(folderCountInput || 0);
      let value;
      if (!root && !name) value = { open: false, singleProject: false, summary: "未打开本地项目；上传、Agent 和远端操作前必须打开一个项目" };
      else if (singleProjectInput === false || folderCount > 1) value = { open: true, singleProject: false, summary: (name || "当前目录") + " · 多根工作区（" + Math.max(2, folderCount) + " 个），远端操作会阻断" };
      else if (mappingError) value = { open: true, singleProject: true, summary: (name || "当前项目") + " · 工作区路径映射错误：" + compactText(mappingError, 180) };
      else {
        const remotePath = meaningfulValue(containerPathInput);
        const pathSummary = remotePath ? "容器 " + remotePath + " → 宿主 " + compactPath(root) : compactPath(root);
        value = { open: true, singleProject: true, summary: (name || "当前项目") + " · " + pathSummary };
      }
      projectWorkspaceContextCache.set(item, { mappingErrorInput, workspaceRootInput, workspaceNameInput, folderCountInput, singleProjectInput, containerPathInput, projectRootInput, value });
      return value;
    }

    function executionEnvironmentText(value) {
      const condaEnv = meaningfulValue(value);
      return condaEnv ? "Conda " + condaEnv : "系统 Python";
    }

    function renderProjectNextAction(state, project, meta, planFile, outputGate, serverReadiness, workerReadiness, endpointReadiness) {
      const selectedPlan = planFile ? planFromContext(state || {}, { planFile }) || {} : {};
      const activeRun = planFile ? planActiveRunEvidence(state, planFile, selectedPlan) : { active: false };
      if (activeRun.active) {
        if (activeRun.historicalOnly) {
          return activeRun.taskCount
            ? projectSectionNextAction("旧 revision 仍有未结束任务；为保护旧任务，当前版本暂不能提交", "查看全部任务", "tasks", "tasks-list", { taskPlanScope: "all" })
            : projectSectionNextAction("旧 revision 仍有未结束提交；为保护旧任务，当前版本暂不能提交", "查看提交进度", "operations", "operations-list");
        }
        return renderPlanExecutionNextAction(state, planFile);
      }
      const executionStage = planFile ? planExecutionStage(state, planFile) : undefined;
      if (["results", "review", "debug-review"].includes(String((executionStage || {}).phase || ""))) {
        return renderPlanExecutionNextAction(state, planFile);
      }
      const simpleSftp = simpleSftpReadinessForState(state);
      if (!simpleSftp.ready) {
        return projectNextAction(simpleSftp.message, "打开配置说明", "openSetupGuide");
      }
      if (!(serverReadiness || {}).ready) {
        return projectSectionNextAction("先配置 Xshell 会话和服务器项目父目录", "配置服务器", "settings", "settings-servers");
      }
      if (!planFile) {
        return asArray((meta || {}).plans || (project || {}).plans || []).length
          ? projectNextAction("选择本次要接入并运行的 Plan", "选择 Plan", "bootstrapProject")
          : projectNextAction("一键创建 Plan 和结果接入", "接入当前项目", "bootstrapProject");
      }
      const contractStage = (meta || {}).outputContractStage;
      if (contractStage) {
        if (contractStage.section === "operations") {
          return projectSectionNextAction(contractStage.message, contractStage.label, contractStage.section, contractStage.anchor);
        }
        if (contractStage.section === "plans") {
          if (project.adapterConfig) {
            return projectNextAction(contractStage.message + "；修改接入配置或项目输出后重新运行当前 Plan", "打开接入配置", "openPlan", { file: project.adapterConfig });
          }
          return projectNextAction(contractStage.message, "生成接入模板", "generateOutputAdapter");
        }
        return projectNextAction(contractStage.message, contractStage.label, contractStage.command);
      }
      if (!outputGate.ok && !project.adapterConfig) {
        return projectNextAction("补全结果捕获规则", "生成接入模板", "generateOutputAdapter");
      }
      if (!outputGate.ok) {
        return projectNextAction("补全计划输出契约", "打开当前计划", "openPlan", { file: planFile });
      }
      if (!(workerReadiness || {}).ready) {
        return projectSectionNextAction("至少配置并启用一个执行 Worker", "添加 Worker", "settings", "settings-servers");
      }
      const preparationBlockers = agentPreparationBlockersFromState(state);
      if (preparationBlockers.length) {
        return projectSectionNextAction(preparationBlockers[0], "修复服务器配置", "settings", "settings-servers");
      }
      if ((endpointReadiness || {}).versionMismatch) {
        return projectNextAction("Agent 版本与插件不兼容；部署后需重启 Xshell 会话", "部署 Agent", "deployLatestAgent");
      }
      if ((endpointReadiness || {}).projectMismatch) {
        return projectNextAction("当前 Agent 仍指向旧项目；需重写本项目启动命令", "准备 Agent", "prepareAgents");
      }
      if ((endpointReadiness || {}).restartRequired) {
        return projectNextAction("最新版 Agent 已部署；请重启 Hub/Worker Xshell 会话后检测", "启动会话", "startAllConnections");
      }
      if (asArray((endpointReadiness || {}).dependencyIssues).length) {
        return projectSectionNextAction(endpointReadiness.dependencyIssues[0], "查看依赖", "settings", "settings-servers");
      }
      if (!(endpointReadiness || {}).ready) {
        return projectNextAction("检测 Xshell 隧道与 Hub/Worker Agent", "检测全部", "testAll");
      }
      if (planFirstRunRecommended(state, planFile, (meta || {}).selectedPlan, executionStage, true)) {
        return renderProjectFirstRunActions(true, planFile);
      }
      return renderPlanExecutionNextAction(state, planFile);
    }

    function renderProjectRuntimeContractRow(stage, project, planFile) {
      if (!stage) return "";
      return projectQuickRow("运行时契约", runtimeContractStageMessage(stage, project), [renderRuntimeContractRecoveryActions(stage, project, planFile)], stage.section === "plans" ? "status-warning" : stage.section === "operations" ? "status-running" : "status-completed");
    }

    function runtimeContractStageMessage(stage, project) {
      const message = String((stage || {}).message || "");
      return stage && stage.section === "plans" && (project || {}).adapterConfig
        ? message + "；修改接入配置或项目输出后重新运行当前 Plan"
        : message;
    }

    function runtimeContractStageBadge(stage) {
      if (!stage) return "";
      if (stage.section === "operations") return "检查中";
      if (stage.section === "plans") return "运行缺失";
      return stage.command === "checkOutputContract" ? "待检查" : "待重新解析";
    }

    function renderRuntimeContractRecoveryActions(stage, project, planFile) {
      if (!stage) return "";
      if (stage.section === "operations") {
        return '<button class="mini projectPathButton secondary" type="button" data-section-target="operations" data-anchor-target="operations-list">查看进度</button>';
      }
      if (stage.section === "plans") {
        const inspectActions = renderRemoteResultInspectionActions(stage.unparseableFileList, planFile, 2, stage.unparseableDetails);
        if ((project || {}).adapterConfig) {
          return inspectActions + projectPathButton("打开接入配置", project.adapterConfig) + (planFile
            ? '<button class="mini projectPathButton secondary" data-command="runPlan" data-plan-file="' + escAttr(planFile) + '" data-confirm="true" title="修改接入配置或项目输出后，重新同步、校验、预演并提交">修复后重新运行</button>'
            : "");
        }
        return inspectActions + '<button class="mini projectPathButton secondary" data-command="generateOutputAdapter">生成接入模板</button>';
      }
      return '<button class="mini projectPathButton secondary" data-command="' + escAttr(stage.command) + '">' + esc(stage.label) + '</button>';
    }

    function renderPlanExecutionNextAction(state, planFile) {
      const stage = planExecutionStage(state, planFile);
      if (stage.section) return projectSectionNextAction(stage.status, stage.label, stage.section, stage.anchor || stage.section);
      return projectNextAction(stage.status, stage.label, stage.command, { planFile });
    }

    function planActiveRunEvidence(state, planFile, selectedPlanRecord) {
      const selectedPlan = normalizePlanSelectionKey(planFile);
      if (!selectedPlan) return { active: false, operationCount: 0, taskCount: 0 };
      const plan = selectedPlanRecord && typeof selectedPlanRecord === "object"
        ? selectedPlanRecord
        : (typeof planFromContext === "function" ? planFromContext(state || {}, { planFile }) || {} : {});
      const planRevision = String(plan.revision || plan.planRevision || plan.plan_revision || "").trim();
      const planUpdatedAtText = String(plan.updatedAt || plan.updated_at || "");
      const planUpdatedAt = Date.parse(planUpdatedAtText);
      if (planActiveRunEvidenceCacheState !== state) {
        planActiveRunEvidenceCacheState = state;
        planActiveRunEvidenceCache = new Map();
      }
      const cacheKey = [selectedPlan, planRevision, planUpdatedAtText].join("|");
      if (planActiveRunEvidenceCache.has(cacheKey)) return planActiveRunEvidenceCache.get(cacheKey);
      const matchesCurrentVersion = (row) => {
        const revision = String((row || {}).planRevision || (row || {}).plan_revision || "").trim();
        if (planRevision && revision) return revision === planRevision;
        if (Number.isFinite(planUpdatedAt)) {
          const rowAt = Date.parse(String((row || {}).updatedAt || (row || {}).updated_at || (row || {}).startedAt || (row || {}).started_at || ""));
          return Number.isFinite(rowAt) && rowAt >= planUpdatedAt;
        }
        return !planRevision;
      };
      let operationCount = 0;
      let taskCount = 0;
      let currentOperationCount = 0;
      let currentTaskCount = 0;
      for (const row of operationRowsForState(state || {})) {
        if (!PLAN_RUN_OPERATION_TYPES.has(String((row || {}).type || "").toLowerCase())
          || !samePlanSelection((row || {}).planFile || "", selectedPlan)
          || (row || {}).schedulerFinished
          || !PLAN_ACTIVE_STATUSES.has(String((row || {}).status || "").toLowerCase())) continue;
        operationCount += 1;
        if (matchesCurrentVersion(row)) currentOperationCount += 1;
      }
      for (const row of schedulerRowsForState(state || {})) {
        if (!samePlanSelection((row || {}).planFile || (row || {}).plan || "", selectedPlan)
          || !PLAN_ACTIVE_STATUSES.has(String((row || {}).status || "").toLowerCase())) continue;
        taskCount += 1;
        if (matchesCurrentVersion(row)) currentTaskCount += 1;
      }
      const active = operationCount > 0 || taskCount > 0;
      const currentActive = currentOperationCount > 0 || currentTaskCount > 0;
      const result = {
        active,
        currentActive,
        historicalActive: active && (currentOperationCount < operationCount || currentTaskCount < taskCount),
        historicalOnly: active && !currentActive,
        operationCount,
        taskCount,
        currentOperationCount,
        currentTaskCount,
        historicalOperationCount: operationCount - currentOperationCount,
        historicalTaskCount: taskCount - currentTaskCount
      };
      planActiveRunEvidenceCache.set(cacheKey, result);
      return result;
    }

    function planExecutionStage(state, planFile) {
      const data = state || {};
      const plan = planFromContext(data, { planFile }) || {};
      const planUpdatedAtText = String(plan.updatedAt || "");
      const planUpdatedAt = Date.parse(planUpdatedAtText);
      const planRevision = String(plan.revision || "");
      if (planExecutionStageCacheState !== data) {
        planExecutionStageCacheState = data;
        planExecutionStageCache = new Map();
      }
      const cacheKey = planExecutionStageCacheKey(planFile, planRevision, planUpdatedAtText);
      if (planExecutionStageCache.has(cacheKey)) return planExecutionStageCache.get(cacheKey);
      const rows = planVersionOperationRows(data, planFile, planRevision, planUpdatedAt);
      if (!rows.length) {
        const taskStage = terminalPlanTaskExecutionStage(data, planFile, planRevision, planUpdatedAt);
        if (taskStage) return cachePlanExecutionStage(cacheKey, taskStage);
      }
      const latestValidate = rows.find((row) => String(row.type || "").toLowerCase() === "validate-plan");
      if (!latestValidate) {
        return cachePlanExecutionStage(cacheKey, {
          phase: "ready",
          status: "准备就绪；确认后自动同步、校验、预演并提交",
          label: "校验并提交运行",
          command: "runPlan"
        });
      }
      if (operationPending(latestValidate)) {
        return cachePlanExecutionStage(cacheKey, { phase: "validating", status: "计划校验执行中，等待操作终态", label: "查看进度", section: "operations", anchor: "operations" });
      }
      if (!operationSucceeded(latestValidate)) {
        return cachePlanExecutionStage(cacheKey, {
          phase: "validate",
          status: operationIsFailureLike(latestValidate.status) ? "最近一次校验失败；修正 Plan 后重新校验" : "最近一次校验未完成；重新校验当前计划",
          label: "重新校验",
          command: "validatePlan"
        });
      }
      const latestDryRun = rows.find((row) => String(row.type || "").toLowerCase() === "dry-run-plan" && operationAtOrAfter(row, latestValidate));
      if (operationPending(latestDryRun)) {
        return cachePlanExecutionStage(cacheKey, { phase: "dry-running", status: "计划预演执行中，等待调度预览", label: "查看进度", section: "operations", anchor: "operations" });
      }
      if (!operationSucceeded(latestDryRun)) {
        return cachePlanExecutionStage(cacheKey, {
          phase: "dry-run",
          status: latestDryRun && operationIsFailureLike(latestDryRun.status) ? "最近一次预演失败；调整后重新预演" : "校验已通过，预演调度与任务展开结果",
          label: latestDryRun && operationIsFailureLike(latestDryRun.status) ? "重新预演" : "预演当前计划",
          command: "dryRunPlan"
        });
      }
      const latestRun = rows.find((row) => ["run-plan", "reproduce-plan"].includes(String(row.type || "").toLowerCase()) && operationAtOrAfter(row, latestDryRun));
      const runAccepted = Boolean(latestRun && (latestRun.submissionAccepted || latestRun.schedulerStarted));
      if (operationPending(latestRun)) {
        if (runAccepted) {
          return cachePlanExecutionStage(cacheKey, { phase: "monitor", status: "计划已提交，调度器正在排队或运行任务", label: "查看任务", section: "tasks", anchor: "tasks" });
        }
        return cachePlanExecutionStage(cacheKey, { phase: "submitting", status: "运行计划提交中，等待调度确认", label: "查看进度", section: "operations", anchor: "operations" });
      }
      if (operationSucceeded(latestRun)) {
        if (debugRunRecord(latestRun)) {
          return cachePlanExecutionStage(cacheKey, { phase: "debug-review", status: "Debug 已完成；先查看任务与日志，确认无误后可正式运行", label: "查看 Debug 任务", section: "tasks", anchor: "tasks" });
        }
        return cachePlanExecutionStage(cacheKey, { phase: "results", status: "调度已完成，进入结果解析、筛选与归档流程", label: "查看结果", section: "results", anchor: "results" });
      }
      if (latestRun && operationIsFailureLike(latestRun.status) && runAccepted) {
        return cachePlanExecutionStage(cacheKey, {
          phase: "review",
          status: latestRun.schedulerFinished ? "调度已结束且存在失败任务；先查看任务并按需重试" : "调度状态异常；先查看任务与日志，避免重复提交整个 Plan",
          label: "查看任务",
          section: "tasks",
          anchor: "tasks"
        });
      }
      return cachePlanExecutionStage(cacheKey, {
        phase: "run",
        status: latestRun && operationIsFailureLike(latestRun.status) ? "运行提交失败；修正后重新提交" : "预演已通过，可以提交正式运行",
        label: latestRun && operationIsFailureLike(latestRun.status) ? "重新提交" : "提交运行",
        command: "runPlan"
      });
    }

    function planExecutionStageCacheKey(planFile, planRevision, planUpdatedAt) {
      return [normalizePlanSelectionKey(planFile), String(planRevision || ""), String(planUpdatedAt || "")].join("|");
    }

    function cachePlanExecutionStage(cacheKey, stage) {
      if (planExecutionStageCache.size >= PLAN_EXECUTION_STAGE_CACHE_LIMIT) {
        const oldestKey = planExecutionStageCache.keys().next().value;
        if (oldestKey !== undefined) planExecutionStageCache.delete(oldestKey);
      }
      planExecutionStageCache.set(cacheKey, stage);
      return stage;
    }

    function taskMatchesPlanVersion(row, planRevision, planUpdatedAt) {
      const revision = String((row || {}).planRevision || (row || {}).plan_revision || "");
      if (planRevision && revision) return revision === planRevision;
      if (Number.isFinite(planUpdatedAt)) {
        const taskAt = Date.parse(String((row || {}).updatedAt || (row || {}).startedAt || ""));
        return Number.isFinite(taskAt) && taskAt >= planUpdatedAt;
      }
      return !planRevision;
    }

    function terminalPlanTaskExecutionStage(state, planFile, planRevision, planUpdatedAt) {
      const matching = planVersionTaskRows(state, planFile, planRevision, planUpdatedAt);
      if (!matching.length || matching.some((row) => !taskTerminalStatus((row || {}).status))) return undefined;
      if (matching.some((row) => taskFailureLikeStatus((row || {}).status))) {
        return { phase: "review", status: "调度任务均已结束且存在失败、停止或取消记录；先查看任务并按需重试", label: "查看任务", section: "tasks", anchor: "tasks" };
      }
      if (matching.some((row) => debugRunRecord(row))) {
        return { phase: "debug-review", status: "Debug 任务已完成；先查看任务与日志，确认无误后可正式运行", label: "查看 Debug 任务", section: "tasks", anchor: "tasks" };
      }
      return { phase: "results", status: "调度任务均已完成，进入结果解析、筛选与归档流程", label: "查看结果", section: "results", anchor: "results" };
    }

    function debugRunRecord(row) {
      const item = row && typeof row === "object" ? row : {};
      const mode = item.debugMode ?? item.debug_mode;
      if (mode === true || String(mode || "").trim().toLowerCase() === "true") return true;
      const output = String(item.debugOutputDir || item.debug_output_dir || "").replace(/\\\\/g, "/").replace(new RegExp("^/+", "g"), "");
      return output.startsWith("zlk_cluster/debug_runs/");
    }

    function planPreflightSummary(state, planFile) {
      const plan = planFromContext(state || {}, { planFile }) || {};
      const rows = planVersionOperationRows(state, planFile, String(plan.revision || ""), Date.parse(String(plan.updatedAt || "")));
      const validate = rows.find((row) => String(row.type || "").toLowerCase() === "validate-plan");
      const dryRun = operationSucceeded(validate) && rows.find((row) => String(row.type || "").toLowerCase() === "dry-run-plan" && operationAtOrAfter(row, validate));
      if (dryRun) {
        const message = compactText(meaningfulValue(dryRun.error) || meaningfulValue(dryRun.message) || "预演状态已更新", 72);
        if (operationPending(dryRun)) return { ready: false, tone: "info", message, badge: "预演中" };
        if (operationIsFailureLike(dryRun.status)) return { ready: false, tone: "error", message, badge: "预演失败" };
        if (operationSucceeded(dryRun)) return { ready: true, tone: "good", message, badge: "可调度 " + Number(dryRun.dispatchableCount || 0) + " / 排队 " + Number(dryRun.queuedCount || 0) };
      }
      if (validate) {
        const message = compactText(meaningfulValue(validate.error) || meaningfulValue(validate.message) || "校验状态已更新", 72);
        if (operationPending(validate)) return { ready: false, tone: "info", message, badge: "校验中" };
        if (operationIsFailureLike(validate.status)) return { ready: false, tone: "error", message, badge: "校验失败" };
        if (operationSucceeded(validate)) return { ready: false, tone: "info", message, badge: "任务 " + (meaningfulValue(validate.jobCount) || "-") + " / 运行时继续预演" };
      }
      return { ready: false, tone: "info", message: "提交运行时自动执行", badge: "自动校验预演" };
    }

    function planVersionOperationRows(state, planFile, planRevision, planUpdatedAt) {
      ensurePlanVersionRowsCache(state);
      const cacheKey = planVersionRowsCacheKey(planFile, planRevision, planUpdatedAt);
      if (planVersionOperationRowsCache.has(cacheKey)) return planVersionOperationRowsCache.get(cacheKey);
      const rows = operationRowsForState(state || {}).filter((row) => samePlanSelection(row.planFile, planFile) && operationMatchesPlanVersion(row, planRevision, planUpdatedAt));
      cachePlanVersionRows(planVersionOperationRowsCache, cacheKey, rows);
      return rows;
    }

    function planVersionTaskRows(state, planFile, planRevision, planUpdatedAt) {
      ensurePlanVersionRowsCache(state);
      const cacheKey = planVersionRowsCacheKey(planFile, planRevision, planUpdatedAt);
      if (planVersionTaskRowsCache.has(cacheKey)) return planVersionTaskRowsCache.get(cacheKey);
      const rows = schedulerRowsForState(state || {}).filter((row) => samePlanSelection((row || {}).planFile || (row || {}).plan || "", planFile)
        && taskMatchesPlanVersion(row, planRevision, planUpdatedAt));
      cachePlanVersionRows(planVersionTaskRowsCache, cacheKey, rows);
      return rows;
    }

    function ensurePlanVersionRowsCache(state) {
      if (planVersionRowsCacheState === state) return;
      planVersionRowsCacheState = state;
      planVersionOperationRowsCache = new Map();
      planVersionTaskRowsCache = new Map();
    }

    function planVersionRowsCacheKey(planFile, planRevision, planUpdatedAt) {
      return [normalizePlanSelectionKey(planFile), String(planRevision || ""), Number.isFinite(planUpdatedAt) ? String(planUpdatedAt) : ""].join("|");
    }

    function cachePlanVersionRows(cache, key, rows) {
      if (cache.size >= PLAN_VERSION_ROWS_CACHE_LIMIT) cache.clear();
      cache.set(key, rows);
    }

    function operationMatchesPlanVersion(row, planRevision, planUpdatedAt) {
      const rowRevision = String((row || {}).planRevision || (row || {}).plan_revision || "").trim();
      if (rowRevision) return !planRevision || rowRevision === planRevision;
      if (Number.isFinite(planUpdatedAt)) {
        const operationAt = Date.parse(String((row || {}).updatedAt || (row || {}).updated_at || ""));
        return Number.isFinite(operationAt) && operationAt >= planUpdatedAt;
      }
      return !planRevision;
    }

    function resultSummaryMatchesPlanVersion(summary, planRevision, planUpdatedAt) {
      const revision = String((summary || {}).planRevision || (summary || {}).plan_revision || "").trim();
      if (planRevision && revision) return revision === planRevision;
      if (Number.isFinite(planUpdatedAt)) {
        const parsedAt = Date.parse(String((summary || {}).lastParsedAt || (summary || {}).last_parsed_at || (summary || {}).generatedAt || (summary || {}).generated_at || ""));
        return Number.isFinite(parsedAt) && parsedAt >= planUpdatedAt;
      }
      return !planRevision;
    }

    function operationAtOrAfter(candidate, reference) {
      if (!candidate || !reference) return false;
      const candidateAt = Date.parse(String(candidate.updatedAt || ""));
      const referenceAt = Date.parse(String(reference.updatedAt || ""));
      if (Number.isFinite(candidateAt) && Number.isFinite(referenceAt)) return candidateAt >= referenceAt;
      return Number(candidate.seq || 0) >= Number(reference.seq || 0);
    }

    function operationSucceeded(row) {
      const status = String((row || {}).status || "").toLowerCase();
      return Boolean(status && !operationIsFailureLike(status) && (status.includes("complete") || status === "done" || status.includes("success") || status.includes("succeed")));
    }

    function operationPending(row) {
      const status = String((row || {}).status || "").toLowerCase();
      return status === "accepted" || operationIsActive(status);
    }

    function serverSetupReadiness(state) {
      const setupSource = (state || {}).setup;
      const setup = setupSource && typeof setupSource === "object" ? setupSource : EMPTY_SERVER_SETUP;
      const workers = enabledWorkerTunnelsForState(state);
      if (setup === serverSetupReadinessCacheSetup && workers === serverSetupReadinessCacheWorkers && serverSetupReadinessCacheValue) return serverSetupReadinessCacheValue;
      const missing = [];
      if (!meaningfulValue(setup.savedSessionPath)) missing.push("Hub Xshell 会话");
      if (!meaningfulValue(setup.agentProjectDir)) missing.push("Hub 项目父目录");
      workers.forEach((worker) => {
        const label = String(worker.displayName || worker.id || "Worker");
        if (!meaningfulValue(worker.savedSessionPath)) missing.push(label + " Xshell 会话");
        if (!meaningfulValue(worker.agentProjectDir)) missing.push(label + " 项目父目录");
      });
      const workerLabel = workers.length ? "；" + workers.length + " 个 Worker" : "；Hub 模式";
      const value = {
        ready: missing.length === 0,
        missing,
        summary: missing.length ? "缺少：" + missing.join("、") : "Hub 已配置" + workerLabel
      };
      serverSetupReadinessCacheSetup = setup;
      serverSetupReadinessCacheWorkers = workers;
      serverSetupReadinessCacheValue = value;
      return value;
    }

    function executionWorkerReadiness(state) {
      const workers = enabledWorkerTunnelsForState(state);
      if (workers === executionWorkerReadinessCacheWorkers && executionWorkerReadinessCacheValue) return executionWorkerReadinessCacheValue;
      const value = {
        ready: workers.length > 0,
        count: workers.length,
        missing: workers.length ? [] : ["执行 Worker"],
        summary: workers.length ? workers.length + " 个 Worker 已启用" : "未配置执行 Worker，不能提交实验"
      };
      executionWorkerReadinessCacheWorkers = workers;
      executionWorkerReadinessCacheValue = value;
      return value;
    }

    function agentPreparationBlockersFromState(state) {
      const blockers = ((state || {}).agentSessions || {}).preparationBlockers;
      const source = Array.isArray(blockers) ? blockers : EMPTY_AGENT_PREPARATION_BLOCKERS;
      if (source === agentPreparationBlockersCacheSource && agentPreparationBlockersCacheValue) return agentPreparationBlockersCacheValue;
      agentPreparationBlockersCacheSource = source;
      agentPreparationBlockersCacheValue = uniqueText(source.map((item) => String(item || "").trim()).filter(Boolean));
      return agentPreparationBlockersCacheValue;
    }

    function projectEndpointReadiness(state) {
      const data = state || {};
      if (projectEndpointReadinessCacheState === data && projectEndpointReadinessCacheValue) return projectEndpointReadinessCacheValue;
      const workers = enabledWorkerTunnelsForState(state);
      const workerProbes = data.workerProbes || {};
      const hubStatus = String((data.probe || {}).status || (data.health || {}).state || "").toLowerCase();
      const restartRequired = hubStatus === "agent_restart_required";
      let versionMismatch = hubStatus === "agent_version_mismatch";
      let projectMismatch = hubStatus === "agent_project_mismatch";
      const hubReady = ["ok", "agent_ok", "file_api_unavailable"].includes(hubStatus);
      let workerReady = true;
      const hubProbe = data.probe || {};
      const hubMismatch = "Hub 当前 Agent 仍指向旧项目（" + String(hubProbe.projectRoot || "未返回") + "；期望 " + String(hubProbe.expectedProjectRoot || "未配置") + "）";
      const missing = hubReady ? [] : [restartRequired ? "Agent 待重启" : versionMismatch ? "Hub Agent 版本不兼容" : projectMismatch ? hubMismatch : "Hub 未检测或不可达"];
      const dependencyRows = [{ label: "Hub", dependency: hubProbe.schedulerDependencies }];
      workers.forEach((worker) => dependencyRows.push({ label: worker.displayName || worker.id || "Worker", dependency: (workerProbes[worker.id] || {}).schedulerDependencies }));
      const dependencyIssues = dependencyRows.flatMap((row) => {
        const dependency = row.dependency;
        if (!dependency || dependency.ok !== false) return [];
        const install = String(dependency.installCommand || "").trim();
        return [String(row.label) + " Scheduler 依赖缺失" + (install ? "；安装命令：" + install : "")];
      });
      missing.push(...dependencyIssues);
      workers.forEach((worker) => {
        const label = String(worker.displayName || worker.id || "Worker");
        const workerProbe = workerProbes[worker.id] || {};
        const status = String(workerProbe.status || "").toLowerCase();
        if (status === "agent_version_mismatch") versionMismatch = true;
        if (status === "agent_project_mismatch") projectMismatch = true;
        if (status !== "ok") {
          workerReady = false;
          missing.push(label + (status === "agent_version_mismatch" ? " Agent 版本不兼容" : status === "agent_project_mismatch" ? " 当前 Agent 仍指向旧项目（" + String(workerProbe.projectRoot || "未返回") + "；期望 " + String(workerProbe.expectedProjectRoot || "未配置") + "）" : " 未检测或不可达"));
        }
      });
      const value = {
        ready: missing.length === 0,
        hubReady,
        workerReady,
        versionMismatch,
        projectMismatch,
        restartRequired,
        dependencyReady: dependencyIssues.length === 0,
        dependencyIssues,
        missing,
        summary: restartRequired
          ? "Agent 已部署，需重启会话并检测"
          : projectMismatch
            ? "当前 Agent 仍指向旧项目，需准备 Agent"
          : versionMismatch
            ? "Agent 版本不兼容，需部署并重启"
            : dependencyIssues.length ? "Scheduler 依赖未就绪：" + dependencyIssues.join("、")
            : missing.length ? "缺少：" + missing.join("、") : "Hub/Worker Agent 可达"
      };
      projectEndpointReadinessCacheState = data;
      projectEndpointReadinessCacheValue = value;
      return value;
    }

    function projectCodeSyncReadiness(state) {
      const data = state || {};
      if (projectCodeSyncReadinessCacheState === data && projectCodeSyncReadinessCacheValue) return projectCodeSyncReadinessCacheValue;
      const workerRequired = enabledWorkerTunnelsForState(state).length > 0;
      const sync = data.codeSync || {};
      const hubReady = syncStatusOk(sync.hub);
      const workerReady = !workerRequired || syncStatusOk(sync.workers);
      const fingerprintReady = hasText(sync.fingerprint);
      const missing = [];
      if (!hubReady) missing.push("Hub 代码");
      if (!workerReady) missing.push("Worker 代码");
      if (!fingerprintReady) missing.push("代码指纹");
      const value = {
        ready: hubReady && workerReady && fingerprintReady,
        hubReady,
        workerReady,
        workerRequired,
        fingerprintReady,
        missing,
        summary: missing.length ? "待同步：" + missing.join("、") : "代码已同步 · " + compactIdentifier(sync.fingerprint)
      };
      projectCodeSyncReadinessCacheState = data;
      projectCodeSyncReadinessCacheValue = value;
      return value;
    }

    function projectReadinessStatusText(simpleSftpReadiness, serverReadiness, workerReadiness, endpointReadiness, outputGate) {
      const simpleSftpMissing = simpleSftpReadiness && simpleSftpReadiness.ready === false ? ["SimpleSFTP 文件传输依赖"] : [];
      const serverMissing = asArray((serverReadiness || {}).missing);
      const workerMissing = asArray((workerReadiness || {}).missing);
      const endpointMissing = asArray((endpointReadiness || {}).missing);
      const outputMissing = asArray((outputGate || {}).missing);
      const missing = [...simpleSftpMissing, ...serverMissing, ...workerMissing, ...endpointMissing, ...outputMissing];
      return missing.length ? "缺少：" + missing.join("、") : "已满足运行前置条件";
    }

    function projectNextAction(status, label, command, payload) {
      const data = payload || {};
      const fileAttr = data.file ? ' data-file="' + escAttr(data.file) + '"' : "";
      const planAttr = data.planFile ? ' data-plan-file="' + escAttr(data.planFile) + '"' : "";
      const actionReason = debugModeDisableReason(command) || simpleSftpCommandDisableReason(lastState || {}, command);
      const disabledAttr = actionReason ? ' disabled title="' + escAttr(actionReason) + '" aria-label="' + escAttr(label + "：" + actionReason) + '"' : "";
      return '<div class="projectQuickNext"><span>下一步</span><b>' + esc(status) + '</b><button class="mini" data-command="' + escAttr(command) + '"' + fileAttr + planAttr + disabledAttr + '>' + esc(label) + '</button></div>';
    }

    function renderProjectFirstRunActions(show, planFile) {
      if (!show || !planFile) return "";
      const planAttr = ' data-plan-file="' + escAttr(planFile) + '"';
      return '<div class="projectQuickNext firstRunActions"><span>首次运行</span><b>当前 Plan revision 尚无运行证据，建议先验证首个任务</b><div class="projectQuickActions">' +
        '<button class="mini" data-command="runPlan" data-debug-mode="true" data-confirm="true"' + planAttr + ' title="只提交当前 Plan 的首个任务，产物进入 Debug 独立目录，不进入正式结果链">Debug 首跑</button>' +
        '<button class="mini secondary" data-command="runPlan" data-debug-mode="false" data-confirm="true" data-force-formal="true"' + planAttr + ' title="同步、校验并预演后提交完整正式 Plan">正式运行</button>' +
      '</div></div>';
    }

    function projectSectionNextAction(status, label, section, anchor, options) {
      const taskScope = options && options.taskPlanScope === "all" ? ' data-task-plan-scope="all"' : options && options.taskPlanScope === "selected" ? ' data-task-plan-scope="selected"' : "";
      return '<div class="projectQuickNext"><span>下一步</span><b>' + esc(status) + '</b><button class="mini" type="button" data-section-target="' + escAttr(section) + '" data-anchor-target="' + escAttr(anchor) + '"' + taskScope + '>' + esc(label) + '</button></div>';
    }

    function firstProjectConfig(project, meta, plan) {
      const selected = meaningfulValue((plan || {}).baseConfig || (plan || {}).base_config);
      if (selected) return selected;
      const planConfigSource = meaningfulValue((plan || {}).configSource);
      if (planConfigSource) return planConfigSource;
      const summaries = asArray((meta || {}).configs || (project || {}).configSummaries || []);
      const summary = summaries.find((item) => item && item.file);
      if (summary && summary.file) return String(summary.file);
      return firstProjectPath((project || {}).configs);
    }

    function projectConfigAvailable(file, project, meta) {
      const value = meaningfulValue(file);
      if (/^(?:Plan 内联配置|case 级配置)$/.test(value)) return true;
      if (!value || /[{}$]/.test(value)) return Boolean(value);
      return asArray((project || {}).configs || (meta || {}).configs || []).some((item) => String((item && item.file) || item || "") === value);
    }

    function firstProjectPath(values) {
      const item = asArray(values || []).find(Boolean);
      return item ? String(item) : "";
    }

    function projectResultLocation(project, meta, plan) {
      const projectSource = project && typeof project === "object" && !Array.isArray(project) ? project : EMPTY_OUTPUT_DERIVATION_SOURCE;
      const metaSource = meta && typeof meta === "object" && !Array.isArray(meta) ? meta : EMPTY_OUTPUT_DERIVATION_SOURCE;
      const planSource = plan && typeof plan === "object" && !Array.isArray(plan) ? plan : EMPTY_OUTPUT_DERIVATION_SOURCE;
      const rules = projectSource.adapterRules || metaSource.adapterRules || EMPTY_OUTPUT_DERIVATION_SOURCE;
      const outputContractFiles = projectSource.outputContractFiles || metaSource.outputContractFiles || EMPTY_OUTPUT_DERIVATION_VALUES;
      const resultFiles = projectSource.resultFiles || metaSource.resultFiles || EMPTY_OUTPUT_DERIVATION_VALUES;
      const cached = projectResultLocationCache.get(planSource);
      if (cached && cached.rules === rules && cached.outputContractFiles === outputContractFiles && cached.resultFiles === resultFiles) return cached.value;
      const planCandidates = planOutputEvidenceCandidates(planSource);
      const ruleCandidates = adapterRuleResultCandidates(rules);
      const existingCandidates = uniqueText([
        ...asArray(outputContractFiles),
        ...asArray(resultFiles)
      ].map((item) => String(item || "").trim()).filter(isParseableResultCandidate));
      const source = planCandidates.length ? "当前 Plan" : ruleCandidates.length ? "接入规则" : existingCandidates.length ? "已发现结果" : "";
      const candidates = uniqueText([...planCandidates, ...ruleCandidates, ...existingCandidates]);
      const resultPath = candidates[0] || "";
      const value = {
        path: resultPath,
        count: candidates.length,
        source,
        summary: resultPath ? resultPath + (candidates.length > 1 ? " 等 " + candidates.length + " 个" : "") + " · " + source : "未声明可解析结果位置"
      };
      projectResultLocationCache.set(planSource, { rules, outputContractFiles, resultFiles, value });
      return value;
    }

    function projectQuickRow(label, value, actions, klass) {
      return '<div class="projectQuickRow" title="' + escAttr(label + "：" + (value || "-")) + '">' +
        '<div class="projectQuickLabel">' + esc(label) + '</div>' +
        '<div class="projectQuickValue ' + escAttr(klass || "") + '">' + esc(value || "-") + '</div>' +
        '<div class="projectQuickActions">' + asArray(actions || []).filter(Boolean).join("") + '</div>' +
      '</div>';
    }

    function projectPathButton(label, file) {
      if (!label || !file) return "";
      return '<button class="mini projectPathButton secondary" data-command="openPlan" data-file="' + escAttr(file) + '" title="' + escAttr(file) + '">' + esc(label) + '</button>';
    }

    function renderProjectOnboardingFlow(state, project, meta) {
      const selectedPlan = (meta || {}).selectedPlan || {};
      const selectedPlanFile = String(selectedPlan.planFile || selectedPlan.file || selectedPlan.planId || "").trim();
      const simpleSftp = simpleSftpReadinessForState(state);
      const server = (meta || {}).serverReadiness || serverSetupReadiness(state);
      const worker = (meta || {}).executionWorkerReadiness || executionWorkerReadiness(state);
      const endpoint = (meta || {}).endpointReadiness || projectEndpointReadiness(state);
      const outputGate = (meta || {}).outputGate || projectOutputGateDiagnostics(project, meta, selectedPlan);
      const infrastructureReady = simpleSftp.ready && server.ready && worker.ready;
      const infrastructureDetail = !simpleSftp.ready ? simpleSftp.message : !server.ready ? server.summary : !worker.ready ? worker.summary : "SimpleSFTP、Hub 与执行 Worker 已就绪";
      const planReady = Boolean(selectedPlanFile) && outputGate.ok;
      const planDetail = !selectedPlanFile
        ? (asArray((meta || {}).plans || (project || {}).plans).length ? "先明确选择本次实验 Plan" : "接入当前项目并创建首个 Plan")
        : outputGate.ok ? selectedPlanFile + "；输出位置已声明" : "待补齐：" + asArray(outputGate.missing).join("、");
      const endpointDetail = infrastructureReady ? endpoint.summary : "完成基础设施配置后检测当前项目 Agent";
      const agentReady = infrastructureReady && endpoint.ready;
      const executionStage = selectedPlanFile ? planExecutionStage(state, selectedPlanFile) : undefined;
      const firstRunRecommended = planFirstRunRecommended(state, selectedPlanFile, selectedPlan, executionStage, planReady && agentReady);
      const execution = projectWorkflowExecutionStep(executionStage, planReady && agentReady, firstRunRecommended);
      const executionTarget = projectOnboardingExecutionTarget(executionStage);
      const result = currentPlanWorkflowResultReadiness(state, selectedPlanFile);
      const stepSpecs = [
        { title: "1. 基础设施", ok: infrastructureReady, status: infrastructureReady ? "已就绪" : "待配置", detail: infrastructureDetail, section: "settings", anchor: "settings-servers", action: "查看服务器设置" },
        { title: "2. Plan 与输出", ok: planReady, status: planReady ? "已就绪" : selectedPlanFile ? "待输出" : "待选择", detail: planDetail, section: "plans", anchor: "plans-detected", action: "查看实验准备" },
        { title: "3. Agent 连接", ok: agentReady, status: agentReady ? "已连接" : "待检测", detail: endpointDetail, section: "servers", anchor: "servers-list", action: "查看连接" },
        { title: "4. 运行与监控", ok: execution.ok, status: execution.status, detail: execution.detail, section: executionTarget.section, anchor: executionTarget.anchor, action: executionTarget.action },
        { title: "5. 结果与归档", ok: result.tone === "good", status: result.status, detail: result.detail, section: "results", anchor: "results", action: "查看结果" }
      ];
      const activeIndex = stepSpecs.findIndex((step) => !step.ok);
      const steps = stepSpecs.map((step, index) => onboardingStep(step.title, step.ok, step.status, step.detail, {
        current: activeIndex === index,
        pending: activeIndex >= 0 && index > activeIndex,
        section: step.section,
        anchor: step.anchor,
        action: step.action
      }));
      return '<div class="onboardingFlow" title="当前 Plan 实验工作流">' + steps.join("") + '</div>';
    }

    function projectOnboardingExecutionTarget(stage) {
      const phase = String((stage || {}).phase || "");
      if (["validating", "dry-running", "submitting"].includes(phase)) {
        return { section: "operations", anchor: "operations-list", action: "查看运行进度" };
      }
      if (["monitor", "review", "debug-review", "results"].includes(phase)) {
        return { section: "tasks", anchor: "tasks-list", action: "查看任务" };
      }
      return { section: "plans", anchor: "plans-actions", action: "查看运行入口" };
    }

    function planFirstRunRecommended(state, planFile, plan, stage, readyToStart) {
      if (!readyToStart || !planFile) return false;
      const phase = String((stage || {}).phase || "");
      if (!["ready", "run"].includes(phase)) return false;
      if (phase === "run" && /失败|异常|未完成/.test(String((stage || {}).status || ""))) return false;
      return !currentPlanRevisionRunEvidenceForState(state || {}, planFile, plan || {});
    }

    function projectWorkflowExecutionStep(stage, readyToStart, firstRunRecommended) {
      const item = stage || {};
      const phase = String(item.phase || "");
      const detail = String(item.status || (readyToStart ? "可以提交当前 Plan" : "完成前置步骤后开始运行"));
      if (phase === "results") return { ok: true, status: "运行完成", detail };
      if (phase === "monitor") return { ok: false, status: "运行中", detail };
      if (["validating", "dry-running", "submitting"].includes(phase)) return { ok: false, status: "处理中", detail };
      if (phase === "debug-review") return { ok: false, status: "Debug 待复核", detail };
      if (phase === "review") return { ok: false, status: "任务需处理", detail };
      if (!readyToStart) return { ok: false, status: "待前置步骤", detail: "完成基础设施、Plan 输出和 Agent 检测后开始运行" };
      if (firstRunRecommended) return { ok: false, status: "建议 Debug 首跑", detail: "先验证首个任务、实时日志和结果输出，再提交完整 Plan" };
      if (["ready", "run"].includes(phase)) return { ok: true, status: "可提交", detail };
      return { ok: false, status: "待处理", detail };
    }

    function currentPlanWorkflowResultReadiness(state, selectedPlanFile) {
      const planFile = String(selectedPlanFile || "").trim();
      if (!planFile) return { tone: "info", status: "待选择 Plan", detail: "选择当前 Plan 后显示对应结果进度" };
      const data = state || {};
      if (currentPlanWorkflowResultCacheState !== data) {
        currentPlanWorkflowResultCacheState = data;
        currentPlanWorkflowResultCache = new Map();
      }
      const cacheKey = normalizePlanSelectionKey(planFile);
      if (currentPlanWorkflowResultCache.has(cacheKey)) return currentPlanWorkflowResultCache.get(cacheKey);
      const scopedState = data.planFileInput === planFile ? data : Object.assign({}, data, { planFileInput: planFile });
      const summary = scopedState.resultsSummary || {};
      const autoParse = resultAutoParseReadinessForState(scopedState, summary);
      if (autoParse.status === "parsed") {
        const workflowStatus = currentPlanResultWorkflowStatus(scopedState, summary, autoParse);
        return cacheCurrentPlanWorkflowResult(cacheKey, projectWorkflowResultStep(resultWorkflowStage(workflowStatus)));
      }
      if (autoParse.status === "run-evidence") return cacheCurrentPlanWorkflowResult(cacheKey, { tone: "info", status: "等待当前结果", detail: "当前 Plan revision 已运行，等待解析、筛选与归档" });
      if (autoParse.status === "plan-unavailable") return cacheCurrentPlanWorkflowResult(cacheKey, { tone: "warn", status: "等待 Plan 元数据", detail: "当前 Plan 元数据尚未加载完成" });
      return cacheCurrentPlanWorkflowResult(cacheKey, { tone: "info", status: "待运行", detail: "尚无当前 Plan revision 的运行与结果证据" });
    }

    function cacheCurrentPlanWorkflowResult(key, value) {
      if (currentPlanWorkflowResultCache.size >= CURRENT_PLAN_WORKFLOW_RESULT_CACHE_LIMIT) {
        currentPlanWorkflowResultCache.delete(currentPlanWorkflowResultCache.keys().next().value);
      }
      currentPlanWorkflowResultCache.set(key, value);
      return value;
    }

    function currentPlanResultWorkflowStatus(state, summary, autoParse) {
      const data = state || {};
      const item = summary || {};
      const traceScope = traceRowsForPlanScope(experimentTraceRowsForState(data), data, "selected");
      const traceStats = resultEvidenceTraceStatsForRows(traceScope.rows);
      const outputContractCheck = currentResultOutputContractCheck(data);
      const analysisArtifacts = resultAnalysisArtifactsForState(data, item);
      const archivedCount = Number(pick(item, ["effectiveArchivedResultCount", "effective_archived_result_count", "finalResultCount", "final_result_count"], 0)) || 0;
      const pendingCount = Number(pick(item, ["pendingReviewCount", "pending_review_count"], 0)) || 0;
      const excludedCount = Number(pick(item, ["excludedResultCount", "excluded_result_count"], 0)) || 0;
      const previewCount = Number(pick(item, ["previewResultCount", "preview_result_count", "resultCount", "result_count"], asArray(item.results).length)) || 0;
      const qualityGatePath = meaningfulValue(pick(item, ["qualityGatePath", "quality_gate_path"], ""));
      const qualityResultCount = Number(pick(item, ["qualityGateResultCount", "quality_gate_result_count"], 0)) || 0;
      const statisticsPath = meaningfulValue(pick(item, ["statisticsPath", "statistics_path"], ""));
      const statisticsResultCount = Number(pick(item, ["statisticsResultCount", "statistics_result_count"], 0)) || 0;
      const paperTablePath = meaningfulValue(pick(item, ["paperTablePath", "paper_table_path", "exportPath"], ""));
      const paperTableResultCount = Number(pick(item, ["paperTableResultCount", "paper_table_result_count"], 0)) || 0;
      const claimEvidence = item.claimEvidence || item.claim_evidence || {};
      const claimStatus = pick(item, ["claimEvidenceStatus", "claim_evidence_status"], pick(claimEvidence, ["status"], "待检查"));
      const claimPreview = asArray(item.claimEvidencePreview || item.claim_evidence_preview || claimEvidence.preview || claimEvidence.claims);
      const previewIssues = claimEvidenceIssueCounts(claimPreview);
      const claimStatusText = String(claimStatus || "").toLowerCase();
      const unsupported = Math.max(Number(pick(item, ["claimUnsupportedCount", "claim_unsupported_count"], pick(claimEvidence, ["unsupportedCount", "unsupported_count"], 0))) || 0, previewIssues.unsupported, claimStatusText.includes("unsupported") ? 1 : 0);
      const needsExperiment = Math.max(Number(pick(item, ["claimNeedsExperimentCount", "claim_needs_experiment_count"], pick(claimEvidence, ["needsExperimentCount", "needs_experiment_count"], 0))) || 0, previewIssues.needsExperiment, claimStatusText.includes("need") ? 1 : 0);
      return {
        parsed: meaningfulValue(pick(item, ["lastParsedAt", "last_parsed_at"], "")),
        parsedRows: Math.max(traceStats.parsedRows, Number(pick(item, ["parsedResultCount", "parsed_result_count"], 0)) || 0),
        qualityGatePath: archivedCount > 0 && qualityResultCount === archivedCount ? qualityGatePath : "",
        statisticsPath: archivedCount > 0 && statisticsResultCount === archivedCount ? statisticsPath : "",
        claimStatus,
        claimIssueCount: unsupported + needsExperiment,
        paperTablePath: archivedCount > 0 && paperTableResultCount === archivedCount ? paperTablePath : "",
        plottingContractPath: analysisArtifacts.plottingContractPath,
        effectiveArchivedResultCount: archivedCount,
        pendingReviewCount: pendingCount,
        excludedResultCount: excludedCount,
        previewResultCount: previewCount,
        previewCsvPath: meaningfulValue(pick(item, ["previewCsvPath", "preview_csv_path"], "")),
        archivableCount: traceStats.archivable,
        archiveBlockedCount: traceStats.archiveBlocked,
        outputContractStatus: outputContractCheck.status,
        outputContractMissingFiles: outputContractCheck.missingFiles,
        outputContractUnparseableFiles: outputContractCheck.unparseableFiles,
        outputContractUnparseableFileList: outputContractCheck.unparseableFileList,
        outputContractUnparseableDetails: outputContractCheck.unparseableDetails,
        outputContractMessage: outputContractCheck.message,
        autoParseStatus: (autoParse || {}).status,
        planFile: (autoParse || {}).planFile,
      };
    }

    function projectWorkflowResultStep(stage) {
      const item = stage || {};
      if (item.kind === "archive") return { tone: "warn", status: "待归档 " + Number(item.count || 0), detail: "选择要纳入最终结果的实验记录" };
      if (item.kind === "archive-blocked") return { tone: "warn", status: "归档受阻 " + Number(item.count || 0), detail: "实验记录缺少 Worker 来源，先检查任务记录" };
      if (item.kind === "review") return { tone: "warn", status: "待筛选 " + Number(item.count || 0), detail: "完整预览不会自动进入统计；请决定归档或排除" };
      if (item.kind === "section") return { tone: "warn", status: String(item.label || "待处理"), detail: String(item.message || "打开对应区域处理") };
      const commandStatus = {
        parseResults: "待解析",
        checkOutputContract: "待输出检查",
        runQualityGate: "待质量门禁",
        runStatistics: "待统计",
        checkClaimEvidence: "待论文证据",
        openPlan: "论文证据待修复",
        exportPaperTable: "待论文表格",
        exportPlottingContract: "待绘图契约",
        plotResultsToPpt: "可绘图",
      };
      return {
        tone: item.command === "plotResultsToPpt" ? "good" : "warn",
        status: commandStatus[item.command] || String(item.label || "待处理"),
        detail: String(item.message || "继续当前 Plan 结果流程"),
      };
    }

    function renderOutputGateChecklist(project, meta, plan) {
      const diagnostics = (meta && meta.outputGate) || projectOutputGateDiagnostics(project, meta, plan);
      const visibleRows = diagnostics.ok ? [{ label: "全部", ok: true, fix: "可运行" }] : diagnostics.rows.filter((row) => !row.ok);
      const fixText = diagnostics.ok ? "" : projectOutputGateFixes(diagnostics.missing, project).join("；");
      const rows = visibleRows.map((row) =>
        '<div class="outputGateRow"><b>' + esc(row.label) + '</b><em class="' + (row.ok ? "status-completed" : "status-warning") + '">' + esc(row.ok ? "通过" : "待处理") + '</em></div>'
      ).join("");
      return '<div class="outputGateChecklist ' + (diagnostics.ok ? "ready" : "") + '">' +
        '<div class="outputGateHead"><b>运行门禁</b><span class="' + (diagnostics.ok ? "status-completed" : "status-warning") + '">' + esc(diagnostics.ok ? "可运行" : ("阻断 " + diagnostics.missing.length)) + '</span>' + statusInfoPopover(fixText, "修复") + '</div>' +
        '<div class="outputGateRows">' + rows + '</div>' +
      '</div>';
    }

    function projectOutputGateDiagnostics(project, meta, plan) {
      project = project || {};
      meta = meta || {};
      const projectSource = project && typeof project === "object" ? project : EMPTY_OUTPUT_DERIVATION_SOURCE;
      const planSource = plan && typeof plan === "object" ? plan : EMPTY_OUTPUT_DERIVATION_SOURCE;
      const rules = project.adapterRules || meta.adapterRules || EMPTY_OUTPUT_DERIVATION_SOURCE;
      const configs = project.configs || meta.configs || EMPTY_OUTPUT_DERIVATION_VALUES;
      const outputContractFiles = project.outputContractFiles || meta.outputContractFiles || EMPTY_OUTPUT_DERIVATION_VALUES;
      const resultParsePreviews = meta.resultParsePreviews || project.resultParsePreviews || EMPTY_OUTPUT_DERIVATION_VALUES;
      const contractReady = !plan || plan.planContractOk !== false;
      const configFile = String((plan || {}).baseConfig || (plan || {}).base_config || "").trim();
      const adapterReady = Boolean(project.adapterConfig);
      const cacheKey = refListKey(planSource, rules, configs, outputContractFiles, resultParsePreviews, contractReady, configFile, adapterReady);
      let projectCache = projectOutputGateDiagnosticsCache.get(projectSource);
      if (projectCache && projectCache.has(cacheKey)) {
        const cached = projectCache.get(cacheKey);
        projectCache.delete(cacheKey);
        projectCache.set(cacheKey, cached);
        return cached;
      }
      const configReady = !configFile || /[{}$]/.test(configFile) || asArray(configs).some((item) => String((item && item.file) || item || "") === configFile);
      const planSignals = contractReady ? planOutputEvidenceSignals(plan) : [];
      const planCandidates = contractReady ? planOutputEvidenceCandidates(plan) : [];
      const planReady = Boolean(planSignals.length && planCandidates.length);
      const ruleCandidateCount = actionableAdapterRuleSignals(rules) ? adapterRuleResultCandidates(rules).length : 0;
      const candidateCount = ruleCandidateCount + planCandidates.length;
      const projectContractCount = asArray(outputContractFiles).length;
      const planContractCount = planCandidates.filter((file) => new RegExp("(^|/)(metrics_summary\\.csv|metrics_case\\.csv)$", "i").test(file)).length;
      const parseableCount = validResultPreviewCount(resultParsePreviews);
      const explicitAdapterReady = adapterReady && ruleCandidateCount > 0;
      const accessReady = planReady || ruleCandidateCount > 0;
      const outputReady = planReady || ruleCandidateCount > 0;
      const rows = [
        { label: "计划强契约", ok: contractReady, fix: planContractFixText(plan) },
        { label: "配置文件", ok: configReady, fix: "在工作区创建或在当前 Plan 中改为可用配置。" },
        { label: "接入配置", ok: explicitAdapterReady || planReady || ruleCandidateCount > 0, fix: adapterReady ? "打开 experiments/zlk_project.yaml 补充候选结果规则；或在当前 plan 声明 result_csv、metrics_summary.csv、stdout/stderr 捕获。" : "点击“生成输出接入模板”，生成 experiments/zlk_project.yaml；或在当前 plan 声明 result_csv、metrics_summary.csv、stdout/stderr 捕获。" },
        { label: "计划输出", ok: planReady || ruleCandidateCount > 0, fix: "在 plan 的 paper.result_csv、runner.test_command --result-csv/--output-dir 或 expectedResults 中写明可解析结果位置。" },
        { label: "候选结果规则", ok: candidateCount > 0 || planReady, fix: "在候选 CSV/JSON/控制台日志/文本 summary 中至少填写一类，或配置 metricRegex。" },
        { label: "标准结果契约", ok: planContractCount > 0 || ruleCandidateCount > 0 || (projectContractCount > 0 && planReady), fix: "推荐让测试代码输出 metrics_summary.csv，列为 experiment_id,suite,method,dataset,split,seed,metric,value。" },
        { label: "解析预览", ok: parseableCount > 0 || planReady || ruleCandidateCount > 0, fix: "保存接入规则后点击“刷新识别”，确认至少一个结果文件或控制台日志可解析。" }
      ];
      const diagnostics = { ok: contractReady && configReady && accessReady && outputReady, rows, missing: rows.filter((row) => !row.ok).map((row) => row.label) };
      if (!projectCache) {
        projectCache = new Map();
        projectOutputGateDiagnosticsCache.set(projectSource, projectCache);
      }
      if (projectCache.size >= PROJECT_OUTPUT_GATE_DIAGNOSTICS_VARIANT_LIMIT) projectCache.delete(projectCache.keys().next().value);
      projectCache.set(cacheKey, diagnostics);
      return diagnostics;
    }

    function planContractFixText(plan) {
      const issues = asArray((plan || {}).planContractIssues || []);
      const fixes = issues.map((item) => item && item.fix).filter(Boolean);
      if (fixes.length) return fixes.join("；");
      const missing = asArray((plan || {}).planContractMissing || []);
      return missing.length ? "按共享 plan 契约补齐：" + missing.join("、") : "需包含 suite、base_config/config、seeds、cases、训练命令、测试命令和可解析结果输出。";
    }

    function validResultPreviewCount(previews) {
      const source = previews && typeof previews === "object" ? previews : null;
      if (source && validResultPreviewCountCache.has(source)) return validResultPreviewCountCache.get(source);
      const count = asArray(source || []).filter(resultPreviewHasRecords).length;
      if (source) validResultPreviewCountCache.set(source, count);
      return count;
    }

    function resultPreviewHasRecords(item) {
      if (!item || item.parseable !== true) return false;
      return Number(item.records || item.recordCount || item.rows || item.rowCount || 0) > 0;
    }

    function resultPreviewRegexEscape(value) {
      return String(value || "").split("").map((char) => ".*+?^{}()|[]$".includes(char) || char.charCodeAt(0) === 92 ? String.fromCharCode(92) + char : char).join("");
    }

    function normalizeResultCandidatePath(value) {
      return String(value || "").trim().replace(/\\\\/g, "/").replace(/^\\.\\//, "");
    }

    function compileResultCandidatePatterns(candidates, plan) {
      plan = plan || {};
      const known = {
        suite: String(plan.suite || "").trim(),
        plan: String(plan.planFile || plan.file || plan.planId || "").trim(),
        plan_file: String(plan.planFile || plan.file || "").trim()
      };
      const basenames = new Set();
      const exactPaths = new Set();
      const patterns = [];
      asArray(candidates).forEach((candidate) => {
        const pattern = normalizeResultCandidatePath(candidate);
        if (!pattern) return;
        if (!/[?*]/.test(pattern) && !pattern.includes(String.fromCharCode(123))) {
          if (pattern.includes("/")) exactPaths.add(pattern.toLowerCase());
          else basenames.add(pattern.toLowerCase());
          return;
        }
        let source = "^";
        for (let index = 0; index < pattern.length;) {
          const placeholder = pattern.slice(index).match(/^\{+([A-Za-z0-9_.-]+)\}+/);
          if (placeholder) {
            const key = placeholder[1];
            const value = known[key];
            source += value ? resultPreviewRegexEscape(value.replace(/\\\\/g, "/")) : /output_?dir/i.test(key) ? ".+" : "[^/]+";
            index += placeholder[0].length;
            continue;
          }
          const char = pattern[index];
          if (char === "*") {
            if (pattern[index + 1] === "*") {
              source += ".*";
              index += 2;
            } else {
              source += "[^/]*";
              index += 1;
            }
            continue;
          }
          if (char === "?") {
            source += "[^/]";
            index += 1;
            continue;
          }
          source += resultPreviewRegexEscape(char);
          index += 1;
        }
        try {
          patterns.push(new RegExp(source + "$", "i"));
        } catch (_) {
          // Ignore malformed candidates while retaining valid matchers.
        }
      });
      return { basenames, exactPaths, patterns };
    }

    function compiledResultCandidatesMatchFile(compiled, file) {
      const target = normalizeResultCandidatePath(file);
      if (!target) return false;
      const normalized = target.toLowerCase();
      const basename = (target.split("/").pop() || "").toLowerCase();
      return compiled.exactPaths.has(normalized)
        || compiled.basenames.has(basename)
        || compiled.patterns.some((pattern) => pattern.test(target));
    }

    function resultCandidatePatternMatchesFile(candidate, file, plan) {
      return compiledResultCandidatesMatchFile(compileResultCandidatePatterns([candidate], plan), file);
    }

    function planScopedResultParsePreviews(previews, plan, rules) {
      const previewSource = previews && typeof previews === "object" ? previews : EMPTY_OUTPUT_DERIVATION_VALUES;
      const planSource = plan && typeof plan === "object" && !Array.isArray(plan) ? plan : EMPTY_OUTPUT_DERIVATION_SOURCE;
      const rulesSource = rules && typeof rules === "object" && !Array.isArray(rules) ? rules : EMPTY_OUTPUT_DERIVATION_SOURCE;
      let planCache = planScopedResultPreviewCache.get(previewSource);
      if (!planCache) {
        planCache = new WeakMap();
        planScopedResultPreviewCache.set(previewSource, planCache);
      }
      let rulesCacheForPreviews = planCache.get(planSource);
      if (!rulesCacheForPreviews) {
        rulesCacheForPreviews = new WeakMap();
        planCache.set(planSource, rulesCacheForPreviews);
      }
      if (rulesCacheForPreviews.has(rulesSource)) return rulesCacheForPreviews.get(rulesSource);
      const all = asArray(previewSource).filter((item) => item && typeof item === "object");
      const selected = Boolean(plan && (plan.planFile || plan.file || plan.planId || plan.suite));
      if (!selected) {
        const unscoped = { items: all, totalCount: all.length, hiddenCount: 0, candidateCount: 0, scoped: false };
        rulesCacheForPreviews.set(rulesSource, unscoped);
        return unscoped;
      }
      let rulesCache = planScopedResultCandidateCache.get(planSource);
      if (!rulesCache) {
        rulesCache = new WeakMap();
        planScopedResultCandidateCache.set(planSource, rulesCache);
      }
      let derived = rulesCache.get(rulesSource);
      if (!derived) {
        const candidates = uniqueText([
          ...planOutputEvidenceCandidates(plan),
          ...adapterRuleResultCandidates(rulesSource)
        ]);
        derived = { candidates, compiled: compileResultCandidatePatterns(candidates, plan) };
        rulesCache.set(rulesSource, derived);
      }
      const candidates = derived.candidates;
      const items = candidates.length ? all.filter((item) => compiledResultCandidatesMatchFile(derived.compiled, item.file || item.path || "")) : [];
      const scoped = { items, totalCount: all.length, hiddenCount: Math.max(0, all.length - items.length), candidateCount: candidates.length, scoped: true };
      rulesCacheForPreviews.set(rulesSource, scoped);
      return scoped;
    }

    function renderProjectRuleEditor(rules) {
      const partial = adapterRulesArePartial(rules);
      const classificationMetrics = uniqueText([rules.primaryMetric || "AUC", ...(rules.secondaryMetrics || []), ...(rules.classificationMetrics || ["accuracy", "F1", "AUPRC", "precision", "recall", "specificity", "balanced_accuracy", "loss"])]);
      const segmentationMetrics = uniqueText(rules.segmentationMetrics || ["Dice", "DSC", "IoU", "HD95", "ASD"]);
      const candidateCsv = uniqueText(rules.candidateCsv || ["metrics_summary.csv", "results.csv", "work_dirs/results.csv", "experiments/results/*.csv", "test_results/summary.csv"]);
      const configuredJson = uniqueText(asArray(rules.candidateJson).filter(isParseableResultCandidate));
      const candidateJson = configuredJson.length ? configuredJson : ["metrics.json", "result.json", "results.json"];
      const consoleLogs = uniqueText(rules.consoleLogs || ["stdout.log", "stderr.log"]);
      const textLogs = uniqueText(rules.textLogs || ["summary.txt", "console.log"]);
      const aliases = mapToLines(rules.metricAliases || { acc: "accuracy", auroc: "AUC", roc_auc: "AUC", auprc: "AUPRC", macro_f1: "F1", val_loss: "loss", dice: "DSC" });
      const mapping = mapToLines(rules.csvColumnMapping || { metric: "metric", value: "value", dataset: "dataset", seed: "seed" });
      const open = detailIsOpen("project-rule-editor", false);
      const summary = renderAdapterRuleSummary(Object.assign({}, rules, { classificationMetrics, segmentationMetrics, candidateCsv, candidateJson, consoleLogs, textLogs }));
      const partialNotice = partial
        ? '<div class="notice warning" title="规则摘要">规则较多，已启用摘要模式；打开 experiments/zlk_project.yaml 编辑完整规则。</div>'
        : "";
      return '<details class="projectRuleEditor" data-details-key="project-rule-editor"' + detailsOpenAttr("project-rule-editor", false) + ' title="接入规则">' +
        '<summary>分类指标与输出捕获配置<span class="muted">' + esc(summary) + '</span></summary>' +
        (open && partial ? partialNotice + '<div class="toolbar"><button class="secondary" data-command="openPlan" data-file="experiments/zlk_project.yaml" title="experiments/zlk_project.yaml">打开完整接入配置</button></div>' :
        open ? '<div class="projectRuleGrid">' +
          projectRuleInput("taskType", "任务类型", rules.taskType || "classification", "默认分类任务；分割只保留兼容入口。") +
          projectRuleInput("primaryMetric", "主指标", rules.primaryMetric || "AUC", "质量门禁、统计、论文表格默认围绕主指标组织。") +
          projectRuleTextarea("secondaryMetrics", "辅助指标", asEditorList(rules.secondaryMetrics || ["accuracy", "F1", "AUPRC", "precision", "recall", "specificity"]), "每行或逗号分隔，用于论文表格和结果扫读。") +
          projectRuleTextarea("classificationMetrics", "分类指标池", asEditorList(classificationMetrics), "分类任务常用指标别名归一化范围。") +
          projectRuleTextarea("segmentationMetrics", "分割兼容指标", asEditorList(segmentationMetrics), "仅作为偶尔使用分割任务时的兼容指标。") +
          projectRuleTextarea("candidateCsv", "候选 CSV", asEditorList(candidateCsv), "优先使用 metrics_summary.csv 长表，也兼容已有 results.csv 或 work_dirs 结果。") +
          projectRuleTextarea("candidateJson", "候选 JSON", asEditorList(candidateJson), "已有结构化结果文件可在这里登记。") +
          projectRuleTextarea("consoleLogs", "控制台日志", asEditorList(consoleLogs), "run_wrapper 会捕获 stdout/stderr；正则可从日志提取指标。") +
          projectRuleTextarea("textLogs", "文本 summary", asEditorList(textLogs), "summary.txt 或 console.log 等轻量文本结果。") +
          projectRuleInput("metricRegex", "控制台指标正则", rules.metricRegex || "", "留空使用默认深度学习指标正则；仅在项目输出格式特殊时填写。", "wide") +
          projectRuleTextarea("csvColumnMapping", "CSV 列映射", mapping, "格式：原列名: 标准列名。常用标准列有 metric、value、dataset、seed。", "wide") +
          projectRuleTextarea("metricAliases", "指标别名", aliases, "格式：项目输出名: 标准指标名，例如 auroc: AUC。", "wide") +
          projectRuleTextarea("inferredSignalsReadonly", "自动推断线索", asEditorList(rules.inferredSignals || []), "只读参考：从配置、工厂模式、结果脚本和指标名推断出的线索。", "wide readonly") +
        '</div>' +
        '<div class="projectRuleActions">' +
          '<span class="muted">本地接入配置：experiments/zlk_project.yaml</span>' +
          '<button data-command="saveProjectAdapterRules" data-config-scope="projectAdapterRules" title="experiments/zlk_project.yaml">保存接入规则</button>' +
        '</div>' : '<div class="muted">接入规则按需展开。</div>') +
      '</details>';
    }

    function projectRuleInput(key, label, value, title, cls) {
      const compactTitle = label + "：" + displayValue(value || "");
      return '<div class="projectRuleField ' + escAttr(cls || "") + '" title="' + escAttr(compactTitle) + '"><label>' + esc(label) + helpBadge(compactTitle) + '</label><input data-config-input="projectAdapterRules" data-key="' + escAttr(key) + '" value="' + escAttr(value || "") + '" title="' + escAttr(compactTitle) + '"></div>';
    }

    function projectRuleTextarea(key, label, value, title, cls) {
      const readonly = String(cls || "").includes("readonly");
      const configAttr = readonly ? "" : ' data-config-input="projectAdapterRules" data-key="' + escAttr(key) + '"';
      const lineCount = String(value || "").split(/\\n/).filter(Boolean).length;
      const compactTitle = label + "：" + lineCount + " 行";
      return '<div class="projectRuleField ' + escAttr(cls || "") + '" title="' + escAttr(compactTitle) + '"><label>' + esc(label) + helpBadge(compactTitle) + '</label><textarea' + configAttr + (readonly ? " readonly" : "") + ' title="' + escAttr(compactTitle) + '">' + esc(value || "") + '</textarea></div>';
    }

    function asEditorList(values) {
      return (values || []).filter(Boolean).join("\\\\n");
    }

    function mapToLines(map) {
      return Object.entries(map || {}).map(([key, value]) => key + ": " + value).join("\\\\n");
    }

    function adapterRulesArePartial(rules) {
      return Boolean(rules && (rules.adapterRulesPartial || ["secondaryMetrics", "classificationMetrics", "segmentationMetrics", "candidateCsv", "candidateJson", "consoleLogs", "textLogs", "csvColumnMapping", "metricAliases", "inferredSignals"].some((key) => Number(rules[key + "OmittedCount"] || 0) > 0)));
    }

    function adapterRuleCount(rules, key) {
      const total = Number((rules || {})[key + "TotalCount"]);
      if (Number.isFinite(total) && total >= 0) return total;
      const value = (rules || {})[key];
      if (Array.isArray(value)) return value.length;
      if (value && typeof value === "object") return Object.keys(value).length;
      return value ? 1 : 0;
    }

    function adapterRuleText(rules, key, fallback) {
      const value = (rules || {})[key];
      const omitted = Number((rules || {})[key + "OmittedCount"] || 0);
      const total = adapterRuleCount(rules, key);
      let text = "";
      if (Array.isArray(value)) text = value.filter(Boolean).join("、");
      else if (value && typeof value === "object") text = Object.entries(value).map(([k, v]) => k + "→" + v).join("、");
      else text = String(value || "");
      if (!text) text = fallback || "";
      return omitted > 0 ? text + "；另有 " + omitted + " 项未显示（共 " + total + "）" : text;
    }

    function adapterRuleSignalCount(rules) {
      rules = rules || {};
      return adapterRuleCount(rules, "candidateCsv") +
        adapterRuleCount(rules, "candidateJson") +
        adapterRuleCount(rules, "consoleLogs") +
        adapterRuleCount(rules, "textLogs") +
        (rules.metricRegex ? 1 : 0);
    }

    function hasAdapterRuleSignals(rules) {
      return adapterRuleSignalCount(rules) > 0;
    }

    function actionableAdapterRuleSignals(rules) {
      rules = rules || {};
      if (rules.inferredFromProject && !asArray(rules.inferredSignals || []).length) return false;
      return adapterRuleResultCandidates(rules).length > 0;
    }

    function adapterRuleResultCandidates(rules) {
      const source = rules && typeof rules === "object" ? rules : null;
      if (!source) return EMPTY_OUTPUT_DERIVATION_VALUES;
      const cached = adapterRuleResultCandidatesCache.get(source);
      if (cached) return cached;
      const value = uniqueText([
        ...asArray(source.candidateCsv),
        ...asArray(source.candidateJson),
        ...asArray(source.consoleLogs),
        ...asArray(source.textLogs)
      ].map((item) => String(item || "").trim()).filter(isParseableResultCandidate));
      adapterRuleResultCandidatesCache.set(source, value);
      return value;
    }

    function ignoredAdapterRuleCandidateCount(rules) {
      const raw = [
        ...asArray((rules || {}).candidateCsv),
        ...asArray((rules || {}).candidateJson),
        ...asArray((rules || {}).consoleLogs),
        ...asArray((rules || {}).textLogs)
      ].map((item) => String(item || "").trim()).filter(Boolean);
      return Math.max(0, raw.length - raw.filter(isParseableResultCandidate).length);
    }

    function uniqueText(values) {
      const seen = new Set();
      return (values || []).map((item) => String(item || "").trim()).filter((item) => {
        if (!item || seen.has(item.toLowerCase())) return false;
        seen.add(item.toLowerCase());
        return true;
      });
    }

    function onboardingStep(title, ok, status, detail, options = {}) {
      const hasTarget = Boolean(options.section && options.anchor);
      const tone = ok ? "good" : options.pending ? "pending" : options.current ? "current" : "warn";
      const statusClass = ok ? "status-completed" : options.pending ? "muted" : "status-warning";
      const tag = hasTarget ? "button" : "div";
      const targetAttrs = hasTarget
        ? ' type="button" class="onboardingStep is-link ' + tone + '" data-section-target="' + escAttr(options.section) + '" data-anchor-target="' + escAttr(options.anchor) + '" aria-label="' + escAttr(options.action || title) + '"'
        : ' class="onboardingStep ' + tone + '"';
      const currentAttr = options.current ? ' aria-current="step"' : "";
      const action = hasTarget ? '<span class="onboardingStepLink">查看</span>' : "";
      return '<' + tag + targetAttrs + currentAttr + ' title="' + escAttr(options.action ? options.action + "：" + detail : detail) + '">' +
        '<b><span>' + esc(title) + '</span><span class="' + statusClass + '">' + esc(status) + '</span></b>' +
        '<span>' + esc(detail) + '</span>' +
        action +
      '</' + tag + '>';
    }

    function renderAdapterRuleSummary(rules) {
      const parts = [
        "任务 " + projectTaskTypeLabel(rules.taskType || "classification"),
        "主指标 " + (rules.primaryMetric || "AUC"),
        "分类 " + adapterRuleCount(rules, "classificationMetrics"),
        "分割 " + adapterRuleCount(rules, "segmentationMetrics"),
        "CSV " + adapterRuleCount(rules, "candidateCsv"),
        "JSON " + adapterRuleCount(rules, "candidateJson"),
        "日志 " + (adapterRuleCount(rules, "consoleLogs") + adapterRuleCount(rules, "textLogs")),
        "别名 " + adapterRuleCount(rules, "metricAliases"),
        "列映射 " + adapterRuleCount(rules, "csvColumnMapping"),
      ];
      if (rules.inferredFromProject) parts.push("自动推断");
      if (rules.metricRegex) parts.push("自定义正则");
      if (adapterRulesArePartial(rules)) parts.push("摘要模式");
      return parts.join(" · ");
    }

    function projectTaskTypeLabel(taskType) {
      const raw = String(taskType || "").trim();
      const key = raw.toLowerCase().replace(/[\s-]+/g, "_");
      const labels = {
        classification: "分类", segmentation: "分割", regression: "回归", detection: "目标检测",
        object_detection: "目标检测", generation: "生成", retrieval: "检索", ranking: "排序"
      };
      return labels[key] || raw || "未指定";
    }

    function renderAdapterRules(rules) {
      const source = rules && typeof rules === "object" ? rules : null;
      if (!source) return "";
      if (renderAdapterRulesCache.has(source)) return renderAdapterRulesCache.get(source);
      if (!hasAdapterRuleSignals(rules)) {
        renderAdapterRulesCache.set(source, "");
        return "";
      }
      const displayed = Object.assign({}, rules, {
        candidateCsv: asArray(rules.candidateCsv).filter(isParseableResultCandidate),
        candidateJson: asArray(rules.candidateJson).filter(isParseableResultCandidate),
        consoleLogs: asArray(rules.consoleLogs).filter(isParseableResultCandidate),
        textLogs: asArray(rules.textLogs).filter(isParseableResultCandidate)
      });
      ["candidateCsv", "candidateJson", "consoleLogs", "textLogs"].forEach((key) => {
        displayed[key + "TotalCount"] = displayed[key].length;
        displayed[key + "OmittedCount"] = 0;
      });
      const ignoredCount = ignoredAdapterRuleCandidateCount(rules);
      const rows = [
        ["规则来源", rules.inferredFromProject ? "自动推断" : "配置文件/默认"],
        ["推断线索", adapterRuleText(rules, "inferredSignals", "无")],
        ["任务类型", projectTaskTypeLabel(rules.taskType || "classification")],
        ["主指标", rules.primaryMetric || "AUC"],
        ["分类指标", adapterRuleText(rules, "classificationMetrics", "默认分类指标")],
        ["分割兼容指标", adapterRuleText(rules, "segmentationMetrics", "Dice、DSC、IoU、HD95、ASD")],
        ["候选 CSV", adapterRuleText(displayed, "candidateCsv", "未配置")],
        ["候选 JSON", adapterRuleText(displayed, "candidateJson", "未配置")],
        ["控制台日志", adapterRuleText(displayed, "consoleLogs", "未配置")],
        ["文本日志", adapterRuleText(displayed, "textLogs", "未配置")],
        ["已忽略非结果候选", ignoredCount ? ignoredCount + " 个状态、manifest 或内部文件" : ""],
        ["指标正则", rules.metricRegex || "默认正则"],
        ["指标别名", adapterRuleText(rules, "metricAliases", "默认别名")],
        ["列映射", adapterRuleText(rules, "csvColumnMapping", "默认列名")],
      ].filter((item) => item[1]);
      const html = '<details class="advanced"><summary>项目接入规则</summary><div class="workbench-summary">' +
        rows.map((item) => row(item[0], item[1])).join("") +
      '</div></details>';
      renderAdapterRulesCache.set(source, html);
      return html;
    }

    function renderResultParsePreviews(scope) {
      const normalized = Array.isArray(scope)
        ? { items: scope, totalCount: scope.length, hiddenCount: 0, scoped: false }
        : (scope || { items: [], totalCount: 0, hiddenCount: 0, scoped: false });
      const matched = asArray(normalized.items).filter(Boolean);
      const list = matched.slice(0, 6);
      if (!list.length && !normalized.hiddenCount) return "";
      const open = detailIsOpen("result-parse-previews", false);
      const scopeText = normalized.scoped
        ? '当前 Plan ' + matched.length + ' 个' + (normalized.hiddenCount ? '，隐藏其他 ' + normalized.hiddenCount + ' 个' : '')
        : '已发现 ' + matched.length + ' 个候选';
      return '<details class="advanced" data-details-key="result-parse-previews"' + detailsOpenAttr("result-parse-previews", false) + '><summary>结果解析预览<span class="muted">' + esc(scopeText) + '</span></summary>' +
        (open ?
        (list.length ? '<div class="param-list">' + list.map((item) => {
          const metrics = compactList(item.sampleMetrics || [], "未识别指标");
          const columns = compactList(item.columns || [], "无列信息");
          const warnings = [...(item.warnings || []), item.error].filter(Boolean);
          const snippets = (item.snippets || []).map((sample) => String(sample.metric || "") + "@" + String(sample.line || "-") + "=" + String(sample.value ?? "") + "：" + String(sample.snippet || "")).join("；");
          const sourceLabel = item.sourceType === "text_metric" ? "文本正则" : "结构化";
          return '<div class="param-row' + (item.parseable ? " important" : "") + '">' +
            '<div class="param-key" title="' + escAttr(item.file || "") + '">' +
              esc(compactText(item.file || "-", 78)) +
              '<span class="pill ' + (item.parseable ? "status-completed" : "status-warning") + '">' + (item.parseable ? "可解析记录 " + (item.records || 0) : "需接入") + '</span>' +
            '</div>' +
            '<div class="param-value" title="' + escAttr(snippets || warnings.join("；") || "已按当前规则解析") + '">' +
              esc(sourceLabel) + ' · 规则 ' + esc(item.ruleId || item.presetId || item.format || "-") +
              ' · 行 ' + esc(String(item.rows ?? "-")) +
              ' · 指标 ' + metrics +
              ' · 列 ' + columns +
              (snippets ? ' · 片段 ' + esc(compactText(snippets, 96)) : '') +
              (warnings.length ? ' · ' + esc(compactText(warnings.join("；"), 96)) : '') +
            '</div>' +
          '</div>';
        }).join("") + '</div>' : '<div class="muted">当前 Plan 暂无匹配的本地结果预览；其他 Plan 候选已隐藏。</div>') : '<div class="muted">解析明细按需展开。</div>') + '</details>';
    }

    function compactList(values, emptyText) {
      const list = (values || []).filter(Boolean).map(String);
      if (!list.length) return emptyText || "-";
      const text = list.join("、");
      const compact = list.slice(0, 3).join("、") + (list.length > 3 ? " … +" + (list.length - 3) : "");
      return '<span title="' + escAttr(text) + '">' + esc(compact) + '</span>';
    }

    function projectListTotal(project, key, fallbackArray) {
      const total = Number((project || {})[key + "TotalCount"]);
      if (Number.isFinite(total) && total >= 0) return total;
      return asArray(fallbackArray || (project || {})[key] || []).length;
    }

    function projectCountLabel(project, key, fallbackArray) {
      const visible = asArray(fallbackArray || (project || {})[key] || []).length;
      const total = projectListTotal(project, key, fallbackArray);
      return total > visible ? String(total) + "（显示 " + visible + "）" : String(total);
    }

    function compactProjectList(project, key, emptyText) {
      const list = asArray((project || {})[key] || []);
      if (!list.length) return emptyText || "-";
      const omitted = Number((project || {})[key + "OmittedCount"] || 0);
      return compactList(list, emptyText) + (omitted > 0 ? '<span class="muted" title="' + escAttr("省略：" + String(omitted)) + '"> +' + esc(String(omitted)) + '</span>' : "");
    }

    function renderConfigInspector(project, selectedPlan) {
      const planConfigFile = configInspectorPlanConfigFile(selectedPlan);
      if (!detailIsOpen("config-inspector", false)) {
        const count = asArray((project || {}).configSummaries || []).length;
        return '<details class="advanced" data-details-key="config-inspector"' + detailsOpenAttr("config-inspector", false) + '><summary>配置参数预览<span class="muted">已识别 ' + count + ' 个配置</span></summary>' +
          '<div class="muted">' + (planConfigFile ? '当前 Plan 配置：' + esc(compactPath(planConfigFile)) : '当前 Plan 未提供可比较的单文件配置') + '；配置筛选按需展开。</div></details>';
      }
      const info = configInspectorInfo(project || {}, selectedPlan);
      const selected = info.selectedConfig;
      const diff = configParamDiffRows(selected, info.planConfig, info.query);
      const params = diff.rows.slice(0, 18);
      const sourceOmitted = Number((selected && selected.omittedParamCount) || 0) + Number((info.planConfig && info.planConfig !== selected && info.planConfig.omittedParamCount) || 0);
      const renderedOmitted = Math.max(0, diff.rows.length - params.length);
      const omittedParamNotice = sourceOmitted || renderedOmitted
        ? '<div class="taskRenderBudgetNotice" title="' + escAttr("源摘要省略：" + sourceOmitted + "；当前视图折叠：" + renderedOmitted) + '">参数摘要未完全展开：源文件省略 ' + esc(String(sourceOmitted)) + '，当前视图折叠 ' + esc(String(renderedOmitted)) + '。</div>'
        : "";
      const comparisonSummary = selected && info.planConfig
        ? '<div class="summaryLine"><span class="muted" title="' + escAttr(info.planConfig.file || "") + '">Plan 基准：' + esc(compactPath(info.planConfig.file || "-")) + '</span>' +
            '<span class="pill status-completed">一致 ' + diff.counts.same + '</span>' +
            '<span class="pill status-warning">变更 ' + diff.counts.changed + '</span>' +
            '<span class="pill">仅所选 ' + diff.counts.added + '</span>' +
            '<span class="pill">所选缺少 ' + diff.counts.missing + '</span>' +
            (diff.counts.uncertain ? '<span class="pill status-warning">摘要外待确认 ' + diff.counts.uncertain + '</span>' : '') + '</div>'
        : '<div class="muted">' + (planConfigFile ? '当前 Plan 配置未进入可预览摘要，暂不能逐项比较。' : '当前 Plan 使用内联、case 级配置或未声明配置，暂不能建立单文件比较基准。') + '</div>';
      const paramRows = params.length ? params.map((item) => {
        const param = item.param || item.baselineParam || {};
        const valueText = configParamDiffValue(item);
        return '<div class="param-row' + (param.important ? " important" : "") + '">' +
          '<div class="param-key">' + esc(item.key) + '<span class="pill" title="' + escAttr("原始类型：" + (param.kind || "参数")) + '">' + esc(configParamKindLabel(param.kind)) + '</span><span class="pill ' + escAttr(configParamDiffClass(item.kind)) + '">' + esc(configParamDiffLabel(item.kind)) + '</span></div>' +
          '<div class="param-value" title="' + escAttr(valueText) + '">' + esc(compactText(valueText, 160)) + '</div>' +
        '</div>'
      }).join("") : '<div class="muted">未识别到符合当前筛选的可比较参数。</div>';
      return '<details class="advanced" data-details-key="config-inspector"' + detailsOpenAttr("config-inspector", false) + '><summary>配置参数预览<span class="muted">筛选后可预览</span></summary>' +
        '<div class="toolbar">' +
          '<select id="configLevel1Filter" data-config-filter="true">' + info.level1Options + '</select>' +
          '<select id="configLevel2Filter" data-config-filter="true">' + info.level2Options + '</select>' +
          '<input id="configParamFilter" data-config-filter="true" class="wide" placeholder="筛选 dataset / output_dir / seed / 参数" value="' + escAttr(configParamFilter) + '">' +
        '</div>' +
        '<div class="toolbar"><select id="configParamSelect" data-config-filter="true">' + info.configOptions + '</select>' + (selected ? '<button class="secondary" data-command="openPlan" data-file="' + escAttr(selected.file) + '" title="打开配置文件：' + escAttr(selected.file) + '">打开配置文件</button>' : '') + '</div>' +
        comparisonSummary +
        omittedParamNotice +
        '<div class="param-list">' + paramRows + '</div>' +
      '</details>';
    }

    function configParamKindLabel(kind) {
      const raw = String(kind || "").trim();
      const labels = {
        yaml: "YAML 配置", yml: "YAML 配置", json: "JSON 配置", python: "Python 配置", py: "Python 配置",
        scalar: "单值", mapping: "对象", object: "对象", sequence: "列表", array: "列表"
      };
      return labels[raw.toLowerCase()] || raw || "参数";
    }

    function configInspectorPlanConfigFile(plan) {
      const raw = String((plan && (plan.baseConfig || plan.base_config)) || "").trim();
      const value = raw.length > 1 && ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) ? raw.slice(1, -1) : raw;
      const lower = value.toLowerCase();
      return [".yaml", ".yml", ".json", ".py"].some((suffix) => lower.endsWith(suffix)) ? value : "";
    }

    function normalizeConfigInspectorFile(value) {
      return String(value || "").trim().replace(/\\\\/g, "/").replace(/^\\.\\//, "").toLowerCase();
    }

    function configParamDiffBase(selected, baseline) {
      const counts = { same: 0, changed: 0, added: 0, missing: 0, uncertain: 0 };
      if (!selected) return { rows: [], counts };
      const selectedSource = selected && typeof selected === "object" && !Array.isArray(selected) ? selected : null;
      if (!selectedSource) return { rows: [], counts };
      const baselineSource = baseline && typeof baseline === "object" && !Array.isArray(baseline) ? baseline : EMPTY_CONFIG_PARAM_DIFF_SOURCE;
      let baselineCache = configParamDiffBaseCache.get(selectedSource);
      if (!baselineCache) {
        baselineCache = new WeakMap();
        configParamDiffBaseCache.set(selectedSource, baselineCache);
      }
      const cached = baselineCache.get(baselineSource);
      if (cached) return cached;
      const hasBaseline = baselineSource !== EMPTY_CONFIG_PARAM_DIFF_SOURCE;
      const selectedOmitted = Number(selected.omittedParamCount || 0) > 0;
      const baselineOmitted = Number((baselineSource && baselineSource.omittedParamCount) || 0) > 0;
      const currentByKey = new Map(asArray(selectedSource.params).map((param) => [String((param || {}).key || ""), param]).filter((entry) => entry[0]));
      const baselineByKey = new Map(asArray(hasBaseline && baselineSource.params).map((param) => [String((param || {}).key || ""), param]).filter((entry) => entry[0]));
      const keys = Array.from(new Set([...currentByKey.keys(), ...baselineByKey.keys()])).sort(naturalCompare);
      const rows = keys.map((key) => {
        const param = currentByKey.get(key);
        const baselineParam = baselineByKey.get(key);
        const kind = !hasBaseline ? "uncompared" : !baselineParam ? baselineOmitted ? "uncertain" : "added" : !param ? selectedOmitted ? "uncertain" : "missing" : String(param.value) === String(baselineParam.value) ? "same" : "changed";
        if (counts[kind] !== undefined) counts[kind] += 1;
        const searchText = [selectedSource.file, hasBaseline && baselineSource.file, key, param && param.value, baselineParam && baselineParam.value, param && param.kind, baselineParam && baselineParam.kind].join(" ").toLowerCase();
        return { key, kind, param, baselineParam, searchText };
      });
      const value = { rows, counts };
      baselineCache.set(baselineSource, value);
      return value;
    }

    function configParamDiffRows(selected, baseline, query) {
      const base = configParamDiffBase(selected, baseline);
      const normalizedQuery = String(query || "").trim().toLowerCase();
      return normalizedQuery ? { rows: base.rows.filter((item) => item.searchText.includes(normalizedQuery)), counts: base.counts } : base;
    }

    function configParamDiffLabel(kind) {
      return ({ same: "与 Plan 一致", changed: "值不同", added: "仅所选配置", missing: "所选配置缺少", uncertain: "摘要外待确认", uncompared: "未比较" })[kind] || "未比较";
    }

    function configParamDiffClass(kind) {
      return kind === "same" ? "status-completed" : kind === "changed" ? "status-warning" : "";
    }

    function configParamDiffValue(item) {
      const current = item && item.param ? String(item.param.value ?? "") : "";
      const baseline = item && item.baselineParam ? String(item.baselineParam.value ?? "") : "";
      if (item.kind === "changed") return "所选配置：" + current + "；Plan 配置：" + baseline;
      if (item.kind === "added") return "所选配置：" + current + "；Plan 配置未声明";
      if (item.kind === "missing") return "所选配置未声明；Plan 配置：" + baseline;
      if (item.kind === "uncertain") return "所选配置：" + (current || "摘要未包含") + "；Plan 配置：" + (baseline || "摘要未包含") + "；存在省略参数，需打开源文件确认";
      return current || baseline;
    }

    function configInspectorInfo(project, selectedPlan) {
      const configSummaries = project.configSummaries || [];
      const staticIndex = configInspectorIndex(configSummaries);
      const indexed = staticIndex.indexed;
      const planConfigKey = normalizeConfigInspectorFile(configInspectorPlanConfigFile(selectedPlan));
      const planConfig = planConfigKey ? indexed.find((cfg) => normalizeConfigInspectorFile(cfg.file) === planConfigKey) : undefined;
      const level1Values = staticIndex.level1Values;
      if (configLevel1Filter !== "all" && !level1Values.includes(configLevel1Filter)) configLevel1Filter = "all";
      const level2Values = configLevel1Filter === "all"
        ? staticIndex.level2Values
        : staticIndex.level2ValuesByLevel1.get(configLevel1Filter) || [];
      if (configLevel2Filter !== "all" && !level2Values.includes(configLevel2Filter)) configLevel2Filter = "all";
      const query = configParamFilter.trim().toLowerCase();
      const filteredConfigs = indexed.filter((cfg) => (configLevel1Filter === "all" || cfg.pathParts.level1 === configLevel1Filter) && (configLevel2Filter === "all" || cfg.pathParts.level2 === configLevel2Filter) && (!query || cfg.searchText.includes(query) || (planConfig && planConfig.searchText.includes(query)))).sort((left, right) => left === planConfig ? -1 : right === planConfig ? 1 : left.index - right.index);
      if (selectedConfigIndex >= filteredConfigs.length) selectedConfigIndex = 0;
      const selectedConfig = filteredConfigs[selectedConfigIndex] || filteredConfigs[0];
      return {
        query,
        planConfig,
        selectedConfig,
        configOptions: filteredConfigs.map((cfg, index) => '<option value="' + index + '"' + (cfg === selectedConfig ? " selected" : "") + '>' + esc(cfg.file) + '</option>').join(""),
        level1Options: optionHtml("all", "全部目录", configLevel1Filter === "all") + level1Values.map((value) => optionHtml(value, value, configLevel1Filter === value)).join(""),
        level2Options: optionHtml("all", "全部子目录", configLevel2Filter === "all") + level2Values.map((value) => optionHtml(value, value, configLevel2Filter === value)).join("")
      };
    }

    function renderPlanCards(state, plans) {
      if (!plans.length) return '<div class="muted">没有 plan 列表时可直接输入 planFile。</div>';
      const visible = planVisibleRows(state, plans);
      const totalPlans = Math.max(Number(state.plansTotalCount || 0), plans.length);
      const omitted = Math.max(Number(state.plansOmittedCount || 0), totalPlans - visible.length);
      const notice = omitted
        ? '<div class="taskRenderBudgetNotice" title="' + escAttr("折叠：" + omitted) + '">计划 ' + visible.length + ' / ' + totalPlans + '；折叠 ' + omitted + '</div>'
        : "";
      return notice + '<div class="taskCardList">' + visible.map((entry) => {
        const plan = entry.plan;
        const index = entry.index;
        const file = plan.file || plan.planFile || plan.path || "";
        const text = plan.text || "";
        const selected = planMatchesSelection(state, plan);
        const textUnavailable = Boolean(plan.textOmitted || plan.metadataTruncated);
        const editable = (selected || Boolean(plan.parseError)) && !textUnavailable;
        const archiveReadiness = planArchiveUiReadiness(state, file);
        const title = plan.name || file.split(/[\\\\/]/).pop() || file;
        const textNotice = plan.metadataTruncated
          ? '<div class="muted" title="' + escAttr("摘要：" + (file || title)) + '">计划文件较大，已隐藏内联编辑。</div>'
          : '<div class="muted" title="' + escAttr("未选中：" + (file || title)) + '">未选中计划已隐藏 YAML 预览。</div>';
        return '<div class="task-card is-' + (plan.parseError ? "failed" : "completed") + (selected ? " selectedRow" : "") + '" data-anchor="' + escAttr(treeAnchorId("plan", file || plan.planId || title)) + '">' +
          '<div class="planCardHead">' +
            '<input class="taskSelectBox" type="checkbox" data-command="selectPlan" data-plan-file="' + escAttr(file) + '" data-plan-id="' + escAttr(plan.planId || file) + '"' + (selected ? " checked" : "") + '>' +
          '<div class="taskTitle"><b>' + esc(title) + '</b><span class="pill">' + esc(planTaskScaleSummary(plan)) + '</span><span class="pill">' + esc(planModeLabel(plan.mode)) + '</span>' + (plan.restoreVersion ? '<span class="pill">' + esc(plan.restoreVersion) + '</span>' : "") + '</div>' +
            '<div class="planCardActions">' +
              '<button class="taskActionButton secondary" data-command="openPlan" data-file="' + escAttr(file) + '">打开 YAML</button>' +
              (plan.restoreEnvironmentDir ? '<button class="taskActionButton secondary" data-command="openPlan" data-file="' + escAttr(plan.restoreEnvironmentDir) + '" title="打开归档时保存的依赖环境清单">环境快照</button>' : '') +
              (plan.restoreParameterDir ? '<button class="taskActionButton secondary" data-command="openPlan" data-file="' + escAttr(plan.restoreParameterDir) + '" title="打开归档时保存的入口脚本和 CLI 默认参数">参数快照</button>' : '') +
              (editable ? '<button class="taskActionButton secondary" data-command="savePlan" data-file="' + escAttr(file) + '" data-save-plan="' + index + '">保存</button>' : '') +
              '<button class="taskActionButton secondary" data-command="validatePlan" data-plan-file="' + escAttr(file) + '">校验</button>' +
              '<button class="taskActionButton secondary" data-command="dryRunPlan" data-plan-file="' + escAttr(file) + '">预演</button>' +
              '<button class="taskActionButton" data-command="runPlan" data-plan-file="' + escAttr(file) + '" data-confirm="true">校验并提交运行</button>' +
              '<button class="taskActionButton secondary" data-command="archivePlan" data-plan-file="' + escAttr(file) + '" data-file="' + escAttr(file) + '" data-confirm="true" title="' + escAttr(archiveReadiness.reason) + '"' + (archiveReadiness.ready ? "" : " disabled") + '>归档计划</button>' +
            '</div>' +
          '</div>' +
          '<div class="taskFacts">' +
            taskMetric("套件", plan.suite || "-") +
            taskMetric("基础配置", plan.baseConfig || plan.configSource || "-") +
            taskMetric("seeds", arrayText(plan.seeds || [])) +
            taskMetric("cases", compactPlanArrayText(plan.cases || [], plan.casesTotalCount, plan.casesOmittedCount)) +
            taskMetric("契约", plan.planContractOk === false ? "缺少：" + asArray(plan.planContractMissing || []).join("、") : "通过") +
            taskMetric("输出捕获", asArray(plan.outputCandidates || []).length ? compactPlanArrayText(plan.outputCandidates || [], plan.outputCandidatesTotalCount, plan.outputCandidatesOmittedCount) : "未声明") +
            (plan.restoreOutputNamespace ? taskMetric("版本输出", plan.restoreOutputNamespace) : "") +
            taskMetric("归档条件", archiveReadiness.ready ? "可归档 / 有效结果 " + archiveReadiness.archivedCount : archiveReadiness.reason) +
            (archiveReadiness.resultCount ? taskMetric("结果取舍", "有效 " + archiveReadiness.archivedCount + " / 未纳入 " + archiveReadiness.notIncludedCount) : "") +
          '</div>' +
          (plan.parseError ? '<div class="status-failed">' + esc(plan.parseError) + '</div>' : "") +
          (editable ? '<textarea id="plan-preview-' + index + '" class="wide" rows="8" data-plan-preview="true" data-plan-file="' + escAttr(file) + '">' + esc(text) + '</textarea>' : textNotice) +
        '</div>';
      }).join("") + '</div>';
    }

    function planVisibleRows(state, plans) {
      const rows = asArray(plans || []).map((plan, index) => ({ plan, index }));
      if (rows.length <= PLAN_RENDER_LIMIT) return rows;
      const out = [];
      const seen = new Set();
      function add(entry) {
        const key = planIdentity(entry.plan, entry.index);
        if (seen.has(key)) return;
        seen.add(key);
        out.push(entry);
      }
      rows.filter((entry) => planMatchesSelection(state, entry.plan)).forEach(add);
      rows.filter((entry) => entry.plan && entry.plan.parseError).forEach(add);
      rows.forEach((entry) => { if (out.length < PLAN_RENDER_LIMIT) add(entry); });
      return out.slice(0, PLAN_RENDER_LIMIT);
    }

    function planIdentity(plan, index) {
      return String((plan && (plan.planId || plan.file || plan.planFile || plan.path || plan.name)) || ("plan-" + index));
    }

    function compactPlanArrayText(items, totalCount, omittedCount) {
      const values = asArray(items || []);
      const total = Math.max(Number(totalCount || 0), values.length);
      const omitted = Math.max(Number(omittedCount || 0), total - values.length);
      const base = arrayText(values);
      return omitted ? base + "；另有 " + omitted + " 项已省略" : base;
    }

    function planMatchesSelection(state, plan) {
      const file = String((plan && (plan.file || plan.planFile || plan.path)) || "");
      const id = String((plan && (plan.planId || file)) || "");
      const selected = String((state && (state.planFileInput || ((state.selection || {}).selectedPlanId))) || "");
      return Boolean(selected && (samePlanSelection(selected, file) || samePlanSelection(selected, id)));
    }

    function normalizePlanSelectionKey(value) {
      const normalized = String(value || "").trim().split(String.fromCharCode(92)).join("/");
      return normalized.startsWith("./") ? normalized.slice(2) : normalized;
    }

    function planFileEquivalenceEntry(value) {
      const raw = normalizePlanSelectionKey(value);
      if (!raw) return EMPTY_PLAN_FILE_EQUIVALENCE_ENTRY;
      const lower = raw.toLowerCase();
      if (planFileEquivalenceCache.has(lower)) return planFileEquivalenceCache.get(lower);
      const base = lower.split("/").pop() || lower;
      const extension = [".yaml", ".yml", ".json"].find((item) => base.endsWith(item)) || "";
      const noExt = extension ? base.slice(0, -extension.length) : base;
      const keys = uniqueText([
        lower,
        base,
        noExt,
        lower.startsWith("experiments/plans/") ? lower.slice("experiments/plans/".length) : lower,
        lower.startsWith("plans/") ? lower.slice("plans/".length) : lower
      ]);
      const entry = { keys, keySet: new Set(keys) };
      if (planFileEquivalenceCache.size >= PLAN_FILE_EQUIVALENCE_CACHE_LIMIT) planFileEquivalenceCache.clear();
      planFileEquivalenceCache.set(lower, entry);
      return entry;
    }

    function planFileEquivalenceKeys(value) {
      return planFileEquivalenceEntry(value).keys;
    }

    function samePlanSelection(left, right) {
      const rightEntry = planFileEquivalenceEntry(right);
      return rightEntry.keys.length > 0 && planFileEquivalenceEntry(left).keys.some((key) => rightEntry.keySet.has(key));
    }

    function planArchiveRecordPlanFile(row) {
      const record = row && typeof row === "object" ? row : {};
      const provenance = record.provenance && typeof record.provenance === "object" ? record.provenance : {};
      return record.planFile || record.plan_file || provenance.planFile || provenance.plan_file || "";
    }

    function addPlanArchiveReadinessIndexEntry(index, planFile, rowIndex) {
      planFileEquivalenceKeys(planFile).forEach((key) => {
        let rows = index.get(key);
        if (!rows) {
          rows = [];
          index.set(key, rows);
        }
        rows.push(rowIndex);
      });
    }

    function planArchiveUiReadinessIndexForState(state) {
      state = state || {};
      const summary = state.resultsSummary || {};
      const results = asArray(summary.results);
      const tasks = schedulerRowsForState(state);
      if (planArchiveReadinessIndexState === state
        && planArchiveReadinessIndexSummary === summary
        && planArchiveReadinessIndexResults === results
        && planArchiveReadinessIndexTasks === tasks
        && planArchiveReadinessIndexValue) return planArchiveReadinessIndexValue;
      const resultIndicesByKey = new Map();
      const activeTaskIndicesByKey = new Map();
      const archivedResultIndices = new Set();
      results.forEach((row, index) => {
        addPlanArchiveReadinessIndexEntry(resultIndicesByKey, planArchiveRecordPlanFile(row), index);
        if (String((row || {}).finalEvidenceState || (row || {}).final_evidence_state || "").toLowerCase() === "archived") archivedResultIndices.add(index);
      });
      tasks.forEach((row, index) => {
        if (taskTerminalStatus((row || {}).status)) return;
        addPlanArchiveReadinessIndexEntry(activeTaskIndicesByKey, (row || {}).planFile || (row || {}).plan || "", index);
      });
      const value = { summary, results, resultIndicesByKey, activeTaskIndicesByKey, archivedResultIndices };
      planArchiveReadinessIndexState = state;
      planArchiveReadinessIndexSummary = summary;
      planArchiveReadinessIndexResults = results;
      planArchiveReadinessIndexTasks = tasks;
      planArchiveReadinessIndexValue = value;
      planArchiveReadinessCache.clear();
      return value;
    }

    function planArchiveUiReadinessIndices(index, planFile) {
      const rows = new Set();
      planFileEquivalenceKeys(planFile).forEach((key) => asArray(index.get(key)).forEach((rowIndex) => rows.add(rowIndex)));
      return rows;
    }

    function cachePlanArchiveUiReadiness(cacheKey, value) {
      if (!planArchiveReadinessCache.has(cacheKey) && planArchiveReadinessCache.size >= PLAN_ARCHIVE_READINESS_CACHE_LIMIT) {
        planArchiveReadinessCache.delete(planArchiveReadinessCache.keys().next().value);
      }
      planArchiveReadinessCache.set(cacheKey, value);
      return value;
    }

    function planArchiveUiReadiness(state, planFile) {
      const index = planArchiveUiReadinessIndexForState(state || {});
      const cacheKey = normalizePlanSelectionKey(planFile).toLowerCase();
      if (planArchiveReadinessCache.has(cacheKey)) return planArchiveReadinessCache.get(cacheKey);
      const resultIndices = planArchiveUiReadinessIndices(index.resultIndicesByKey, planFile);
      const activeTaskIndices = planArchiveUiReadinessIndices(index.activeTaskIndicesByKey, planFile);
      let archivedCount = 0;
      resultIndices.forEach((rowIndex) => { if (index.archivedResultIndices.has(rowIndex)) archivedCount += 1; });
      const resultCount = resultIndices.size;
      const activeTaskCount = activeTaskIndices.size;
      const notIncludedCount = Math.max(0, resultCount - archivedCount);
      const summary = index.summary;
      const previewCsvPath = String(summary.previewCsvPath || summary.preview_csv_path || "").trim();
      const effectiveResultsCsvPath = String(summary.effectiveResultsCsvPath || summary.effective_results_csv_path || "").trim();
      if (activeTaskCount) return cachePlanArchiveUiReadiness(cacheKey, { ready: false, reason: "仍有 " + activeTaskCount + " 个任务未结束，暂不可归档 Plan。", archivedCount, notIncludedCount, resultCount, activeTaskCount });
      if (!resultCount) return cachePlanArchiveUiReadiness(cacheKey, { ready: false, reason: "没有该 Plan 的已解析结果；请先完成运行并解析结果。", archivedCount: 0, notIncludedCount: 0, resultCount: 0, activeTaskCount: 0 });
      if (!archivedCount) return cachePlanArchiveUiReadiness(cacheKey, { ready: false, reason: "尚无已归档有效结果；请先在结果完整预览中至少归档一条记录。", archivedCount: 0, notIncludedCount, resultCount, activeTaskCount: 0 });
      if (!previewCsvPath || !effectiveResultsCsvPath) return cachePlanArchiveUiReadiness(cacheKey, { ready: false, reason: "结果摘要缺少完整预览 CSV 或有效结果 CSV；请先重新解析当前 Plan。", archivedCount, notIncludedCount, resultCount, activeTaskCount: 0 });
      return cachePlanArchiveUiReadiness(cacheKey, { ready: true, reason: "有效结果 " + archivedCount + " 条；未纳入 " + notIncludedCount + " 条。归档包会保存完整结果取舍清单。", archivedCount, notIncludedCount, resultCount, activeTaskCount: 0 });
    }

    function bindPlanInspectControls() {
      const configSelect = el("configParamSelect");
      if (configSelect) configSelect.onchange = () => {
        selectedConfigIndex = Number(configSelect.value) || 0;
        refreshPlanLocalUi();
      };
      const level1 = el("configLevel1Filter");
      if (level1) level1.onchange = () => {
        configLevel1Filter = level1.value || "all";
        configLevel2Filter = "all";
        selectedConfigIndex = 0;
        refreshPlanLocalUi();
      };
      const level2 = el("configLevel2Filter");
      if (level2) level2.onchange = () => {
        configLevel2Filter = level2.value || "all";
        selectedConfigIndex = 0;
        refreshPlanLocalUi();
      };
      const filter = el("configParamFilter");
      if (filter) filter.oninput = () => {
        const value = filter.value || "";
        configParamFilter = value;
        const generation = ++configParamFilterGeneration;
        clearTimeout(configParamFilterTimer);
        configParamFilterTimer = setTimeout(() => {
          if (generation !== configParamFilterGeneration) return;
          refreshPlanLocalUi();
          const next = el("configParamFilter");
          if (next) { next.focus(); next.setSelectionRange(value.length, value.length); }
        }, 140);
      };
    }

    function refreshPlanLocalUi() {
      const state = lastState || {};
      renderSectionIfVisible(state, "plans", { force: true });
      refreshPlanActionButtons(state, el("planQuickGrid"));
      refreshContextualActionButtons(state, el("workbenchInspector"));
      refreshContextualActionButtons(state, el("pinnedActionsHost"));
      schedulePostRenderMaintenance(false);
    }

    function taskMetric(label, value) {
      return '<div class="taskMetric"><span class="metric-label">' + esc(label) + '</span><span class="metric-value" title="' + escAttr(value) + '">' + esc(compactText(value, 80)) + '</span></div>';
    }

    function timeMetric(label, time) {
      return '<div class="taskMetric"><span class="metric-label">' + esc(label) + '</span><span class="metric-value" title="' + escAttr(label + "时间：" + time.raw) + '">' + esc(time.relative) + '</span></div>';
    }

    function optionHtml(value, label, selected) {
      return '<option value="' + escAttr(value) + '"' + (selected ? " selected" : "") + '>' + esc(label) + '</option>';
    }

    function configPathParts(file) {
      const raw = String(file || "").replace(/\\\\/g, "/");
      const rel = raw.startsWith("configs/") ? raw.slice("configs/".length) : raw;
      const parts = rel.split("/").filter(Boolean);
      return { level1: parts[0] || "", level2: parts[1] || "" };
    }

    function paramMatchesQuery(param, query, selectedConfig) {
      if (!query) return true;
      return [selectedConfig && selectedConfig.file, param.key, param.value, param.kind].join(" ").toLowerCase().includes(query);
    }

    function renderTaskCards(state, rows, selected, totalCount) {
      const total = Number(totalCount || rows.length || 0);
      const omitted = Math.max(0, total - rows.length);
      const budgetNotice = omitted
        ? '<div class="taskRenderBudgetNotice" title="' + escAttr(TASK_RENDER_BUDGET_HINT + "；折叠 " + omitted + " 条") + '">任务 ' + rows.length + ' / ' + total + '；折叠 ' + omitted + '<span class="muted">（优先显示已选、运行与失败）</span></div>'
        : "";
      return budgetNotice + '<div class="taskCardList">' + rows.map((row) => renderTaskCard(state, row, selected)).join("") + '</div>';
    }

    function taskRowsViewModel(rows, selected) {
      const allRows = Array.isArray(rows) ? rows : [];
      const counts = { queued: 0, running: 0, testing: 0, completed: 0, failed: 0, stopped: 0 };
      const selectedRows = [];
      const criticalRows = [];
      const queuedRows = [];
      const activeRows = [];
      const queuedLimit = Math.floor(TASK_RENDER_LIMIT / 3);
      allRows.forEach((row) => {
        const status = String((row || {}).status || "");
        if (counts[status] !== undefined) counts[status] += 1;
        if (isTaskRowSelected(row, selected)) selectedRows.push(row);
        if (criticalRows.length < TASK_RENDER_LIMIT && (["running", "testing"].includes(taskStatusToken(status)) || taskFailureLikeStatus(status))) criticalRows.push(row);
        if (queuedRows.length < queuedLimit && ["queued", "pending"].includes(status)) queuedRows.push(row);
        if (activeRows.length < 8 && ["running", "testing"].includes(status)) activeRows.push(row);
      });
      let visibleRows = allRows;
      if (allRows.length > TASK_RENDER_LIMIT) {
        const out = [];
        const seen = new Set();
        const add = (row) => {
          if (out.length >= TASK_RENDER_LIMIT) return;
          const key = String((row && row.uiKey) || "");
          if (!key || seen.has(key)) return;
          seen.add(key);
          out.push(row);
        };
        selectedRows.forEach(add);
        criticalRows.forEach(add);
        queuedRows.forEach(add);
        for (const row of allRows) {
          if (out.length >= TASK_RENDER_LIMIT) break;
          add(row);
        }
        visibleRows = out;
      }
      return {
        rows: allRows,
        counts,
        selectedRows,
        activeRows,
        visibleRows,
        detailRow: selectedRows[0] || activeRows[0] || allRows[0]
      };
    }

    function configInspectorIndex(configSummaries) {
      const source = asArray(configSummaries);
      if (configInspectorIndexCacheSource === source && configInspectorIndexCacheValue) return configInspectorIndexCacheValue;
      const indexed = source.map((cfg, index) => Object.assign({}, cfg, {
        index,
        pathParts: configPathParts(cfg.file),
        searchText: [cfg.file, cfg.folder, ...(cfg.params || []).flatMap((param) => [param.key, param.value, param.kind])].join(" ").toLowerCase()
      }));
      const level1Set = new Set();
      const level2Set = new Set();
      const level2SetsByLevel1 = new Map();
      indexed.forEach((cfg) => {
        const level1 = cfg.pathParts.level1;
        const level2 = cfg.pathParts.level2;
        if (level1) level1Set.add(level1);
        if (level2) level2Set.add(level2);
        if (!level1 || !level2) return;
        if (!level2SetsByLevel1.has(level1)) level2SetsByLevel1.set(level1, new Set());
        level2SetsByLevel1.get(level1).add(level2);
      });
      const level1Values = Array.from(level1Set).sort(naturalCompare);
      const level2Values = Array.from(level2Set).sort(naturalCompare);
      const level2ValuesByLevel1 = new Map(Array.from(level2SetsByLevel1.entries()).map(([level1, values]) => [level1, Array.from(values).sort(naturalCompare)]));
      configInspectorIndexCacheSource = source;
      configInspectorIndexCacheValue = { indexed, level1Values, level2Values, level2ValuesByLevel1 };
      return configInspectorIndexCacheValue;
    }

    function taskVisibleRows(rows, selected) {
      return taskRowsViewModel(rows, selected).visibleRows;
    }

    function renderTaskDetailPane(state, rows, selectedRows, preferredRow) {
      const pane = el("taskDetailPane");
      if (!pane) return;
      const row = preferredRow || selectedRows[0] || rows[0];
      if (!row) {
        setHtmlIfChanged(pane, '<h3>任务详情</h3><div class="muted">暂无任务。</div>');
        return;
      }
      const key = taskTargetKey(row);
      const log = compactText(taskLogText(state, row, key) || "暂无日志。", 420);
      const actions = [
        ["停止", "stopExperiment", ["running", "testing"].includes(row.status), true],
        ["重试", "retryExperiment", taskFailureLikeStatus(row.status), true],
        ["解析", "parseResults", true, false],
        ["归档", "archiveArtifacts", taskArchivableStatus(row.status), true],
        ["删除", "deleteArtifacts", true, false, true],
        ["日志", "selectLogRunKey", Boolean(key), false],
        ["隐藏残留", "clearLegacyTasks", !usableTaskKey(taskActionKey(row)), false]
      ].map((item) => rowActionButton(item[0], item[1], row, item[2], item[3], item[4])).join("");
      const detailTone = row.status === "completed" || row.status === "done" ? "good" : (taskFailureLikeStatus(row.status) ? "error" : (["queued", "pending"].includes(row.status) ? "warn" : "good"));
      const taskTime = taskTimestampView(row);
      setHtmlIfChanged(pane,
        '<div class="detailHeader" title="任务详情">' +
          '<div class="detailHeaderText"><h3>任务详情</h3><span>' + esc(compactText(row.experimentName, 72)) + '</span></div>' +
          '<span class="detailBadge ' + escAttr(detailTone) + '" title="' + escAttr("原始状态：" + (row.status || "-")) + '">' + esc(taskStatusLabel(row.status)) + '</span>' +
        '</div>' +
        '<div class="detailTabs" title="详情分区">' +
          detailTab("检查", usableTaskKey(taskActionKey(row)) ? "可定位" : "缺 key") +
          detailTab("事件", "状态/Worker/操作") +
          detailTab("日志", taskLogText(state, row, key) ? "已有片段" : "暂无") +
        '</div>' +
        '<div class="taskDetailMeta">' +
          taskDetailLine("状态", '<span class="' + statusClass(row.status) + '" title="' + escAttr("原始状态：" + row.status) + '">' + esc(taskStatusLabel(row.status)) + '</span>') +
          taskDetailLine("实验", esc(compactText(row.experimentName, 90))) +
          taskDetailLine("Worker", esc(workerName(row.serverId))) +
          taskDetailLine("GPU", esc(arrayText(row.gpuIds))) +
          taskDetailLine("runKey", '<span title="' + escAttr(row.runKey) + '">' + esc(compactIdentifier(row.runKey)) + '</span>') +
          taskDetailLine("进度", esc(row.progress || "-")) +
          taskDetailLine(taskTime.label, '<span title="' + escAttr(taskTime.label + "时间：" + taskTime.raw) + '">' + esc(taskTime.relative) + '</span>') +
        '</div>' +
        '<div class="taskActions">' + actions + '</div>' +
        renderTaskReadiness(state, row) +
        renderTaskTimeline(state, row, key) +
        '<div class="detailLogLabel"><span>日志摘要</span><span>完整日志</span></div>' +
        '<pre class="taskDetailLog" title="' + escAttr(taskLogText(state, row, key) || "") + '">' + esc(log) + '</pre>');
    }

    function detailTab(label, value) {
      return '<div class="detailTab" title="' + escAttr(label + "：" + value) + '"><b>' + esc(label) + '</b><span>' + esc(value || "-") + '</span></div>';
    }

    function taskDetailLine(label, valueHtml) {
      return '<div class="taskDetailLine"><span>' + esc(label) + '</span><span>' + valueHtml + '</span></div>';
    }

    function renderTaskReadiness(state, row) {
      const key = taskActionKey(row);
      const workerId = resolveWorkerId(row.serverId);
      const stopReason = rowActionDisableReason(state, "stopExperiment", { runKey: key, experimentId: row.experimentId, archiveKey: row.archiveKey, workerId, experimentIndex: row.experimentIndex, rowAction: true });
      const archiveReason = rowActionDisableReason(state, "archiveArtifacts", { runKey: key, experimentId: row.experimentId, archiveKey: row.archiveKey, workerId, experimentIndex: row.experimentIndex, rowAction: true });
      const deleteReason = rowActionDisableReason(state, "deleteArtifacts", { runKey: key, experimentId: row.experimentId, archiveKey: row.archiveKey, workerId, experimentIndex: row.experimentIndex, rowAction: true });
      const items = [
        ["可操作标识", usableTaskKey(key) ? "已定位" : "缺失", usableTaskKey(key), key || "-"],
        ["Worker 直达", workerId && workerId !== "-" ? workerName(workerId) : "缺失", Boolean(workerId && workerId !== "-"), workerId || "-"],
        ["停止/重试", stopReason ? "不可用" : "可用", !stopReason, stopReason || "可用"],
        ["归档/删除", archiveReason || deleteReason ? "需检查" : "可用", !(archiveReason || deleteReason), archiveReason || deleteReason || "可用"]
      ];
      return '<div class="taskReadinessGrid" title="任务检查">' + items.map((item) => {
        const ok = Boolean(item[2]);
        const tone = ok ? "good" : (String(item[1]).includes("缺失") || String(item[1]).includes("不可用") ? "error" : "warn");
        return '<div class="taskReadinessItem ' + tone + '" title="' + escAttr(item[0] + "：" + item[3]) + '"><span>' + esc(item[0]) + '</span><b>' + esc(item[1]) + '</b></div>';
      }).join("") + '</div>';
    }

    function renderTaskTimeline(state, row, key) {
      const log = taskLogText(state, row, key);
      const rawWorkerLiveStatus = row.workerLiveStatus && row.workerLiveStatus !== "-" ? String(row.workerLiveStatus) : "";
      const workerLiveStatus = rawWorkerLiveStatus ? labelStatus(rawWorkerLiveStatus) : "等待推送";
      const workerLiveDetail = row.workerTelemetryWarning || (rawWorkerLiveStatus ? "Agent 原始状态：" + rawWorkerLiveStatus : "尚未收到 Worker 推送");
      const rawTaskStatus = row.status || "-";
      const events = [
        ["任务状态", taskStatusLabel(rawTaskStatus), "原始状态：" + rawTaskStatus + "；" + taskTimelineDetail(row), taskCardClass(row.status)],
        ["Worker 观测", workerLiveStatus, workerLiveDetail, row.workerTelemetryWarning ? "warn" : "info"],
        ["日志", log ? "已有日志片段" : "暂无日志", log ? compactText(log, 140) : "-", log ? "good" : "warn"],
        ["操作终态", "看操作进度", row.clientActionId || row.operationId || "-", "info"]
      ];
      return '<div class="taskTimeline" title="任务事件">' +
        events.map((event) => taskTimelineItem(event[0], event[1], event[2], event[3])).join("") +
      '</div>';
    }

    function taskTimelineItem(title, status, detail, tone) {
      const cls = tone === "is-completed" || tone === "good" ? "good" : (tone === "is-failed" || tone === "is-stopped" || tone === "error" ? "error" : (tone === "is-queued" || tone === "warn" ? "warn" : ""));
      return '<div class="taskTimelineItem ' + cls + '" title="' + escAttr(compactText(detail || status || "", 72)) + '"><b>' + esc(title) + ' · ' + esc(status || "-") + '</b><span>' + esc(compactText(detail || "-", 72)) + '</span></div>';
    }

    function taskTimelineDetail(row) {
      const taskTime = taskTimestampView(row);
      const parts = [
        row.progress && row.progress !== "-" ? "进度 " + row.progress : "",
        row.duration && row.duration !== "-" ? "耗时 " + row.duration : "",
        taskTime.raw !== "-" ? taskTime.label + " " + taskTime.relative : ""
      ].filter(Boolean);
      return parts.join("；") || "-";
    }

    function renderTaskCard(state, row, selected) {
      const key = taskTargetKey(row);
      const checked = isTaskRowSelected(row, selected);
      const pending = taskActionPending(row);
      const pendingDelete = Boolean(taskActionPending(row, "deleteArtifacts"));
      const actions = [
        ["停止", "stopExperiment", ["running", "testing"].includes(row.status), true],
        ["重试", "retryExperiment", taskFailureLikeStatus(row.status), true],
        ["解析", "parseResults", true, false],
        ["归档", "archiveArtifacts", taskArchivableStatus(row.status), true],
        ["删除", "deleteArtifacts", true, false, true],
        ["打开日志", "selectLogRunKey", Boolean(key), false],
        ["隐藏残留", "clearLegacyTasks", !usableTaskKey(taskActionKey(row)), false]
      ].map((item) => rowActionButton(item[0], item[1], row, item[2], item[3], item[4])).join("");
      const pendingBadge = pending ? '<span class="taskActionPending">' + loadingPrefix(true) + esc(pendingLabel(pending)) + '</span>' : "";
      const taskTime = taskTimestampView(row);
      const titleBits = [
        row.experimentName || "",
        row.status || "",
        row.plan ? "计划 " + compactPath(row.plan) : "",
        row.runKey ? "runKey " + compactIdentifier(row.runKey) : "",
        row.serverId ? "Worker " + workerName(row.serverId) : "",
        arrayText(row.gpuIds) !== "-" ? "GPU " + arrayText(row.gpuIds) : "",
        row.duration && row.duration !== "-" ? "耗时 " + row.duration : "",
        row.progress && row.progress !== "-" ? "进度 " + row.progress : ""
      ].filter(Boolean).join(" · ");
      return '<div class="task-card ' + taskCardClass(row.status) + (checked ? " selectedRow" : "") + (pendingDelete ? " delete-pending" : "") + '" data-anchor="' + escAttr(treeAnchorId("task", key || row.experimentId || row.experimentName)) + '" title="' + escAttr(titleBits) + '">' +
        '<div class="taskCardHead">' +
          '<input class="taskSelectBox" type="checkbox" data-command="selectExperiment" data-task-ui-key="' + escAttr(row.uiKey) + '" data-run-key="' + escAttr(taskActionKey(row)) + '" data-action-key="' + escAttr(taskActionKey(row)) + '" data-experiment-id="' + escAttr(row.experimentId) + '" data-archive-key="' + escAttr(taskArchiveActionKey(row)) + '" data-worker-id="' + escAttr(resolveWorkerId(row.serverId)) + '" data-plan-file="' + escAttr(taskPlanFile(row)) + '" data-artifact-path="' + escAttr(row.artifactPath) + '" data-result-path="' + escAttr(row.resultPath) + '" data-log-path="' + escAttr(row.logPath) + '" data-debug-mode="' + (row.debugMode ? "true" : "false") + '"' + (checked ? " checked" : "") + '>' +
          '<div class="taskTitle"><b title="' + escAttr(row.experimentName) + '">' + esc(compactText(row.experimentName, 52)) + '</b><span class="' + statusClass(row.status) + '" title="' + escAttr("原始状态：" + row.status) + '">' + esc(taskStatusLabel(row.status)) + '</span><span class="pill" title="' + escAttr(taskTime.label + "时间：" + taskTime.raw) + '">' + esc(taskTime.label + " " + taskTime.relative) + '</span>' + taskLivePills(row) + (row.debugMode ? '<span class="pill status-warning">Debug</span>' : '') + pendingBadge + '</div>' +
          '<div class="taskActions">' + actions + '</div>' +
        '</div>' +
        renderTaskLogDetails(state, row) +
      '</div>';
    }

    // Running rows only: progress and placement are what the user scans for while a
    // plan is live. Terminal rows keep the compact head and leave detail to the tooltip.
    function taskLivePills(row) {
      if (!TASK_LIVE_STATUS_TOKENS.has(taskStatusToken(String((row || {}).status || "")))) return "";
      const progress = compactText(String((row || {}).progress || "").trim(), 18);
      const gpuIds = arrayText((row || {}).gpuIds);
      const worker = (row || {}).serverId && row.serverId !== "-" ? workerName(row.serverId) : "";
      const pills = [];
      if (progress && progress !== "-") pills.push(['进度 ' + esc(progress), "进度：" + progress]);
      if (worker) pills.push([esc(compactText(worker, 18)), "Worker：" + worker + (gpuIds && gpuIds !== "-" ? "；GPU " + gpuIds : "")]);
      if (gpuIds && gpuIds !== "-") pills.push(['GPU ' + esc(compactText(gpuIds, 12)), "GPU：" + gpuIds]);
      return pills.map((pill) => '<span class="pill taskLivePill" title="' + escAttr(pill[1]) + '">' + pill[0] + '</span>').join("");
    }

    function renderTaskTable(state, rows, selected) {
      const headers = ["选", "状态", "计划", "实验", "runKey", "Worker", "GPU", "耗时", "进度", "操作"];
      return '<table class="table"><thead><tr>' + headers.map((h) => '<th>' + esc(h) + '</th>').join("") + '</tr></thead><tbody>' +
        rows.map((row) => renderTaskMainRow(row, selected) + renderTaskLogDetails(state, row, headers.length)).join("") +
        '</tbody></table>';
    }

    function renderTaskMainRow(row, selected) {
      const key = taskTargetKey(row);
      const checked = isTaskRowSelected(row, selected);
      const actions = [
        ["停止", "stopExperiment", ["running", "testing"].includes(row.status), true],
        ["重试", "retryExperiment", taskFailureLikeStatus(row.status), true],
        ["解析", "parseResults", true, false],
        ["归档", "archiveArtifacts", taskArchivableStatus(row.status), true],
        ["删除", "deleteArtifacts", true, false, true],
        ["打开日志", "selectLogRunKey", Boolean(key), false],
        ["隐藏残留", "clearLegacyTasks", !usableTaskKey(taskActionKey(row)), false]
      ].map((item) => rowActionButton(item[0], item[1], row, item[2], item[3], item[4])).join("");
      const cells = [
        '<input class="taskSelectBox" type="checkbox" data-command="selectExperiment" data-task-ui-key="' + escAttr(row.uiKey) + '" data-run-key="' + escAttr(taskActionKey(row)) + '" data-action-key="' + escAttr(taskActionKey(row)) + '" data-experiment-id="' + escAttr(row.experimentId) + '" data-archive-key="' + escAttr(taskArchiveActionKey(row)) + '" data-worker-id="' + escAttr(resolveWorkerId(row.serverId)) + '" data-plan-file="' + escAttr(taskPlanFile(row)) + '" data-artifact-path="' + escAttr(row.artifactPath) + '" data-result-path="' + escAttr(row.resultPath) + '" data-log-path="' + escAttr(row.logPath) + '"' + (checked ? " checked" : "") + '>',
        '<span class="' + statusClass(row.status) + '" title="' + escAttr("原始状态：" + row.status) + '">' + esc(taskStatusLabel(row.status)) + '</span>',
        clippedCell(row.plan, "wide", compactPath(row.plan)),
        clippedCell(row.experimentName, "wide", compactText(row.experimentName, 36)),
        clippedCell(row.runKey, "wide", compactIdentifier(row.runKey)),
        clippedCell(row.serverId, "narrow", workerName(row.serverId)),
        clippedCell(arrayText(row.gpuIds), "narrow"),
        esc(row.duration),
        clippedCell(row.progress, "narrow"),
        '<div class="taskActions">' + actions + '</div>'
      ];
      return '<tr' + (checked ? ' class="selectedRow"' : "") + '>' + cells.map((cell) => '<td>' + cell + '</td>').join("") + '</tr>';
    }

    function renderTaskBatchActions(state, rows, selectedRows) {
      const count = selectedRows.length;
      const allLegacyRows = rows.filter((row) => !usableTaskKey(taskActionKey(row)));
      if (!count) {
        setHtmlIfChanged("taskBatchActions", allLegacyRows.length ? clearVisibleLegacyButton(allLegacyRows) : "");
        return;
      }
      const legacyCount = selectedRows.filter((row) => !usableTaskKey(taskActionKey(row))).length;
      const selectedPlanFiles = uniqueText(selectedRows.map((row) => taskPlanFile(row)).filter(Boolean));
      const retryReason = selectedPlanFiles.length === 1
        ? ""
        : selectedPlanFiles.length > 1
          ? "批量重试需要选中的任务来自同一个 plan；请按计划分批选择。"
          : "批量重试需要任务带有所属 planFile；旧任务缺少 plan 时不能安全重试。";
      setHtmlIfChanged("taskBatchActions",
        '<span class="pill">已选 ' + count + '</span>' +
        (legacyCount ? '<span class="pill status-warning">旧任务 ' + legacyCount + '</span>' : '') +
        (selectedPlanFiles.length > 1 ? '<span class="pill status-warning" title="多计划">多计划 ' + selectedPlanFiles.length + '</span>' : '') +
        actionButton("停止选中", "stopExperiment", { confirm: true, batch: true }) +
        actionButton("重试选中", "retryExperiment", { confirm: true, batch: true, disabledReason: retryReason }) +
        actionButton("解析选中", "parseResults", { batch: true }) +
        actionButton("归档选中", "archiveArtifacts", { confirm: true, batch: true }) +
        actionButton("删除选中", "deleteArtifacts", { danger: true, batch: true }) +
        (legacyCount ? actionButton("清除选中旧任务", "clearLegacyTasks", { batch: true }) : "") +
        (allLegacyRows.length > legacyCount ? clearVisibleLegacyButton(allLegacyRows) : ""));
    }

    function clearVisibleLegacyButton(rows) {
      const keys = uniqueText(rows.map((row) => row.uiKey).filter(Boolean));
      return '<button data-command="clearLegacyTasks" data-clear-legacy-visible="true" data-legacy-task-ui-keys="' + escAttr(keys.join("|")) + '" title="隐藏旧任务残留">清除全部旧任务残留</button>';
    }

    function isTaskRowSelected(row, selected) {
      const uiKeys = selected && selected.uiKeys ? selected.uiKeys : EMPTY_TASK_SELECTION_SET;
      const operationKeys = selected && selected.operationKeys ? selected.operationKeys : EMPTY_TASK_SELECTION_SET;
      return uiKeys.has(String(row.uiKey || "")) || (!uiKeys.size && taskOperationKeys(row).some((value) => operationKeys.has(value)));
    }

    function taskCardClass(status) {
      const value = taskStatusToken(status) || "unknown";
      if (value.includes("running")) return "is-running";
      if (value.includes("testing")) return "is-testing";
      if (value.includes("queue") || value.includes("pending")) return "is-queued";
      if (value.includes("complete") || value === "done") return "is-completed";
      if (["stopped", "cancelled"].includes(value)) return "is-stopped";
      if (["failed", "error", "stalled"].includes(value)) return "is-failed";
      return "is-queued";
    }

    function taskActionPending(row, command) {
      const keys = taskSelectableKeys(row);
      return Object.values(pendingActions).find((item) => {
        if (!item) return false;
        if (command && item.command !== command) return false;
        const itemKeys = [item.runKey, item.experimentId, item.archiveKey].map((value) => String(value || "")).filter((value) => value && value !== "-");
        return itemKeys.length && itemKeys.some((value) => keys.includes(value));
      });
    }

    function pendingLabel(item) {
      const command = String((item && item.command) || "");
      const labels = {
        stopExperiment: "停止中", retryExperiment: "重试中", parseResults: "解析中",
        archiveArtifacts: "归档中", syncArtifacts: "检查中", completeThreeWay: "校验中", deleteArtifacts: "删除中",
        runPlan: "运行中", dryRunPlan: "预演中", validatePlan: "校验中", checkClaimEvidence: "检查中"
      };
      return labels[command] || "执行中";
    }

    function renderTaskLogDetails(state, row, colSpan) {
      const key = taskTargetKey(row);
      if (!usableTaskKey(key)) return "";
      const log = taskLogText(state, row, key);
      if (!log && !isActiveTask(row) && !isTerminalTask(row)) return "";
      const stored = Object.prototype.hasOwnProperty.call(expandedTaskLogs, key) ? expandedTaskLogs[key] : undefined;
      const open = (stored === undefined ? shouldOpenTaskLog(row, log) : stored) ? " open" : "";
      const title = isTerminalTask(row) ? "最终日志" : "实时日志";
      const text = log || (isTerminalTask(row) ? "暂无最终日志。" : "暂无实时输出。点击“打开日志”后等待 Hub Agent /api/events 或 /api/live-output 回传。");
      const displayText = compactTaskLogText(text);
      const meta = '<div class="taskLogMeta">' +
        '<span class="pill" title="' + escAttr("原始状态：" + row.status) + '">' + esc(taskStatusLabel(row.status)) + '</span>' +
        '<span class="pill">Worker ' + esc(workerName(row.serverId)) + '</span>' +
        '<span class="pill">GPU ' + esc(arrayText(row.gpuIds)) + '</span>' +
        (displayText.length < String(text || "").length ? '<span class="pill status-warning" title="日志已截断">已截断</span>' : '') +
      '</div>';
      const tableWrap = colSpan ? '<tr class="taskLogRow"><td colspan="' + escAttr(colSpan || 10) + '">' : '<div class="taskLogRow">';
      const tableEnd = colSpan ? '</td></tr>' : '</div>';
      return tableWrap +
        '<details class="taskLogDetails" data-task-log-key="' + escAttr(key) + '"' + open + '>' +
          '<summary>' + esc(title) + '</summary>' +
          meta +
          '<pre class="taskLogPre">' + esc(displayText) + '</pre>' +
        '</details>' +
      tableEnd;
    }

    function compactTaskLogText(text) {
      const value = String(text || "");
      if (value.length <= TASK_LOG_RENDER_LIMIT) return value;
      const omitted = value.length - TASK_LOG_RENDER_LIMIT;
      return "[已省略前 " + String(omitted) + " 字符]\\n" + value.slice(-TASK_LOG_RENDER_LIMIT);
    }

    function taskLogText(state, row, key) {
      const logs = state.logs || {};
      const direct = logs[key] || logs[row.logPath] || logs[row.runKey] || logs[row.experimentId] || logs[row.archiveKey];
      const text = logPayloadText(direct);
      const liveText = firstText(text, row.liveOutput, row.logTail);
      const finalText = firstText(row.finalLog, row.finalOutput, row.consoleTail, row.stdout, row.stderr, row.logTail, row.liveOutput);
      return isTerminalTask(row) ? firstText(finalText, liveText) : firstText(liveText, finalText);
    }

    function shouldOpenTaskLog(row, text) {
      return isActiveTask(row) || isTerminalTask(row) || Boolean(text);
    }

    function isActiveTask(row) {
      return ["running", "testing"].includes(String(row.status || "").toLowerCase());
    }

    function isTerminalTask(row) {
      return taskTerminalStatus(row.status);
    }

    function logPayloadText(value) {
      if (typeof value === "string") return value;
      if (!value || typeof value !== "object") return "";
      return firstText(value.text, value.output, value.tail, value.log, value.stdout, value.stderr);
    }

    function renderTaskProgressCard(row) {
      const pct = progressWidth(progressPercent(row.progress));
      const warning = row.workerTelemetryWarning ? '<div class="status-warning">' + esc(row.workerTelemetryWarning) + '</div>' : "";
      const live = row.workerLiveStatus && row.workerLiveStatus !== "-" ? '<span class="pill" title="原始 Worker 状态：' + escAttr(row.workerLiveStatus) + '">Worker ' + esc(labelStatus(row.workerLiveStatus)) + '</span>' : "";
      return '<div class="taskProgressCard">' +
        '<div class="gpuServerHead"><b>' + esc(row.experimentName) + '</b><span class="' + statusClass(row.status) + '" title="' + escAttr("原始状态：" + row.status) + '">' + esc(taskStatusLabel(row.status)) + '</span></div>' +
        '<div class="muted">' + clippedCell(row.plan, "wide", compactPath(row.plan)) + ' · ' + esc(workerName(row.serverId)) + ' · GPU ' + esc(arrayText(row.gpuIds)) + '</div>' +
        '<div class="progress-line"><div class="progress-bar"><div class="progress-fill busy" style="width:' + pct + '%"></div></div><span>' + esc(row.progress) + '</span></div>' +
        '<div class="summaryLine"><span class="pill">' + esc(row.duration) + '</span>' + live + '<button class="mini" data-command="selectLogRunKey" data-run-key="' + escAttr(taskLogActionKey(row)) + '" data-worker-id="' + escAttr(resolveWorkerId(row.serverId)) + '">日志</button></div>' +
        warning +
      '</div>';
    }

    function renderTraceSection(state) {
      const traceModel = experimentTraceViewModelForState(state);
      const rows = traceModel.rows;
      const scope = traceModel.scope || {};
      const archivedPlans = asArray((state.planArchive || {}).plans || []);
      const selected = traceModel.selected;
      const selectedRow = traceModel.selectedRow;
      const visibleRows = traceModel.visibleRows;
      const visibleArchivedPlans = archivedPlans.slice(0, ARCHIVED_PLAN_RENDER_LIMIT);
      const omittedRows = Math.max(0, rows.length - visibleRows.length);
      const omittedPlans = Math.max(0, archivedPlans.length - visibleArchivedPlans.length);
      const traceNotice = omittedRows
        ? '<div class="taskRenderBudgetNotice" title="' + escAttr("折叠：" + omittedRows) + '">实验记录 ' + visibleRows.length + ' / ' + rows.length + '；折叠 ' + omittedRows + '</div>'
        : "";
      const archivedNotice = omittedPlans
        ? '<div class="taskRenderBudgetNotice" title="已归档计划">已显示 ' + visibleArchivedPlans.length + ' / ' + archivedPlans.length + ' 个已归档计划。</div>'
        : "";
      const scopeBar = scope.selectedPlanFile
        ? '<div class="taskScopeBar"><span class="muted">记录范围</span><div class="taskScopeSwitch" role="group" aria-label="实验记录范围">' +
            '<button type="button" data-trace-plan-scope="selected" class="' + (scope.scoped ? "is-active" : "") + '" aria-pressed="' + (scope.scoped ? "true" : "false") + '">当前 Plan ' + scope.selectedCount + '</button>' +
            '<button type="button" data-trace-plan-scope="all" class="' + (!scope.scoped ? "is-active" : "") + '" aria-pressed="' + (!scope.scoped ? "true" : "false") + '">全部记录 ' + scope.totalCount + '</button>' +
          '</div><span class="muted" title="' + escAttr(scope.selectedPlanFile) + '">' + esc(compactPath(scope.selectedPlanFile)) + (scope.unscopedCount ? '；未归属 ' + scope.unscopedCount : '') + '</span></div>'
        : '<div class="taskScopeBar"><span class="muted">未选择 Plan，显示全部实验记录。</span></div>';
      setHtmlIfChanged("traceTable", scopeBar + (rows.length ? traceNotice + '<div class="traceList">' + visibleRows.map((row) => renderTraceCard(row, selected)).join("") + '</div>' : '<div class="muted">' + (scope.scoped ? '当前 Plan 暂无实验记录；可切换“全部记录”查看历史或未归属记录。' : '暂无实验记录。') + '</div>') +
        (archivedPlans.length ? '<h3>已归档计划</h3>' + archivedNotice + '<div class="traceList">' + visibleArchivedPlans.map(renderArchivedPlanCard).join("") + '</div>' : ""));
      renderTraceDetailPane(selectedRow, rows.length);
    }

    function handleTracePlanScopeClick(button) {
      const next = button.dataset.tracePlanScope === "all" ? "all" : "selected";
      if (!setTracePlanScope(next)) return;
      renderTraceSection(lastState || {});
      renderResultSummary(lastState || {});
    }

    function traceVisibleRows(rows, selected) {
      if (!Array.isArray(rows) || rows.length <= TRACE_RENDER_LIMIT) return rows || [];
      const out = [];
      const seen = new Set();
      const selectedRows = [];
      const attentionRows = [];
      const fillerRows = [];
      function add(row) {
        if (out.length >= TRACE_RENDER_LIMIT) return;
        const key = traceRowKey(row);
        if (seen.has(key)) return;
        seen.add(key);
        out.push(row);
      }
      rows.forEach((row) => {
        if (traceRowSelected(row, selected)) selectedRows.push(row);
        else if (traceNeedsAttention(row)) { if (attentionRows.length < TRACE_RENDER_LIMIT) attentionRows.push(row); }
        else if (fillerRows.length < TRACE_RENDER_LIMIT * 2) fillerRows.push(row);
      });
      selectedRows.forEach(add);
      attentionRows.forEach(add);
      fillerRows.forEach(add);
      return out;
    }

    function traceNeedsAttention(row) {
      const text = [row.executionStatus, row.status, row.resultStatus, row.deleteStatus].map((value) => String(value || "").toLowerCase()).join(" ");
      return /fail|error|stalled|residue|missing|缺失|失败|残留/.test(text);
    }

    function traceRowKey(row) {
      return uniqueText([row.id, row.archiveKey, row.artifactPath, row.resultPath, row.updatedAt]).join("|") || "trace";
    }

    function renderArchivedPlanCard(plan) {
      var bundleDir = String(plan.archivedFile || "").split("/").slice(0, -1).join("/");
      var evidenceSource = plan.archiveEvidenceSourceMode === "hub_download" ? "Hub 只读同步" : plan.archiveEvidenceSourceMode === "local" ? "本地证据" : "";
      var resultSelectionMeta = plan.archiveResultSelectionFile ? '<span class="pill">有效结果 ' + esc(String(plan.archiveResultSelectionIncludedCount || 0)) + '</span><span class="pill">未纳入 ' + esc(String(plan.archiveResultSelectionNotIncludedCount || 0)) + '</span>' : '';
      var bundleMeta = plan.archiveBundle ? '<span class="pill">配置 ' + esc(String(plan.archiveConfigCount || 0)) + '</span><span class="pill">环境 ' + esc(String(plan.archiveEnvironmentCount || 0)) + '</span><span class="pill">参数 ' + esc(String(plan.archiveParameterCount || 0)) + '</span>' + (Number(plan.archiveParameterReviewCount || 0) > 0 ? '<span class="pill status-warning">参数待复核 ' + esc(String(plan.archiveParameterReviewCount)) + '</span>' : '') + '<span class="pill">参数源码 ' + esc(String(plan.archiveEntryScriptCount || 0)) + '</span>' + resultSelectionMeta + '<span class="pill">迁移配置 ' + esc(String(plan.archiveConfigMigratedCount || 0)) + '</span><span class="pill">迁移结果 ' + esc(String(plan.archiveResultMigratedCount || 0)) + '</span><span class="pill">证据 ' + esc(String(plan.archiveEvidenceCount || 0)) + '</span>' + (evidenceSource ? '<span class="pill">' + esc(evidenceSource) + '</span>' : '') : "";
      var restoreReason = debugModeDisableReason("restoreArchivedPlan");
      var restoreTitle = restoreReason || "恢复为独立 vN 版本，不覆盖已有 Plan 或配置";
      var restoreDisabled = restoreReason ? " disabled" : "";
      return '<div class="traceCard" data-anchor="' + escAttr(treeAnchorId("archived-plan", plan.archivedFile || plan.planFile || plan.name)) + '">' +
        '<div class="traceCardHead">' +
          '<div class="traceTitle"><span title="' + escAttr(plan.archivedFile || "") + '">' + esc(compactPath(plan.planFile || plan.file || plan.name || "-")) + '</span><span class="status-completed" title="原始状态：archived">已归档</span></div>' +
          '<div class="toolbar"><button class="mini secondary" data-command="openPlan" data-file="' + escAttr(plan.archivedFile || "") + '" title="打开归档计划">Plan</button>' + (plan.archiveBundle ? '<button class="mini" data-command="restoreArchivedPlan" data-file="' + escAttr(plan.archivedFile || "") + '" title="' + escAttr(restoreTitle) + '" aria-label="恢复新版本：' + escAttr(restoreTitle) + '"' + restoreDisabled + '>恢复新版本</button>' + (plan.archiveResultSelectionFile ? '<button class="mini secondary" data-command="openPlan" data-file="' + escAttr(plan.archiveResultSelectionFile) + '" title="打开本次归档的完整结果取舍清单">结果取舍</button>' : '') + '<button class="mini secondary" data-command="openPlan" data-file="' + escAttr(bundleDir) + '" title="打开归档包">归档包</button>' : "") + '</div>' +
        '</div>' +
        '<div class="summaryLine"><span class="pill" title="' + escAttr(plan.originalFile || "") + '">原位置 ' + esc(compactPath(plan.originalFile || "-")) + '</span><span class="pill" title="' + escAttr(plan.archivedFile || "") + '">归档 ' + esc(compactPath(plan.archivedFile || "-")) + '</span>' + bundleMeta + '</div>' +
      '</div>';
    }

    function renderTraceCard(row, selected) {
      const checked = traceRowSelected(row, selected);
      const traceTime = relativeTimestampView(row.updatedAt, "更新");
      return '<div class="traceCard ' + traceClass(row) + ' ' + (checked ? "selectedRow" : "") + '">' +
        '<div class="traceCardHead">' +
          '<div class="traceTitle"><span title="' + escAttr(row.id) + '">' + esc(compactIdentifier(row.id)) + '</span><span class="' + statusClass(row.executionStatus) + '" title="原始执行状态：' + escAttr(row.executionStatus) + '">执行 ' + esc(labelStatus(row.executionStatus)) + '</span><span class="' + statusClass(row.status) + '" title="原始归档状态：' + escAttr(row.status) + '">归档 ' + esc(labelStatus(row.status)) + '</span><span class="pill ' + statusClass(row.deleteStatus) + '" title="原始删除状态：' + escAttr(row.deleteStatus) + '">删除 ' + esc(labelStatus(row.deleteStatus)) + '</span></div>' +
          '<button class="mini" data-command="selectExperiment" data-run-key="' + escAttr(row.id) + '" data-archive-key="' + escAttr(row.archiveKey || row.id) + '" title="实验详情">详情</button>' +
        '</div>' +
        '<div class="traceMetaGrid">' +
          taskMetric("Plan", compactPath(row.planFile || "未归属")) +
          taskMetric("解析", labelStatus(row.resultStatus)) +
          taskMetric("取舍", reviewStateLabel(row.reviewState)) +
          taskMetric("标签", row.tags || "-") +
          timeMetric("更新", traceTime) +
        '</div>' +
        '<div class="summaryLine"><span class="pill" title="' + escAttr(row.artifactPath) + '">产物 ' + esc(compactPath(row.artifactPath)) + '</span><span class="pill" title="' + escAttr(row.resultPath) + '">结果 ' + esc(compactPath(row.resultPath)) + '</span></div>' +
      '</div>';
    }

    function renderTraceDetailPane(row, count) {
      const pane = el("traceDetailPane");
      if (!pane) return;
      if (!row) {
        setHtmlIfChanged(pane, '<h3>记录详情</h3><div class="muted">暂无实验记录。完成任务、解析结果或归档后会显示详情。</div>');
        return;
      }
      const headlineStage = meaningfulValue(row.executionStatus) ? "执行" : "归档";
      const headlineStatus = meaningfulValue(row.executionStatus) ? row.executionStatus : row.status;
      const detailTone = traceTone(headlineStatus) === "good" ? "good" : (traceTone(headlineStatus) === "error" ? "error" : "warn");
      const traceStatisticsSourcePath = finalStatisticsSourcePath((lastState || {}).resultsSummary || {});
      const traceTime = relativeTimestampView(row.updatedAt, "更新");
      setHtmlIfChanged(pane,
        '<div class="detailHeader" title="记录详情">' +
          '<div class="detailHeaderText"><h3>记录详情</h3><span>' + esc(compactIdentifier(row.id)) + '</span></div>' +
          '<span class="detailBadge ' + escAttr(detailTone) + '" title="' + escAttr(headlineStage + "原始状态：" + headlineStatus) + '">' + esc(headlineStage + " · " + labelStatus(headlineStatus || "-")) + '</span>' +
        '</div>' +
        '<div class="detailTabs" title="详情分区">' +
          detailTab("执行", labelStatus(row.executionStatus || "未知")) +
          detailTab("解析", labelStatus(row.resultStatus || "待解析")) +
          detailTab("取舍", reviewStateLabel(row.reviewState)) +
          detailTab("归档", labelStatus(row.status || "待筛选")) +
          detailTab("删除", labelStatus(row.deleteStatus || "未删除")) +
        '</div>' +
        '<div class="taskDetailMeta">' +
          taskDetailLine("记录数", esc(count || 0)) +
          taskDetailLine("实验", '<span title="' + escAttr(row.id) + '">' + esc(compactIdentifier(row.id)) + '</span>') +
          taskDetailLine("Plan", '<span title="' + escAttr(row.planFile || "") + '">' + esc(compactPath(row.planFile || "未归属")) + '</span>') +
          taskDetailLine("版本", esc(row.planRevision || "未记录")) +
          taskDetailLine("Worker", esc(workerName(row.workerId || "-"))) +
          taskDetailLine("执行", '<span title="原始状态：' + escAttr(row.executionStatus) + '">' + esc(labelStatus(row.executionStatus)) + '</span>') +
          taskDetailLine("归档", '<span class="' + statusClass(row.status) + '" title="原始状态：' + escAttr(row.status) + '">' + esc(labelStatus(row.status)) + '</span>') +
          taskDetailLine("结果取舍", '<span title="' + escAttr(row.reviewReason || "") + '">' + esc(reviewStateLabel(row.reviewState)) + '</span>') +
          taskDetailLine("删除", '<span title="原始状态：' + escAttr(row.deleteStatus) + '">' + esc(labelStatus(row.deleteStatus)) + '</span>') +
          taskDetailLine("解析", '<span title="原始状态：' + escAttr(row.resultStatus) + '">' + esc(labelStatus(row.resultStatus)) + '</span>') +
          taskDetailLine("标签", esc(row.tags || "-")) +
          taskDetailLine("更新", '<span title="' + escAttr("更新时间：" + traceTime.raw) + '">' + esc(traceTime.relative) + '</span>') +
        '</div>' +
        '<div class="taskActions">' +
          traceActionButton("解析", "parseResults", row) +
          traceActionButton("反推配置", "inferConfigFromRun", row) +
          traceActionButton("恢复 Plan", "recoverPlanFromRun", row) +
          traceActionButton("异常诊断", "diagnoseResultAnomaly", row) +
          traceActionButton("对比最优配置", "compareWithBestConfig", row) +
          traceActionButton("检查同步清单", "syncArtifacts", row, true) +
          traceActionButton("三方校验", "completeThreeWay", row, true) +
          traceActionButton("归档", "archiveArtifacts", row, true) +
          traceActionButton("排除但保留预览", "excludeResults", row, true) +
          traceActionButton("删除", "deleteArtifacts", row, true, true) +
        '</div>' +
        renderTraceReadiness(row) +
        renderTraceTimeline(row) +
        '<div><b>产物路径</b><pre class="tracePath" title="' + escAttr(row.artifactPath) + '">' + esc(row.artifactPath || "-") + '</pre></div>' +
        '<div><b>结果路径</b>' + (row.resultPath ? '<span class="pptPlotInline">' + pptPlotButton("聚合绘图", traceStatisticsSourcePath, "SCI 聚合统计", { runKey: row.id || "", experimentId: row.id || "", archiveKey: row.archiveKey || "", planFile: row.planFile || "" }) + '</span>' : "") + '<pre class="tracePath" title="' + escAttr(row.resultPath) + '">' + esc(row.resultPath || "-") + '</pre></div>');
    }

    function traceActionButton(label, command, row, confirmFlag, dangerFlag) {
      const runKey = usableTaskKey(row.id) ? row.id : "";
      const archiveKey = usableTaskKey(row.archiveKey) ? row.archiveKey : runKey;
      const confirmationPath = firstPathLike(row.resultPath, row.artifactPath);
      const planFile = meaningfulValue(row.planFile);
      const context = { runKey, archiveKey, workerId: row.workerId, planFile, planRevision: row.planRevision, updatedAt: row.updatedAt, reviewState: row.reviewState };
      const reason = traceActionDisableReason(lastState, command, context);
      const pendingKey = pendingKeyForAction(command, { runKey, archiveKey, workerId: row.workerId, planFile, confirmationPath });
      const pending = pendingButtonKeys.has(pendingKey);
      const titleText = reason || (pending ? "执行中" : commandHelp(command));
      return '<button class="taskActionButton" data-command="' + escAttr(command) + '" data-pending-key="' + escAttr(pendingKey) + '" data-run-key="' + escAttr(runKey) + '" data-archive-key="' + escAttr(archiveKey) + '" data-plan-file="' + escAttr(planFile) + '" data-plan-revision="' + escAttr(row.planRevision || "") + '" data-worker-id="' + escAttr(row.workerId || "") + '" data-confirmation-path="' + escAttr(confirmationPath) + '" data-artifact-path="' + escAttr(row.artifactPath) + '" data-result-path="' + escAttr(row.resultPath) + '"' + (confirmFlag ? ' data-confirm="true"' : "") + (dangerFlag ? ' data-danger="true"' : "") + ((reason || pending) ? " disabled" : "") + (titleText ? ' title="' + escAttr(titleText) + '" aria-label="' + escAttr(label + "：" + titleText) + '"' : "") + '>' + loadingPrefix(pending) + esc(label) + '</button>';
    }

    function reviewStateLabel(value) {
      const key = String(value || "").toLowerCase();
      if (key === "archived") return "已归档，有效";
      if (key === "excluded") return "已排除，保留预览";
      return "待筛选";
    }

    function traceActionDisableReason(state, command, context) {
      if (!usableTaskKey(context.runKey) && !usableTaskKey(context.archiveKey)) return "旧记录缺少可操作标识";
      if (!meaningfulValue(context.planFile)) return "旧记录缺少所属 Plan；可查看记录，但不能安全执行结果、归档或删除操作。";
      const plan = planFromContext(state || {}, { planFile: context.planFile });
      if (!plan) return "所属 Plan 不在当前活动列表；可查看记录，但不能安全执行操作。";
      if (!traceMatchesPlanVersion(context, String(plan.revision || ""), Date.parse(String(plan.updatedAt || "")))) return "记录属于旧 Plan 版本；可查看历史，但不能作为当前版本结果执行操作。";
      const reason = disableReason(state, command, context);
      if (reason) return reason;
      if (["archiveArtifacts", "deleteArtifacts"].includes(command) && (!context.workerId || context.workerId === "-")) {
        return "缺少 Worker 标识，只能处理 Hub 索引；请优先在任务区选择带 Worker 的任务。";
      }
      return "";
    }

    function renderTraceReadiness(row) {
      const hasArchiveKey = usableTaskKey(row.archiveKey || row.id);
      const hasWorker = usableTaskKey(row.workerId);
      const hasArtifact = meaningfulValue(row.artifactPath);
      const hasResult = meaningfulValue(row.resultPath);
      const items = [
        ["归档标识", hasArchiveKey ? "已定位" : "缺失", hasArchiveKey, row.archiveKey || row.id || "-"],
        ["Worker 直达", hasWorker ? workerName(row.workerId) : "缺失", hasWorker, row.workerId || "-"],
        ["产物路径", hasArtifact ? "已发现" : "缺失", hasArtifact, row.artifactPath || "-"],
        ["结果路径", hasResult ? "已发现" : "缺失", hasResult, row.resultPath || "-"]
      ];
      return '<div class="traceReadinessGrid" title="记录检查">' + items.map((item) => {
        const ok = Boolean(item[2]);
        const tone = ok ? "good" : (String(item[1]).includes("缺失") ? "error" : "warn");
        return '<div class="traceReadinessItem ' + tone + '" title="' + escAttr(item[0] + "：" + item[3]) + '"><span>' + esc(item[0]) + '</span><b>' + esc(item[1]) + '</b></div>';
      }).join("") + '</div>';
    }

    function renderTraceTimeline(row) {
      const rawExecutionStatus = row.executionStatus || "未知";
      const rawResultStatus = row.resultStatus || "待解析";
      const rawArchiveStatus = row.status || "待归档";
      const rawDeleteStatus = row.deleteStatus || "未删除";
      const events = [
        ["执行", labelStatus(rawExecutionStatus), traceTone(row.executionStatus), rawExecutionStatus],
        ["解析", labelStatus(rawResultStatus), traceTone(row.resultStatus), rawResultStatus],
        ["取舍", reviewStateLabel(row.reviewState), traceTone(row.reviewState), row.reviewState || "pending_review"],
        ["归档", labelStatus(rawArchiveStatus), traceTone(row.status), rawArchiveStatus],
        ["删除", labelStatus(rawDeleteStatus), traceTone(row.deleteStatus), rawDeleteStatus],
        ["更新", relativeTimeLabel(row.updatedAt, Date.now()), row.updatedAt && row.updatedAt !== "-" ? "good" : "warn", row.updatedAt || "-"]
      ];
      return '<div class="traceTimeline" title="记录事件">' +
        events.map((event) => traceTimelineItem(event[0], event[1], event[2], event[3])).join("") +
      '</div>';
    }

    function traceTimelineItem(title, status, tone, rawStatus) {
      const cls = tone === "good" ? "good" : (tone === "error" ? "error" : (tone === "warn" ? "warn" : ""));
      const detail = rawStatus ? (title === "更新" ? "原始时间：" : title + "原始状态：") + rawStatus : title + "：" + (status || "-");
      return '<div class="traceTimelineItem ' + cls + '" title="' + escAttr(detail) + '"><b>' + esc(title) + ' · ' + esc(status || "-") + '</b></div>';
    }

    function traceTone(value) {
      const text = String(value || "").toLowerCase();
      if (text.includes("complete") || text.includes("archiv") || text.includes("parsed") || text.includes("success") || text.includes("已")) return "good";
      if (text.includes("fail") || text.includes("error") || text.includes("residue") || text.includes("stalled")) return "error";
      if (!text || text === "-" || text.includes("待") || text.includes("missing")) return "warn";
      return "info";
    }

    function traceSelectionSet(selection) {
      return new Set([...(selection.selectedRunKeys || []), ...(selection.selectedArchiveKeys || []), selection.selectedRunKey].filter(Boolean).map(String));
    }

    function traceRowSelected(row, selected) {
      return [row.id, row.archiveKey].some((value) => selected.has(String(value || "")));
    }

    function renderOperationSection(state) {
      const view = operationViewModelForState(state);
      setHtmlIfChanged("operationList", view.rows.length
        ? renderOperationStatusSummary(view.statusCounts) + renderOperationHiddenSummary(view.hiddenCount) + (view.visibleRows.length
          ? '<div class="operationTimeline">' + view.visibleRows.map(renderOperationItem).join("") + '</div>'
          : '<div class="empty-state">当前筛选下没有操作记录。</div>')
        : '<div class="empty-state">尚无操作记录。</div>');
    }

    function operationViewModelForState(state) {
      const rows = operationRowsForState(state || {});
      if (rows === operationViewCacheRows && operationStatusFilter === operationViewCacheFilter && operationViewCacheValue) return operationViewCacheValue;
      const filteredRows = rows.filter((row) => operationMatchesStatusFilter(row, operationStatusFilter));
      const visibleRows = operationRowsForRender(filteredRows);
      operationViewCacheRows = rows;
      operationViewCacheFilter = operationStatusFilter;
      operationViewCacheValue = {
        rows,
        visibleRows,
        hiddenCount: Math.max(0, filteredRows.length - visibleRows.length),
        statusCounts: operationStatusCounts(rows)
      };
      return operationViewCacheValue;
    }

    function operationMatchesStatusFilter(row, filter) {
      if (!filter || filter === "all") return true;
      const status = String((row || {}).status || "").toLowerCase();
      if (filter === "accepted") return status === "accepted" || status === "submitted";
      if (filter === "running") return operationIsActive(status) && status !== "accepted" && status !== "submitted";
      if (filter === "failed") return operationIsFailureLike(status);
      if (filter === "cancelled") return operationIsCancelled(status);
      if (filter === "completed") return operationIsCompleted(status);
      return true;
    }

    function normalizeOperationStatusFilter(value) {
      const filter = String(value || "all");
      return OPERATION_STATUS_FILTER_VALUES.includes(filter) ? filter : "all";
    }

    function normalizePlanViewScope(value) {
      const scope = String(value || "selected");
      return PLAN_VIEW_SCOPE_VALUES.includes(scope) ? scope : "selected";
    }

    function normalizeRunMode(value) {
      return String(value || "formal") === "debug" ? "debug" : "formal";
    }

    function setRunMode(value) {
      const next = normalizeRunMode(value);
      if (next === runMode) return false;
      runMode = next;
      persistWebviewState({ runMode });
      return true;
    }

    function setTaskPlanScope(value) {
      const next = normalizePlanViewScope(value);
      if (next === taskPlanScope) return false;
      taskPlanScope = next;
      persistWebviewState({ taskPlanScope });
      return true;
    }

    function setTracePlanScope(value) {
      const next = normalizePlanViewScope(value);
      if (next === tracePlanScope) return false;
      tracePlanScope = next;
      persistWebviewState({ tracePlanScope });
      return true;
    }

    function persistWebviewState(patch) {
      if (typeof vscode.setState !== "function") return;
      const current = typeof vscode.getState === "function" ? (vscode.getState() || {}) : {};
      vscode.setState(Object.assign({}, current, patch || {}));
    }

    function operationRowsForRender(rows) {
      if (!Array.isArray(rows) || rows.length <= OPERATION_RENDER_LIMIT) return rows || [];
      const out = [];
      const seen = new Set();
      const add = (row) => {
        const key = String(row.operationId || row.id || row.type || row.updatedAt || out.length);
        if (seen.has(key) || out.length >= OPERATION_RENDER_LIMIT) return;
        seen.add(key);
        out.push(row);
      };
      rows.filter((row) => operationIsActive(row.status)).forEach(add);
      rows.filter((row) => operationIsFailureLike(row.status)).forEach(add);
      rows.forEach(add);
      return out.slice(0, OPERATION_RENDER_LIMIT);
    }

    function renderOperationHiddenSummary(hiddenCount) {
      return hiddenCount > 0
        ? '<div class="operationHiddenSummary" title="' + escAttr("隐藏：" + hiddenCount) + '">已隐藏较早终态操作 ' + esc(hiddenCount) + ' 条</div>'
        : "";
    }

    function renderOperationStatusSummary(rowsOrStats) {
      const stats = rowsOrStats && rowsOrStats.accepted !== undefined ? rowsOrStats : operationStatusCounts(rowsOrStats);
      return '<div class="operationStatusSummary" title="操作进度">' +
        operationStatusCard("全部", stats.total, "all") +
        operationStatusCard("已提交", stats.accepted, "accepted") +
        operationStatusCard("执行中", stats.running, "running") +
        operationStatusCard("已完成", stats.completed, "completed") +
        operationStatusCard("已取消", stats.cancelled, "cancelled") +
        operationStatusCard("异常", stats.failed, "failed") +
      '</div>';
    }

    function operationStatusCard(label, value, klass) {
      const active = operationStatusFilter === klass;
      return '<button type="button" class="operationStatusCard ' + escAttr(klass) + (active ? ' is-active' : '') + '" data-operation-filter="' + escAttr(klass) + '" aria-pressed="' + (active ? "true" : "false") + '" title="' + escAttr("筛选" + label + "操作：" + (value || 0)) + '"' + (!active && !value ? " disabled" : "") + '><span>' + esc(label) + '</span><b>' + esc(value || 0) + '</b></button>';
    }

    function operationStatusCounts(rows) {
      const out = { total: rows.length, accepted: 0, running: 0, completed: 0, cancelled: 0, failed: 0 };
      rows.forEach((row) => {
        const status = String(row.status || "").toLowerCase();
        if (status === "accepted" || status === "submitted") out.accepted += 1;
        else if (operationIsActive(status)) out.running += 1;
        else if (operationIsFailureLike(status)) out.failed += 1;
        else if (operationIsCancelled(status)) out.cancelled += 1;
        else if (operationIsCompleted(status)) out.completed += 1;
      });
      return out;
    }

    function renderOperationItem(row) {
      const status = String(row.status || "-").toLowerCase();
      const cls = operationIsActive(status) ? "is-running" : (operationIsFailureLike(status) ? "is-failed" : (operationIsCancelled(status) ? "is-cancelled" : (operationIsCompleted(status) ? "is-completed" : "")));
      const message = operationDisplayMessage(row);
      const errorLine = operationErrorLine(row, message);
      const details = renderOperationDetailPills(row);
      const fileActions = renderRemoteResultInspectionActions(row.unparseableFileList, row.planFile, 3, row.unparseableDetails);
      const rawType = row.type || row.action || "operation";
      const itemTitle = operationTypeLabel(rawType) + "（原始：" + rawType + "）：" + operationStatusLabel(row.status);
      const timestamp = operationTimestampView(row);
      return '<div class="operationItem ' + cls + '" data-anchor="' + escAttr(treeAnchorId("operation", row.operationId || row.id || row.type || row.updatedAt)) + '" title="' + escAttr(itemTitle) + '">' +
        '<span class="operationDot" aria-hidden="true"></span>' +
        '<div class="operationBody">' +
          '<div class="operationHead">' +
            '<div class="operationTitle"><span title="' + escAttr("原始操作：" + rawType) + '">' + esc(operationTypeLabel(rawType)) + '</span><span class="' + statusClass(row.status) + '" title="' + escAttr("原始状态：" + (row.status || "-")) + '">' + loadingPrefix(operationIsActive(row.status)) + esc(operationStatusLabel(row.status)) + '</span></div>' +
            '<span class="operationId" title="' + escAttr(row.operationId) + '">' + esc(compactIdentifier(row.operationId)) + '</span>' +
          '</div>' +
          '<div class="operationMessage">' + esc(message) + '</div>' +
          errorLine +
          details +
          fileActions +
          '<div class="operationMeta">' + (meaningfulValue(row.progress) ? '<span class="pill">进度 ' + esc(row.progress) + '</span>' : '') + '<span class="pill" title="' + escAttr(timestamp.label + "时间：" + timestamp.raw) + '">' + esc(timestamp.label + " " + timestamp.relative) + '</span>' + (!errorLine && row.error && row.error !== "-" ? '<span class="pill status-failed" title="' + escAttr(row.error) + '">错误</span>' : '') + '</div>' +
        '</div>' +
      '</div>';
    }

    // A failed operation's error was reachable only by hovering a two-character pill while the
    // less actionable message occupied the visible line; promote it whenever it adds information.
    function operationErrorLine(row, message) {
      const error = String((row || {}).error || "").trim();
      if (!error || error === "-") return "";
      const shown = String(message || "").trim();
      if (shown && (shown === error || shown.includes(error))) return "";
      return '<div class="operationError" title="' + escAttr(error) + '"><b>错误</b><span>' + esc(compactText(error, 220)) + '</span></div>';
    }

    function operationTimestampView(row) {
      const terminal = operationIsFailureLike(row.status) || operationIsCancelled(row.status) || operationIsCompleted(row.status);
      const terminalAt = meaningfulValue(row.terminalAt) ? row.terminalAt : row.updatedAt;
      return relativeTimestampView(terminal ? terminalAt : row.updatedAt, terminal ? "终态" : "更新");
    }

    function taskTimestampView(row) {
      return relativeTimestampView(row.updatedAt, taskTerminalStatus(row.status) ? "终态" : "更新");
    }

    function relativeTimestampView(value, label) {
      const raw = String(value || "-");
      return { label: label || "更新", raw, relative: relativeTimeLabel(raw, Date.now()) };
    }

    function relativeTimeLabel(value, nowMs) {
      const at = Date.parse(String(value || ""));
      if (!Number.isFinite(at)) return "时间未知";
      const deltaMs = Math.max(0, Number(nowMs || Date.now()) - at);
      if (deltaMs < 45000) return "刚刚";
      const minutes = Math.floor(deltaMs / 60000);
      if (minutes < 60) return String(minutes) + " 分钟前";
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return String(hours) + " 小时前";
      return String(Math.floor(hours / 24)) + " 天前";
    }

    function renderOperationDetailPills(row) {
      const items = [
        ["任务", row.jobCount, "", ""],
        ["模式", meaningfulValue(row.executionMode) ? planModeLabel(row.executionMode) : "", "", ""],
        ["可调度", row.dispatchableCount, "", ""],
        ["排队", row.queuedCount, "", hasWarningValue(row.queuedCount) ? "warn" : ""],
        ["运行器警告", row.runnerWarningCount, "", hasWarningValue(row.runnerWarningCount) ? "warn" : ""],
        ["调度阻塞", row.blockedReasonCount, "", hasWarningValue(row.blockedReasonCount) ? "warn" : ""],
        ["预演文件", row.previewPath, "", ""],
        ["目标", row.targetCount, "", ""],
        ["文件", row.fileCount, "", ""],
        ["成功删除", row.deletedCount, "", ""],
        ["跳过", row.skippedCount, "", hasWarningValue(row.skippedCount) ? "warn" : ""],
        ["残留", row.residueCount, "", hasWarningValue(row.residueCount) ? "error" : ""],
        ["缺失", row.missingCount, "", hasWarningValue(row.missingCount) ? "warn" : ""],
        ["契约缺失", row.missingFiles, "", hasWarningValue(row.missingFiles) ? "error" : ""],
        ["不可解析", row.unparseableFiles, "", hasWarningValue(row.unparseableFiles) ? "error" : ""],
        ["可解析结果", row.parseableResultCount, "", ""],
        ["契约报告", row.contractReportPath, "", ""],
        ["未归档", row.unarchivedCount, "", hasWarningValue(row.unarchivedCount) ? "warn" : ""],
        ["Worker", row.workerId, "", ""],
        ["产物", row.manifestPath, "", ""]
      ].filter((item) => meaningfulValue(item[1]));
      return items.length
        ? '<div class="operationDetails" title="操作明细">' + items.map((item) => operationDetailPill(item[0], item[1], item[2], item[3])).join("") + '</div>'
        : "";
    }

    function operationDetailPill(label, value, title, tone) {
      return '<span class="operationDetailPill ' + escAttr(tone || "") + '" title="' + escAttr(label + "：" + (value || "-")) + '">' + esc(label) + '<b>' + esc(compactText(value, 36)) + '</b></span>';
    }

    function renderRemoteResultInspectionActions(files, planFile, limit, details) {
      const rows = uniqueText(asArray(files).map((file) => String(file || "").trim()).filter((file) => /\.(csv|json|txt|log|out)$/i.test(file)));
      if (!rows.length || !meaningfulValue(planFile)) return "";
      const detailMap = new Map(asArray(details).map((item) => [String((item || {}).path || "").trim(), String((item || {}).error || "").trim()]));
      const visible = rows.slice(0, Math.max(1, Number(limit || 3)));
      const entries = visible.map((file) => {
        const name = file.replace(/\\\\/g, "/").split("/").pop() || "结果文件";
        const error = detailMap.get(file) || "未返回具体解析原因；可下载原文件检查内容。";
        return '<div class="operationFileEntry"><div class="operationFileReason" title="' + escAttr(file + "：" + error) + '"><b>' + esc(compactText(name, 44)) + '</b><span>' + esc(compactText(error, 120)) + '</span></div><button class="mini secondary" data-command="downloadRemoteResult" data-remote-path="' + escAttr(file) + '" data-plan-file="' + escAttr(planFile) + '" title="' + escAttr("下载只读副本并打开：" + file) + '">查看文件</button></div>';
      }).join("");
      const omitted = rows.length - visible.length;
      return '<div class="operationFileActions"><span>不可解析的远端原文件</span>' + entries + (omitted ? '<span>其余 ' + esc(String(omitted)) + ' 个见操作详情</span>' : "") + '</div>';
    }

    function operationDisplayMessage(row) {
      const message = row.message || (row.status === "accepted" ? "等待 Hub Agent 回传进度" : "");
      if (message) return message;
      if (operationIsActive(row.status)) return "已提交，等待 Hub Agent 回传进度；可手动刷新数据。";
      if (operationIsFailureLike(row.status)) return row.error && row.error !== "-" ? row.error : "操作未成功，请查看错误详情。";
      if (operationIsCancelled(row.status)) return "操作已取消或停止。";
      if (operationIsCompleted(row.status)) return "操作已完成。";
      return "暂无状态说明。";
    }

    function operationStatusLabel(status) {
      const text = String(status || "").toLowerCase();
      if (text === "accepted" || text === "submitted") return "已提交";
      if (text.includes("running") || text.includes("progress") || text.includes("started") || text.includes("in_progress")) return "执行中";
      if (text.includes("queue") || text.includes("pending")) return "排队";
      if (text.includes("completed_with_errors")) return "部分失败";
      if (text.includes("cancel")) return "已取消";
      if (text.includes("stop")) return "已停止";
      if (text.includes("stalled")) return "已超时";
      if (text.includes("unsupported")) return "不支持";
      if (text.includes("fail") || text.includes("error")) return "失败";
      if (text.includes("complete") || text === "done") return "已完成";
      return status || "-";
    }

    function operationTypeLabel(type) {
      const raw = String(type || "").trim();
      if (!raw || raw === "-") return raw || "操作";
      const key = raw.replace(/([a-z])([A-Z])/g, "$1-$2").replace(/_/g, "-").replace(/\s+/g, "-").toLowerCase();
      const labels = {
        "validate-plan": "校验计划", "dry-run-plan": "预演计划", "run-plan": "运行计划", "reproduce-plan": "复现实验", "run-all-plans": "运行全部计划",
        "parse-results": "解析结果", "refresh-results": "刷新结果", "check-output-contract": "检查输出契约", "archive-plan": "归档计划", "restore-archived-plan": "恢复归档 Plan",
        "archive-artifacts": "归档实验产物", "delete-artifacts": "删除实验产物", "sync-artifacts": "检查同步清单", "complete-three-way": "三方一致校验",
        "run-quality-gate": "质量门禁", "run-statistics": "统计分析", "check-claim-evidence": "检查论文证据", "export-paper-table": "导出论文表格", "export-plotting-contract": "导出 PPT 绘图契约", "plot-results-to-ppt": "绘图到 PPT",
        "parse-case-level": "样本级解析", "run-leakage-check": "泄漏检查", "run-subgroup-analysis": "子组分析", "export-case-analysis": "导出样本级报告", "inspect-dataset": "检查数据集",
        "plan-checkpoint-retention": "检查点清理预案", "infer-config-from-run": "反推配置", "recover-plan-from-run": "恢复 Plan", "diagnose-result-anomaly": "异常诊断", "compare-with-best-config": "对比最优配置",
        "publish-github": "发布 GitHub", "sync-github": "同步 GitHub", "overwrite-github": "覆盖 GitHub", "upload-project-to-hub": "上传到 Hub", "upload-project-to-workers": "上传到 Worker", "distribute-code-to-workers": "分发 Worker 代码", "deploy-latest-agent": "部署 Agent",
        "configure-sftp-ignores": "配置 SFTP 忽略", "prepare-agents": "准备 Agent", "test-all": "检测全部连接", "start-all-connections": "启动全部连接", "start-all": "启动全部隧道", "self-check": "运行自检", "create-debug-bundle": "生成调试包"
      };
      return labels[key] || raw;
    }

    function renderResultSummary(state) {
      const summary = state.resultsSummary || {};
      renderPptPlotConfig(state);
      setHtmlIfChanged("resultSummary", renderWorkerResultAggregateWarning(summary) + renderResultEvidenceWorkbench(state, summary) + [
        row("最近解析", pick(summary, ["lastParsedAt", "last_parsed_at"], "-")),
        row("解析失败数量", pick(summary, ["parseFailed", "parse_failed"], "-")),
        row("质量警告", pick(summary, ["qualityWarnings", "quality_warnings"], "-")),
        row("完整预览 CSV", pick(summary, ["previewCsvPath", "preview_csv_path"], "-")),
        row("有效结果 CSV", pick(summary, ["effectiveResultsCsvPath", "effective_results_csv_path"], "-")),
        row("统计更新时间", pick(summary, ["statisticsUpdatedAt", "statistics_updated_at"], "-")),
        row("论文表格路径", pick(summary, ["paperTablePath", "paper_table_path", "exportPath"], "-"))
      ].join(""));
    }

    function renderWorkerResultAggregateWarning(summary) {
      if (!(summary || {}).incompleteAggregate) return "";
      const expected = asArray(summary.expectedWorkerIds);
      const available = asArray(summary.availableWorkerIds);
      const unavailable = asArray(summary.unavailableWorkerIds);
      const coverage = String(summary.aggregateCoverage || (available.length + "/" + expected.length));
      const missing = unavailable.length ? unavailable.join("、") : "未知 Worker";
      return '<div class="notice warning" title="缺少 Worker：' + escAttr(missing) + '"><b>结果摘要不完整</b> 已读取 ' + esc(coverage) + '；缺少 ' + esc(missing) + '。当前数字仅代表可用 Worker 的只读部分视图。</div>';
    }

    function renderPptPlotConfig(state) {
      if (shouldKeepConfigDraftScope("ppt")) {
        refreshPptPlotConfigDebugState(state);
        return;
      }
      const config = state.pptPlotConfig || {};
      const automation = pptAutomationReadinessForState(state);
      const resultSummary = (state || {}).resultsSummary || {};
      const statisticsSourcePath = finalStatisticsSourcePath(resultSummary);
      const pathValue = String(configDraftValue("ppt", "presentationPath", config.presentationPath || ""));
      const chartType = String(configDraftValue("ppt", "chartType", config.chartType || "auto") || "auto");
      const styleMode = String(configDraftValue("ppt", "styleMode", config.styleMode || "activePpt") || "activePpt");
      const automationAction = !automation.ready && automation.actionCommand
        ? '<button data-command="' + escAttr(automation.actionCommand) + '" class="secondary" title="' + escAttr(automation.message) + '">' + esc(automation.actionLabel) + '</button>'
        : "";
      const plotDisabled = !statisticsSourcePath || !automation.ready;
      const debugReason = debugModeDisableReason("plotResultsToPpt");
      const plotActionDisabled = Boolean(debugReason || plotDisabled);
      const plotTitle = debugReason || (!statisticsSourcePath ? "请先归档结果并运行统计" : automation.ready ? statisticsSourcePath : automation.message);
      setHtmlIfChanged("pptPlotConfig",
        '<div class="pptPlotConfig" title="PPT 绘图">' +
          '<div class="gpuServerHead"><b>绘图到 PPT</b><span class="' + (automation.ready ? "good" : "muted") + '" title="' + escAttr(automation.message) + '">' + esc(automation.label) + '</span></div>' +
          '<div class="pptPlotConfigGrid">' +
            '<label class="field"><span>PPT 路径</span><div class="pptPathInputRow"><input class="wide" data-config-input="ppt" data-key="presentationPath" value="' + escAttr(pathValue) + '" placeholder="留空表示新建 PPT" title="' + escAttr("PPT：" + (pathValue || "新建")) + '"><button data-command="choosePptPath" class="secondary" title="选择 PPT">浏览</button><button data-command="chooseNewPptPath" class="secondary" title="新建 PPT">新建路径</button></div></label>' +
            '<label class="field"><span>图类型</span><select data-config-input="ppt" data-key="chartType" title="' + escAttr("图类型：" + chartTypeLabel(chartType) + "；原始值：" + chartType) + '">' +
              optionHtml("auto", "自动", chartType === "auto") +
              optionHtml("leaderboardBar", "柱状", chartType === "leaderboardBar") +
              optionHtml("meanStdErrorBar", "误差图", chartType === "meanStdErrorBar") +
              optionHtml("genericTable", "表格", chartType === "genericTable") +
            '</select></label>' +
            '<label class="field"><span>样式</span><select data-config-input="ppt" data-key="styleMode" title="' + escAttr("样式：" + styleModeLabel(styleMode) + "；原始值：" + styleMode) + '">' +
              optionHtml("activePpt", "跟随当前 PPT", styleMode === "activePpt") +
              optionHtml("default", "默认样式", styleMode === "default") +
            '</select></label>' +
          '</div>' +
          '<div class="pptPlotActions">' +
            '<button data-command="savePptPlotConfig" data-config-scope="ppt" class="secondary" title="保存绘图配置">保存绘图配置</button>' +
            automationAction +
            '<button data-command="plotResultsToPpt" data-source-path="' + escAttr(statisticsSourcePath) + '" data-source-label="SCI 聚合统计"' + (plotActionDisabled ? " disabled" : "") + ' title="' + escAttr(plotTitle) + '" aria-label="绘图到 PPT：' + escAttr(plotTitle) + '">绘图到 PPT</button>' +
          '</div>' +
        '</div>');
    }

    function refreshPptPlotConfigDebugState(state) {
      const root = el("pptPlotConfig");
      const button = root && root.querySelector ? root.querySelector('button[data-command="plotResultsToPpt"]') : null;
      if (!button) return;
      const automation = pptAutomationReadinessForState(state || {});
      const statisticsSourcePath = finalStatisticsSourcePath((state || {}).resultsSummary || {});
      const debugReason = debugModeDisableReason("plotResultsToPpt");
      const prerequisiteReason = !statisticsSourcePath ? "请先归档结果并运行统计" : automation.ready ? statisticsSourcePath : automation.message;
      const title = debugReason || prerequisiteReason;
      button.disabled = Boolean(debugReason || !statisticsSourcePath || !automation.ready);
      setNativeTitle(button, title);
      button.setAttribute("aria-label", "绘图到 PPT：" + title);
    }

    function pptAutomationReadinessForState(state) {
      const item = (state || {}).pptAutomation || {};
      const status = String(item.state || "unknown");
      const labels = {
        unknown: "PPT 插件待检测",
        not_running: "PPT 插件未启动",
        busy: "PPT 插件忙碌",
        token_missing: "PPT 令牌缺失",
        token_invalid: "PPT 令牌失效",
        incompatible: "PPT 版本不兼容",
        unavailable: "PPT 插件不可用",
        ready: "PPT 插件已就绪"
      };
      return {
        state: status,
        ready: item.ready === true && status === "ready",
        label: labels[status] || labels.unknown,
        message: String(item.message || "尚未检测 PPT automation。"),
        actionCommand: PPT_AUTOMATION_ACTION_COMMANDS.has(String(item.actionCommand || "")) ? String(item.actionCommand) : "",
        actionLabel: String(item.actionLabel || "")
      };
    }

    function chartTypeLabel(value) {
      const labels = { auto: "自动", leaderboardBar: "柱状", meanStdErrorBar: "误差图", genericTable: "表格" };
      return labels[String(value || "")] || String(value || "未知");
    }

    function styleModeLabel(value) {
      const labels = { activePpt: "跟随当前 PPT", default: "默认样式" };
      return labels[String(value || "")] || String(value || "未知");
    }

    function currentPlanRevisionRunEvidenceForState(state, planFile, plan) {
      const data = state || {};
      const selectedPlan = meaningfulValue(planFile);
      const item = plan || planFromContext(data, { planFile: selectedPlan }) || {};
      if (!selectedPlan || !Object.keys(item).length) return false;
      if (currentPlanRevisionRunEvidenceCacheState !== data) {
        currentPlanRevisionRunEvidenceCacheState = data;
        currentPlanRevisionRunEvidenceCache = new Map();
      }
      const planRevision = String(item.revision || "");
      const planUpdatedAtText = String(item.updatedAt || "");
      const planUpdatedAt = Date.parse(planUpdatedAtText);
      const cacheKey = [normalizePlanSelectionKey(selectedPlan), planRevision, planUpdatedAtText].join("|");
      if (currentPlanRevisionRunEvidenceCache.has(cacheKey)) return currentPlanRevisionRunEvidenceCache.get(cacheKey);
      const operationMatch = operationRowsForState(data).some((row) =>
        ["run-plan", "reproduce-plan"].includes(String((row || {}).type || "").toLowerCase())
        && samePlanSelection((row || {}).planFile || "", selectedPlan)
        && Boolean((row || {}).submissionAccepted || (row || {}).schedulerStarted)
        && operationMatchesPlanVersion(row, planRevision, planUpdatedAt));
      if (operationMatch) return cacheCurrentPlanRevisionRunEvidence(cacheKey, true);
      const value = schedulerRowsForState(data).some((row) =>
        samePlanSelection((row || {}).planFile || (row || {}).plan || "", selectedPlan)
        && taskMatchesPlanVersion(row, planRevision, planUpdatedAt));
      return cacheCurrentPlanRevisionRunEvidence(cacheKey, value);
    }

    function cacheCurrentPlanRevisionRunEvidence(cacheKey, value) {
      if (currentPlanRevisionRunEvidenceCache.size >= CURRENT_PLAN_RUN_EVIDENCE_CACHE_LIMIT) currentPlanRevisionRunEvidenceCache.clear();
      currentPlanRevisionRunEvidenceCache.set(cacheKey, value);
      return value;
    }

    function resultAutoParseReadinessForState(state, summary) {
      const data = state || {};
      const item = summary || {};
      if (resultAutoParseReadinessCacheState === data && resultAutoParseReadinessCacheSummary === item && resultAutoParseReadinessCacheValue) {
        return resultAutoParseReadinessCacheValue;
      }
      const ready = (value) => {
        resultAutoParseReadinessCacheState = data;
        resultAutoParseReadinessCacheSummary = item;
        resultAutoParseReadinessCacheValue = value;
        return value;
      };
      const planFile = meaningfulValue(data.planFileInput || (data.selection || {}).selectedPlanId || pick(item, ["planFile", "plan_file"], ""));
      if (!planFile) return ready({ status: "no-plan", planFile: "", planRevision: "", runEvidence: false });
      const plan = planFromContext(data, { planFile }) || {};
      if (!Object.keys(plan).length) return ready({ status: "plan-unavailable", planFile, planRevision: "", runEvidence: false });
      const planRevision = String(plan.revision || "");
      const planUpdatedAt = Date.parse(String(plan.updatedAt || ""));
      const summaryPlanFile = meaningfulValue(pick(item, ["planFile", "plan_file"], ""));
      const currentSummary = Boolean(
        meaningfulValue(pick(item, ["lastParsedAt", "last_parsed_at"], ""))
        && summaryPlanFile
        && samePlanSelection(summaryPlanFile, planFile)
        && resultSummaryMatchesPlanVersion(item, planRevision, planUpdatedAt));
      const runEvidence = currentPlanRevisionRunEvidenceForState(data, planFile, plan);
      return ready({ status: currentSummary ? "parsed" : runEvidence ? "run-evidence" : "waiting-run", planFile, planRevision, runEvidence });
    }

    // An artifact produced against a smaller archived set is stale, not missing; without saying so
    // the row reads "待运行" and the user has to diff two counts that live in different rows.
    function evidenceCoverageState(artifactPath, coveredCount, archivedCount) {
      const archived = Number(archivedCount) || 0;
      const covered = Number(coveredCount) || 0;
      const hasArtifact = Boolean(meaningfulValue(artifactPath));
      if (!archived) return { tone: "warn", label: "等待归档", detail: "尚无已归档结果" };
      if (!hasArtifact) return { tone: "warn", label: "待运行", detail: "尚未生成产物；已归档 " + archived + " 条" };
      if (covered === archived) return { tone: "good", label: "已生成", detail: "覆盖全部 " + archived + " 条已归档结果" };
      if (covered > archived) return { tone: "warn", label: "需重跑", detail: "产物含 " + covered + " 条，多于当前已归档 " + archived + " 条；归档已变更" };
      return { tone: "warn", label: "需重跑", detail: "产物覆盖 " + covered + " 条，已归档 " + archived + " 条；" + (archived - covered) + " 条未纳入" };
    }

    function renderResultEvidenceWorkbench(state, summary) {
      const traceScope = traceRowsForPlanScope(experimentTraceRowsForState(state), state, "selected");
      const traceStats = resultEvidenceTraceStatsForRows(traceScope.rows);
      const parsed = meaningfulValue(pick(summary, ["lastParsedAt", "last_parsed_at"], ""));
      const autoParseReadiness = resultAutoParseReadinessForState(state, summary);
      const outputContractCheck = currentResultOutputContractCheck(state);
      const analysisArtifacts = resultAnalysisArtifactsForState(state, summary);
      const cacheKey = resultEvidenceWorkbenchCacheKeyFor(summary, traceStats, outputContractCheck, analysisArtifacts, autoParseReadiness);
      if (cacheKey === resultEvidenceWorkbenchCacheKey && resultEvidenceWorkbenchCacheHtml) return resultEvidenceWorkbenchCacheHtml;
      const parseFailed = pick(summary, ["parseFailed", "parse_failed"], "-");
      const qualityWarnings = pick(summary, ["qualityWarnings", "quality_warnings"], "-");
      const qualityGatePath = pick(summary, ["qualityGatePath", "quality_gate_path"], "-");
      const previewCsvPath = pick(summary, ["previewCsvPath", "preview_csv_path"], "-");
      const resultPlanFile = pick(summary, ["planFile", "plan_file"], state.planFileInput || (state.selection || {}).selectedPlanId || "");
      const previewResultCount = Number(pick(summary, ["previewResultCount", "preview_result_count", "resultCount", "result_count"], asArray(summary.results).length)) || 0;
      const effectiveResultsCsvPath = pick(summary, ["effectiveResultsCsvPath", "effective_results_csv_path"], "-");
      const effectiveArchivedResultCount = Number(pick(summary, ["effectiveArchivedResultCount", "effective_archived_result_count", "finalResultCount", "final_result_count"], 0)) || 0;
      const pendingReviewCount = Number(pick(summary, ["pendingReviewCount", "pending_review_count"], 0)) || 0;
      const excludedResultCount = Number(pick(summary, ["excludedResultCount", "excluded_result_count"], 0)) || 0;
      const qualityGateResultCount = pick(summary, ["qualityGateResultCount", "quality_gate_result_count"], "");
      const qualityReady = Boolean(meaningfulValue(qualityGatePath)) && effectiveArchivedResultCount > 0 && Number(qualityGateResultCount) === effectiveArchivedResultCount;
      const statisticsUpdatedAt = pick(summary, ["statisticsUpdatedAt", "statistics_updated_at"], "-");
      const statisticsPath = pick(summary, ["statisticsPath", "statistics_path"], "-");
      const statisticsResultCount = pick(summary, ["statisticsResultCount", "statistics_result_count"], "");
      const statisticsReady = Boolean(meaningfulValue(statisticsPath)) && effectiveArchivedResultCount > 0 && Number(statisticsResultCount) === effectiveArchivedResultCount;
      const statisticsSourcePath = statisticsReady ? meaningfulValue(statisticsPath) : "";
      const pairedComparisons = asArray(summary.pairedComparisons || summary.paired_comparisons);
      const firstComparison = pairedComparisons[0] || {};
      const paperTablePath = pick(summary, ["paperTablePath", "paper_table_path", "exportPath"], "-");
      const paperTableCsvPath = pick(summary, ["paperTableCsvPath", "paper_table_csv_path"], "-");
      const paperTableResultCount = pick(summary, ["paperTableResultCount", "paper_table_result_count"], "");
      const paperTableReady = Boolean(meaningfulValue(paperTablePath)) && effectiveArchivedResultCount > 0 && Number(paperTableResultCount) === effectiveArchivedResultCount;
      const paperTableSourcePath = paperTableReady ? (meaningfulValue(paperTableCsvPath) || meaningfulValue(paperTablePath)) : "";
      const pptReady = Boolean(statisticsSourcePath || paperTableSourcePath || analysisArtifacts.plottingContractPath || analysisArtifacts.caseLevelPath || analysisArtifacts.recoveredPlanReportPath || analysisArtifacts.anomalyPath);
      const claimEvidence = summary.claimEvidence || summary.claim_evidence || {};
      const claimStatus = pick(summary, ["claimEvidenceStatus", "claim_evidence_status"], pick(claimEvidence, ["status"], "待检查"));
      const claimPath = pick(summary, ["claimEvidencePath", "claim_evidence_path"], pick(claimEvidence, ["path"], "zlk_cluster/results/claim_evidence.json"));
      const claimCount = pick(summary, ["claimCount", "claim_count"], pick(claimEvidence, ["claimCount", "claim_count"], 0));
      const claimSupported = pick(summary, ["claimSupportedCount", "claim_supported_count"], pick(claimEvidence, ["supportedCount", "supported_count"], 0));
      const claimPreview = asArray(summary.claimEvidencePreview || summary.claim_evidence_preview || claimEvidence.preview || claimEvidence.claims);
      const previewIssueCounts = claimEvidenceIssueCounts(claimPreview);
      const claimStatusText = String(claimStatus || "").toLowerCase();
      const claimUnsupported = Math.max(
        Number(pick(summary, ["claimUnsupportedCount", "claim_unsupported_count"], pick(claimEvidence, ["unsupportedCount", "unsupported_count"], 0))) || 0,
        previewIssueCounts.unsupported,
        claimStatusText.includes("unsupported") ? 1 : 0
      );
      const claimNeeds = Math.max(
        Number(pick(summary, ["claimNeedsExperimentCount", "claim_needs_experiment_count"], pick(claimEvidence, ["needsExperimentCount", "needs_experiment_count"], 0))) || 0,
        previewIssueCounts.needsExperiment,
        claimStatusText.includes("need") ? 1 : 0
      );
      const claimIssueCount = Number(claimUnsupported || 0) + Number(claimNeeds || 0);
      const claimDisplayStatus = claimIssueCount ? "缺证据" : meaningfulValue(claimStatus) ? claimEvidenceStatusLabel(claimStatus) : "待检查";
      const archived = traceStats.archived;
      const deleted = traceStats.deleted;
      const parsedRows = traceStats.parsedRows;
      const qualityCoverage = evidenceCoverageState(qualityGatePath, qualityGateResultCount, effectiveArchivedResultCount);
      const statisticsCoverage = evidenceCoverageState(statisticsPath, statisticsResultCount, effectiveArchivedResultCount);
      const paperTableCoverage = evidenceCoverageState(paperTablePath, paperTableResultCount, effectiveArchivedResultCount);
      const rows = [
        resultEvidenceRow("解析与质量", parsed || parsedRows ? (qualityReady && !hasWarningValue(qualityWarnings) ? "good" : "warn") : "warn", parsed || parsedRows ? (qualityReady ? (hasWarningValue(qualityWarnings) ? "有警告" : "已检查") : "待质量门禁") : "待解析", "", [
          ["最近解析", parsed || "-", ""],
          ["失败数", parseFailed, ""],
          ["警告", qualityWarnings, ""],
          ["质量报告", compactPath(qualityGatePath), qualityGatePath],
          ["检查结果", String(qualityGateResultCount || 0), "仅检查已归档结果"],
          ["覆盖", qualityCoverage.detail, "质量门禁覆盖范围与当前已归档结果的对照"]
        ]),
        resultEvidenceRow("SCI 统计", statisticsCoverage.tone, statisticsCoverage.label, "", [
          ["更新时间", statisticsUpdatedAt, ""],
          ["统计文件", compactPath(statisticsPath), statisticsPath],
          ["纳入结果", String(statisticsResultCount || 0), "仅统计已归档结果"],
          ["覆盖", statisticsCoverage.detail, "统计覆盖范围与当前已归档结果的对照"],
          ["配对比较", pairedComparisons.length ? String(pairedComparisons.length) + " 组" : "待生成", pairedComparisonTitle(firstComparison)],
          ["显著性", analysisStatusLabel(pick(summary, ["significanceStatus", "significance_status"], "待检查")), "原始值：" + String(pick(summary, ["significanceStatus", "significance_status"], "待检查"))]
        ], [pptPlotButton("统计绘图", statisticsSourcePath, "SCI 统计")]),
        resultEvidenceRow("结果筛选", "info", "预览与有效结果分离", "", [
          ["完整预览", compactPath(previewCsvPath), previewCsvPath],
          ["预览条数", String(previewResultCount), "包含全部解析记录，归档前不进入最终分析"],
          ["有效结果", compactPath(effectiveResultsCsvPath), effectiveResultsCsvPath],
          ["纳入规则", "仅已归档", "临时预览不会进入统计、论文表或 PPT"],
          ["有效条数", String(effectiveArchivedResultCount), ""],
          ["待筛选", String(pendingReviewCount), "未决定的记录保留在完整预览中，不进入质量门禁、统计、论文表或 PPT"],
          ["已排除", String(excludedResultCount), "排除只改变结果取舍状态，不删除任务、产物或完整预览"]
        ], [
          resultFileButton("打开完整预览", previewCsvPath, resultPlanFile),
          resultFileButton("打开有效结果", effectiveResultsCsvPath, resultPlanFile)
        ]),
        resultEvidenceRow("论文与归档", claimIssueCount ? "warn" : meaningfulValue(claimStatus) && claimStatus !== "待检查" ? "mine" : "warn", claimDisplayStatus, "", [
          ["论文表格", compactPath(paperTablePath), paperTablePath || ""],
          ["表格覆盖", paperTableCoverage.detail, "论文表格覆盖范围与当前已归档结果的对照"],
          ["论文声明", String(claimCount), ""],
          ["缺证据", String(claimUnsupported), ""],
          ["已归档", String(archived), ""]
        ], [pptPlotButton("论文表格绘图", paperTableSourcePath, "论文表格")]),
        resultEvidenceRow("按需分析", "", "按需运行", "", [
          ["恢复报告", compactPath(analysisArtifacts.recoveredPlanReportPath), analysisArtifacts.recoveredPlanReportPath],
          ["异常报告", compactPath(analysisArtifacts.anomalyPath), analysisArtifacts.anomalyPath],
          ["日志规则", "OOM/NaN/CUDA", ""],
          ["安全", "不执行命令", ""]
        ], [
          pptPlotButton("恢复报告页", analysisArtifacts.recoveredPlanReportPath, "配置反推报告", { unavailableReason: "请先运行恢复 Plan" }),
          pptPlotButton("异常报告页", analysisArtifacts.anomalyPath, "异常定位报告", { unavailableReason: "请先运行异常诊断" })
        ]),
        resultEvidenceRow("PPT 绘图", pptReady ? "good" : "warn", pptReady ? "已有可用文件" : "等待分析文件", "", [
          ["契约", compactPath(analysisArtifacts.plottingContractPath), analysisArtifacts.plottingContractPath],
          ["统计结果", compactPath(statisticsSourcePath), statisticsSourcePath],
          ["论文表格", compactPath(paperTableSourcePath), paperTableSourcePath],
          ["样本级结果", compactPath(analysisArtifacts.caseLevelPath), analysisArtifacts.caseLevelPath]
        ], [
          pptPlotButton("均值绘图", statisticsSourcePath, "SCI 聚合统计"),
          pptPlotButton("契约页", analysisArtifacts.plottingContractPath, "PPT 绘图契约", { unavailableReason: "请先导出 PPT 绘图契约" }),
          pptPlotButton("统计结果", statisticsSourcePath, "statistics"),
          pptPlotButton("论文表格", paperTableSourcePath, "paper table"),
          pptPlotButton("样本级结果", analysisArtifacts.caseLevelPath, "case_level", { unavailableReason: "请先运行样本级解析" }),
          pptPlotButton("异常原因", analysisArtifacts.anomalyPath, "root cause/storyline", { unavailableReason: "请先运行异常诊断" })
        ])
      ];
      const html = '<div class="resultEvidenceWorkbench" title="结果证据">' +
        renderResultNextAction({ parsed, parsedRows, qualityGatePath: qualityReady ? qualityGatePath : "", statisticsPath: statisticsReady ? statisticsPath : "", claimStatus, claimIssueCount, paperTablePath: paperTableReady ? paperTablePath : "", plottingContractPath: analysisArtifacts.plottingContractPath, effectiveArchivedResultCount, pendingReviewCount, excludedResultCount, previewCsvPath, archivableCount: traceStats.archivable, archiveBlockedCount: traceStats.archiveBlocked, previewResultCount, outputContractStatus: outputContractCheck.status, outputContractMissingFiles: outputContractCheck.missingFiles, outputContractUnparseableFiles: outputContractCheck.unparseableFiles, outputContractMessage: outputContractCheck.message, autoParseStatus: autoParseReadiness.status, planFile: autoParseReadiness.planFile }) +
        '<div class="resultEvidenceRows">' + rows.join("") + '</div>' +
        renderClaimEvidencePreviewCached(claimPreview) +
      '</div>';
      resultEvidenceWorkbenchCacheKey = cacheKey;
      resultEvidenceWorkbenchCacheHtml = html;
      return html;
    }

    function claimEvidenceIssueCounts(rows) {
      return asArray(rows).reduce((counts, row) => {
        const status = String((row || {}).status || "").trim().toLowerCase();
        if (status.includes("need")) counts.needsExperiment += 1;
        else if (status.includes("unsupported")) counts.unsupported += 1;
        return counts;
      }, { unsupported: 0, needsExperiment: 0 });
    }

    function resultFileButton(label, file, planFile) {
      const path = meaningfulValue(file);
      if (!path) return "";
      return '<button class="taskActionButton secondary" data-command="openResultArtifact" data-remote-path="' + escAttr(path) + '" data-plan-file="' + escAttr(planFile || "") + '" title="' + escAttr("打开当前 Plan 结果：" + path) + '">' + esc(label) + '</button>';
    }

    function renderResultNextAction(status) {
      const stage = resultWorkflowStage(status);
      if (stage.kind === "await-run") return resultAwaitRunNextAction(stage);
      if (stage.kind === "archive") return resultArchiveNextAction(stage.count);
      if (stage.kind === "archive-blocked") return resultArchiveBlockedNextAction(stage.count);
      if (stage.kind === "review") return resultReviewNextAction(stage.count);
      if (stage.kind === "section") return projectSectionNextAction(stage.message, stage.label, stage.section, stage.anchor || stage.section);
      if (stage.command === "plotResultsToPpt") {
        const automation = pptAutomationReadinessForState(lastState || {});
        if (!automation.ready) return projectNextAction(automation.message, automation.actionLabel, automation.actionCommand);
      }
      return projectNextAction(stage.message, stage.label, stage.command, { file: stage.file, planFile: stage.planFile });
    }

    function resultWorkflowStage(status) {
      if (!status.parsed && status.autoParseStatus === "waiting-run") {
        return { kind: "await-run", message: "当前版本尚无运行证据，自动解析已跳过", planFile: status.planFile };
      }
      if (!status.parsed && ["no-plan", "plan-unavailable"].includes(status.autoParseStatus)) {
        return { kind: "section", message: status.autoParseStatus === "no-plan" ? "尚未选择 Plan" : "当前 Plan 元数据尚未就绪", label: "选择 Plan", section: "plans", anchor: "plans-local" };
      }
      if (!status.parsed && !status.parsedRows) {
        return { kind: "command", message: status.autoParseStatus === "run-evidence" ? "已检测到当前版本运行记录，等待结果解析" : "尚未生成结果摘要", label: "解析结果", command: "parseResults", planFile: status.planFile };
      }
      const archivedCount = Number(status.effectiveArchivedResultCount || 0);
      const pendingCount = Number(status.pendingReviewCount || 0);
      const excludedCount = Number(status.excludedResultCount || 0);
      const parsedCount = Math.max(Number(status.previewResultCount || 0), Number(status.parsedRows || 0), archivedCount + pendingCount);
      if (archivedCount <= 0 && Number(status.archivableCount || 0) > 0) {
        return { kind: "archive", count: Number(status.archivableCount || 0) };
      }
      if (archivedCount <= 0 && Number(status.archiveBlockedCount || 0) > 0) {
        return { kind: "archive-blocked", count: Number(status.archiveBlockedCount || 0) };
      }
      if (archivedCount <= 0 && pendingCount > 0) {
        return { kind: "review", count: pendingCount };
      }
      if (archivedCount <= 0 && parsedCount > 0) {
        return { kind: "review", count: parsedCount };
      }
      if (archivedCount <= 0) {
        return zeroResultOutputContractStage(status);
      }
      if (!meaningfulValue(status.qualityGatePath)) {
        return { kind: "command", message: "已归档 " + archivedCount + " 条未纳入 " + (pendingCount + excludedCount) + " 条（待筛选 " + pendingCount + " 条；已排除 " + excludedCount + " 条）", label: "检查已归档结果", command: "runQualityGate" };
      }
      if (!meaningfulValue(status.statisticsPath)) {
        return { kind: "command", message: "结果已归档，等待最终统计", label: "运行统计", command: "runStatistics" };
      }
      if (status.claimIssueCount) {
        return { kind: "command", message: "论文声明仍有 " + Number(status.claimIssueCount) + " 项缺失证据", label: "打开 claims.md", command: "openPlan", file: "paper/claims.md" };
      }
      if (!meaningfulValue(status.claimStatus) || String(status.claimStatus) === "待检查") {
        return { kind: "command", message: "统计已完成，等待证据检查", label: "检查论文证据", command: "checkClaimEvidence" };
      }
      if (!meaningfulValue(status.paperTablePath)) {
        return { kind: "command", message: "证据检查已完成", label: "导出论文表格", command: "exportPaperTable" };
      }
      if (!meaningfulValue(status.plottingContractPath)) {
        return { kind: "command", message: "论文表格已生成，等待 PPT 绘图契约", label: "导出绘图契约", command: "exportPlottingContract" };
      }
      return { kind: "command", message: "结果证据与绘图契约均已完成", label: "绘图到 PPT", command: "plotResultsToPpt" };
    }

    function resultAwaitRunNextAction(stage) {
      const planFile = String((stage || {}).planFile || "");
      const planAttr = planFile ? ' data-plan-file="' + escAttr(planFile) + '"' : "";
      const state = lastState || {};
      const runReason = disableReason(state, "runPlan", { planFile });
      const parseReason = disableReason(state, "parseResults", { planFile });
      const actionButton = (command, label, reason, confirm) => {
        const title = reason || commandHelp(command);
        return '<button class="mini' + (command === "parseResults" ? ' secondary' : '') + '" data-command="' + command + '"' + planAttr + (confirm ? ' data-confirm="true"' : '') + (reason ? ' disabled' : '') + ' title="' + escAttr(title) + '" aria-label="' + escAttr(label + "：" + title) + '">' + esc(label) + '</button>';
      };
      return '<div class="projectQuickNext"><span>自动解析</span><b>' + esc((stage || {}).message || "当前版本尚无运行证据") + '</b><div class="projectQuickActions">' + actionButton("runPlan", runModeActionLabel(runMode, "校验并提交运行"), runReason, true) + actionButton("parseResults", "解析已有结果", parseReason, false) + '</div></div>';
    }

    function zeroResultOutputContractStage(status) {
      const contractStatus = String(status.outputContractStatus || "").toLowerCase();
      if (/accepted|pending|queued|running|in_progress|started|progress/.test(contractStatus)) {
        return { kind: "section", message: "正在检查输出契约", label: "查看检查进度", section: "operations", anchor: "operations-list" };
      }
      if (/failed|failure|error|stalled|unsupported/.test(contractStatus)) {
        const missingFiles = meaningfulValue(status.outputContractMissingFiles);
        const unparseableFiles = meaningfulValue(status.outputContractUnparseableFiles);
        const rawUnparseableFileList = Array.isArray(status.outputContractUnparseableFileList) ? status.outputContractUnparseableFileList : [];
        const unparseableFileList = [...new Set(rawUnparseableFileList.map((item) => String(item || "").trim()).filter(Boolean))];
        const unparseableDetails = Array.isArray(status.outputContractUnparseableDetails) ? status.outputContractUnparseableDetails : [];
        const failureMessage = missingFiles ? "输出契约缺失：" + missingFiles : unparseableFiles ? "结果文件不可解析：" + unparseableFiles : meaningfulValue(status.outputContractMessage) || "输出契约检查失败";
        return { kind: "section", message: failureMessage, label: "修复输出接入", section: "plans", anchor: "plans-detected", unparseableFileList, unparseableDetails };
      }
      if (/completed|complete|done|success|succeeded/.test(contractStatus)) {
        return { kind: "command", message: "输出契约完整，重新读取结果文件", label: "重新解析结果", command: "parseResults" };
      }
      return { kind: "command", message: "解析已完成，但未发现结果记录", label: "检查输出契约", command: "checkOutputContract" };
    }

    function outputContractStageForCheck(check) {
      const item = check || {};
      return zeroResultOutputContractStage({ outputContractStatus: item.status, outputContractMissingFiles: item.missingFiles, outputContractUnparseableFiles: item.unparseableFiles, outputContractUnparseableFileList: item.unparseableFileList, outputContractUnparseableDetails: item.unparseableDetails, outputContractMessage: item.message });
    }

    function currentPlanRuntimeContractStage(state, planFile) {
      const data = state || {};
      const selectedPlan = meaningfulValue(planFile);
      if (!selectedPlan) return undefined;
      const summary = data.resultsSummary || {};
      const summaryPlan = meaningfulValue(pick(summary, ["planFile", "plan_file"], ""));
      if (summaryPlan && !samePlanSelection(summaryPlan, selectedPlan)) return undefined;
      return resultSummaryNeedsOutputContractRecovery(summary)
        ? outputContractStageForCheck(currentResultOutputContractCheck(data))
        : undefined;
    }

    function resultSummaryNeedsOutputContractRecovery(summary) {
      const item = summary || {};
      const parsedAt = meaningfulValue(pick(item, ["lastParsedAt", "last_parsed_at"], ""));
      if (!parsedAt) return false;
      const previewCount = Number(pick(item, ["previewResultCount", "preview_result_count", "resultCount", "result_count"], asArray(item.results).length)) || 0;
      const archivedCount = Number(pick(item, ["effectiveArchivedResultCount", "effective_archived_result_count", "finalResultCount", "final_result_count"], 0)) || 0;
      const pendingCount = Number(pick(item, ["pendingReviewCount", "pending_review_count"], 0)) || 0;
      return Math.max(previewCount, archivedCount + pendingCount) <= 0;
    }

    function resultArchiveNextAction(count) {
      return '<div class="projectQuickNext"><span>下一步</span><b>待归档 ' + esc(String(count)) + ' 条实验记录</b><button class="mini" type="button" data-section-target="results" data-anchor-target="results-traces">选择实验记录</button></div>';
    }

    function resultArchiveBlockedNextAction(count) {
      return '<div class="projectQuickNext"><span>下一步</span><b>' + esc(String(count)) + ' 条记录缺少 Worker，暂不可归档</b><button class="mini" type="button" data-section-target="results" data-anchor-target="results-traces">查看记录</button></div>';
    }

    function resultReviewNextAction(count) {
      return '<div class="projectQuickNext"><span>下一步</span><b>' + esc(String(count)) + ' 条预览结果尚未决定</b><button class="mini" type="button" data-section-target="results" data-anchor-target="results-traces">归档或排除</button></div>';
    }

    function resultEvidenceTraceStatsForRows(rows) {
      const list = asArray(rows);
      if (list === resultEvidenceTraceStatsCacheRows && resultEvidenceTraceStatsCacheValue) return resultEvidenceTraceStatsCacheValue;
      const stats = { count: list.length, archived: 0, excluded: 0, deleted: 0, parsedRows: 0, archivable: 0, archiveBlocked: 0 };
      list.forEach((row) => {
        const item = row || {};
        const status = String(item.status || "").toLowerCase();
        const deleteStatusRaw = String(item.deleteStatus || "");
        const deleteStatus = deleteStatusRaw.toLowerCase();
        const resultStatus = String(item.resultStatus || "");
        const archived = status.includes("archiv") || status.includes("已归档");
        const excluded = String(item.reviewState || "").toLowerCase() === "excluded";
        const deleted = deleteStatus.includes("delet") || deleteStatusRaw.includes("已删");
        if (archived) stats.archived += 1;
        if (excluded) stats.excluded += 1;
        if (deleted) stats.deleted += 1;
        if (!archived && !excluded && !deleted && isArchivableTraceStatus(item.executionStatus) && usableTaskKey(item.archiveKey || item.id)) {
          if (usableTaskKey(item.workerId)) stats.archivable += 1;
          else stats.archiveBlocked += 1;
        }
        if (meaningfulValue(resultStatus) && resultStatus.toLowerCase() !== "unknown") stats.parsedRows += 1;
      });
      resultEvidenceTraceStatsCacheRows = list;
      resultEvidenceTraceStatsCacheValue = stats;
      return stats;
    }

    function isArchivableTraceStatus(status) {
      return /completed|done|failed|error|stalled|stopped|cancelled|canceled|已完成|失败|停滞|停止|取消/.test(String(status || "").toLowerCase());
    }

    function latestResultOutputContractCheck(state, planFile, parsedAt, planRevision, planUpdatedAt) {
      const parsedAtMs = Date.parse(String(parsedAt || ""));
      return operationRowsForState(state || {}).find((row) => {
        if (String((row || {}).type || "").toLowerCase() !== "check-output-contract") return false;
        if (planFile && !samePlanSelection(row.planFile, planFile)) return false;
        if (!operationMatchesPlanVersion(row, planRevision, planUpdatedAt)) return false;
        if (!Number.isFinite(parsedAtMs)) return true;
        const operationAtMs = Date.parse(String((row || {}).updatedAt || ""));
        return Number.isFinite(operationAtMs) && operationAtMs >= parsedAtMs;
      }) || {};
    }

    function currentResultOutputContractCheck(state) {
      const data = state || {};
      if (currentResultOutputContractCheckCacheState === data && currentResultOutputContractCheckCacheValue) return currentResultOutputContractCheckCacheValue;
      const summary = data.resultsSummary || {};
      const parsedAt = meaningfulValue(pick(summary, ["lastParsedAt", "last_parsed_at"], ""));
      const planFile = meaningfulValue(data.planFileInput || (data.selection || {}).selectedPlanId || pick(summary, ["planFile", "plan_file"], ""));
      const plan = planFromContext(data, { planFile }) || {};
      const value = latestResultOutputContractCheck(data, planFile, parsedAt, String(plan.revision || ""), Date.parse(String(plan.updatedAt || "")));
      currentResultOutputContractCheckCacheState = data;
      currentResultOutputContractCheckCacheValue = value;
      return value;
    }

    function resultAnalysisArtifactsForState(state, summary) {
      const data = state || {};
      const item = summary || {};
      if (resultAnalysisArtifactsCacheState === data && resultAnalysisArtifactsCacheSummary === item && resultAnalysisArtifactsCacheValue) {
        return resultAnalysisArtifactsCacheValue;
      }
      const planFile = meaningfulValue(data.planFileInput || (data.selection || {}).selectedPlanId || pick(item, ["planFile", "plan_file"], ""));
      const summaryPlanFile = meaningfulValue(pick(item, ["planFile", "plan_file"], ""));
      const plan = planFromContext(data, { planFile }) || {};
      const planRevision = String(plan.revision || "");
      const planUpdatedAt = Date.parse(String(plan.updatedAt || ""));
      const summaryMatchesPlan = !planFile || Boolean(summaryPlanFile && samePlanSelection(summaryPlanFile, planFile));
      const summaryMatchesVersion = resultSummaryMatchesPlanVersion(item, planRevision, planUpdatedAt);
      const rows = planVersionOperationRows(data, planFile, planRevision, planUpdatedAt);
      const artifacts = latestResultAnalysisArtifactPaths(rows, planFile, planRevision, planUpdatedAt);
      const value = {
        plottingContractPath: (summaryMatchesPlan && summaryMatchesVersion ? meaningfulValue(pick(item, ["plottingContractPath", "plotting_contract_path"], "")) : "") || artifacts.plottingContractPath,
        caseLevelPath: artifacts.caseLevelPath,
        recoveredPlanReportPath: artifacts.recoveredPlanReportPath,
        anomalyPath: artifacts.anomalyPath
      };
      resultAnalysisArtifactsCacheState = data;
      resultAnalysisArtifactsCacheSummary = item;
      resultAnalysisArtifactsCacheValue = value;
      return value;
    }

    function latestResultAnalysisArtifactPaths(rows, planFile, planRevision, planUpdatedAt) {
      const out = { plottingContractPath: "", caseLevelPath: "", recoveredPlanReportPath: "", anomalyPath: "" };
      const seenActions = new Set();
      for (const row of asArray(rows)) {
        const action = String((row || {}).type || "").toLowerCase();
        const field = RESULT_ANALYSIS_ARTIFACT_FIELDS[action];
        if (!field || seenActions.has(action) || !operationSucceeded(row)) continue;
        if ((planFile && !samePlanSelection(row.planFile, planFile)) || !operationMatchesPlanVersion(row, planRevision, planUpdatedAt)) continue;
        seenActions.add(action);
        out[field] = meaningfulValue(row[field]);
        if (seenActions.size === Object.keys(RESULT_ANALYSIS_ARTIFACT_FIELDS).length) break;
      }
      return out;
    }

    function compactOutputContractCheckForSignature(check) {
      return compactRecordForSignature(check || {}, ["operationId", "status", "updatedAt", "planFile", "message", "missingFiles", "unparseableFiles", "unparseableDetails", "parseableResultCount", "contractReportPath"]);
    }

    function resultEvidenceWorkbenchCacheKeyFor(summary, traceStats, outputContractCheck, analysisArtifacts, autoParseReadiness) {
      return stableSectionSignature({
        runMode: String(typeof runMode === "undefined" ? "formal" : runMode),
        summary: compactResultsSummaryForSignature(summary),
        traceStats,
        outputContractCheck: compactOutputContractCheckForSignature(outputContractCheck),
        analysisArtifacts,
        autoParseReadiness
      });
    }

    function renderClaimEvidencePreviewCached(rows) {
      const key = stableSectionSignature(compactRowsForSignature(rows, 8, ["text", "claim", "status", "evidenceRefs", "evidence_refs", "matchedKeys", "matched_keys", "missingRefs", "missing_refs", "line"]));
      if (key === claimEvidencePreviewHtmlCacheKey) return claimEvidencePreviewHtmlCache;
      claimEvidencePreviewHtmlCacheKey = key;
      claimEvidencePreviewHtmlCache = renderClaimEvidencePreview(rows);
      return claimEvidencePreviewHtmlCache;
    }

    function renderClaimEvidencePreview(rows) {
      const list = asArray(rows).filter(Boolean).slice(0, 8);
      if (!list.length) return "";
      return '<div class="claimEvidenceList" title="论文证据">' +
        list.map((row) => {
          const status = String(row.status || "unknown").toLowerCase();
          const tone = status.includes("support") && !status.includes("unsupported") ? "supported" : status.includes("need") ? "needs" : status.includes("unsupported") ? "unsupported" : "";
          const refs = asArray(row.evidenceRefs || row.evidence_refs || row.matchedKeys || row.matched_keys).join(", ") || asArray(row.missingRefs || row.missing_refs).join(", ") || "无证据";
          const line = row.line ? "L" + row.line + " · " : "";
          return '<div class="claimEvidenceRow ' + tone + '" title="' + escAttr(row.text || "") + '">' +
            '<div class="claimEvidenceText">' + esc(row.text || "-") + '</div>' +
            '<div class="claimEvidenceMeta" title="' + escAttr((row.status || "-") + "；" + refs) + '">' + esc(line + claimEvidenceStatusLabel(row.status || "-")) + '</div>' +
          '</div>';
        }).join("") +
      '</div>';
    }

    function claimEvidenceStatusLabel(status) {
      const text = String(status || "").toLowerCase();
      if (text.includes("unsupported")) return "缺证据";
      if (text.includes("need")) return "需实验";
      if (text.includes("support") || text === "passed" || text === "ok") return "已支持";
      if (text.includes("fail")) return "未通过";
      if (text.includes("pending") || text.includes("waiting")) return "待检查";
      return String(status || "-");
    }

    function analysisStatusLabel(status) {
      const raw = String(status || "").trim();
      const key = raw.toLowerCase().replace(/[\s-]+/g, "_");
      const labels = {
        significant: "显著", not_significant: "不显著", pending: "待检查", waiting: "待检查", passed: "已通过", ok: "已通过", supported: "已支持",
        insufficient: "样本不足", needs_experiment: "需实验", unsupported: "不支持", unavailable: "不可用", failed: "失败", error: "错误"
      };
      return labels[key] || raw || "待检查";
    }

    function resultEvidenceRow(title, tone, status, detail, items, actions) {
      const facts = (items || []).slice(0, 3).map((item) => resultEvidenceFact(item[0], item[1], item[2])).join("");
      const fullFacts = '<div class="resultEvidenceMiniGrid">' + (items || []).map((item) => resultEvidenceMini(item[0], item[1], item[2])).join("") + '</div>';
      const actionHtml = actions && actions.length ? '<div class="pptPlotActions">' + actions.join("") + '</div>' : "";
      const summary = title + "：" + (status || "-");
      return '<div class="resultEvidenceRow ' + escAttr(tone || "") + '" title="' + escAttr(summary) + '">' +
        '<span class="resultEvidenceName">' + esc(title) + '</span>' +
        '<span class="resultEvidenceFacts">' + facts + '</span>' +
        '<span class="' + statusToneClass(tone) + '">' + esc(status) + '</span>' +
        '<details class="statusInfoPopover resultEvidenceMore"><summary title="' + escAttr(summary) + '">i</summary><div class="statusInfoPopoverBody">' + fullFacts + actionHtml + '</div></details>' +
      '</div>';
    }

    function pptPlotButton(label, sourcePath, sourceLabel, extra) {
      const source = String(sourcePath || "").trim();
      const automation = pptAutomationReadinessForState(lastState || {});
      const pendingKey = pendingKeyForAction("plotResultsToPpt", { sourcePath: source });
      const pending = pendingButtonKeys.has(pendingKey);
      const debugReason = debugModeDisableReason("plotResultsToPpt");
      const unavailable = Boolean(debugReason || !source || !automation.ready);
      const unavailableReason = debugReason || (!source
        ? String((extra || {}).unavailableReason || "请先归档结果并运行统计")
        : automation.message);
      const titleText = pending ? "绘图中" : unavailable ? unavailableReason : source;
      return '<button class="taskActionButton secondary" data-command="plotResultsToPpt" data-pending-key="' + escAttr(pendingKey) + '" data-source-path="' + escAttr(source) + '" data-source-label="' + escAttr(sourceLabel || label) + '"' + buttonPayloadAttributes(extra || {}) + (pending || unavailable ? " disabled" : "") + ' title="' + escAttr(titleText) + '">' + loadingPrefix(pending) + esc(label) + '</button>';
    }

    function finalStatisticsSourcePath(summary) {
      const item = summary && typeof summary === "object" ? summary : {};
      const path = meaningfulValue(pick(item, ["statisticsPath", "statistics_path"], ""));
      const count = pick(item, ["statisticsResultCount", "statistics_result_count"], "");
      const archivedCount = Number(pick(item, ["effectiveArchivedResultCount", "effective_archived_result_count", "finalResultCount", "final_result_count"], 0)) || 0;
      return path && archivedCount > 0 && Number(count) === archivedCount ? path : "";
    }

    function resultEvidenceMini(label, value, title) {
      return '<div class="resultEvidenceMini" title="' + escAttr(title || (label + "：" + (value || "-"))) + '"><span>' + esc(label) + '</span><b>' + esc(value) + '</b></div>';
    }

    function resultEvidenceFact(label, value, title) {
      return '<span class="resultEvidenceFact" title="' + escAttr(title || (label + "：" + (value || "-"))) + '"><span>' + esc(label) + '</span><b>' + esc(value) + '</b></span>';
    }

    function pairedComparisonTitle(item) {
      if (!item || !Object.keys(item).length) return "缺配对结果";
      const metric = item.metric || "-";
      const baseline = item.baseline || "-";
      const candidate = item.candidate || "-";
      const pairedN = item.pairedN || 0;
      const pValue = item.pValueApprox === undefined || item.pValueApprox === null ? "无" : Number(item.pValueApprox).toPrecision(3);
      return metric + "；" + candidate + " vs " + baseline + "；n=" + pairedN + "；p=" + pValue;
    }

    function meaningfulValue(value) {
      const text = String(value === undefined || value === null ? "" : value).trim();
      return text && text !== "-" && text.toLowerCase() !== "unknown" && text.toLowerCase() !== "none" ? text : "";
    }

    function hasWarningValue(value) {
      const text = meaningfulValue(value);
      return Boolean(text && text !== "0" && text.toLowerCase() !== "false" && text !== "无");
    }

    function renderTargetCompletionMatrix(state) {
      const health = String(((state.health || {}).state) || "");
      const caps = state.capabilities || {};
      const endpoints = caps.endpoints || {};
      const setup = state.setup || {};
      const project = state.detectedProject || {};
      const version = String(state.extensionVersion || "-");
      const rows = [
        ["当前插件版本", "done", version, ["package.json", "VSIX", version]],
        ...TARGET_MATRIX_BASELINE_ROWS,
        ["项目自动接入", project.adapterConfig ? "done" : "partial", project.adapterConfig ? "已接入" : "可生成", TARGET_MATRIX_PROJECT_EVIDENCE],
        ["真实 Agent 能力", endpoints.actions ? "done" : "partial", endpoints.actions ? "可用" : "待检测/升级", ["capabilities", health || "未检测", "Agent"]],
        ["真实集群烟测", "partial", health === "agent_ok" ? "Hub 可达，待现场验收" : "待现场验收", TARGET_MATRIX_SMOKE_EVIDENCE],
        ...TARGET_MATRIX_TRAILING_ROWS
      ];
      setHtmlIfChanged("targetCompletionMatrix",
        '<div class="targetMatrix">' +
          '<div class="targetMatrixList">' + rows.map((row) => targetMatrixRow(row[0], row[1], row[2], row[3])).join("") + '</div>' +
        '</div>');
    }

    function targetMatrixRow(title, tone, status, evidence) {
      const evidenceText = (evidence || []).join("；");
      return '<div class="targetMatrixRow ' + escAttr(tone || "partial") + '" title="' + escAttr(evidenceText || title + "：" + (status || "-")) + '">' +
        '<span class="targetMatrixName">' + esc(title) + '</span>' +
        '<span class="targetMatrixStatus">' + esc(status) + '</span>' +
        '<span class="targetEvidenceCount">证据 ' + esc(String((evidence || []).length)) + '</span>' +
      '</div>';
    }

    function renderFeatureReadiness(state) {
      const audit = cachedWebviewDomCommandAudit(state);
      const rowsHtml = featureReadinessRowsHtmlForState(state, FEATURE_READINESS_GROUPS);
      setHtmlIfChanged("featureReadiness",
        '<div class="featureReadiness">' +
          '<div class="toolbar"><button id="refreshDomCommandAudit" class="secondary" title="按钮审计">刷新按钮审计</button><span class="muted">' + esc(audit.stale ? "审计缓存待刷新" : (audit.updatedAt ? "审计已缓存" : "审计尚未刷新")) + '</span></div>' +
          '<div class="featureAuditBar">' +
            renderFeatureAuditPills(audit) +
          '</div>' +
          '<div class="featureReadinessList">' + rowsHtml + '</div>' +
        '</div>');
    }

    function featureReadinessRowsHtmlForState(state, groups) {
      const key = featureReadinessCacheKeyForState(state || {});
      if (key === featureReadinessRowsCacheKey) return featureReadinessRowsCacheHtml;
      featureReadinessRowsCacheKey = key;
      featureReadinessRowsCacheHtml = (groups || []).map((group) => featureReadinessRow(state, group[0], group[1])).join("");
      return featureReadinessRowsCacheHtml;
    }

    function featureReadinessCacheKeyForState(state) {
      return refListKey(
        state.connectionMode,
        state.lastSnapshotAt,
        state.planFileInput,
        state.plansOmittedCount,
        state.debugBundlePath,
        state.capabilities,
        state.fileCapabilities,
        state.health,
        state.realtime,
        state.integrations,
        state.setup,
        state.detectedProject,
        state.selection,
        state.plans,
        state.recentPlans
      );
    }

    function renderFeatureAuditPills(audit) {
      const wiringIssues = (audit.missingHandler || []).length + (audit.missingHelp || []).length + Number(audit.withoutTooltip || 0);
      const wiringDetail = []
        .concat((audit.missingHandler || []).map((item) => "缺 handler " + item))
        .concat((audit.missingHelp || []).map((item) => "缺说明 " + item))
        .concat(audit.withoutTooltip ? ["缺悬浮 " + String(audit.withoutTooltip)] : []);
      return [
        featureAuditPill("按钮", audit.buttonCount, "good"),
        featureAuditPill("命令", audit.commandCount, "good"),
        featureAuditPill("接线", wiringIssues ? String(wiringIssues) : "0", (audit.missingHandler || []).length ? "error" : wiringIssues ? "warn" : "good", wiringDetail),
        featureAuditPill("payload", (audit.payloadWarnings || []).length ? String(audit.payloadWarnings.length) : "0", (audit.payloadWarnings || []).length ? "error" : "good", audit.payloadWarnings),
        featureAuditPill("Worker", (audit.directWorkerWarnings || []).length ? String(audit.directWorkerWarnings.length) : "0", (audit.directWorkerWarnings || []).length ? "error" : "good", (audit.directWorkerWarnings || []).concat(audit.surfaceCounts || [], audit.disabledWithoutReason || []))
      ].join("");
    }

    function featureAuditPill(label, value, tone, detail) {
      const hasDetail = Array.isArray(detail) && detail.length;
      const detailText = hasDetail ? detail.slice(0, 4).join("；") + (detail.length > 4 ? "；+" + String(detail.length - 4) : "") : "";
      const title = hasDetail ? ' title="' + escAttr(detailText) + '"' : "";
      return '<span class="featureAuditPill ' + escAttr(tone || "") + '"' + title + '><span>' + esc(label) + '</span><b>' + esc(compactText(value, 24)) + '</b></span>';
    }

    function featureReadinessRow(state, title, commands) {
      const rows = commands.map((command) => {
        const reason = disableReason(state, command, {});
        return { command, reason, label: featureCommandLabel(command) };
      });
      const blocked = rows.filter((row) => row.reason);
      const runnable = rows.length - blocked.length;
      const tone = blocked.length === 0 ? "good" : (runnable ? "warn" : "error");
      const status = blocked.length === 0 ? "可用" : (runnable ? (runnable + "/" + rows.length + " 可用") : "需配置");
      const blockedText = blocked.map((row) => row.label).join("；");
      const rowTitle = blockedText ? ' title="' + escAttr(blocked.map((row) => row.label + "：" + row.reason).join("；")) + '"' : "";
      return '<div class="featureReadinessRow ' + tone + '"' + rowTitle + '>' +
        '<span class="featureReadinessName">' + esc(title) + '</span>' +
        '<span class="featureReadinessStatus">' + esc(status) + '</span>' +
        '<span class="featureReadinessMetric">入口 ' + esc(String(rows.length)) + '</span>' +
        '<span class="featureReadinessMetric">可用 ' + esc(String(runnable)) + '</span>' +
        '<span class="featureReadinessMetric">待配 ' + esc(String(blocked.length)) + '</span>' +
      '</div>';
    }

    function featureReadinessVisibleRows(rows, blocked, runnable) {
      if (!blocked.length) return [{ label: "全部入口", command: "", reason: "", summary: "全部可执行" }];
      const compact = blocked.slice(0, 2);
      if (runnable > 0) compact.push({ label: "可执行入口", command: "", reason: "", summary: "已可用 " + runnable + " 个" });
      return compact;
    }

    function featureCommandLabel(command) {
      const labels = {
        publishGithub: "一键发布",
        syncGithub: "同步 GitHub",
        overwriteGithub: "覆盖本机",
        uploadProjectToHub: "上传 Hub",
        uploadProjectToWorkers: "上传 Worker",
        distributeCodeToWorkers: "分发 Worker",
        deployLatestAgent: "部署 Agent",
        prepareAgents: "准备 Agent 并启动",
        configureSftpIgnores: "SFTP 忽略",
        resetRemotePathConfirmations: "恢复路径提醒",
        validatePlan: "校验计划",
        dryRunPlan: "预演计划",
        runPlan: "校验并提交运行",
        runAllPlans: "运行全部计划",
        archivePlan: "归档计划",
        restoreArchivedPlan: "恢复归档 Plan",
        reproducePlan: "复现实验",
        stopExperiment: "停止",
        retryExperiment: "重试",
        archiveArtifacts: "归档",
        excludeResults: "排除结果",
        syncArtifacts: "检查同步清单",
        completeThreeWay: "校验三方一致",
        deleteArtifacts: "删除",
        parseResults: "解析结果",
        refreshResults: "刷新结果",
        runQualityGate: "质量门禁",
        runStatistics: "统计",
        checkClaimEvidence: "论文证据",
        exportPaperTable: "论文表格",
        checkOutputContract: "输出契约",
        parseCaseLevel: "样本级解析",
        runLeakageCheck: "泄漏检查",
        inspectDataset: "数据集画像",
        planCheckpointRetention: "检查点清理预案",
        exportPlottingContract: "PPT 绘图契约",
        plotResultsToPpt: "绘图到 PPT",
        choosePptPath: "选择 PPT",
        chooseNewPptPath: "新建 PPT 路径",
        savePptPlotConfig: "保存 PPT 配置",
        inferConfigFromRun: "反推配置",
        recoverPlanFromRun: "恢复 Plan",
        diagnoseResultAnomaly: "异常诊断",
        compareWithBestConfig: "对比最优配置",
        runSubgroupAnalysis: "子组分析",
        exportCaseAnalysis: "Case 报告",
        selfCheck: "自检",
        createDebugBundle: "调试包",
        downloadDebugBundle: "下载调试包",
        downloadRemoteResult: "查看远端结果",
        openResultArtifact: "打开结果文件",
        openAuditTail: "审计尾部",
        reconcileDeletions: "校准删除",
        openPlan: "打开文件",
        savePlan: "保存计划",
        selectPlan: "选择计划",
        selectExperiment: "选择任务",
        selectLogRunKey: "查看日志",
        saveTopologyMode: "保存拓扑",
        saveSchedulerConfig: "保存策略",
        saveHubConfig: "保存 Hub",
        saveWorkerConfig: "保存服务器",
        addWorkerConfig: "新增服务器",
        deleteWorkerConfig: "删除服务器",
        configurePorts: "配置端口",
        repairPorts: "处理端口冲突",
        startTunnelEndpoint: "启动隧道",
        startHub: "启动 Hub",
        startWorker: "启动 Worker",
        startAll: "启动全部隧道",
        startAgents: "启动全部隧道",
        writeAgentCommands: "写入自启动",
        bootstrapProject: "接入当前项目",
        generatePlanGuide: "生成 Plan 模板",
        generateOutputAdapter: "生成接入模板",
        saveProjectAdapterRules: "保存接入规则",
        pauseAll: "暂停网络",
        resumeNetwork: "恢复网络",
        testAll: "检测全部",
        snapshot: "刷新数据"
      };
      return labels[command] || command;
    }

    function renderCapabilities(state) {
      const caps = state.capabilities || {};
      const endpoints = caps.endpoints || {};
      const realtimeRaw = endpoints.websocketEvents ? "WebSocket" : (endpoints.sseEvents ? "SSE" : "snapshot");
      const realtime = labelStatus(realtimeRaw);
      const fileList = hasCapability(state, "endpoints.fileList");
      const fileDownload = hasCapability(state, "endpoints.fileDownload");
      const fileUploadChunk = hasCapability(state, "endpoints.fileUploadChunk");
      const items = [
        capabilityItem("动作接口", endpoints.actions ? "可用" : "需升级", endpoints.actions),
        capabilityItem("实时通道", realtime, Boolean(endpoints.websocketEvents || endpoints.sseEvents), "原始通道：" + realtimeRaw),
        capabilityItem("文件列表", fileList ? "可用" : "需升级", fileList),
        capabilityItem("下载", fileDownload ? "可用" : "需升级", fileDownload),
        capabilityItem("上传", fileUploadChunk ? "可用" : "需升级", fileUploadChunk)
      ];
      setHtmlIfChanged("capabilities", '<div class="capabilityBar">' + items.join("") + '</div>');
    }

    function capabilityItem(label, value, ok, valueTitle) {
      return '<div class="capabilityItem ' + (ok ? "ok" : "warn") + '" title="' + escAttr(valueTitle || (label + "：" + (value || "-"))) + '">' +
        '<span>' + esc(label) + '</span><b class="' + (ok ? "status-completed" : "status-warning") + '">' + esc(value) + '</b>' +
      '</div>';
    }

    function renderActionErrors(state) {
      const rows = state.actionErrors || [];
      setHtmlIfChanged("actionErrors", rows.length ? '<div class="errorList">' + rows.map(renderActionErrorRow).join("") + '</div>' : '<div class="muted">暂无错误。</div>');
    }

    function renderActionErrorRow(row) {
      const rawCommand = row.command || "unknown";
      const commandLabel = featureCommandLabel(rawCommand);
      const suggestion = row.suggestion || (row.capabilityMissing ? "需要升级 Hub Agent: " + row.capabilityMissing.join(", ") : "请查看操作进度和高级诊断。");
      return '<div class="errorRow" title="' + escAttr(suggestion) + '">' +
        '<span class="errorRowCommand" title="原始命令：' + escAttr(rawCommand) + '">' + esc(commandLabel) + '</span>' +
        '<span class="errorRowTime status-failed">' + esc(row.timestamp || "-") + '</span>' +
        '<span class="errorRowMessage status-failed">' + esc(row.message || "未知错误") + '</span>' +
        '<span class="errorRowSuggestion" title="' + escAttr(suggestion) + '">下一步：' + esc(compactText(suggestion, 160)) + '</span>' +
      '</div>';
    }

    function buttonPayloadAttributes(payload) {
      const nameMap = {
        endpointId: "endpoint-id",
        planFile: "plan-file",
        planRevision: "plan-revision",
        planId: "plan-id",
        file: "file",
        runKey: "run-key",
        taskUiKey: "task-ui-key",
        experimentId: "experiment-id",
        archiveKey: "archive-key",
        experimentIndex: "experiment-index",
        gpuId: "gpu-id",
        workerId: "worker-id",
        remotePath: "remote-path",
        confirmationPath: "confirmation-path",
        artifactPath: "artifact-path",
        resultPath: "result-path",
        logPath: "log-path",
        savePlan: "save-plan",
        sourcePath: "source-path",
        sourceLabel: "source-label",
        presentationPath: "presentation-path",
        chartType: "chart-type",
        styleMode: "style-mode"
      };
      return Object.keys(payload || {}).map((key) => {
        if (key === "batchSelected") return "";
        const attr = nameMap[key];
        if (!attr) return "";
        return ' data-' + attr + '="' + escAttr(payload[key]) + '"';
      }).join("");
    }

    function actionButton(label, command, options) {
      options = options || {};
      const savedPayload = sanitizeActionPayload(options.payload || {});
      const batchPayload = options.batch ? Object.assign({ batchSelected: "true" }, selectedTaskPayloadFromState(lastState || {})) : {};
      const pendingPayload = Object.assign({}, savedPayload, batchPayload);
      const reason = options.disabledReason || actionButtonDisableReason(command, pendingPayload, options);
      const pendingKey = pendingKeyForAction(command, pendingPayload);
      const pending = pendingButtonKeys.has(pendingKey);
      const disabled = reason || pending ? " disabled" : "";
      const titleText = reason || (pending ? "执行中" : commandHelp(command));
      const title = titleText ? ' title="' + escAttr(titleText) + '" aria-label="' + escAttr(label + "：" + titleText) + '"' : "";
      const confirmAttr = options.confirm ? ' data-confirm="true"' : "";
      const dangerAttr = options.danger ? ' data-danger="true"' : "";
      const batchAttr = options.batch ? ' data-batch-selected="true"' : "";
      const configScopeAttr = options.configScope ? ' data-config-scope="' + escAttr(options.configScope) + '"' : "";
      const actionIdAttr = options.actionId ? ' data-action-id="' + escAttr(options.actionId) + '"' : "";
      const actionSectionAttr = options.actionSection ? ' data-action-section="' + escAttr(options.actionSection) + '"' : "";
      return '<button data-command="' + escAttr(command) + '" data-pending-key="' + escAttr(pendingKey) + '"' + buttonPayloadAttributes(savedPayload) + actionIdAttr + actionSectionAttr + ' data-context-action="true"' + disabled + title + confirmAttr + dangerAttr + batchAttr + configScopeAttr + '>' + loadingPrefix(pending) + esc(label) + '</button>';
    }

    function actionButtonDisableReason(command, payload, options) {
      const strictReason = scopedActionMissingContextReason(command, payload, options || {});
      if (strictReason) return strictReason;
      const rowScoped = taskObjectScopedCommands.has(command) && hasTaskObjectTarget(payload) && String(payload.batchSelected || "") !== "true";
      return rowScoped ? rowActionDisableReason(lastState, command, payload) : disableReason(lastState, command, payload);
    }

    function scopedActionMissingContextReason(command, payload, options) {
      payload = payload || {};
      options = options || {};
      const storedAction = Boolean(options.actionId || options.actionSection || options.savedAction);
      const batchAction = Boolean(options.batch || String(payload.batchSelected || "") === "true");
      if (batchAction && taskBatchScopedCommands.has(command) && !hasTaskBatchTarget(payload)) return "请先在任务表勾选实验";
      if (storedAction && taskObjectScopedCommands.has(command) && !batchAction && !hasTaskObjectTarget(payload)) return "该固定按钮缺少任务标识，请从任务行重新加入工作详情或右侧置顶";
      if (storedAction && endpointScopedCommands.has(command) && !payload.endpointId) return "该固定按钮缺少服务器标识，请从服务器行重新加入工作详情或右侧置顶";
      if (storedAction && explicitPlanFileCommands.has(command) && !(payload.planFile || payload.file)) return "该固定按钮缺少 planFile，请从计划行重新加入工作详情或右侧置顶";
      if (storedAction && explicitSavePlanCommands.has(command) && !payload.savePlan) return "该固定按钮缺少计划草稿标识，请从计划编辑区重新加入工作详情或右侧置顶";
      return "";
    }

    function hasTaskObjectTarget(payload) {
      return Boolean(payload && (usableTaskKey(payload.runKey) || usableTaskKey(payload.archiveKey) || usableTaskKey(payload.experimentId) || usableTaskKey(payload.taskUiKey)));
    }

    function hasTaskBatchTarget(payload) {
      if (!payload) return false;
      if (hasTaskObjectTarget(payload)) return true;
      return ["selectedRunKeys", "selectedExperimentIds", "selectedArchiveKeys", "selectedTaskUiKeys", "selectedLegacyTaskUiKeys", "selectedTaskTargets"].some((key) => asArray(payload[key]).length > 0);
    }
    function rowActionButton(label, command, row, visible, confirmFlag, dangerFlag) {
      if (!visible) return "";
      const archiveScoped = ["archiveArtifacts", "deleteArtifacts"].includes(command);
      const runKey = command === "selectLogRunKey" ? taskLogActionKey(row) : (archiveScoped ? "" : taskActionKeyForCommand(row, command));
      const experimentId = archiveScoped ? "" : row.experimentId;
      const archiveKey = archiveScoped ? taskArchiveActionKey(row) : row.archiveKey;
      const workerId = resolveWorkerId(row.serverId);
      const planFile = taskPlanFile(row);
      const confirmationPath = firstPathLike(row.resultPath, row.artifactPath, row.logPath);
      const context = { runKey, taskUiKey: row.uiKey, experimentId, archiveKey, workerId, experimentIndex: row.experimentIndex, gpuId: row.gpuIds, planFile, confirmationPath, debugMode: row.debugMode === true, rowAction: true };
      const reason = rowActionDisableReason(lastState, command, context);
      const pendingKey = pendingKeyForAction(command, { runKey, taskUiKey: row.uiKey, experimentId, archiveKey, workerId, planFile, confirmationPath });
      const pending = pendingButtonKeys.has(pendingKey);
      const titleText = reason || (pending ? "执行中" : commandHelp(command));
      return '<button class="taskActionButton" data-command="' + escAttr(command) + '" data-pending-key="' + escAttr(pendingKey) + '" data-task-ui-key="' + escAttr(row.uiKey) + '" data-run-key="' + escAttr(runKey) + '" data-experiment-id="' + escAttr(experimentId) + '" data-archive-key="' + escAttr(archiveKey) + '" data-worker-id="' + escAttr(workerId) + '" data-experiment-index="' + escAttr(row.experimentIndex) + '" data-gpu-id="' + escAttr(arrayText(row.gpuIds)) + '" data-plan-file="' + escAttr(planFile) + '" data-confirmation-path="' + escAttr(confirmationPath) + '" data-artifact-path="' + escAttr(row.artifactPath) + '" data-result-path="' + escAttr(row.resultPath) + '" data-log-path="' + escAttr(row.logPath) + '" data-debug-mode="' + (row.debugMode ? "true" : "false") + '"' + (confirmFlag ? ' data-confirm="true"' : "") + (dangerFlag ? ' data-danger="true"' : "") + ((reason || pending) ? " disabled" : "") + (titleText ? ' title="' + escAttr(titleText) + '" aria-label="' + escAttr(label + "：" + titleText) + '"' : "") + '>' + loadingPrefix(pending) + esc(label) + '</button>';
    }
    function rowActionDisableReason(state, command, context) {
      const base = context || {};
      context = Object.assign({}, base, {
        runKey: usableTaskKey(base.runKey) ? base.runKey : "",
        archiveKey: usableTaskKey(base.archiveKey) ? base.archiveKey : "",
        experimentId: usableTaskKey(base.experimentId) ? base.experimentId : ""
      });
      if (command === "clearLegacyTasks") return context.taskUiKey ? "" : "该旧任务缺少本机 UI 标识，无法隐藏";
      if (command === "selectLogRunKey") return context.runKey ? "" : "该任务缺少可定位日志标识";
      const workerAction = directWorkerActionMap[command];
      if (workerAction) {
        const needsWorker = ["stopExperiment", "retryExperiment"].includes(command) || Boolean(context.workerId && context.workerId !== "-");
        if (needsWorker) {
          if (!context.workerId || context.workerId === "-") return "该任务缺少 Worker 标识，不能直发 Worker Agent";
          const workerMissing = missingWorkerActionCapabilities(state, context.workerId, workerAction);
          const canHubProjectFallback = ["archiveArtifacts", "deleteArtifacts"].includes(command) && Boolean(context.runKey || context.archiveKey);
          if (workerMissing.length && !canHubProjectFallback) return "需要升级或检测 Worker Agent: " + workerMissing.join(", ");
        }
      }
      if (["archiveArtifacts", "deleteArtifacts"].includes(command)) {
        if (!context.runKey && !context.archiveKey) return "旧任务缺少可操作标识";
      } else if (!context.runKey) {
        return "旧任务缺少可操作标识";
      }
      return disableReason(state, command, context);
    }
    function disableReason(state, command, context) {
      context = context || {};
      const debugReason = debugModeDisableReason(command, context.debugMode === true ? "debug" : undefined);
      if (debugReason) return debugReason;
      const contextRunKey = usableTaskKey(context.runKey) ? context.runKey : "";
      const contextArchiveKey = usableTaskKey(context.archiveKey) ? context.archiveKey : "";
      if (state.connectionMode === "offline_import" && isRemoteAction(command)) return "离线导入不能执行远端操作";
      if (command === "clearLegacyTasks") return "";
      const simpleSftpReason = simpleSftpCommandDisableReason(state, command);
      if (simpleSftpReason) return simpleSftpReason;
      const capabilityReadiness = uiCapabilityReadinessForStateCommand(state, command);
      const keys = capabilityReadiness.keys;
      const missing = capabilityReadiness.missing.slice();
      const workerMissing = missingNoHubWorkerResultCapabilities(state, command, keys, context);
      if (workerMissing) missing.splice(0, missing.length, ...workerMissing);
      if (missing.length) return (workerMissing ? "需要升级或检测 Worker Agent: " : "需要升级或检测 Hub Agent: ") + missing.join(", ");
      const health = (state.health || {}).state;
      if (isRemoteAction(command) && state.connectionMode !== "offline_import" && health && ["local_port_closed", "agent_unreachable", "not_configured"].includes(health) && !hasRealtimeSignal(state)) return "tunnel 未连接";
      if (command === "startAll" && !hasAnyTunnelSession(state)) return "请先配置 Hub 或 Worker 的 Xshell 隧道会话";
      if (command === "startAgents" && !hasAnyTunnelSession(state)) return "请先配置 Hub 或 Worker 的 Xshell 隧道会话";
      if (command === "startAllConnections" && !hasAnyTunnelSession(state)) return "请先配置 Xshell 隧道会话";
      if (command === "prepareAgents" && !serverSetupReadiness(state).ready) return "请先配置 Hub/Worker 的 Xshell 会话和项目父目录";
      if (command === "prepareAgents") {
        const preparationBlockers = agentPreparationBlockersFromState(state);
        if (preparationBlockers.length) return preparationBlockers[0];
      }
      if (["validatePlan", "dryRunPlan", "runPlan", "reproducePlan"].includes(command) && !hasSelectedPlan(state, context)) return "请先输入或选择 planFile";
      if (command === "archivePlan" && !hasSelectedPlan(state) && !(context && context.planFile)) return "请先输入或选择 planFile";
      if (command === "runAllPlans" && !asArray(state.plans || state.recentPlans || []).length) return "没有可运行的计划文件";
      if (["runPlan", "reproducePlan"].includes(command)) {
        const planFile = String(context.planFile || context.planId || state.planFileInput || ((state.selection || {}).selectedPlanId) || "");
        const plan = typeof planFromContext === "function" ? planFromContext(state, { planFile }) || {} : {};
        const activity = planActiveRunEvidence(state, planFile, plan);
        if (activity.active) {
          if (activity.historicalOnly) return "同一路径的旧 Plan revision 仍有 " + activity.taskCount + " 个任务和 " + activity.operationCount + " 个提交操作未结束；为保护旧任务，当前版本暂不能提交，请查看全部任务";
          return "当前 Plan 已有 " + activity.taskCount + " 个任务和 " + activity.operationCount + " 个提交操作未结束，不能重复提交";
        }
      }
      if (["runPlan", "reproducePlan", "runAllPlans"].includes(command) && !executionWorkerReadiness(state).ready) return "至少配置并启用一个执行 Worker";
      const endpointReadiness = projectEndpointReadiness(state);
      if (["validatePlan", "dryRunPlan"].includes(command) && !endpointReadiness.hubReady) return endpointReadiness.missing[0] || "Hub Agent 未通过当前项目检测";
      if (["runPlan", "reproducePlan", "runAllPlans"].includes(command) && !endpointReadiness.ready) return endpointReadiness.summary;
      if (["runPlan", "reproducePlan"].includes(command)) {
        const outputGateReason = projectOutputGateReason(state, context);
        if (outputGateReason) return outputGateReason;
      }
      if (command === "retryExperiment" && String(context.batchSelected || "") === "true") {
        const selectedPlanFiles = uniqueText(asArray(context.selectedPlanFiles || []).map((item) => String(item || "").trim()).filter(Boolean));
        const hasBatchTargets = asArray(context.selectedTaskTargets || []).length || asArray(context.selectedTaskUiKeys || []).length || hasSelectedExperiment(state);
        if (hasBatchTargets && selectedPlanFiles.length > 1) return "批量重试需要选中的任务来自同一个 plan；请按计划分批选择。";
        if (hasBatchTargets && selectedPlanFiles.length === 0) return "批量重试需要任务带有所属 planFile；旧任务缺少 plan 时不能安全重试。";
      }
      if (["stopExperiment", "retryExperiment"].includes(command) && !contextRunKey && !hasSelectedExperiment(state)) return "请先在任务表勾选实验";
      if (["archiveArtifacts", "deleteArtifacts"].includes(command) && !contextRunKey && !contextArchiveKey && !hasSelectedExperiment(state) && !hasSelectedArchive(state)) return "请先选择实验或归档项";
      if (command === "downloadDebugBundle" && !state.debugBundlePath) return "请先生成调试包并等待完成";
      return "";
    }
    function isRemoteAction(command) {
      return Boolean(uiCapabilityMap[command]);
    }
    function hasRealtimeSignal(state) {
      const status = String(((state.realtime || {}).streamStatus) || "");
      return ["websocket", "sse", "polling", "mixed"].includes(status) || Boolean(state.lastSnapshotAt);
    }
    function hasAnyTunnelSession(state) {
      const setup = state.setup || {};
      return Boolean(setup.savedSessionPath || asArray(setup.workerTunnels || []).some((worker) => worker.enabled !== false && worker.savedSessionPath));
    }
    function hasAnyAgentSession(state) {
      const setup = state.setup || {};
      return hasAnyTunnelSession(state);
    }
    function hasSelectedPlan(state, context) {
      return Boolean((context && (context.planFile || context.planId)) || state.planFileInput || ((state.selection || {}).selectedPlanId));
    }
    function planLookupIndexForState(state) {
      const data = state || {};
      const source = data.plans && data.plans.length
        ? data.plans
        : (Array.isArray(data.recentPlans) ? data.recentPlans : EMPTY_PLAN_ROWS_FOR_LOOKUP);
      if (source === planLookupIndexCacheSource) return planLookupIndexCacheValue;
      const index = new Map();
      source.forEach((plan, rowIndex) => {
        if (!plan || typeof plan !== "object") return;
        const file = String(plan.file || plan.planFile || plan.path || "");
        const id = String(plan.planId || file || "");
        [file, id].filter(Boolean).forEach((key) => {
          if (!index.has(key)) index.set(key, { plan, rowIndex });
        });
      });
      planLookupIndexCacheSource = source;
      planLookupIndexCacheValue = index;
      return index;
    }
    function planFromContext(state, context) {
      const planFile = String((context && context.planFile) || state.planFileInput || ((state.selection || {}).selectedPlanId) || "");
      const planId = String((context && context.planId) || planFile || "");
      if (!planFile && !planId) return undefined;
      const index = planLookupIndexForState(state);
      const fileMatch = planFile ? index.get(planFile) : null;
      const idMatch = planId ? index.get(planId) : null;
      if (!fileMatch) return idMatch && idMatch.plan;
      if (!idMatch) return fileMatch.plan;
      return (fileMatch.rowIndex <= idMatch.rowIndex ? fileMatch : idMatch).plan;
    }
    function planMayBeOmittedFromWebview(state, context) {
      const planFile = String((context && (context.planFile || context.planId)) || state.planFileInput || ((state.selection || {}).selectedPlanId) || "");
      return Boolean(planFile && Number(state.plansOmittedCount || 0) > 0 && !planFromContext(state, context || {}));
    }
    function planOutputCandidates(plan) {
      const source = plan && typeof plan === "object" ? plan : null;
      if (!source) return EMPTY_OUTPUT_DERIVATION_VALUES;
      const cached = planOutputCandidatesCache.get(source);
      if (cached) return cached;
      const value = uniqueText(asArray(source.outputCandidates || []).map((item) => String(item || "").trim()).filter(Boolean));
      planOutputCandidatesCache.set(source, value);
      return value;
    }
    function planOutputEvidenceCandidates(plan) {
      const source = plan && typeof plan === "object" ? plan : null;
      if (!source) return EMPTY_OUTPUT_DERIVATION_VALUES;
      const cached = planOutputEvidenceCandidatesCache.get(source);
      if (cached) return cached;
      const value = planOutputCandidates(source).filter(isParseableResultCandidate);
      planOutputEvidenceCandidatesCache.set(source, value);
      return value;
    }
    function planOutputEvidenceSignals(plan) {
      const source = plan && typeof plan === "object" ? plan : null;
      if (!source) return EMPTY_OUTPUT_DERIVATION_VALUES;
      const cached = planOutputEvidenceSignalsCache.get(source);
      if (cached) return cached;
      const value = uniqueText(asArray(source.outputSignals || [])
        .map((item) => String(item || "").trim())
        .filter((item) => /result_csv|results_csv|metrics_csv|summary_csv|标准契约|结果文件|结果目录|命令参数|文本日志|classification_report|stdout|stderr|metricRegex/i.test(item)));
      planOutputEvidenceSignalsCache.set(source, value);
      return value;
    }
    function isParseableResultCandidate(value) {
      const text = String(value || "").trim().replace(/\\\\/g, "/");
      const base = text.split("/").pop() || "";
      const lower = base.toLowerCase();
      if (!text || text.toLowerCase().startsWith("zlk_cluster/results/") || RESULT_METADATA_FILENAMES.has(lower) || RESULT_METADATA_SUFFIXES.some((suffix) => lower.endsWith(suffix))) return false;
      return /\\.(csv|json|txt|log|out)$/i.test(text);
    }
    function projectOutputGateReason(state, context) {
      const project = state.detectedProject || {};
      const plan = planFromContext(state, context || {});
      if (!plan && planMayBeOmittedFromWebview(state, context || {})) return "";
      const diagnostics = projectOutputGateDiagnostics(project, {}, plan);
      if (diagnostics.ok) return "";
      return "未识别到可用的结果捕获规则，已禁止运行。缺少：" + diagnostics.missing.join("、") + "。" + projectOutputGateFixes(diagnostics.missing, project).join("；") + "。推荐 metrics_summary.csv 列：experiment_id,suite,method,dataset,split,seed,metric,value。";
    }
    function projectOutputGateFixes(missing, project) {
      const adapterReady = Boolean((project || {}).adapterConfig);
      const fixes = {
        "接入配置": adapterReady ? "打开 experiments/zlk_project.yaml 补充候选结果规则，或在当前 plan 声明 result_csv、metrics_summary.csv、stdout/stderr 捕获" : "先在“实验准备 > 项目接入”点击“生成输出接入模板”，生成 experiments/zlk_project.yaml，或在当前 plan 声明 result_csv、metrics_summary.csv、stdout/stderr 捕获",
        "计划输出": "在 plan 的 paper.result_csv、runner.test_command --result-csv/--output-dir 或 expectedResults 中写明可解析结果位置",
        "候选结果规则": "补充 candidateCsv / candidateJson / consoleLogs / textLogs / metricRegex，或点击“保存接入规则”写入推断结果",
        "标准结果契约": "推荐让测试代码输出 metrics_summary.csv，或使用 run_wrapper 捕获 stdout/stderr 后归一化",
        "解析预览": "保存接入规则后点击“刷新识别”，确认至少一个候选输出能解析出指标"
      };
      return uniqueText((missing || []).map((item) => fixes[item] || ""));
    }
    function hasSelectedExperiment(state) {
      const selection = state.selection || {};
      return Boolean(selection.selectedRunKey || (selection.selectedRunKeys || []).length || (selection.selectedExperimentIds || []).length);
    }
    function hasSelectedArchive(state) {
      const selection = state.selection || {};
      return Boolean((selection.selectedArchiveKeys || []).length);
    }
    function hasCapability(state, key) {
      const caps = state.capabilities || {};
      const fileCaps = state.fileCapabilities || {};
      const endpoints = caps.endpoints || {};
      if (key === "endpoints.fileList") return Boolean(endpoints.fileList || fileCaps.supportsList);
      if (key === "endpoints.fileDownload") return Boolean(endpoints.fileDownload || fileCaps.supportsDownload);
      if (key === "endpoints.fileUploadChunk") return Boolean(endpoints.fileUploadChunk || fileCaps.supportsUploadChunk);
      if (key.startsWith("endpoints.")) return Boolean(endpoints[key.slice("endpoints.".length)]);
      if (key.startsWith("actions.")) {
        const action = key.slice("actions.".length);
        const actionEndpoints = caps.actionEndpoints || {};
        return Boolean(endpoints.actions && actionEndpoints[action] === true);
      }
      return false;
    }
    function uiCapabilityReadinessForStateCommand(state, command) {
      const data = state || {};
      const capabilities = data.capabilities && typeof data.capabilities === "object" ? data.capabilities : EMPTY_CAPABILITY_SOURCE;
      const endpoints = capabilities.endpoints && typeof capabilities.endpoints === "object" ? capabilities.endpoints : EMPTY_CAPABILITY_SOURCE;
      const actionEndpoints = capabilities.actionEndpoints && typeof capabilities.actionEndpoints === "object" ? capabilities.actionEndpoints : EMPTY_CAPABILITY_SOURCE;
      const fileCapabilities = data.fileCapabilities && typeof data.fileCapabilities === "object" ? data.fileCapabilities : EMPTY_CAPABILITY_SOURCE;
      const sourceKey = refListKey(capabilities, endpoints, actionEndpoints, fileCapabilities);
      if (sourceKey !== uiCapabilityReadinessCacheKey) {
        uiCapabilityReadinessCacheKey = sourceKey;
        uiCapabilityReadinessCache = new Map();
      }
      const commandKey = String(command || "");
      if (uiCapabilityReadinessCache.has(commandKey)) return uiCapabilityReadinessCache.get(commandKey);
      const keys = uiCapabilityMap[command] || [];
      const missing = keys.filter((key) => !hasCapability(state, key));
      const value = { keys, missing };
      uiCapabilityReadinessCache.set(commandKey, value);
      return value;
    }
    function missingNoHubWorkerResultCapabilities(state, command, keys, context) {
      const topology = (state || {}).topology || {};
      if (!["single_worker", "worker_pool"].includes(String(topology.mode || "")) || !noHubWorkerResultCommands.has(command)) return null;
      const targetIds = uniqueText([
        context && context.workerId,
        ...asArray((context || {}).selectedWorkerIds),
        ...asArray((context || {}).selectedTaskTargets).map((target) => target && target.workerId)
      ].map((value) => resolveWorkerId(value)).filter(Boolean));
      const workerIds = targetIds.length
        ? targetIds
        : enabledWorkerTunnelsForState(state).map((worker) => String(worker.id || "").trim()).filter(Boolean);
      if (!workerIds.length) return ["未配置可用 Worker"];
      const probes = state.workerProbes || {};
      return uniqueText(workerIds.flatMap((workerId) => {
        const probe = probes[workerId] || {};
        if (String(probe.status || "").toLowerCase() !== "ok") return [workerId + ": status." + String(probe.status || "missing")];
        const caps = probe.capabilities || {};
        const endpoints = caps.endpoints || {};
        const actions = caps.actionEndpoints || {};
        return keys.filter((key) => {
          if (key === "endpoints.resultsSummary") return endpoints.resultsSummary !== true;
          if (key.startsWith("actions.")) return endpoints.actions !== true || actions[key.slice("actions.".length)] !== true;
          return !hasCapability(state, key);
        }).map((key) => workerId + ": " + key);
      }));
    }
    function missingWorkerActionCapabilities(state, workerId, action) {
      const probes = state.workerProbes || {};
      const probe = probes[workerId] || {};
      if (probe.status && probe.status !== "ok") return ["Worker Agent " + probe.status];
      const caps = probe.capabilities || {};
      const endpoints = caps.endpoints || {};
      const actionEndpoints = caps.actionEndpoints || {};
      if (!endpoints.actions) return ["endpoints.actions"];
      return actionEndpoints[action] === true ? [] : ["actions." + action];
    }
    function endpointEnabled(state, endpointId) {
      const registry = state.endpointRegistry || {};
      const endpoints = registry.endpoints || [];
      const found = endpoints.find((endpoint) => String(endpoint.id) === String(endpointId));
      return !found || found.enabled !== false;
    }
    function probeStatus(state, endpointId) {
      if (String(endpointId) === "hub") return (state.probe && state.probe.status) || "-";
      const probes = state.workerProbes || {};
      const probe = probes[endpointId] || {};
      return probe.status || "-";
    }
    function runModeForButton(button, command, fallbackMode) {
      const data = (button || {}).dataset || {};
      if (["runPlan", "reproducePlan"].includes(String(command || ""))) {
        if (data.forceFormal === "true") return false;
        if (data.debugMode !== undefined) return data.debugMode === "true";
      }
      return String(fallbackMode || "formal") === "debug";
    }
    function payloadFromButton(button) {
      const payload = {};
      const command = button.dataset.command || "";
      payload.debugMode = runModeForButton(button, command, runMode);
      if (button.dataset.endpointId) payload.endpointId = button.dataset.endpointId;
      if (button.dataset.configScope) {
        payload.configScope = button.dataset.configScope;
        const patch = {};
        document.querySelectorAll('[data-config-input="' + button.dataset.configScope.replace(/"/g, '\\"') + '"]').forEach((input) => {
          patch[input.dataset.key] = configInputValue(input);
        });
        payload.patch = patch;
      }
      const planCommand = ["validatePlan", "dryRunPlan", "runPlan", "reproducePlan", "archivePlan", "restoreArchivedPlan", "savePlan"].includes(command);
      if (button.dataset.planFile) payload.planFile = button.dataset.planFile;
      else if (planCommand && el("planFileInput")) payload.planFile = el("planFileInput").value;
      if (!payload.planFile && command === "archivePlan" && el("planFileInput")) payload.planFile = el("planFileInput").value;
      if (button.dataset.planId) payload.planId = button.dataset.planId;
      if (button.dataset.file) {
        payload.file = button.dataset.file;
        payload.planFile = payload.planFile || button.dataset.file;
      }
      if (button.dataset.savePlan) {
        payload.savePlan = button.dataset.savePlan;
        const input = el("plan-preview-" + button.dataset.savePlan);
        if (input) payload.text = input.value;
      }
      if (button.dataset.runKey) payload.runKey = button.dataset.runKey;
      if (button.dataset.taskUiKey) payload.taskUiKey = button.dataset.taskUiKey;
      if (button.dataset.experimentId) payload.experimentId = button.dataset.experimentId;
      if (button.dataset.archiveKey) payload.archiveKey = button.dataset.archiveKey;
      if (button.dataset.experimentIndex) payload.experimentIndex = button.dataset.experimentIndex;
      if (button.dataset.gpuId) payload.gpuId = button.dataset.gpuId;
      if (button.dataset.workerId) payload.workerId = button.dataset.workerId;
      if (button.dataset.batchSelected === "true") Object.assign(payload, selectedTaskPayload());
      if (["archiveArtifacts", "deleteArtifacts"].includes(command) && button.dataset.batchSelected === "true") {
        payload.selectedRunKeys = [];
        payload.selectedExperimentIds = [];
      }
      if (button.dataset.clearLegacyVisible === "true") {
        payload.selectedLegacyTaskUiKeys = cleanSelectedValues(String(button.dataset.legacyTaskUiKeys || "").split("|"), []);
        payload.selectedTaskUiKeys = payload.selectedLegacyTaskUiKeys;
      }
      if (button.dataset.remotePath) payload.remotePath = button.dataset.remotePath;
      if (button.dataset.confirmationPath) payload.confirmationPath = button.dataset.confirmationPath;
      if (button.dataset.artifactPath) payload.artifactPath = button.dataset.artifactPath;
      if (button.dataset.resultPath) payload.resultPath = button.dataset.resultPath;
      if (button.dataset.logPath) payload.logPath = button.dataset.logPath;
      if (button.dataset.sourcePath) payload.sourcePath = button.dataset.sourcePath;
      if (button.dataset.sourceLabel) payload.sourceLabel = button.dataset.sourceLabel;
      if (button.dataset.presentationPath) payload.presentationPath = button.dataset.presentationPath;
      if (button.dataset.chartType) payload.chartType = button.dataset.chartType;
      if (button.dataset.styleMode) payload.styleMode = button.dataset.styleMode;
      if (command === "selectLogRunKey") payload.runKey = button.dataset.runKey;
      return payload;
    }

    function debugModeBlockedUiCommand(command) {
      return DEBUG_MODE_BLOCKED_UI_COMMANDS.has(String(command || ""));
    }

    function debugModeDisableReason(command, mode) {
      const activeMode = mode === undefined ? (typeof runMode === "undefined" ? "formal" : runMode) : mode;
      return String(activeMode || "formal") === "debug" && debugModeBlockedUiCommand(command) ? "Debug 模式禁止归档、删除、结果、统计、论文和 PPT 操作" : "";
    }

    function refreshRunModeUi() {
      document.body.classList.toggle("debug-run-mode", runMode === "debug");
      document.querySelectorAll("button[data-run-mode]").forEach((button) => {
        const active = (button.dataset.runMode === "debug") === (runMode === "debug");
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-pressed", active ? "true" : "false");
      });
      const note = el("runModeNote");
      if (note) note.textContent = runModeGuidance(lastState || {});
      const state = lastState || {};
      refreshPlanActionButtons(state, el("planQuickGrid"));
      refreshContextualActionButtons(state, el("workbenchInspector"));
      refreshContextualActionButtons(state, el("pinnedActionsHost"));
      renderSectionIfVisible(state, "overview", { force: true });
      renderSectionIfVisible(state, "tasks", { force: true });
      renderSectionIfVisible(state, "results", { force: true });
      syncRunModeActionLabels(document);
    }

    function syncRunModeActionLabels(root) {
      const scope = root && root.querySelectorAll ? root : document;
      const cache = refreshRootDataset(scope);
      const signature = [String(postRenderButtonDomVersion), runMode, rootRefreshIdentity(scope)].join("::");
      if (cache && cache.runModeActionLabelSig === signature) return;
      if (cache) cache.runModeActionLabelSig = signature;
      scope.querySelectorAll('button[data-command="runPlan"]').forEach((button) => {
        if (button.dataset.forceFormal === "true" || button.classList.contains("is-loading")) return;
        if (!button.dataset.formalRunLabel) button.dataset.formalRunLabel = cleanButtonLabel(button) || "校验并提交运行";
        const label = runModeActionLabel(runMode, button.dataset.formalRunLabel);
        if (cleanButtonLabel(button) !== label) button.textContent = label;
        const title = button.title || "";
        button.setAttribute("aria-label", title ? label + "：" + title : label);
      });
    }

    function runModeActionLabel(mode, formalLabel) {
      return String(mode || "formal") === "debug" ? "Debug 运行" : String(formalLabel || "校验并提交运行");
    }

    function refreshRunModeNote(state) {
      const note = el("runModeNote");
      if (note) note.textContent = runModeGuidance(state || {});
    }

    function runModeGuidance(state) {
      if (runMode === "debug") return "仅运行首个任务，实时日志与产物隔离；禁止归档、结果、统计、论文和 PPT";
      const planFile = String((state || {}).planFileInput || (((state || {}).selection || {}).selectedPlanId) || "").trim();
      if (!planFile) return "完整执行 Plan，结果进入正式闭环";
      const plan = planFromContext(state || {}, { planFile }) || {};
      const stage = planExecutionStage(state || {}, planFile);
      if (stage.phase === "debug-review") return "Debug 已完成；先复核任务与日志，再正式运行完整 Plan";
      if (["ready", "validate", "dry-run"].includes(String(stage.phase || "")) && !currentPlanRevisionRunEvidenceForState(state || {}, planFile, plan)) {
        return "首次运行建议先选择 Debug：只提交首个任务，确认日志和输出后再正式运行";
      }
      return "完整执行 Plan，结果进入正式闭环";
    }

    function configInputValue(input) {
      if (!input) return "";
      if (input.tagName === "SELECT" || input.tagName === "TEXTAREA") return input.value;
      if (input.type === "number") {
        const raw = String(input.value || "").trim();
        return raw === "" ? "" : Number(raw);
      }
      return input.value;
    }

    function selectedTaskPayload() {
      const selection = (lastState && lastState.selection) || {};
      const cacheKey = selectedTaskPayloadVersion + "::" + stableSectionSignature(selection);
      if (selectedTaskPayloadCache && selectedTaskPayloadCacheKey === cacheKey) return cloneSelectedTaskPayload(selectedTaskPayloadCache);
      const allBoxes = Array.from(document.querySelectorAll('input[type="checkbox"][data-command="selectExperiment"]'));
      const boxes = allBoxes.filter((box) => box.checked);
      if (!boxes.length) {
        selectedTaskPayloadCacheKey = cacheKey;
        selectedTaskPayloadCache = emptySelectedTaskPayload(true);
        return cloneSelectedTaskPayload(selectedTaskPayloadCache);
      }
      const fallbackRunKeys = selection.selectedRunKeys && selection.selectedRunKeys.length ? selection.selectedRunKeys : (selection.selectedRunKey ? [selection.selectedRunKey] : []);
      const selectedRunKeys = cleanSelectedValues(boxes.map((box) => box.dataset.actionKey || box.dataset.runKey), fallbackRunKeys);
      const selectedExperimentIds = cleanSelectedValues(boxes.map((box) => box.dataset.experimentId), selection.selectedExperimentIds || []);
      const selectedArchiveKeys = cleanSelectedValues(boxes.map((box) => box.dataset.archiveKey), selection.selectedArchiveKeys || []);
      const selectedWorkerIds = cleanSelectedValues(boxes.map((box) => box.dataset.workerId), selection.selectedWorkerIds || []);
      const selectedTaskUiKeys = cleanSelectedValues(boxes.map((box) => box.dataset.taskUiKey), selection.selectedTaskUiKeys || []);
      const selectedPlanFiles = cleanSelectedValues(boxes.map((box) => box.dataset.planFile), []);
      const selectedLegacyTaskUiKeys = cleanSelectedValues(boxes.filter((box) => !usableTaskKey(box.dataset.actionKey)).map((box) => box.dataset.taskUiKey), []);
      const selectedTaskTargets = boxes.map((box) => ({
        workerId: cleanSelectionValue(box.dataset.workerId),
        taskUiKey: cleanSelectionValue(box.dataset.taskUiKey),
        runKey: cleanSelectionValue(box.dataset.actionKey || box.dataset.runKey),
        experimentId: cleanSelectionValue(box.dataset.experimentId),
        archiveKey: cleanSelectionValue(box.dataset.archiveKey),
        planFile: cleanSelectionValue(box.dataset.planFile),
        planRevision: cleanSelectionValue(box.dataset.planRevision),
        artifactPath: cleanSelectionValue(box.dataset.artifactPath),
        resultPath: cleanSelectionValue(box.dataset.resultPath),
        logPath: cleanSelectionValue(box.dataset.logPath),
        debugMode: box.dataset.debugMode === "true"
      })).filter((target) => target.workerId || target.runKey || target.experimentId || target.archiveKey || target.taskUiKey);
      const selectedPlanRevisions = cleanSelectedValues(boxes.map((box) => box.dataset.planRevision), []);
      const payload = { selectedRunKeys, selectedExperimentIds, selectedArchiveKeys, selectedWorkerIds, selectedTaskUiKeys, selectedPlanFiles, selectedPlanRevisions, selectedLegacyTaskUiKeys, selectedTaskTargets, debugMode: selectedTaskTargets.some((target) => target.debugMode) };
      if (selectedPlanFiles.length === 1) payload.planFile = selectedPlanFiles[0];
      if (selectedPlanRevisions.length === 1) payload.planRevision = selectedPlanRevisions[0];
      else payload.suppressGlobalPlan = true;
      selectedTaskPayloadCacheKey = cacheKey;
      selectedTaskPayloadCache = payload;
      return cloneSelectedTaskPayload(selectedTaskPayloadCache);
    }

    function invalidateSelectedTaskPayload() {
      selectedTaskPayloadVersion = (selectedTaskPayloadVersion + 1) % 1000000;
      selectedTaskPayloadCacheKey = "";
      selectedTaskPayloadCache = null;
      selectedTaskStateRowsCacheKey = "";
      selectedTaskStateRowsCache = [];
      selectedTaskStatePayloadCacheKey = "";
      selectedTaskStatePayloadCache = null;
    }

    function cloneSelectedTaskPayload(payload) {
      const source = payload || emptySelectedTaskPayload(true);
      const out = Object.assign({}, source);
      ["selectedRunKeys", "selectedExperimentIds", "selectedArchiveKeys", "selectedWorkerIds", "selectedTaskUiKeys", "selectedPlanFiles", "selectedPlanRevisions", "selectedLegacyTaskUiKeys"].forEach((key) => {
        out[key] = Array.isArray(source[key]) ? source[key].slice() : [];
      });
      out.selectedTaskTargets = Array.isArray(source.selectedTaskTargets) ? source.selectedTaskTargets.map((target) => Object.assign({}, target)) : [];
      return out;
    }

    function emptySelectedTaskPayload(suppressGlobalTaskSelection) {
      const payload = {
        selectedRunKeys: [],
        selectedExperimentIds: [],
        selectedArchiveKeys: [],
        selectedWorkerIds: [],
        selectedTaskUiKeys: [],
        selectedPlanFiles: [],
        selectedPlanRevisions: [],
        selectedLegacyTaskUiKeys: [],
        selectedTaskTargets: []
      };
      if (suppressGlobalTaskSelection) payload.suppressGlobalTaskSelection = true;
      payload.suppressGlobalPlan = true;
      return payload;
    }

    function selectedTaskPayloadFromState(state) {
      const selection = (state && state.selection) || {};
      const rows = selectedTaskRowsFromState(state || {});
      const cacheKey = selectedTaskStateRowsCacheKey + "::payload::" + selectedTaskRowsSignature(rows);
      if (selectedTaskStatePayloadCache && selectedTaskStatePayloadCacheKey === cacheKey) return cloneSelectedTaskPayload(selectedTaskStatePayloadCache);
      const fallbackRunKeys = selection.selectedRunKeys && selection.selectedRunKeys.length ? selection.selectedRunKeys : (selection.selectedRunKey ? [selection.selectedRunKey] : []);
      const selectedRunKeys = cleanSelectedValues(rows.map((row) => taskActionKey(row)), fallbackRunKeys);
      const selectedExperimentIds = cleanSelectedValues(rows.map((row) => row.experimentId), selection.selectedExperimentIds || []);
      const selectedArchiveKeys = cleanSelectedValues(rows.map((row) => taskArchiveActionKey(row)), selection.selectedArchiveKeys || []);
      const selectedWorkerIds = cleanSelectedValues(rows.map((row) => resolveWorkerId(row.serverId)), selection.selectedWorkerIds || []);
      const selectedTaskUiKeys = cleanSelectedValues(rows.map((row) => row.uiKey), selection.selectedTaskUiKeys || []);
      const selectedPlanFiles = cleanSelectedValues(rows.map((row) => taskPlanFile(row)), []);
      const selectedPlanRevisions = cleanSelectedValues(rows.map((row) => row.planRevision), []);
      const selectedLegacyTaskUiKeys = cleanSelectedValues(rows.filter((row) => !usableTaskKey(taskActionKey(row))).map((row) => row.uiKey), []);
      const selectedTaskTargets = rows.map((row) => ({
        workerId: cleanSelectionValue(resolveWorkerId(row.serverId)),
        taskUiKey: cleanSelectionValue(row.uiKey),
        runKey: cleanSelectionValue(taskActionKey(row)),
        experimentId: cleanSelectionValue(row.experimentId),
        archiveKey: cleanSelectionValue(taskArchiveActionKey(row)),
        planFile: cleanSelectionValue(taskPlanFile(row)),
        planRevision: cleanSelectionValue(row.planRevision),
        artifactPath: cleanSelectionValue(row.artifactPath),
        resultPath: cleanSelectionValue(row.resultPath),
        logPath: cleanSelectionValue(row.logPath),
        debugMode: row.debugMode === true
      })).filter((target) => target.workerId || target.runKey || target.experimentId || target.archiveKey || target.taskUiKey);
      const payload = { selectedRunKeys, selectedExperimentIds, selectedArchiveKeys, selectedWorkerIds, selectedTaskUiKeys, selectedPlanFiles, selectedPlanRevisions, selectedLegacyTaskUiKeys, selectedTaskTargets, debugMode: selectedTaskTargets.some((target) => target.debugMode) };
      if (selectedPlanFiles.length === 1) payload.planFile = selectedPlanFiles[0];
      if (selectedPlanRevisions.length === 1) payload.planRevision = selectedPlanRevisions[0];
      else payload.suppressGlobalPlan = true;
      selectedTaskStatePayloadCacheKey = cacheKey;
      selectedTaskStatePayloadCache = payload;
      return cloneSelectedTaskPayload(payload);
    }

    function selectedTaskRowsFromState(state) {
      const selection = (state && state.selection) || {};
      const rows = schedulerRowsForState(state || {});
      const cacheKey = [
        selectedTaskPayloadVersion,
        schedulerRowsCacheSignature,
        stableSectionSignature({
          selectedTaskUiKeys: selection.selectedTaskUiKeys || [],
          selectedRunKeys: selection.selectedRunKeys || [],
          selectedExperimentIds: selection.selectedExperimentIds || [],
          selectedArchiveKeys: selection.selectedArchiveKeys || [],
          selectedRunKey: selection.selectedRunKey || ""
        })
      ].join("::");
      if (selectedTaskStateRowsCacheKey === cacheKey) return selectedTaskStateRowsCache;
      const selected = taskSelectionSetsForState(state);
      const selectedRows = (!selected.uiKeys.size && !selected.operationKeys.size) ? [] : rows.filter((row) => isTaskRowSelected(row, selected));
      selectedTaskStateRowsCacheKey = cacheKey;
      selectedTaskStateRowsCache = selectedRows;
      return selectedTaskStateRowsCache;
    }

    function selectedTaskRowsSignature(rows) {
      return asArray(rows).map((row) => [row.uiKey, taskActionKey(row), taskArchiveActionKey(row), row.serverId, taskPlanFile(row), row.artifactPath, row.resultPath, row.logPath].join("~")).join("|");
    }

    function cleanSelectionValue(value) {
      const text = String(value || "").trim();
      return text && text !== "-" ? text : "";
    }

    function cleanSelectedValues(values, fallback) {
      const cleaned = values.map((value) => String(value || "").trim()).filter((value) => value && value !== "-");
      const source = cleaned.length ? cleaned : asArray(fallback).map((value) => String(value || "").trim()).filter((value) => value && value !== "-");
      return Array.from(new Set(source));
    }

    function normalizeServerGpu(serverId, rows) {
      const rawRows = Array.isArray(rows) ? rows : asArray(pick(rows, ["gpus", "gpu", "rows"], []));
      const gpuRows = rawRows.map(normalizeGpuRow);
      return {
        serverId,
        workerId: pick(rows, ["workerId", "worker_id", "worker"], serverId),
        gpuRows,
        status: String(pick(rows, ["status", "state"], gpuRows.length ? "online" : "stale")).toLowerCase(),
        updatedAt: pick(rows, ["updatedAt", "updated_at", "generatedAt", "generated_at", "timestamp"], "-"),
        source: pick(rows, ["source", "telemetrySource", "telemetry_source"], "-")
      };
    }
    function normalizeGpuRow(row) {
      const memoryUsedMb = numberOrDash(pick(row, ["memoryUsedMb", "memory_used_mb", "memoryUsed", "used"], "-"));
      const memoryTotalMb = numberOrDash(pick(row, ["memoryTotalMb", "memory_total_mb", "memoryTotal", "total"], "-"));
      const processes = normalizeGpuProcesses(pick(row, ["processes", "procs"], []));
      const runKey = pick(row, ["runKey", "run_key", "assignedExperiment", "assignedRunKey", "experiment", "experimentId"], "-");
      const processCount = pick(row, ["processCount", "process_count", "processesTotalCount", "processes_total_count"], processes.length);
      return {
        index: pick(row, ["index", "gpu_index"], pick(row, ["id", "gpuId", "gpu_id"], "-")),
        id: pick(row, ["id", "gpuId", "gpu_id", "uuid"], "-"),
        name: pick(row, ["name", "gpu_name", "model"], "-"),
        memoryUsedMb,
        memoryTotalMb,
        memoryPercent: percent(memoryUsedMb, memoryTotalMb),
        utilizationPercent: pick(row, ["utilization", "utilizationPercent", "gpu_util", "utilization_gpu"], "-"),
        temperature: pick(row, ["temperature", "temperatureGpu", "temperature_gpu", "temp"], "-"),
        processCount,
        processOmittedCount: pick(row, ["processesOmittedCount", "processes_omitted_count", "processOmittedCount", "process_omitted_count"], 0),
        processes,
        runKey,
        busy: processes.length > 0 || Number(processCount) > 0 || (runKey && runKey !== "-")
      };
    }
    function normalizeGpuProcesses(value) {
      return asArray(value).map((proc) => ({
        pid: pick(proc, ["pid", "processId", "process_id"], "-"),
        name: pick(proc, ["processName", "process_name", "name", "exe", "program", "command"], "-"),
        memoryMb: pick(proc, ["usedMemoryMb", "used_memory_mb", "memoryMb", "memory"], "-"),
        user: pick(proc, ["username", "user", "owner"], "-"),
        command: pick(proc, ["command", "cmd", "commandLine", "cmdline", "args"], "-")
      }));
    }
    function normalizeSchedulerRows(rows) {
      return normalizeExpandedSchedulerRows(asArray(rows).flatMap(expandSchedulerRow));
    }
    function normalizeExpandedSchedulerRows(rows) {
      return asArray(rows).map((row, index) => normalizeTaskRow(row, index)).filter((row) => row.status !== "deleted").sort((a, b) => taskStatusRank(a.status) - taskStatusRank(b.status) || naturalCompare(a.uiKey, b.uiKey));
    }
    let schedulerRowsCacheState = null;
    let schedulerRowsCacheSource = null;
    let schedulerRowsCacheSignature = "";
    let schedulerRowsCacheRows = [];
    function schedulerRowsForState(state) {
      const source = (state && state.schedulerStates) || EMPTY_SCHEDULER_STATES;
      if (schedulerRowsCacheState === state && schedulerRowsCacheSource === source) return schedulerRowsCacheRows;
      const sourceModel = schedulerRowsSourceModel(source);
      const signature = sourceModel.signature;
      if (schedulerRowsCacheSource === source && schedulerRowsCacheSignature === signature) {
        schedulerRowsCacheState = state;
        return schedulerRowsCacheRows;
      }
      schedulerRowsCacheState = state;
      schedulerRowsCacheSource = source;
      schedulerRowsCacheSignature = signature;
      schedulerRowsCacheRows = normalizeExpandedSchedulerRows(sourceModel.flat);
      return schedulerRowsCacheRows;
    }

    function schedulerRowsSourceSignature(source) {
      return schedulerRowsSourceModel(source).signature;
    }
    function schedulerRowsSourceModel(source) {
      const flat = asArray(source).flatMap(expandSchedulerRow);
      const rows = schedulerRowsSourceSampleRows(flat).map((row) => compactRecordForSignature(row, [
        "status", "state", "runStatus", "run_status",
        "runKey", "run_key", "runId", "run_id", "jobId", "job_id", "taskId", "task_id",
        "id", "experimentId", "experiment_id", "archiveKey", "archive_key",
        "planFile", "plan_file", "plan", "suite", "case", "name", "workerId", "worker_id", "serverId",
        "updatedAt", "updated_at", "progress", "epoch", "step"
      ]));
      return { flat, signature: stableSectionSignature({ count: flat.length, rows }) };
    }
    function schedulerRowsSourceSampleRows(flat) {
      const rows = asArray(flat);
      const out = [];
      const seen = new Set();
      const add = (row, index) => {
        const key = schedulerSourceRowIdentity(row, index);
        if (seen.has(key)) return;
        seen.add(key);
        out.push(row);
      };
      rows.slice(0, TASK_RENDER_LIMIT + 20).forEach(add);
      rows.forEach((row, index) => {
        if (out.length >= TASK_RENDER_LIMIT * 2) return;
        if (schedulerSourceRowNeedsAttention(row)) add(row, index);
      });
      rows.slice(-Math.min(40, TASK_RENDER_LIMIT)).forEach((row, index) => add(row, Math.max(0, rows.length - Math.min(40, TASK_RENDER_LIMIT)) + index));
      return out;
    }
    function schedulerSourceRowNeedsAttention(row) {
      const status = taskStatusToken(pick(row || {}, ["status", "state", "runStatus", "run_status"], ""));
      return ["running", "testing", "queued", "pending"].includes(status) || taskFailureLikeStatus(status);
    }
    function schedulerSourceRowIdentity(row, index) {
      if (!row || typeof row !== "object") return "row:" + index;
      return uniqueText([
        pick(row, ["runKey", "run_key", "runId", "run_id", "jobId", "job_id", "taskId", "task_id", "id", "experimentId", "experiment_id"], ""),
        pick(row, ["archiveKey", "archive_key"], ""),
        pick(row, ["planFile", "plan_file", "plan", "suite"], ""),
        String(index)
      ]).join("|") || "row:" + index;
    }
    function expandSchedulerRow(row) {
      if (!row || typeof row !== "object") return [];
      const parentPlanFile = row.planFile || row.plan_file || row.planPath || row.plan_path || row.file || row.path || row.plan;
      const parentPlanRevision = row.planRevision || row.plan_revision || "";
      const expanded = SCHEDULER_BUCKETS.flatMap((key) => asArray(row[key]).map((child) => {
        const childRecord = child && typeof child === "object" ? child : {};
        return Object.assign({}, childRecord, { status: childRecord.status || childRecord.state || bucketStatus(key), plan: row.plan || row.planName || row.suite || row.file, planFile: childRecord.planFile || childRecord.plan_file || childRecord.file || childRecord.path || parentPlanFile, planRevision: childRecord.planRevision || childRecord.plan_revision || parentPlanRevision, debugMode: childRecord.debugMode === true || row.debugMode === true, debugRunId: childRecord.debugRunId || row.debugRunId || "", debugOutputDir: childRecord.debugOutputDir || row.debugOutputDir || "" });
      }));
      return expanded.length ? expanded : [row];
    }
    function normalizeTaskRow(row, index) {
      const startedAt = pick(row, ["startedAt", "started_at"], "");
      const updatedAt = pick(row, ["updatedAt", "updated_at", "finishedAt", "finished_at"], "");
      const status = taskStatusToken(pick(row, ["status", "state", "runStatus", "run_status"], "unknown"));
      const experimentId = pick(row, ["experimentId", "experiment_id", "id", "jobId", "job_id", "taskId", "task_id", "global_job_id", "session"], "-");
      const archiveKey = pick(row, ["archiveKey", "archive_key", "artifactKey", "artifact_key", "global_job_id", "session", "hub_job_dir", "worker_job_dir", "native_job_dir", "artifactPath", "artifact_path"], experimentId);
      const experimentIndex = pick(row, ["experimentIndex", "experiment_index", "index", "jobIndex", "job_index"], "-");
      const artifactPath = pick(row, ["artifactPath", "artifact_path", "hub_job_dir", "worker_job_dir", "native_job_dir", "workDir", "work_dir", "outputDir", "output_dir"], "-");
      const resultPath = pick(row, ["resultPath", "result_path", "results_csv", "result_csv", "checkpoint_path"], "-");
      const logPath = firstPathLike(pick(row, ["logPath", "log_path", "hub_console_log", "schedulerLog", "scheduler_log", "stdoutLog", "stdout_log", "stderrLog", "stderr_log"], ""));
      const rawServerId = pick(row, ["serverId", "workerId", "worker_id", "worker", "server", "worker_name"], "-");
      const rawPlanFile = firstPathLike(pick(row, ["planFile", "plan_file", "planPath", "plan_path", "file", "path"], ""), pick(row, ["plan", "planName", "plan_name"], ""));
      const normalized = {
        status,
        plan: pick(row, ["planName", "plan_name", "plan", "suite", "file"], "-"),
        planFile: rawPlanFile || "-",
        planRevision: pick(row, ["planRevision", "plan_revision"], ""),
        debugMode: pick(row, ["debugMode", "debug_mode"], false) === true,
        debugRunId: pick(row, ["debugRunId", "debug_run_id"], ""),
        debugOutputDir: pick(row, ["debugOutputDir", "debug_output_dir"], ""),
        experimentName: pick(row, ["experimentName", "experiment_name", "name", "case", "experiment"], "-"),
        runKey: pick(row, ["runKey", "run_key", "runId", "run_id", "jobId", "job_id", "taskId", "task_id", "id", "experimentId", "experiment_id", "global_job_id", "session"], "-"),
        experimentId,
        experimentIndex,
        archiveKey,
        actionArchiveKey: firstPathLike(artifactPath, resultPath, archiveKey) || firstText(archiveKey, experimentId),
        artifactPath,
        resultPath,
        logPath,
        rawServerId,
        serverId: resolveWorkerId(rawServerId),
        gpuIds: pick(row, ["gpuIds", "gpu_ids", "gpuId", "gpu_id"], "-"),
        startedAt: startedAt || "-",
        updatedAt: updatedAt || "-",
        duration: formatDuration(startedAt, updatedAt),
        progress: pick(row, ["progress", "epoch", "step"], "-"),
        primaryMetric: pick(row, ["primaryMetric", "primary_metric", "metric", "score"], "-"),
        workerLiveStatus: pick(row, ["workerLiveStatus", "worker_live_status", "localStatus"], "-"),
        workerTelemetryWarning: pick(row, ["workerTelemetryWarning", "worker_telemetry_warning"], ""),
        logTail: pick(row, ["logTail", "log_tail", "tail"], ""),
        consoleTail: pick(row, ["consoleTail", "console_tail", "hubConsoleTail", "hub_console_tail"], ""),
        liveOutput: pick(row, ["liveOutput", "live_output", "output"], ""),
        finalLog: pick(row, ["finalLog", "final_log", "finalOutput", "final_output", "latestLog", "latest_log"], ""),
        finalOutput: pick(row, ["finalOutput", "final_output", "latestOutput", "latest_output"], ""),
        stdout: pick(row, ["stdout"], ""),
        stderr: pick(row, ["stderr"], "")
      };
      normalized.uiKey = taskUiKeyFromRow(normalized, index);
      return normalized;
    }

    function taskUiKeyFromRow(row, index) {
      const direct = firstText(taskActionKey(row), row.runKey, row.experimentId, row.archiveKey, row.actionArchiveKey, row.artifactPath);
      if (usableTaskKey(direct)) return "task:" + direct;
      const fallback = uniqueText([row.planFile, row.plan, row.experimentName, row.experimentIndex, row.serverId, arrayText(row.gpuIds), row.startedAt])
        .filter(usableTaskKey)
        .join("|");
      return fallback ? "task:" + fallback : ("task-ui-" + String(index));
    }
    const taskKeyDerivationCache = new WeakMap();
    function taskKeyDerivations(row) {
      const cacheable = Boolean(row) && (typeof row === "object" || typeof row === "function");
      if (cacheable && taskKeyDerivationCache.has(row)) return taskKeyDerivationCache.get(row);
      const direct = firstText(row.runKey, row.experimentId, row.archiveKey, row.session);
      const actionKey = usableTaskKey(direct) ? direct : "";
      const targetFallback = [
        "task",
        row.status,
        row.plan,
        row.experimentName,
        row.serverId,
        arrayText(row.gpuIds),
        row.startedAt,
        row.updatedAt,
        row.progress
      ].map((value) => String(value || "").trim()).filter((value) => value && value !== "-").join("|");
      const targetKey = actionKey || targetFallback || "";
      const archiveDirect = firstPathLike(row.actionArchiveKey, row.artifactPath, row.resultPath, row.archiveKey);
      const archiveActionKey = usableTaskKey(archiveDirect) ? archiveDirect : actionKey;
      const logDirect = firstPathLike(row.logPath, row.runKey);
      const logActionKey = usableTaskKey(logDirect) ? logDirect : targetKey;
      const planDirect = firstPathLike(row.planFile, row.plan);
      const planFile = usableTaskKey(planDirect) ? planDirect : "";
      const operationKeys = [actionKey, archiveActionKey, row.runKey, row.experimentId, row.archiveKey, row.actionArchiveKey, row.artifactPath]
        .map((value) => String(value || "").trim())
        .filter((value) => value && value !== "-");
      const selectableKeys = [targetKey, ...operationKeys]
        .map((value) => String(value || "").trim())
        .filter((value) => value && value !== "-");
      const derived = { targetKey, actionKey, archiveActionKey, logActionKey, planFile, selectableKeys, operationKeys };
      if (cacheable) taskKeyDerivationCache.set(row, derived);
      return derived;
    }
    function taskTargetKey(row) {
      return taskKeyDerivations(row).targetKey;
    }
    function taskActionKey(row) {
      return taskKeyDerivations(row).actionKey;
    }
    function taskArchiveActionKey(row) {
      return taskKeyDerivations(row).archiveActionKey;
    }
    function taskLogActionKey(row) {
      return taskKeyDerivations(row).logActionKey;
    }
    function taskActionKeyForCommand(row, command) {
      return ["archiveArtifacts", "deleteArtifacts"].includes(command) ? taskArchiveActionKey(row) : taskActionKey(row);
    }
    function taskPlanFile(row) {
      return taskKeyDerivations(row).planFile;
    }
    function firstPathLike() {
      return Array.from(arguments).map((value) => String(value || "").trim()).find((value) => value && value !== "-" && /[\\/]/.test(value)) || "";
    }
    function usableTaskKey(value) {
      const text = String(value || "").trim();
      return Boolean(text && text !== "-");
    }
    function taskSelectableKeys(row) {
      return taskKeyDerivations(row).selectableKeys;
    }
    function taskOperationKeys(row) {
      return taskKeyDerivations(row).operationKeys;
    }
    function normalizeExperimentTraceRows(rows) {
      return asArray(rows).map((row) => {
        const stages = traceStageStatuses(row);
        return ({
          id: pick(row, ["id", "experimentId", "experiment_id", "runKey", "run_key", "run_id", "global_job_id"], "-"),
          archiveKey: pick(row, ["archiveKey", "archive_key"], pick(row, ["id", "runKey", "run_key"], "-")),
          planFile: pick(row, ["planFile", "plan_file", "plan"], ""),
          planRevision: pick(row, ["planRevision", "plan_revision"], ""),
          executionStatus: stages.executionStatus,
          status: stages.archiveStatus,
          reviewState: pick(row, ["reviewState", "review_state"], ""),
          reviewReason: pick(row, ["reviewReason", "review_reason"], ""),
          resultStatus: pick(row, ["resultStatus", "result_status", "parseStatus", "parse_status"], "-"),
          deleteStatus: pick(row, ["deleteStatus", "delete_status", "deleted", "residue"], "-"),
          workerId: resolveWorkerId(pick(row, ["workerId", "worker_id", "serverId", "server_id", "worker", "server", "worker_name"], "-")),
          tags: asArray(pick(row, ["tags"], [])).join(", "),
          updatedAt: pick(row, ["updatedAt", "updated_at", "synced_at", "finished_at"], "-"),
          artifactPath: pick(row, ["artifactPath", "artifact_path", "hub_job_dir", "worker_job_dir", "native_job_dir"], "-"),
          resultPath: pick(row, ["resultPath", "result_path", "results_csv"], "-")
        });
      });
    }

    function traceStageStatuses(row) {
      const rawStatus = pick(row, ["status", "state"], "-");
      const explicitExecution = pick(row, ["executionStatus", "execution_status", "runStatus", "run_status", "schedulerStatus", "scheduler_status", "taskStatus", "task_status", "jobStatus", "job_status"], "");
      const explicitArchive = pick(row, ["archiveStatus", "archive_status", "artifact_state"], "");
      const reviewState = String(pick(row, ["reviewState", "review_state"], "") || "").toLowerCase();
      const rawArchiveLike = /^(archived|pending_review|included|excluded|not_archived)$/i.test(String(rawStatus || ""));
      const executionStatus = explicitExecution || (rawArchiveLike ? "-" : rawStatus);
      const archiveStatus = explicitArchive || (rawArchiveLike ? rawStatus : reviewState === "archived" ? "archived" : reviewState === "excluded" ? "excluded" : "pending_review");
      return { executionStatus: executionStatus || "-", archiveStatus: archiveStatus || "pending_review" };
    }
    function experimentTraceRowsForState(state) {
      const input = state && state.experimentTraces;
      if (input === experimentTraceRowsCacheInput) return experimentTraceRowsCacheRows;
      experimentTraceRowsCacheInput = input;
      experimentTraceRowsCacheRows = normalizeExperimentTraceRows(input || []);
      experimentTraceViewCacheRows = null;
      experimentTraceViewCacheSelectionKey = "";
      experimentTraceViewCacheValue = null;
      return experimentTraceRowsCacheRows;
    }
    function traceMatchesPlanVersion(row, planRevision, planUpdatedAt) {
      const revision = String((row || {}).planRevision || "").trim();
      if (planRevision && revision) return revision === planRevision;
      if (Number.isFinite(planUpdatedAt)) {
        const traceAt = Date.parse(String((row || {}).updatedAt || ""));
        return Number.isFinite(traceAt) && traceAt >= planUpdatedAt;
      }
      return !planRevision;
    }
    function traceRowsForPlanScope(rows, state, scopeMode) {
      const allRows = asArray(rows || []);
      const data = state || {};
      const cacheableRows = Boolean(allRows) && (typeof allRows === "object" || typeof allRows === "function");
      const cacheableState = Boolean(data) && (typeof data === "object" || typeof data === "function");
      let stateCache = cacheableRows ? traceRowsForPlanScopeCache.get(allRows) : undefined;
      let variants = stateCache && cacheableState ? stateCache.get(data) : undefined;
      const cacheKey = String(scopeMode || "all");
      if (variants && variants.has(cacheKey)) return variants.get(cacheKey);
      const selectedPlanFile = normalizePlanSelectionKey(data.planFileInput || (data.selection || {}).selectedPlanId || "");
      const plan = selectedPlanFile ? planFromContext(data, { planFile: selectedPlanFile }) || {} : {};
      const selectedPlanRevision = String(plan.revision || "");
      const planUpdatedAt = Date.parse(String(plan.updatedAt || ""));
      const selectedRows = selectedPlanFile
        ? allRows.filter((row) => meaningfulValue((row || {}).planFile)
          && samePlanSelection((row || {}).planFile, selectedPlanFile)
          && traceMatchesPlanVersion(row, selectedPlanRevision, planUpdatedAt))
        : [];
      const scoped = scopeMode !== "all" && Boolean(selectedPlanFile);
      const value = {
        rows: scoped ? selectedRows : allRows,
        scoped,
        selectedPlanFile,
        selectedPlanRevision,
        selectedCount: selectedRows.length,
        unscopedCount: allRows.filter((row) => !meaningfulValue((row || {}).planFile)).length,
        totalCount: allRows.length
      };
      if (cacheableRows && cacheableState) {
        if (!stateCache) {
          stateCache = new WeakMap();
          traceRowsForPlanScopeCache.set(allRows, stateCache);
        }
        if (!variants) {
          variants = new Map();
          stateCache.set(data, variants);
        }
        variants.set(cacheKey, value);
      }
      return value;
    }
    function experimentTraceViewModelForState(state) {
      const allRows = experimentTraceRowsForState(state);
      const scope = traceRowsForPlanScope(allRows, state, tracePlanScope);
      const rows = scope.rows;
      const selectionKey = traceSelectionCacheKey((state && state.selection) || {}) + "\u001d" + [tracePlanScope, scope.selectedPlanFile, scope.selectedPlanRevision, scope.selectedCount, scope.totalCount].join("\u001f");
      if (allRows === experimentTraceViewCacheRows && selectionKey === experimentTraceViewCacheSelectionKey && experimentTraceViewCacheValue) return experimentTraceViewCacheValue;
      const selected = traceSelectionSet((state && state.selection) || {});
      const visibleRows = traceVisibleRows(rows, selected);
      const selectedRow = rows.find((row) => traceRowSelected(row, selected)) || rows[0];
      const traceStats = resultEvidenceTraceStatsForRows(rows);
      experimentTraceViewCacheRows = allRows;
      experimentTraceViewCacheSelectionKey = selectionKey;
      experimentTraceViewCacheValue = { rows, selected, visibleRows, selectedRow, traceStats, scope };
      return experimentTraceViewCacheValue;
    }
    function traceSelectionCacheKey(selection) {
      return [
        asArray(selection && selection.selectedRunKeys).map(String).join("\u001f"),
        asArray(selection && selection.selectedArchiveKeys).map(String).join("\u001f"),
        String((selection && selection.selectedRunKey) || "")
      ].join("\u001e");
    }
    function normalizeOperationRows(operations) {
      return objectRows(operations).map((row) => {
        const payload = operationPayload(row);
        const options = operationPayload(payload.options);
        const validation = operationPayload(row.validation || payload.validation);
        const preview = operationPayload(row.preview || payload.preview);
        const manifest = operationPayload(row.archiveManifest || row.syncManifest || payload.archiveManifest || payload.syncManifest);
        const threeWay = operationPayload(row.threeWay || payload.threeWay);
        const contract = operationPayload(row.contractReport || payload.contractReport);
        const type = pick(row, ["type", "action"], "-");
        const unparseableFileList = asArray(pick(row, ["unparseableFiles", "unparseable_files"], pick(payload, ["unparseableFiles", "unparseable_files"], pick(contract, ["unparseableFiles"], [])))).map((item) => String(item || "").trim()).filter(Boolean).slice(0, 20);
        const unparseableDetails = normalizeUnparseableDetails(pick(row, ["unparseable"], pick(payload, ["unparseable"], pick(contract, ["unparseable"], []))), unparseableFileList);
        return {
          operationId: pick(row, ["operationId", "operation_id", "opId", "id"], pick(payload, ["operationId", "operation_id", "opId", "id"], "-")),
          type: type !== "-" ? type : pick(payload, ["action", "type"], "-"),
          status: pick(row, ["status", "state"], pick(payload, ["status", "state"], operationStatusFromType(type))),
          planFile: pick(row, ["planFile", "plan_file", "plan"], pick(payload, ["planFile", "plan_file", "plan"], pick(options, ["planFile", "plan_file", "plan", "selectedPlanId"], ""))),
          planRevision: pick(row, ["planRevision", "plan_revision"], pick(payload, ["planRevision", "plan_revision"], pick(options, ["planRevision", "plan_revision"], ""))),
          debugMode: pick(row, ["debugMode", "debug_mode"], pick(payload, ["debugMode", "debug_mode"], pick(options, ["debugMode", "debug_mode"], false))) === true,
          debugRunId: pick(row, ["debugRunId", "debug_run_id"], pick(payload, ["debugRunId", "debug_run_id"], "")),
          debugOutputDir: pick(row, ["debugOutputDir", "debug_output_dir"], pick(payload, ["debugOutputDir", "debug_output_dir"], "")),
          submissionAccepted: pick(row, ["submissionAccepted", "submission_accepted"], pick(payload, ["submissionAccepted", "submission_accepted"], false)) === true,
          schedulerStarted: pick(row, ["schedulerStarted", "scheduler_started"], pick(payload, ["schedulerStarted", "scheduler_started"], false)) === true,
          schedulerFinished: pick(row, ["schedulerFinished", "scheduler_finished"], pick(payload, ["schedulerFinished", "scheduler_finished"], false)) === true,
          jobCount: pick(row, ["jobCount", "job_count"], pick(payload, ["jobCount", "job_count"], pick(validation, ["jobCount", "job_count"], "-"))),
          executionMode: pick(row, ["executionMode", "execution_mode"], pick(payload, ["executionMode", "execution_mode"], pick(validation, ["executionMode", "execution_mode"], "-"))),
          dispatchableCount: pick(row, ["dispatchableCount", "assignableNow"], pick(payload, ["dispatchableCount", "assignableNow"], pick(preview, ["dispatchableCount", "assignableNow"], "-"))),
          queuedCount: pick(row, ["queuedCount", "queued"], pick(payload, ["queuedCount", "queued"], pick(preview, ["queuedCount", "queued"], "-"))),
          previewPath: pick(row, ["previewPath", "preview_path"], pick(payload, ["previewPath", "preview_path"], "-")),
          runnerWarningCount: Object.keys(preview).length ? asArray(preview.runnerWarnings).length : "-",
          blockedReasonCount: Object.keys(preview).length ? asArray(preview.blockedReasons).length : "-",
          progress: pick(row, ["progress", "percent"], "-"),
          message: pick(row, ["message", "detail"], pick(payload, ["message", "error"], "-")),
          terminalAt: pick(row, ["completedAt", "completed_at", "finishedAt", "finished_at", "cancelledAt", "cancelled_at", "failedAt", "failed_at"], pick(payload, ["completedAt", "completed_at", "finishedAt", "finished_at", "cancelledAt", "cancelled_at", "failedAt", "failed_at"], "-")),
          updatedAt: pick(row, ["updatedAt", "updated_at", "completedAt", "completed_at", "finishedAt", "finished_at", "generatedAt", "startedAt"], pick(payload, ["updatedAt", "updated_at", "completedAt", "completed_at", "finishedAt", "finished_at", "generatedAt", "startedAt"], "-")),
          error: pick(row, ["error", "lastError"], pick(payload, ["error"], "-")),
          seq: Number(pick(row, ["seq"], 0)),
          targetCount: pick(row, ["targetCount", "target_count"], pick(payload, ["targetCount", "target_count"], pick(manifest, ["targetCount", "target_count"], pick(threeWay, ["targetCount", "target_count"], "-")))),
          fileCount: pick(row, ["fileCount", "file_count"], pick(payload, ["fileCount", "file_count"], pick(manifest, ["fileCount", "file_count"], "-"))),
          deletedCount: pick(row, ["deletedCount", "deleted_count"], pick(payload, ["deletedCount", "deleted_count"], "-")),
          skippedCount: pick(row, ["skippedCount", "skipped_count"], pick(payload, ["skippedCount", "skipped_count"], "-")),
          residueCount: pick(row, ["residueCount", "residue_count"], pick(payload, ["residueCount", "residue_count"], "-")),
          missingCount: pick(row, ["missingCount", "missing_count"], pick(payload, ["missingCount", "missing_count"], pick(manifest, ["missingCount", "missing_count"], pick(threeWay, ["missingCount", "missing_count"], "-")))),
          missingFiles: asArray(pick(row, ["missingFiles", "missing_files"], pick(payload, ["missingFiles", "missing_files"], pick(contract, ["missing"], [])))).map(outputContractMissingLabel).join("、"),
          unparseableCount: pick(row, ["unparseableCount", "unparseable_count"], pick(payload, ["unparseableCount", "unparseable_count"], pick(contract, ["unparseableCount"], "-"))),
          unparseableFiles: asArray(pick(row, ["unparseableFiles", "unparseable_files"], pick(payload, ["unparseableFiles", "unparseable_files"], pick(contract, ["unparseableFiles"], [])))).join("、"),
          unparseableFileList,
          unparseableDetails,
          parseableResultCount: pick(row, ["parseableResultCount", "parseable_result_count"], pick(payload, ["parseableResultCount", "parseable_result_count"], pick(contract, ["parseableResultCount"], "-"))),
          contractReportPath: pick(row, ["contractReportPath", "contract_report_path"], pick(payload, ["contractReportPath", "contract_report_path"], pick(contract, ["path"], "-"))),
          plottingContractPath: pick(row, ["plottingContractPath", "plotting_contract_path"], pick(payload, ["plottingContractPath", "plotting_contract_path"], "")),
          caseLevelPath: pick(row, ["caseLevelPath", "case_level_path"], pick(payload, ["caseLevelPath", "case_level_path"], pick(payload.caseLevel, ["path"], ""))),
          recoveredPlanReportPath: pick(row, ["recoveredPlanReportPath", "recovered_plan_report_path"], pick(payload, ["recoveredPlanReportPath", "recovered_plan_report_path"], "")),
          anomalyPath: pick(row, ["anomalyPath", "anomaly_path"], pick(payload, ["anomalyPath", "anomaly_path"], "")),
          unarchivedCount: pick(row, ["unarchivedCount", "unarchived_count"], pick(payload, ["unarchivedCount", "unarchived_count"], pick(threeWay, ["unarchivedCount", "unarchived_count"], "-"))),
          workerId: resolveWorkerId(pick(row, ["workerId", "worker_id"], pick(payload, ["workerId", "worker_id"], "-"))),
          manifestPath: pick(row, ["manifestPath", "archiveManifestPath", "syncManifestPath", "threeWayPath", "path"], pick(payload, ["manifestPath", "archiveManifestPath", "syncManifestPath", "threeWayPath", "path"], "-")),
          searchText: operationSearchText(row, payload, manifest, threeWay)
        };
      }).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)) || b.seq - a.seq);
    }

    function normalizeUnparseableDetails(value, files) {
      const byPath = new Map();
      asArray(value).forEach((item) => {
        const row = item && typeof item === "object" ? item : { path: item };
        const pathValue = String(row.path || row.file || "").trim();
        if (!pathValue) return;
        byPath.set(pathValue, { path: pathValue, error: String(row.error || row.message || "").trim() });
      });
      asArray(files).forEach((file) => {
        const pathValue = String(file || "").trim();
        if (pathValue && !byPath.has(pathValue)) byPath.set(pathValue, { path: pathValue, error: "" });
      });
      return [...byPath.values()].slice(0, 20);
    }

    function outputContractMissingLabel(value) {
      const text = String(value || "").trim();
      return text === "parseable_result_file" ? "可解析结果文件（CSV、JSON、TXT、LOG 或 OUT）" : text;
    }

    function operationSearchText(row, payload, manifest, threeWay) {
      const budget = { length: 0, max: 1600 };
      const parts = [];
      [row, payload, manifest, threeWay].forEach((item) => appendOperationSearchValue(item, parts, budget, 0, new WeakSet()));
      return parts.join(" ").toLowerCase();
    }

    function appendOperationSearchValue(value, parts, budget, depth, seen) {
      if (budget.length >= budget.max || depth > 3 || value === null || value === undefined) return;
      const type = typeof value;
      if (type === "string" || type === "number" || type === "boolean") {
        appendOperationSearchToken(parts, budget, String(value));
        return;
      }
      if (type !== "object") return;
      if (seen.has(value)) return;
      seen.add(value);
      if (Array.isArray(value)) {
        value.slice(0, 12).forEach((item) => appendOperationSearchValue(item, parts, budget, depth + 1, seen));
        seen.delete(value);
        return;
      }
      Object.keys(value).slice(0, 36).forEach((key) => {
        appendOperationSearchToken(parts, budget, key);
        appendOperationSearchValue(value[key], parts, budget, depth + 1, seen);
      });
      seen.delete(value);
    }

    function appendOperationSearchToken(parts, budget, token) {
      if (budget.length >= budget.max) return;
      const text = compactText(token, 96);
      if (!text || text === "-") return;
      parts.push(text);
      budget.length += text.length + 1;
    }

    function operationPayload(row) {
      if (!row || typeof row !== "object") return {};
      if (row.payload && typeof row.payload === "object") return row.payload;
      if (row.latestEvent && typeof row.latestEvent === "object" && row.latestEvent.payload && typeof row.latestEvent.payload === "object") return row.latestEvent.payload;
      return row;
    }
    function normalizeFileTransferRows(fileTransfers) {
      return objectRows(fileTransfers).map((row) => ({
        transferId: pick(row, ["transferId", "transfer_id", "id"], "-"),
        direction: pick(row, ["direction", "type"], "-"),
        remotePath: pick(row, ["remotePath", "remote_path", "path"], "-"),
        localPath: pick(row, ["localPath", "local_path"], "-"),
        status: pick(row, ["status", "state"], "-"),
        transferredBytes: pick(row, ["transferredBytes", "transferred_bytes", "receivedBytes", "sentBytes", "doneBytes"], 0),
        totalBytes: pick(row, ["totalBytes", "total_bytes", "size", "bytes"], 0),
        speed: pick(row, ["speed", "speedBytesPerSecond", "speed_bytes_per_second", "bytesPerSecond"], "-"),
        eta: pick(row, ["eta", "etaSeconds", "eta_seconds"], "-"),
        error: pick(row, ["error", "lastError"], "-")
      }));
    }

    function pick(obj, keys, fallback) {
      if (!obj || typeof obj !== "object") return fallback;
      for (const key of keys) {
        const value = obj[key];
        if (value !== undefined && value !== null && value !== "") return value;
      }
      return fallback;
    }
    function asArray(value) { return Array.isArray(value) ? value : (!value || typeof value !== "object" ? [] : Object.values(value)); }
    function objectRows(value) { return Array.isArray(value) ? value : (!value || typeof value !== "object" ? [] : Object.entries(value).map(([id, row]) => Object.assign({ id }, row || {}))); }
    function percent(used, total) {
      const a = Number(used), b = Number(total);
      return !Number.isFinite(a) || !Number.isFinite(b) || b <= 0 ? "-" : Math.round((a / b) * 1000) / 10;
    }
    function formatDuration(startedAt, updatedAt) {
      const start = Date.parse(String(startedAt || ""));
      const end = Date.parse(String(updatedAt || "")) || Date.now();
      if (!Number.isFinite(start)) return "-";
      const seconds = Math.max(0, Math.round((end - start) / 1000));
      const minutes = Math.floor(seconds / 60);
      return minutes ? String(minutes) + "m " + String(seconds % 60) + "s" : String(seconds) + "s";
    }
    function taskStatusRank(status) {
      return TASK_STATUS_RANKS[taskStatusToken(status) || "unknown"] ?? 6;
    }
    function taskStatusToken(status) {
      const value = String(status || "").trim().toLowerCase();
      if (value === "canceled") return "cancelled";
      if (value === "normal_completed") return "completed";
      if (value === "completed_with_errors") return "failed";
      if (value.includes("manual_interrupted")) return "stopped";
      return value;
    }
    function taskStatusLabel(status) {
      const raw = String(status || "").trim();
      if (!raw || raw === "-") return raw || "未知";
      const labels = {
        accepted: "已接收", submitted: "已提交", queued: "排队中", pending: "等待中",
        running: "运行中", progress: "运行中", in_progress: "运行中", testing: "测试中",
        completed: "已完成", done: "已完成", failed: "失败", error: "错误", stalled: "已卡住",
        stopped: "已停止", cancelled: "已取消", archived: "已归档", deleted: "已删除"
      };
      return labels[taskStatusToken(raw)] || raw;
    }
    function taskFailureLikeStatus(status) {
      return ["failed", "error", "stalled", "stopped", "cancelled"].includes(taskStatusToken(status));
    }
    function taskTerminalStatus(status) {
      const value = taskStatusToken(status);
      return ["completed", "done", "archived", "deleted"].includes(value) || taskFailureLikeStatus(value);
    }
    function taskArchivableStatus(status) {
      const value = taskStatusToken(status);
      return ["completed", "done"].includes(value) || taskFailureLikeStatus(value);
    }
    function bucketStatus(key) { return SCHEDULER_BUCKET_STATUSES[key] ?? key.replace("_experiments", "").replace("pending", "queued"); }
    function operationStatusFromType(type) {
      const text = String(type);
      if (text.includes("completed")) return "completed";
      if (text.includes("failed")) return "failed";
      if (text.includes("cancelled") || text.includes("canceled")) return "cancelled";
      if (text.includes("stalled")) return "stalled";
      if (text.includes("started") || text.includes("progress")) return "running";
      return "-";
    }
    function statusClass(status) {
      const value = taskStatusToken(status);
      if (taskFailureLikeStatus(value)) return "status-failed";
      if (value.includes("complete") || value === "done" || value === "online" || value === "ok") return "status-completed";
      if (value.includes("running")) return "status-running";
      if (value.includes("testing")) return "status-testing";
      if (value.includes("queue") || value.includes("pending") || value === "accepted") return "status-queued";
      if (value.includes("stale") || value.includes("stalled") || value.includes("degraded") || value.includes("warning")) return "status-warning";
      return "";
    }
    function traceClass(row) {
      const text = [row.executionStatus, row.status, row.resultStatus, row.deleteStatus].map((value) => String(value || "").toLowerCase()).join(" ");
      if (/failed|error|stalled|residue|parse_failed/.test(text)) return "status-failed";
      return statusClass(row.executionStatus) || statusClass(row.status);
    }
    function gpuServerStatusClass(status) {
      const text = String(status || "").toLowerCase();
      if (text.includes("offline") || text.includes("failed") || text.includes("error")) return "offline";
      if (text.includes("stale") || text.includes("degraded") || text.includes("warning")) return "stale";
      if (text.includes("online") || text.includes("ok")) return "online";
      return "";
    }
    function table(headers, rows) {
      if (!rows.length) return "";
      return '<table class="table"><thead><tr>' + headers.map((h) => '<th>' + esc(h) + '</th>').join("") + '</tr></thead><tbody>' +
        rows.map((row) => '<tr>' + row.map((cell) => '<td>' + cell + '</td>').join("") + '</tr>').join("") + '</tbody></table>';
    }
    function row(label, value, klass) { return '<div class="row"><div class="label">' + esc(label) + '</div><div class="value ' + (klass || "") + '">' + esc(value || "-") + '</div></div>'; }
    function progress(value) { const width = value === "-" ? 0 : Math.max(0, Math.min(100, Number(value))); return '<div class="progressTrack"><div class="progressBar" style="width:' + width + '%"></div></div>'; }
    function progressWidth(value) { return value === "-" ? 0 : Math.max(0, Math.min(100, Number(value))); }
    function progressPercent(value) {
      if (typeof value === "number") return value <= 1 ? value * 100 : value;
      const text = String(value || "");
      const percentMatch = text.match(/(\\d+(?:\\.\\d+)?)\\s*%/);
      if (percentMatch) return Number(percentMatch[1]);
      const slashMatch = text.match(/(\\d+(?:\\.\\d+)?)\\s*\\/\\s*(\\d+(?:\\.\\d+)?)/);
      if (slashMatch) return Number(slashMatch[2]) ? Number(slashMatch[1]) / Number(slashMatch[2]) * 100 : 0;
      const number = Number(text);
      return Number.isFinite(number) ? (number <= 1 ? number * 100 : number) : 0;
    }
    function metric(label, value, klass) { return '<div class="metric"><span class="metric-label">' + esc(label) + '</span><span class="metric-value ' + escAttr(klass || "") + '">' + esc(value) + '</span></div>'; }
    function memoryText(gpu) { return String(gpu.memoryUsedMb) + " / " + String(gpu.memoryTotalMb) + " MB (" + valuePercent(gpu.memoryPercent) + ")"; }
    function valuePercent(value) { return value === "-" || value === undefined ? "-" : String(value) + "%"; }
    function arrayText(value) { return Array.isArray(value) ? value.join(", ") : value; }
    function numberOrDash(value) { const number = Number(value); return Number.isFinite(number) ? number : "-"; }
    function labelStatus(value) {
      const raw = String(value === undefined || value === null ? "" : value).trim();
      const key = raw.toLowerCase();
      const map = {
        xshell_tunnel_realtime: "Xshell 实时隧道", offline_import: "离线导入", unknown: "未知", local_port_closed: "本地端口未打开", agent_unreachable: "Agent 不可达", agent_ok: "Agent 正常", file_api_unavailable: "文件 API 不可用",
        disconnected: "未连接", connecting: "连接中", connected: "已连接", reconnecting: "重连中", websocket: "WebSocket（本地转发）", sse: "SSE（本地转发）", polling: "快照备用", snapshot: "快照备用", paused: "已暂停",
        accepted: "已接收", submitted: "已提交", queued: "排队中", pending: "等待中", running: "运行中", in_progress: "运行中", testing: "检测中", completed: "已完成", completed_with_errors: "部分失败", done: "已完成",
        success: "成功", succeeded: "成功", failed: "失败", error: "错误", warning: "注意", stalled: "已卡住", stopped: "已停止", cancelled: "已取消", canceled: "已取消", skipped: "已跳过",
        ready: "已就绪", online: "在线", offline: "离线", stale: "已过期", degraded: "降级", configured: "已配置", not_configured: "未配置", synced: "已同步", syncing: "同步中", uploaded: "已上传", uploading: "上传中",
        archived: "已归档", pending_review: "待筛选", included: "已纳入", excluded: "未纳入", parsed: "已解析", parse_success: "已解析", not_parsed: "待解析", unparsed: "未解析", parse_failed: "解析失败", not_deleted: "未删除", delete_pending: "删除中", deleted: "已删除", residue: "有残留", clean: "已清理", not_found: "未发现"
      };
      if (map[key]) return map[key];
      const detailMatch = raw.match(/^(failed|error|warning)\s*[:：-]\s*(.+)$/i);
      if (detailMatch) return map[detailMatch[1].toLowerCase()] + "：" + detailMatch[2];
      return raw;
    }
    function parentPath(value) {
      const parts = String(value || "zlk_cluster").replace(/\\\\/g, "/").split("/").filter(Boolean);
      if (parts.length <= 1) return parts[0] || "zlk_cluster";
      parts.pop();
      return parts.join("/");
    }
    function esc(value) { return String(value === undefined || value === null || value === "" ? "-" : value).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch])); }
    function escAttr(value) { return esc(value).replace(/"/g, "&quot;"); }
    function cssEscape(value) { return String(value || "").replace(/["\\\\]/g, "\\\\$&"); }
  </script>
</body>
</html>`;
}
