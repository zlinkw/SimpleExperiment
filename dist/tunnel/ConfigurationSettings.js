"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.explicitConfigurationValue = explicitConfigurationValue;
exports.nonDefaultConfigurationValue = nonDefaultConfigurationValue;
function explicitConfigurationValue(config, section, fallback) {
    const inspected = config.inspect(section);
    if (!inspected)
        return fallback;
    if (inspected.workspaceFolderValue !== undefined)
        return inspected.workspaceFolderValue;
    if (inspected.workspaceValue !== undefined)
        return inspected.workspaceValue;
    if (inspected.globalValue !== undefined)
        return inspected.globalValue;
    return fallback;
}
function nonDefaultConfigurationValue(config, section, fallback) {
    const inspected = config.inspect(section);
    if (!inspected)
        return fallback;
    for (const value of [inspected.workspaceFolderValue, inspected.workspaceValue, inspected.globalValue]) {
        if (value !== undefined && value !== inspected.defaultValue)
            return value;
    }
    return fallback;
}
