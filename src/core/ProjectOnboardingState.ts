type OnboardingFact = "projectOnboardingCompleted" | "projectOnboardingPrompt";
const legacyKeys: Record<OnboardingFact, string> = {
  projectOnboardingCompleted: "simpleExperiment.projectOnboardingCompleted",
  projectOnboardingPrompt: "simpleExperiment.projectOnboardingPromptVersion",
};
const legacyOwnerKey = "simpleExperiment.projectOnboardingLegacyRoot";

function factKey(root: string, name: OnboardingFact): string {
  return `simpleExperiment.projectOnboarding.v1:${root}:${name}`;
}

export function hasOnboardingFact(context: any, root: string | undefined, name: OnboardingFact): boolean {
  return Boolean(root) && context.globalState.get(factKey(root!, name)) !== undefined;
}

export function readOnboardingFact(context: any, root: string | undefined, name: OnboardingFact, allowLegacy = true): any {
  if (!root) return undefined;
  const saved = context.globalState.get(factKey(root, name));
  if (saved !== undefined) return saved.value;
  const owner = context.workspaceState.get(legacyOwnerKey);
  return allowLegacy && (owner === undefined || owner === root) ? context.workspaceState.get(legacyKeys[name]) : undefined;
}

export async function writeOnboardingFact(context: any, root: string | undefined, name: OnboardingFact, value: any): Promise<void> {
  if (!root) throw new Error("需要打开单个项目工作区才能保存项目引导状态。");
  await context.globalState.update(factKey(root, name), value === undefined ? {} : { value });
}

export async function migrateOnboardingFacts(context: any, root: string | undefined): Promise<void> {
  if (!root) return;
  const owner = context.workspaceState.get(legacyOwnerKey);
  if (owner !== undefined && owner !== root) return;
  const legacy = Object.fromEntries((Object.keys(legacyKeys) as OnboardingFact[]).map(name => [name, context.workspaceState.get(legacyKeys[name])]));
  for (const name of Object.keys(legacyKeys) as OnboardingFact[]) {
    if (hasOnboardingFact(context, root, name)) continue;
    const value = legacy[name];
    if (value !== undefined) await writeOnboardingFact(context, root, name, value);
  }
  if (owner === undefined && Object.values(legacy).some(value => value !== undefined))
    await context.workspaceState.update(legacyOwnerKey, root);
}
