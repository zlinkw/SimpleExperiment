"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.allSectionIds = exports.DiagnosticsSection = exports.SettingsSection = exports.TmuxSection = exports.GpuSection = exports.ExecutionSection = exports.ResultsSection = exports.PlansSection = exports.ServersSection = void 0;
exports.createAllSections = createAllSections;
exports.createSectionById = createSectionById;
exports.toPanelSections = toPanelSections;
const ServersSection_1 = require("./ServersSection");
const PlansSection_1 = require("./PlansSection");
const ResultsSection_1 = require("./ResultsSection");
const ExecutionSection_1 = require("./ExecutionSection");
const GpuSection_1 = require("./GpuSection");
const TmuxSection_1 = require("./TmuxSection");
const SettingsSection_1 = require("./SettingsSection");
const DiagnosticsSection_1 = require("./DiagnosticsSection");
var ServersSection_2 = require("./ServersSection");
Object.defineProperty(exports, "ServersSection", { enumerable: true, get: function () { return ServersSection_2.ServersSection; } });
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
    const sections = [
        new ServersSection_1.ServersSection(),
        new SettingsSection_1.SettingsSection(),
        new PlansSection_1.PlansSection(),
        new ResultsSection_1.ResultsSection(),
        new GpuSection_1.GpuSection(),
        new TmuxSection_1.TmuxSection(),
        new ExecutionSection_1.ExecutionSection(),
        new DiagnosticsSection_1.DiagnosticsSection(),
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
exports.allSectionIds = ["servers", "settings", "plans", "results", "gpu", "tmux", "execution", "diagnostics"];
