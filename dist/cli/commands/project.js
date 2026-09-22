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
exports.projectStatus = projectStatus;
const path = __importStar(require("path"));
const api_1 = require("../api");
const data_1 = require("../data");
const format_1 = require("../format");
async function projectStatus(flags) {
    const pkg = (0, data_1.packageMeta)();
    const root = (0, data_1.projectRoot)();
    const discovery = (0, api_1.discoveryOrNull)();
    const apiReady = Boolean(discovery);
    let cluster = null;
    if (apiReady)
        cluster = (await (0, api_1.optionalApi)("status"));
    const experimentIndex = (0, data_1.fileExists)((0, data_1.resolveProjectPath)(data_1.EXPERIMENT_INDEX_REL));
    const planDir = (0, data_1.fileExists)((0, data_1.resolveProjectPath)(data_1.DEFAULT_PLAN_DIR));
    const ready = experimentIndex || planDir || apiReady;
    const payload = {
        name: path.basename(root) || pkg.name,
        root,
        version: String((cluster && cluster.version) || pkg.version || ""),
        services: {
            experiment: experimentIndex || planDir ? "ready" : "offline",
            cluster: cluster ? "ready" : (apiReady ? "unknown" : "offline"),
            api: apiReady ? String(discovery.baseUrl || "ready") : "offline",
        },
        status: ready ? "ready" : "offline",
        api: cluster || null,
    };
    if (flags.json) {
        (0, format_1.writeJson)(payload, flags.compactJson);
        return 0;
    }
    (0, format_1.writeText)((0, format_1.nestedBlock)({
        Project: { name: payload.name, root: payload.root, version: payload.version },
        Services: payload.services,
        Status: payload.status,
    }));
    return 0;
}
