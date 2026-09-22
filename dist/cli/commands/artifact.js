"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.artifactCommand = artifactCommand;
exports.artifactList = artifactList;
exports.artifactDownload = artifactDownload;
exports.artifactInspect = artifactInspect;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const api_1 = require("../api");
const data_1 = require("../data");
const errors_1 = require("../errors");
const format_1 = require("../format");
const parse_1 = require("../parse");
const experiment_1 = require("./experiment");
const FileTransferClient_1 = require("../../tunnel/FileTransferClient");
const RequestBudget_1 = require("../../tunnel/RequestBudget");
const FileTransferTypes_1 = require("../../tunnel/FileTransferTypes");
async function artifactCommand(action, rest, flags) {
    if (action === "list")
        return artifactList((0, parse_1.requirePositional)(rest, 0, "experiment id"), flags);
    if (action === "download")
        return artifactDownload((0, parse_1.requirePositional)(rest, 0, "artifact id"), flags);
    if (action === "inspect")
        return artifactInspect((0, parse_1.requirePositional)(rest, 0, "artifact id"), flags);
    throw (0, errors_1.usageError)(`unknown artifact action: ${action || "(missing)"}`);
}
async function artifactList(experimentId, flags) {
    const rows = (await listArtifacts(experimentId)).map(({ local: _local, ...row }) => row);
    if (flags.json) {
        (0, format_1.writeJson)(rows, flags.compactJson);
        return 0;
    }
    (0, format_1.writeText)((0, format_1.table)(["id", "path", "size"], rows));
    return 0;
}
async function artifactDownload(id, flags) {
    const artifacts = await findArtifact(id);
    if (!artifacts)
        throw (0, errors_1.businessError)(`artifact not found: ${id}`);
    const dest = path.resolve(flags.out || path.join((0, data_1.projectRoot)(), "experiments", "downloads", path.basename(artifacts.path)));
    if (artifacts.local && (0, data_1.fileExists)(artifacts.local)) {
        (0, data_1.copyFile)(artifacts.local, dest);
        const payload = { id, path: dest, source: "local" };
        if (flags.json)
            (0, format_1.writeJson)(payload, flags.compactJson);
        else
            (0, format_1.writeText)(`downloaded ${id} -> ${dest}`);
        return 0;
    }
    if (!(0, api_1.hasApiDiscovery)())
        throw (0, errors_1.envError)("artifact download requires Local API / tunnel. Open VS Code or copy a local artifact.");
    const config = await (0, api_1.optionalApi)("config.list");
    const endpoint = (0, api_1.tunnelEndpointFromConfig)(asRecord(asRecord(config).tunnel || asRecord(config).hub || config));
    if (!endpoint)
        throw (0, errors_1.envError)("tunnel endpoint missing from config.list; cannot download remotely.");
    if (!(0, FileTransferTypes_1.isSafeRemotePath)(artifacts.path))
        throw (0, errors_1.businessError)(`unsafe remote path: ${artifacts.path}`);
    const client = new FileTransferClient_1.FileTransferClient({ localHost: endpoint.localHost, localPort: endpoint.localPort }, new RequestBudget_1.RequestBudget({
        maxRequestsPerMinute: 60,
        maxConcurrentRequests: 1,
        pauseWhenHidden: false,
        allowManualOverride: true,
        minIntervalByPurpose: { file_transfer: 0 },
    }));
    const task = await client.download(artifacts.path, dest);
    const payload = { id, path: dest, transferId: task.transferId, status: task.status, source: "tunnel" };
    if (flags.json)
        (0, format_1.writeJson)(payload, flags.compactJson);
    else
        (0, format_1.writeText)(`downloaded ${id} -> ${dest}`);
    return 0;
}
async function artifactInspect(id, flags) {
    const artifact = await findArtifact(id);
    if (!artifact)
        throw (0, errors_1.businessError)(`artifact not found: ${id}`);
    const local = artifact.local && (0, data_1.fileExists)(artifact.local) ? artifact.local : "";
    const stat = local ? fs.statSync(local) : null;
    const payload = {
        id,
        file: artifact.path,
        size: stat ? stat.size : (artifact.size || ""),
        mtime: stat ? stat.mtime.toISOString() : "",
        hash: local ? crypto.createHash("sha256").update(fs.readFileSync(local)).digest("hex") : "",
    };
    if (flags.json)
        (0, format_1.writeJson)(payload, flags.compactJson);
    else
        (0, format_1.writeText)(`${payload.file} size=${payload.size} mtime=${payload.mtime} hash=${payload.hash}`);
    return 0;
}
async function listArtifacts(experimentId) {
    const experiment = (await (0, experiment_1.loadExperiments)()).find((row) => row.id === experimentId || row.name === experimentId);
    const outputDir = experiment?.raw ? String(experiment.raw.hub_job_dir || experiment.raw.outputDir || experiment.raw.runDir || runDirFromLog(experiment.raw.stdout) || "") : "";
    const rows = [];
    if (outputDir) {
        const abs = path.isAbsolute(outputDir) ? outputDir : (0, data_1.resolveProjectPath)(outputDir);
        if ((0, data_1.fileExists)(abs)) {
            const manifest = (0, data_1.readJsonFile)(path.join(abs, "artifact_manifest.json"), {});
            const files = Array.isArray(manifest.files) && manifest.files.length
                ? manifest.files.map((file) => ({ path: path.join(abs, String(file.path || "")), size: file.size }))
                : (0, data_1.listFilesRecursive)(abs, () => true, 2).map((file) => ({ path: file, size: fs.statSync(file).size }));
            for (const file of files) {
                rows.push({
                    id: `${experimentId}:${path.basename(file.path)}`,
                    path: path.relative((0, data_1.projectRoot)(), file.path).replace(/\\/g, "/") || file.path,
                    size: String(file.size ?? ""),
                    local: file.path,
                });
            }
        }
    }
    const remote = await (0, api_1.optionalApi)("results.list", { planFile: experimentId });
    const results = Array.isArray(remote?.results) ? remote.results : [];
    for (const result of results) {
        const files = Array.isArray(result.sourceFiles) ? result.sourceFiles : [];
        for (const file of files) {
            const filePath = String(file.path || "");
            if (!filePath)
                continue;
            rows.push({ id: `${String(result.resultId || experimentId)}:${path.basename(filePath)}`, path: filePath, size: String(file.size || "") });
        }
    }
    return rows;
}
async function findArtifact(id) {
    const [experimentId, ...rest] = id.split(":");
    const name = rest.join(":") || experimentId;
    const listed = await listArtifacts(experimentId);
    const match = listed.find((row) => row.id === id || row.path.endsWith(name) || path.basename(row.path) === id);
    if (match) {
        const abs = match.local || (path.isAbsolute(match.path) ? match.path : (0, data_1.resolveProjectPath)(match.path));
        const local = (0, data_1.fileExists)(abs) ? abs : undefined;
        return { path: match.path, size: local ? String(fs.statSync(local).size) : match.size, local };
    }
    const abs = path.isAbsolute(id) ? id : (0, data_1.resolveProjectPath)(id);
    if ((0, data_1.fileExists)(abs))
        return { path: id, size: String(fs.statSync(abs).size), local: abs };
    return null;
}
function runDirFromLog(value) {
    const text = String(value || "").replace(/\\/g, "/");
    const match = text.match(/^(.*)\/(?:stdout|stderr)\.log$/);
    return match ? match[1] : "";
}
function asRecord(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}
