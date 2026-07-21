import {
  defaultMobaXtermTunnelSetupConfig,
  MobaXtermAuthMethod,
  MobaXtermRealtimeTunnelConfig,
  MobaXtermTunnelSetupConfig,
  MobaXtermWorkerTunnelConfig,
  normalizeMobaXtermSetupConfig,
  normalizeWorkerTunnelConfig,
  publicSetupSummary,
  SavedSessionRunner,
  validateMobaXtermSetupConfig,
  workerTunnelToSetupConfig,
} from "./MobaXtermSetup";

export type XshellAuthMethod = MobaXtermAuthMethod;
export type XshellRealtimeTunnelConfig = MobaXtermRealtimeTunnelConfig;
export type XshellTunnelSetupConfig = MobaXtermTunnelSetupConfig;
export type XshellWorkerTunnelConfig = MobaXtermWorkerTunnelConfig;
export type { SavedSessionRunner };

export const defaultXshellTunnelSetupConfig = defaultMobaXtermTunnelSetupConfig;
export const normalizeXshellSetupConfig = normalizeMobaXtermSetupConfig;
export const normalizeXshellWorkerTunnelConfig = normalizeWorkerTunnelConfig;
export const validateXshellSetupConfig = validateMobaXtermSetupConfig;
export const publicXshellSetupSummary = publicSetupSummary;
export const workerTunnelToXshellSetupConfig = workerTunnelToSetupConfig;
