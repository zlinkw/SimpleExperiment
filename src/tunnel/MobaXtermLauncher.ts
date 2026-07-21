import {
  buildForwardCommand,
  buildXshellArgs,
  buildXshellPreview,
  findXshellExecutable,
  generateBatScript,
  generatePs1Script,
  isLocalPortAvailable,
  launchXshellTunnel,
  recommendAvailableLocalPort,
  validateXshellExecutable,
} from "./XshellTunnelLauncher";

export const findMobaXtermExecutable = findXshellExecutable;
export const validateMobaXtermExecutable = validateXshellExecutable;
export const buildMobaXtermArgs = buildXshellArgs;
export const buildMobaXtermPreview = buildXshellPreview;
export const launchMobaXterm = launchXshellTunnel;

export {
  buildForwardCommand,
  generateBatScript,
  generatePs1Script,
  isLocalPortAvailable,
  recommendAvailableLocalPort,
};
