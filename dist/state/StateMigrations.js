"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateLegacyStateToProfiles = migrateLegacyStateToProfiles;
const Migrations_1 = require("../config/Migrations");
function migrateLegacyStateToProfiles(state, projectRoot = "") {
    const migrated = (0, Migrations_1.migrateClusterState)(state).state;
    const profile = {
        id: "default",
        name: "Default",
        projectRoot,
        servers: migrated.servers || [],
        artifactHub: migrated.artifactHub,
        settings: {
            agentEnabled: migrated.agentEnabled,
            agentStreamEnabled: migrated.agentStreamEnabled,
            allowOneShotForBackground: migrated.allowOneShotForBackground,
        },
    };
    return { state: { ...migrated, profiles: [profile], activeProfileId: profile.id }, profiles: [profile], activeProfileId: profile.id };
}
