import {
  buildIntegrationReport,
  isLocalPortAvailable,
  recommendAvailableLocalPort,
  XshellExecutableResult,
  XshellExecutableValidation,
  XshellIntegration,
  XshellIntegrationCheckResult,
  XshellRealIntegrationReport,
} from "./XshellTunnelIntegration";

export type MobaXtermExecutableResult = XshellExecutableResult;
export type MobaXtermExecutableValidation = XshellExecutableValidation;
export type MobaXtermIntegrationCheckResult = XshellIntegrationCheckResult;
export type MobaXtermRealIntegrationReport = XshellRealIntegrationReport;

export class MobaXtermIntegration extends XshellIntegration {}

export { buildIntegrationReport, isLocalPortAvailable, recommendAvailableLocalPort };