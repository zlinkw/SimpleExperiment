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
exports.importOfflineBundle = importOfflineBundle;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
async function importOfflineBundle(sourcePath) {
    try {
        const stat = await fs.stat(sourcePath);
        const bundle = stat.isDirectory()
            ? await importOfflineDirectory(sourcePath)
            : JSON.parse(await fs.readFile(sourcePath, "utf8"));
        if (!Number.isInteger(bundle.schemaVersion))
            return { ok: false, error: "offline bundle missing schemaVersion" };
        return {
            ok: true,
            bundle: {
                ...bundle,
                importedFrom: sourcePath,
                lastImportedAt: new Date().toISOString(),
            },
        };
    }
    catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
}
async function importOfflineDirectory(dir) {
    const snapshot = await readOptionalJson(path.join(dir, "cluster_snapshot.json"));
    const diagnostics = await readOptionalJson(path.join(dir, "diagnostics.json"));
    const auditTail = await readOptionalText(path.join(dir, "audit_tail.jsonl"));
    const results = await readOptionalJson(path.join(dir, "results_summary.json"));
    const qualityGate = await readOptionalJson(path.join(dir, "quality_gate.json"));
    const paperTable = await readOptionalJson(path.join(dir, "paper_table.json"));
    return {
        schemaVersion: Number(snapshot?.schemaVersion || 1),
        snapshot,
        diagnostics,
        auditTail,
        results,
        qualityGate,
        paperTable,
    };
}
async function readOptionalJson(file) {
    try {
        return JSON.parse(await fs.readFile(file, "utf8"));
    }
    catch {
        return undefined;
    }
}
async function readOptionalText(file) {
    try {
        return await fs.readFile(file, "utf8");
    }
    catch {
        return undefined;
    }
}
