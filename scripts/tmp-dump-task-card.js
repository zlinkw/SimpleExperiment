const fs = require("fs");
const path = require("path");
const source = fs.readFileSync(path.join(__dirname, "..", "src", "ui", "PanelHtml.ts"), "utf8");
const start = source.indexOf("function renderTaskCard(state, row, selected)");
if (start < 0) {
  throw new Error("renderTaskCard not found");
}
const end = source.indexOf("function renderTaskTable(state, rows, selected)", start);
const block = source.slice(start, end);
fs.writeFileSync(path.join(__dirname, "tmp-task-card-block.txt"), block, "utf8");
console.log("len", block.length);
console.log("hasMeta", block.includes("taskMetaGrid"));
console.log("hasPending", block.includes("pendingBadge"));