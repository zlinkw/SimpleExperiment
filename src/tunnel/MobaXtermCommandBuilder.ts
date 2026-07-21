import {
  buildMultiEndpointXshellTunnelCommands,
  buildXshellArgs,
  buildXshellForwardCommand,
  buildXshellTunnelCommand,
  generateXshellBatScript,
  generateXshellPs1Script,
  generateXshellStartAllBatScript,
  generateXshellStartAllPs1Script,
  MultiEndpointXshellCommandPreview,
  validateXshellCommandConfig,
  XshellCommandPreview,
} from "./XshellTunnelCommandBuilder";

export type MobaXtermCommandPreview = XshellCommandPreview;
export type MultiEndpointMobaXtermCommandPreview = MultiEndpointXshellCommandPreview;

export const buildTunnelCommand = buildXshellTunnelCommand;
export const buildMultiEndpointTunnelCommands = buildMultiEndpointXshellTunnelCommands;
export const buildSshForwardCommand = buildXshellForwardCommand;
export const buildMobaXtermArgs = buildXshellArgs;
export const generateMobaXtermBatScript = generateXshellBatScript;
export const generateMobaXtermPs1Script = generateXshellPs1Script;
export const generateMobaXtermStartAllBatScript = generateXshellStartAllBatScript;
export const generateMobaXtermStartAllPs1Script = generateXshellStartAllPs1Script;
export const validateCommandConfig = validateXshellCommandConfig;