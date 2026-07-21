const fs = require("fs");
const path = require("path");
const source = fs.readFileSync(path.join(__dirname, "..", "src", "ui", "PanelHtml.ts"), "utf8");
const marker = 'function renderTaskCard(state, row, selected)';
const idx = source.indexOf(marker);
console.log("idx", idx);
console.log(JSON.stringify(source.slice(idx, idx + 1400)));