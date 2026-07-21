export interface ConfigurationInspection<T> {
  globalValue?: T;
  workspaceValue?: T;
  workspaceFolderValue?: T;
  defaultValue?: T;
}

export interface InspectableConfiguration {
  inspect<T>(section: string): ConfigurationInspection<T> | undefined;
}

export function explicitConfigurationValue<T>(
  config: InspectableConfiguration,
  section: string,
  fallback: T,
): T {
  const inspected = config.inspect<T>(section);
  if (!inspected) return fallback;
  if (inspected.workspaceFolderValue !== undefined) return inspected.workspaceFolderValue;
  if (inspected.workspaceValue !== undefined) return inspected.workspaceValue;
  if (inspected.globalValue !== undefined) return inspected.globalValue;
  return fallback;
}