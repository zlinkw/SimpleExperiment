export function atomicStdinWriteCommand(remotePath: string): string {
  const dir = remotePath.replace(/\/[^/]*$/, "") || ".";
  const tmp = `${remotePath}.tmp.${Date.now()}.$$`;
  return [
    `mkdir -p ${shellQuote(dir)}`,
    `tmp=${shellQuote(tmp)}`,
    `cat > "$tmp"`,
    `mv -f "$tmp" ${shellQuote(remotePath)}`,
  ].join(" && ");
}

export function shellQuote(value: string): string {
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}



