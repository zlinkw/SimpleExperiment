import * as crypto from "crypto";
import * as fs from "fs";
import { FileTransferVerifyResult } from "./FileTransferTypes";

export async function sha256File(file: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const input = fs.createReadStream(file);
    input.on("data", (chunk) => hash.update(chunk));
    input.on("error", reject);
    input.on("end", () => resolve(hash.digest("hex")));
  });
}

export async function verifyLocalFileSha256(
  transferId: string,
  localPath: string,
  expectedSha256?: string,
): Promise<FileTransferVerifyResult> {
  if (!expectedSha256) return { transferId, ok: true, message: "No sha256 expected value provided." };
  const actualSha256 = await sha256File(localPath);
  return {
    transferId,
    ok: actualSha256.toLowerCase() === expectedSha256.toLowerCase(),
    expectedSha256,
    actualSha256,
    message: actualSha256.toLowerCase() === expectedSha256.toLowerCase() ? "sha256 ok" : "sha256 mismatch",
  };
}