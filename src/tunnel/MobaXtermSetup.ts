import {
  defaultXshellTunnelSetupConfig,
  normalizeXshellSetupConfig,
  normalizeXshellWorkerTunnelConfig,
  publicXshellSetupSummary,
  SavedSessionRunner,
  validateXshellSetupConfig,
  workerTunnelToXshellSetupConfig,
  XshellAuthMethod,
  XshellRealtimeTunnelConfig,
  XshellTunnelSetupConfig,
  XshellWorkerTunnelConfig,
} from "./XshellTunnelSetup";

export type MobaXtermAuthMethod = XshellAuthMethod;
export type MobaXtermRealtimeTunnelConfig = XshellRealtimeTunnelConfig;
export type MobaXtermTunnelSetupConfig = XshellTunnelSetupConfig;
export type MobaXtermWorkerTunnelConfig = XshellWorkerTunnelConfig;
export type { SavedSessionRunner };

export const defaultMobaXtermTunnelSetupConfig = defaultXshellTunnelSetupConfig;
export const normalizeMobaXtermSetupConfig = normalizeXshellSetupConfig;
export const normalizeWorkerTunnelConfig = normalizeXshellWorkerTunnelConfig;
export const validateMobaXtermSetupConfig = validateXshellSetupConfig;
export const publicSetupSummary = publicXshellSetupSummary;
export const workerTunnelToSetupConfig = workerTunnelToXshellSetupConfig;