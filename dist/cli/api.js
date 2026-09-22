"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasApiDiscovery = hasApiDiscovery;
exports.discoveryOrNull = discoveryOrNull;
exports.callApi = callApi;
exports.optionalApi = optionalApi;
exports.tunnelEndpointFromConfig = tunnelEndpointFromConfig;
exports.classifyApiFailure = classifyApiFailure;
const cli_legacy_1 = require("../cli.legacy");
const errors_1 = require("./errors");
function hasApiDiscovery() {
    try {
        (0, cli_legacy_1.readApiDiscovery)();
        return true;
    }
    catch {
        return false;
    }
}
function discoveryOrNull() {
    try {
        return (0, cli_legacy_1.readApiDiscovery)();
    }
    catch {
        return null;
    }
}
async function callApi(method, params = {}) {
    let discovery;
    try {
        discovery = (0, cli_legacy_1.readApiDiscovery)();
    }
    catch (error) {
        throw (0, errors_1.asCliError)(error, 2);
    }
    try {
        const result = await (0, cli_legacy_1.apiRequest)(discovery, method, params);
        if (result.error) {
            const message = String(result.error.message || "API error");
            const detail = JSON.stringify(result.error.data ?? result.error);
            if (Number(result.error.code) === 2001)
                throw (0, errors_1.envError)(message, detail);
            throw (0, errors_1.asCliError)(new Error(message), 3);
        }
        return result.result;
    }
    catch (error) {
        if (error.exitCode)
            throw error;
        throw (0, errors_1.asCliError)(error, 4);
    }
}
async function optionalApi(method, params = {}) {
    if (!hasApiDiscovery())
        return null;
    try {
        return await callApi(method, params);
    }
    catch (error) {
        const mapped = (0, errors_1.asCliError)(error, 4);
        if (mapped.exitCode === 4)
            return null;
        if (mapped.exitCode === 2)
            return null;
        throw mapped;
    }
}
function tunnelEndpointFromConfig(config) {
    if (!config)
        return null;
    const host = firstString(config, ["localForwardHost", "localHost", "host"]);
    const port = Number(config.localForwardPort ?? config.localPort ?? config.port);
    if (!host || !Number.isInteger(port) || port <= 0)
        return null;
    return { localHost: host, localPort: port };
}
function firstString(record, keys) {
    for (const key of keys) {
        const value = record[key];
        if (typeof value === "string" && value.trim())
            return value.trim();
    }
    return "";
}
function classifyApiFailure(error) {
    const mapped = (0, errors_1.asCliError)(error, 4);
    if (mapped.exitCode === 4)
        throw (0, errors_1.networkError)(mapped.message, mapped.detail);
    throw mapped;
}
