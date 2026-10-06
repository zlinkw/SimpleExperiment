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
exports.postProgressRpc = postProgressRpc;
const http = __importStar(require("node:http"));
const https = __importStar(require("node:https"));
const node_stream_1 = require("node:stream");
/** A long loopback RPC returns headers only after its work finishes. Native
 * fetch has an independent 300s headers deadline despite live SSE progress.
 * The caller's progress watchdog and signal own the deadline instead. */
function postProgressRpc(url, options) {
    if (!["http:", "https:"].includes(url.protocol) || !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname))
        return Promise.reject(new Error("Progress RPC requires a loopback endpoint"));
    return new Promise((resolve, reject) => {
        const transport = url.protocol === "https:" ? https : http;
        const request = transport.request(url, { method: "POST", headers: options.headers, signal: options.signal,
            agent: false, timeout: 0 }, (incoming) => {
            const headers = new Headers();
            for (const [name, value] of Object.entries(incoming.headers)) {
                if (Array.isArray(value))
                    for (const item of value)
                        headers.append(name, item);
                else if (value !== undefined)
                    headers.set(name, value);
            }
            try {
                const status = incoming.statusCode || 500;
                const noBody = [204, 205, 304].includes(status);
                if (noBody)
                    incoming.resume();
                resolve(new Response(noBody ? null : node_stream_1.Readable.toWeb(incoming), { status, headers }));
            }
            catch (error) {
                incoming.destroy();
                reject(error);
            }
        });
        request.once("error", reject);
        request.end(options.body);
    });
}
