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
exports.sha256File = sha256File;
exports.verifyLocalFileSha256 = verifyLocalFileSha256;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
async function sha256File(file) {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash("sha256");
        const input = fs.createReadStream(file);
        input.on("data", (chunk) => hash.update(chunk));
        input.on("error", reject);
        input.on("end", () => resolve(hash.digest("hex")));
    });
}
async function verifyLocalFileSha256(transferId, localPath, expectedSha256) {
    if (!expectedSha256)
        return { transferId, ok: true, message: "No sha256 expected value provided." };
    const actualSha256 = await sha256File(localPath);
    const normalizedActualSha256 = actualSha256.toLowerCase();
    const normalizedExpectedSha256 = expectedSha256.toLowerCase();
    const ok = normalizedActualSha256 === normalizedExpectedSha256;
    return {
        transferId,
        ok,
        expectedSha256,
        actualSha256,
        message: ok ? "sha256 ok" : "sha256 mismatch",
    };
}
