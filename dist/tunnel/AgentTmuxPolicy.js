"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.zlkDefaultCondaEnv = exports.zlkAgentRuntimeRelativePath = exports.zlkAgentTmuxCommandVersion = exports.zlkTmuxSessionPrefix = void 0;
exports.defaultAgentTmuxSessionName = defaultAgentTmuxSessionName;
exports.isValidZlkTmuxSessionName = isValidZlkTmuxSessionName;
exports.agentTmuxStartupCommand = agentTmuxStartupCommand;
exports.zlkTmuxSessionPrefix = "zlk-";
exports.zlkAgentTmuxCommandVersion = "ZLK_AGENT_TMUX_V19=1";
exports.zlkAgentRuntimeRelativePath = "zlk_cluster/runtime/cluster_agent.py";
exports.zlkDefaultCondaEnv = "";
function defaultAgentTmuxSessionName(role, endpointId) {
    if (role === "hub")
        return "zlk-hub-agent";
    return `zlk-worker-${slug(endpointId || "worker")}-agent`;
}
function isValidZlkTmuxSessionName(value) {
    return /^zlk-[a-z0-9][a-z0-9._-]*$/.test(value);
}
function agentTmuxStartupCommand(options) {
    const role = options.role;
    const mode = role === "hub" ? "hub_control" : "worker_telemetry";
    const port = options.port || 18765;
    const session = defaultAgentTmuxSessionName(role, options.endpointId);
    const condaEnv = normalizeCondaEnvName(options.condaEnv);
    const requireCondaEnv = condaEnv ? "1" : "0";
    const command = agentRuntimeCommand({ session, mode, port, installDir: options.installDir, workDir: options.workDir, pythonCommand: options.pythonCommand, endpointId: options.endpointId, condaEnv });
    const agentPids = `AGENT_PIDS=$(ps -eo pid=,comm=,args= | awk -v port="$PORT" -v mode="$MODE" '$2 ~ /python/ && index($0,"cluster_agent.py") && (index($0,"--port " port) || index($0,"--port=" port)) && (index($0,"--mode " mode) || index($0,"--mode=" mode)) { print $1 }')`;
    const portPids = `PORT_PIDS=$({ ss -ltnp "sport = :$PORT" 2>/dev/null | awk -F'pid=' '/pid=/ { split($2,a,","); print a[1] }'; if command -v lsof >/dev/null 2>&1; then lsof -nP -iTCP:"$PORT" -sTCP:LISTEN -t 2>/dev/null; fi; } | sort -u)`;
    const mergePids = `PIDS=$(printf "%s\\n%s\\n" "$AGENT_PIDS" "$PORT_PIDS" | tr ' ' '\\n' | awk -v self="$$" 'NF && $1 != self { print $1 }' | sort -u)`;
    const stopSession = `if tmux has-session -t "$SESSION" 2>/dev/null; then tmux kill-session -t "$SESSION" >/dev/null 2>&1 || true; sleep 1; fi`;
    const stopPids = `if [ -n "$PIDS" ]; then kill $PIDS >/dev/null 2>&1 || true; sleep 1; for pid in $PIDS; do kill -0 "$pid" 2>/dev/null && kill -9 "$pid" >/dev/null 2>&1 || true; done; fi`;
    const startTmux = `tmux new-session -d -s "$SESSION" "$CMD" >/dev/null 2>&1 || true`;
    const openWorkShell = [
        `export WORK_DIR ZLK_CONDA_ENV ZLK_REQUIRE_CONDA_ENV CONDA_CHANGEPS1=true`,
        `sleep 0.1`,
        foregroundBashShellCommand(condaEnv),
        `if [ -n "$WORK_DIR" ] && [ -d "$WORK_DIR" ]; then cd "$WORK_DIR"; fi`,
        `sleep 0.1`,
        zlkCondaActivationShell(false, { quietActivate: false, reportOptionalFailure: true, reportOptionalMissing: true }),
        `exec "\${SHELL:-/bin/sh}" -i`,
    ].join("; ");
    return [
        exports.zlkAgentTmuxCommandVersion,
        "unset TMUX",
        `SESSION=${shellQuote(session)}`,
        `PORT=${shellQuote(String(port))}`,
        `MODE=${shellQuote(mode)}`,
        `ZLK_CONDA_ENV=${shellQuote(condaEnv)}`,
        `ZLK_REQUIRE_CONDA_ENV=${shellQuote(requireCondaEnv)}`,
        `INSTALL_DIR=${shellQuote(options.installDir || "")}`,
        `WORK_DIR=${shellQuote((options.workDir || options.installDir || "").trim())}`,
        `CMD=${shellQuote(command)}`,
        `${stopSession}; ${agentPids}; ${portPids}; ${mergePids}; ${stopPids}; ${startTmux}; ${openWorkShell}`,
    ].join("; ");
}
function agentRuntimeCommand(options) {
    const workerIdArg = options.mode === "worker_telemetry" && options.endpointId ? ` --worker-id ${shellQuote(options.endpointId)}` : "";
    if (options.pythonCommand)
        return `${options.pythonCommand} --host 127.0.0.1 --port ${options.port} --mode ${options.mode}${workerIdArg}`;
    const installDir = options.installDir?.trim() || "";
    const workDir = options.workDir?.trim() || installDir;
    const condaEnv = normalizeCondaEnvName(options.condaEnv);
    const requireCondaEnv = condaEnv ? "1" : "0";
    return [
        `INSTALL_DIR=${shellQuote(installDir)}`,
        `WORK_DIR=${shellQuote(workDir)}`,
        `PORT=${shellQuote(String(options.port))}`,
        `MODE=${shellQuote(options.mode)}`,
        `if [ -z "$INSTALL_DIR" ]; then exit 127; fi`,
        `if [ -z "$WORK_DIR" ]; then exit 127; fi`,
        `LOG="$INSTALL_DIR/logs/${options.session}.log"`,
        `mkdir -p "$INSTALL_DIR/logs" "$INSTALL_DIR/zlk_cluster/runtime" "$WORK_DIR"`,
        `exec >> "$LOG" 2>&1`,
        `echo "[$(date -Is)] Starting ${options.session} mode=${options.mode} port=${options.port}"`,
        `echo "Install dir: $INSTALL_DIR"`,
        `echo "Work dir: $WORK_DIR"`,
        `echo "State dir: runtime namespaces state by work dir under $INSTALL_DIR/state/projects/<project-namespace>"`,
        `AGENT_SCRIPT="$INSTALL_DIR/${exports.zlkAgentRuntimeRelativePath}"`,
        `if [ ! -f "$AGENT_SCRIPT" ]; then echo "Runtime missing: $AGENT_SCRIPT"; echo "Deploy latest runtime from VS Code panel, then restart the Xshell tunnel session."; exit 127; fi`,
        `chmod +x "$AGENT_SCRIPT" 2>/dev/null || true`,
        `cd "$WORK_DIR" || exit 127`,
        `export ZLK_CONDA_ENV="\${ZLK_CONDA_ENV:-${condaEnv}}"`,
        `export ZLK_REQUIRE_CONDA_ENV="\${ZLK_REQUIRE_CONDA_ENV:-${requireCondaEnv}}"`,
        zlkCondaActivationShell(false),
        `export ZLK_AGENT_INSTALL_DIR="$INSTALL_DIR"`,
        `export PYTHONPATH="$INSTALL_DIR\${PYTHONPATH:+:$PYTHONPATH}"`,
        `if command -v python3 >/dev/null 2>&1; then ZLK_PY=python3; elif command -v python >/dev/null 2>&1; then ZLK_PY=python; else echo "python3 or python is required."; exit 127; fi`,
        `echo "Runtime script: $AGENT_SCRIPT"`,
        `exec "$ZLK_PY" "$AGENT_SCRIPT" serve --project-dir "$WORK_DIR" --host 127.0.0.1 --port "$PORT" --mode "$MODE"${workerIdArg}`,
    ].join("; ");
}
function shellQuote(value) {
    return `'${value.replace(/'/g, `'\\''`)}'`;
}
function foregroundBashShellCommand(condaEnv = exports.zlkDefaultCondaEnv) {
    const envName = normalizeCondaEnvName(condaEnv);
    const bashRcLines = [
        `for __ZLK_PROFILE in "$HOME/.bash_profile" "$HOME/.bash_login" "$HOME/.profile"; do if [ -f "$__ZLK_PROFILE" ]; then . "$__ZLK_PROFILE"; fi; done`,
        `if [ -f "$HOME/.bashrc" ]; then . "$HOME/.bashrc"; fi`,
        `for __ZLK_CONDA_WAIT in 1 2 3 4 5 6 7 8 9 10; do command -v conda >/dev/null 2>&1 && break; sleep 0.2; done`,
        `export ZLK_CONDA_ENV="\${ZLK_CONDA_ENV:-${envName}}"`,
        `export ZLK_REQUIRE_CONDA_ENV="\${ZLK_REQUIRE_CONDA_ENV:-0}"`,
        `export CONDA_CHANGEPS1=true`,
        `sleep 0.1`,
        zlkCondaActivationShell(false, { quietActivate: false, reportOptionalFailure: true, reportOptionalMissing: true, hookShell: "bash" }),
        `sleep 0.1`,
        `if [ -n "$WORK_DIR" ] && [ -d "$WORK_DIR" ]; then cd "$WORK_DIR"; fi`,
        `rm -f "$__ZLK_BASHRC" >/dev/null 2>&1 || true`,
    ];
    return `if command -v bash >/dev/null 2>&1; then __ZLK_BASHRC="\${TMPDIR:-/tmp}/zlk-agent-shell-$$.bashrc"; export __ZLK_BASHRC WORK_DIR ZLK_CONDA_ENV ZLK_REQUIRE_CONDA_ENV CONDA_CHANGEPS1; if printf "%s\\n" ${bashRcLines.map(shellQuote).join(" ")} > "$__ZLK_BASHRC"; then exec bash --rcfile "$__ZLK_BASHRC" -i; fi; fi`;
}
function zlkCondaActivationShell(required, options = {}) {
    const missing = required
        ? `echo "Conda env $ZLK_CONDA_ENV is required."; exit 127`
        : (options.reportOptionalMissing ? `echo "ZLK conda activation failed: conda command not found."; true` : "true");
    const failed = required
        ? `{ echo "Conda env $ZLK_CONDA_ENV is required."; exit 127; }`
        : (options.reportOptionalFailure ? `{ __ZLK_CONDA_RC=$?; echo "ZLK conda activation failed: conda activate $ZLK_CONDA_ENV exited $__ZLK_CONDA_RC."; true; }` : "true");
    const missingGuard = required ? `"\${ZLK_REQUIRE_CONDA_ENV:-1}" = "1"` : (options.reportOptionalMissing ? `"1" = "1"` : `"0" = "1"`);
    const activateRedirect = options.quietActivate === false ? "" : " >/dev/null 2>&1";
    const hookShell = options.hookShell || "posix";
    return [
        `if [ -n "$ZLK_CONDA_ENV" ]; then :`,
        `for __ZLK_CONDA_SH in "$HOME/miniconda3/etc/profile.d/conda.sh" "$HOME/anaconda3/etc/profile.d/conda.sh" "$HOME/miniforge3/etc/profile.d/conda.sh" "$HOME/mambaforge/etc/profile.d/conda.sh" "/opt/conda/etc/profile.d/conda.sh" "/opt/anaconda3/etc/profile.d/conda.sh" "/usr/local/anaconda3/etc/profile.d/conda.sh"; do if ! command -v conda >/dev/null 2>&1 && [ -f "$__ZLK_CONDA_SH" ]; then . "$__ZLK_CONDA_SH"; fi; done`,
        `if command -v conda >/dev/null 2>&1; then __ZLK_CONDA_SETUP="$(conda shell.${hookShell} hook 2>/dev/null)" && eval "$__ZLK_CONDA_SETUP" || true; fi`,
        `if command -v conda >/dev/null 2>&1; then conda activate "$ZLK_CONDA_ENV"${activateRedirect} || ${failed}; elif [ ${missingGuard} ]; then ${missing}; fi`,
        `fi`,
    ].join("; ");
}
function normalizeCondaEnvName(value) {
    return String(value || exports.zlkDefaultCondaEnv).trim();
}
function slug(value) {
    return String(value || "worker").trim().toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "worker";
}
