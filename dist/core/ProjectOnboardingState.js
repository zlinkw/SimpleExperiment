"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasOnboardingFact = hasOnboardingFact;
exports.readOnboardingFact = readOnboardingFact;
exports.writeOnboardingFact = writeOnboardingFact;
exports.migrateOnboardingFacts = migrateOnboardingFacts;
const legacyKeys = {
    projectOnboardingCompleted: "simpleExperiment.projectOnboardingCompleted",
    projectOnboardingPrompt: "simpleExperiment.projectOnboardingPromptVersion",
};
const legacyOwnerKey = "simpleExperiment.projectOnboardingLegacyRoot";
function factKey(root, name) {
    return `simpleExperiment.projectOnboarding.v1:${root}:${name}`;
}
function hasOnboardingFact(context, root, name) {
    return Boolean(root) && context.globalState.get(factKey(root, name)) !== undefined;
}
function readOnboardingFact(context, root, name, allowLegacy = true) {
    if (!root)
        return undefined;
    const saved = context.globalState.get(factKey(root, name));
    if (saved !== undefined)
        return saved.value;
    const owner = context.workspaceState.get(legacyOwnerKey);
    return allowLegacy && (owner === undefined || owner === root) ? context.workspaceState.get(legacyKeys[name]) : undefined;
}
async function writeOnboardingFact(context, root, name, value) {
    if (!root)
        throw new Error("需要打开单个项目工作区才能保存项目引导状态。");
    await context.globalState.update(factKey(root, name), value === undefined ? {} : { value });
}
async function migrateOnboardingFacts(context, root) {
    if (!root)
        return;
    const owner = context.workspaceState.get(legacyOwnerKey);
    if (owner !== undefined && owner !== root)
        return;
    const legacy = Object.fromEntries(Object.keys(legacyKeys).map(name => [name, context.workspaceState.get(legacyKeys[name])]));
    for (const name of Object.keys(legacyKeys)) {
        if (hasOnboardingFact(context, root, name))
            continue;
        const value = legacy[name];
        if (value !== undefined)
            await writeOnboardingFact(context, root, name, value);
    }
    if (owner === undefined && Object.values(legacy).some(value => value !== undefined))
        await context.workspaceState.update(legacyOwnerKey, root);
}
