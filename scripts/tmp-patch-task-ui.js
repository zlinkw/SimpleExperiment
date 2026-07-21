const fs = require("fs");
const path = require("path");

const target = path.join(__dirname, "..", "src", "ui", "PanelHtml.ts");
let source = fs.readFileSync(target, "utf8");
const nl = source.includes("\r\n") ? "\r\n" : "\n";

function replaceExact(fromLines, toLines, label) {
  const from = fromLines.join(nl);
  const to = toLines.join(nl);
  if (!source.includes(from)) {
    throw new Error(`missing ${label}`);
  }
  source = source.replace(from, to);
}

replaceExact(
  [
    "      if (hiddenLegacyTaskUiKeys.size) {",
    "        taskSummaryHtml += '<div class=\"muted\">已隐藏 ' + hiddenLegacyTaskUiKeys.size + ' 条旧任务残留；不会删除远端文件。</div>';",
    "      }",
  ],
  [
    "      if (hiddenLegacyTaskUiKeys.size) {",
    "        taskSummaryHtml = taskSummaryHtml.replace('</div>', '<span class=\"pill status-warning\" title=\"已隐藏旧任务\">隐藏 ' + hiddenLegacyTaskUiKeys.size + '</span></div>');",
    "      }",
  ],
  "legacy summary"
);

replaceExact(
  [
    "      const active = rows.filter((row) => [\"running\", \"testing\"].includes(row.status)).slice(0, 8);",
    "      setHtmlIfChanged(\"taskProgressCards\", active.length ? '<div class=\"progressCards\">' + active.map(renderTaskProgressCard).join(\"\") + '</div>' : \"\");",
  ],
  [
    "      setHtmlIfChanged(\"taskProgressCards\", \"\");",
  ],
  "progress cards"
);

replaceExact(
  [
    "      if (!count) {",
    "        setHtmlIfChanged(\"taskBatchActions\",",
    "          '<div class=\"muted\">勾选任务后可批量停止、重试、解析、归档或删除。</div>' +",
    "          (allLegacyRows.length ? clearVisibleLegacyButton(allLegacyRows) : \"\"));",
    "        return;",
    "      }",
  ],
  [
    "      if (!count) {",
    "        setHtmlIfChanged(\"taskBatchActions\", allLegacyRows.length ? clearVisibleLegacyButton(allLegacyRows) : \"\");",
    "        return;",
    "      }",
  ],
  "batch empty"
);

replaceExact(
  [
    "      const pendingBadge = pending ? '<span class=\"taskActionPending\">' + loadingPrefix(true) + esc(pendingLabel(pending)) + '</span>' : \"\";",
    "      return '<div class=\"task-card ' + taskCardClass(row.status) + (checked ? \" selectedRow\" : \"\") + (pendingDelete ? \" delete-pending\" : \"\") + '\" data-anchor=\"' + escAttr(treeAnchorId(\"task\", key || row.experimentId || row.experimentName)) + \">' +",
    "        '<div class=\"taskCardHead\">' +",
    "          '<input class=\"taskSelectBox\" type=\"checkbox\" data-command=\"selectExperiment\" data-task-ui-key=\"' + escAttr(row.uiKey) + '\" data-run-key=\"' + escAttr(taskActionKey(row)) + '\" data-action-key=\"' + escAttr(taskActionKey(row)) + '\" data-experiment-id=\"' + escAttr(row.experimentId) + '\" data-archive-key=\"' + escAttr(taskArchiveActionKey(row)) + '\" data-worker-id=\"' + escAttr(resolveWorkerId(row.serverId)) + '\" data-plan-file=\"' + escAttr(taskPlanFile(row)) + '\"' + (checked ? \" checked\" : \"\") + '>' +",
    "          '<div class=\"taskTitle\"><b title=\"' + escAttr(row.experimentName) + '\">' + esc(compactText(row.experimentName, 52)) + '</b><span class=\"' + statusClass(row.status) + '\">' + esc(row.status) + '</span>' + pendingBadge + '</div>' +",
    "          '<div class=\"taskActions\">' + actions + '</div>' +",
    "        '</div>' +",
    "        '<div class=\"taskMetaGrid\">' +",
    "          taskMetric(\"计划\", row.plan) +",
    "          taskMetric(\"runKey\", row.runKey) +",
    "          taskMetric(\"Worker\", workerName(row.serverId)) +",
    "          taskMetric(\"GPU\", arrayText(row.gpuIds)) +",
    "          taskMetric(\"耗时\", row.duration) +",
    "          taskMetric(\"进度\", row.progress) +",
    "        '</div>' +",
    "        renderTaskLogDetails(state, row) +",
    "      '</div>';",
  ],
  [
    "      const pendingBadge = pending ? '<span class=\"taskActionPending\">' + loadingPrefix(true) + esc(pendingLabel(pending)) + '</span>' : \"\";",
    "      const titleBits = [",
    "        row.experimentName || \"\",",
    "        row.status || \"\",",
    "        row.plan ? \"计划 \" + compactPath(row.plan) : \"\",",
    "        row.runKey ? \"runKey \" + compactIdentifier(row.runKey) : \"\",",
    "        row.serverId ? \"Worker \" + workerName(row.serverId) : \"\",",
    "        arrayText(row.gpuIds) !== \"-\" ? \"GPU \" + arrayText(row.gpuIds) : \"\",",
    "        row.duration && row.duration !== \"-\" ? \"耗时 \" + row.duration : \"\",",
    "        row.progress && row.progress !== \"-\" ? \"进度 \" + row.progress : \"\"",
    "      ].filter(Boolean).join(\" · \");",
    "      return '<div class=\"task-card ' + taskCardClass(row.status) + (checked ? \" selectedRow\" : \"\") + (pendingDelete ? \" delete-pending\" : \"\") + '\" data-anchor=\"' + escAttr(treeAnchorId(\"task\", key || row.experimentId || row.experimentName)) + '\" title=\"' + escAttr(titleBits) + \">' +",
    "        '<div class=\"taskCardHead\">' +",
    "          '<input class=\"taskSelectBox\" type=\"checkbox\" data-command=\"selectExperiment\" data-task-ui-key=\"' + escAttr(row.uiKey) + '\" data-run-key=\"' + escAttr(taskActionKey(row)) + '\" data-action-key=\"' + escAttr(taskActionKey(row)) + '\" data-experiment-id=\"' + escAttr(row.experimentId) + '\" data-archive-key=\"' + escAttr(taskArchiveActionKey(row)) + '\" data-worker-id=\"' + escAttr(resolveWorkerId(row.serverId)) + '\" data-plan-file=\"' + escAttr(taskPlanFile(row)) + '\"' + (checked ? \" checked\" : \"\") + '>' +",
    "          '<div class=\"taskTitle\"><b title=\"' + escAttr(row.experimentName) + '\">' + esc(compactText(row.experimentName, 52)) + '</b><span class=\"' + statusClass(row.status) + '\">' + esc(row.status) + '</span>' + pendingBadge + '</div>' +",
    "          '<div class=\"taskActions\">' + actions + '</div>' +",
    "        '</div>' +",
    "        renderTaskLogDetails(state, row) +",
    "      '</div>';",
  ],
  "task card"
);

fs.writeFileSync(target, source);
console.log("patched task ui");