"use strict";
/**
 * RenderStateTypes - Webview 渲染状态类型与常量
 * 拆分自 WebviewRenderState.ts (328→模块化)
 * 职责：任务状态优先级、调度桶映射、桶列表常量
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SCHEDULER_BUCKETS = exports.SCHEDULER_BUCKET_STATUSES = exports.TASK_STATUS_RANKS = void 0;
exports.TASK_STATUS_RANKS = Object.freeze({
    running: 0,
    testing: 1,
    queued: 2,
    pending: 2,
    failed: 3,
    completed: 4,
    done: 4,
    stopped: 5,
    unknown: 6,
});
exports.SCHEDULER_BUCKET_STATUSES = Object.freeze({
    queued_experiments: "queued",
    pending_experiments: "queued",
    running_experiments: "running",
    testing_experiments: "testing",
    completed_experiments: "completed",
    failed_experiments: "failed",
    stopped_experiments: "stopped",
});
exports.SCHEDULER_BUCKETS = Object.freeze(Object.keys(exports.SCHEDULER_BUCKET_STATUSES));
