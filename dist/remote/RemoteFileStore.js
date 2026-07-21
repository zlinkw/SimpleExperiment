"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.atomicStdinWriteCommand = atomicStdinWriteCommand;
exports.shellQuote = shellQuote;
function atomicStdinWriteCommand(remotePath) {
    const dir = remotePath.replace(/\/[^/]*$/, "") || ".";
    const tmp = `${remotePath}.tmp.${Date.now()}.$$`;
    return [
        `mkdir -p ${shellQuote(dir)}`,
        `tmp=${shellQuote(tmp)}`,
        `cat > "$tmp"`,
        `mv -f "$tmp" ${shellQuote(remotePath)}`,
    ].join(" && ");
}
function shellQuote(value) {
    return `'${String(value).replace(/'/g, "'\\''")}'`;
}
