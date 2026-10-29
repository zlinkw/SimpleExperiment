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
exports.sameProjectRoot = void 0;
exports.currentWindowSftpDiscovery = currentWindowSftpDiscovery;
const path = __importStar(require("node:path"));
const sameProjectRoot = (a, b) => {
    if (!a || !b)
        return false;
    const clean = (value) => path.resolve(value).replace(/\\/g, "/").replace(/\/+$/, "");
    return process.platform === "win32" ? clean(a).toLowerCase() === clean(b).toLowerCase() : clean(a) === clean(b);
};
exports.sameProjectRoot = sameProjectRoot;
/** Extension exports are local to this Extension Host; the global api.json is only a legacy hint. */
async function currentWindowSftpDiscovery(registry, root, legacy) {
    if (!root)
        throw new Error("SFTP_PROJECT_REQUIRED：当前窗口没有受支持的项目，不能借用其他窗口的连接。");
    const extension = registry?.getExtension?.("simple-local.simple-sftp");
    const api = extension ? (extension.isActive ? extension.exports : await extension.activate()) : undefined;
    const discovery = typeof api?.getLocalApiDiscovery === "function" ? await api.getLocalApiDiscovery() : await legacy();
    if (Number(discovery.pid) !== process.pid)
        throw new Error("SFTP_WINDOW_MISMATCH：SimpleSFTP API 属于另一个 VS Code 窗口；请更新配套插件并重载本项目窗口。");
    if (discovery.workspace !== undefined && !(0, exports.sameProjectRoot)(String(discovery.workspace), root))
        throw new Error("SFTP_WORKSPACE_MISMATCH：SimpleSFTP 当前项目与调用项目不一致，未转交请求。");
    return discovery;
}
