"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recommendAvailableLocalPort = exports.isLocalPortAvailable = exports.buildIntegrationReport = exports.MobaXtermIntegration = void 0;
const XshellTunnelIntegration_1 = require("./XshellTunnelIntegration");
Object.defineProperty(exports, "buildIntegrationReport", { enumerable: true, get: function () { return XshellTunnelIntegration_1.buildIntegrationReport; } });
Object.defineProperty(exports, "isLocalPortAvailable", { enumerable: true, get: function () { return XshellTunnelIntegration_1.isLocalPortAvailable; } });
Object.defineProperty(exports, "recommendAvailableLocalPort", { enumerable: true, get: function () { return XshellTunnelIntegration_1.recommendAvailableLocalPort; } });
class MobaXtermIntegration extends XshellTunnelIntegration_1.XshellIntegration {
}
exports.MobaXtermIntegration = MobaXtermIntegration;
