"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const worker_threads_1 = require("worker_threads");
const LatestResultExport_1 = require("./LatestResultExport");
worker_threads_1.parentPort?.on("message", async (request) => {
    try {
        const catalog = await (0, LatestResultExport_1.latestResultCatalog)(request.root, request.resultDir);
        worker_threads_1.parentPort?.postMessage({ id: request.id, catalog });
    }
    catch (error) {
        worker_threads_1.parentPort?.postMessage({ id: request.id, error: error instanceof Error ? error.message : String(error) });
    }
});
