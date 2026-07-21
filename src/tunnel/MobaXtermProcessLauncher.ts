import { launchXshellTunnelProcess, XshellLaunchResult } from "./XshellProcessLauncher";

export type MobaXtermLaunchResult = XshellLaunchResult;
export const launchMobaXtermTunnel = launchXshellTunnelProcess;