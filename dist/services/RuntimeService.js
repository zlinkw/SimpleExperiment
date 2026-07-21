"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuntimeService = void 0;
const RuntimeManager_1 = require("../runtime/RuntimeManager");
class RuntimeService {
    manager(remote, projectDir, pluginVersion, runtimeVersion, components) {
        return new RuntimeManager_1.RuntimeManager(remote, projectDir, pluginVersion, runtimeVersion, components);
    }
}
exports.RuntimeService = RuntimeService;
