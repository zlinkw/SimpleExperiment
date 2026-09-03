"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.allSectionIds = exports.DiagnosticsSection = exports.SettingsSection = exports.TmuxSection = exports.GpuSection = exports.ExecutionSection = exports.ResultsSection = exports.PlansSection = exports.SyncSection = exports.ServersSection = void 0;
exports.createAllSections = createAllSections;
exports.createSectionById = createSectionById;
exports.toPanelSections = toPanelSections;
const ServersSection_1 = require("./ServersSection");
const SyncSection_1 = require("./SyncSection");
const PlansSection_1 = require("./PlansSection");
const ResultsSection_1 = require("./ResultsSection");
const ExecutionSection_1 = require("./ExecutionSection");
const GpuSection_1 = require("./GpuSection");
const TmuxSection_1 = require("./TmuxSection");
const SettingsSection_1 = require("./SettingsSection");
const DiagnosticsSection_1 = require("./DiagnosticsSection");
var ServersSection_2 = require("./ServersSection");
Object.defineProperty(exports, "ServersSection", { enumerable: true, get: function () { return ServersSection_2.ServersSection; } });
var SyncSection_2 = require("./SyncSection");
Object.defineProperty(exports, "SyncSection", { enumerable: true, get: function () { return SyncSection_2.SyncSection; } });
var PlansSection_2 = require("./PlansSection");
Object.defineProperty(exports, "PlansSection", { enumerable: true, get: function () { return PlansSection_2.PlansSection; } });
var ResultsSection_2 = require("./ResultsSection");
Object.defineProperty(exports, "ResultsSection", { enumerable: true, get: function () { return ResultsSection_2.ResultsSection; } });
var ExecutionSection_2 = require("./ExecutionSection");
Object.defineProperty(exports, "ExecutionSection", { enumerable: true, get: function () { return ExecutionSection_2.ExecutionSection; } });
var GpuSection_2 = require("./GpuSection");
Object.defineProperty(exports, "GpuSection", { enumerable: true, get: function () { return GpuSection_2.GpuSection; } });
var TmuxSection_2 = require("./TmuxSection");
Object.defineProperty(exports, "TmuxSection", { enumerable: true, get: function () { return TmuxSection_2.TmuxSection; } });
var SettingsSection_2 = require("./SettingsSection");
Object.defineProperty(exports, "SettingsSection", { enumerable: true, get: function () { return SettingsSection_2.SettingsSection; } });
var DiagnosticsSection_2 = require("./DiagnosticsSection");
Object.defineProperty(exports, "DiagnosticsSection", { enumerable: true, get: function () { return DiagnosticsSection_2.DiagnosticsSection; } });
function createAllSections() {
    // 目标序：sync1/plans2/gpu3/tmux4/execution5/results6/diagnostics7/settings8；
    // servers 仅废弃兼容保留（order 90），运行时顺序以 legacy RESOURCE 为准
    const sections = [
        new SyncSection_1.SyncSection(),
        new PlansSection_1.PlansSection(),
        new GpuSection_1.GpuSection(),
        new TmuxSection_1.TmuxSection(),
        new ExecutionSection_1.ExecutionSection(),
        new ResultsSection_1.ResultsSection(),
        new DiagnosticsSection_1.DiagnosticsSection(),
        new SettingsSection_1.SettingsSection(),
        new ServersSection_1.ServersSection(),
    ];
    return sections.sort((a, b) => a.order - b.order);
}
function createSectionById(id) {
    return createAllSections().find((s) => s.id === id);
}
/**
 * 适配 PanelSectionFactory 的 PanelSection 形状，供 PanelHtmlRenderer 使用
 */
function toPanelSections(sections) {
    return sections.map((s) => ({
        id: s.id,
        title: s.title,
        order: s.order,
        icon: "",
        renderHtml: (state) => s.renderHtml(state),
        renderCss: () => s.renderCss(),
        renderScript: () => s.renderScript(),
    }));
}
exports.allSectionIds = ["sync", "plans", "gpu", "tmux", "execution", "results", "diagnostics", "settings"];
// 已废弃（兼容保留，不参与目标序）：servers, operations
