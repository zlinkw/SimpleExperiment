"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClusterController = void 0;
class ClusterController {
    services;
    constructor(services) {
        this.services = services;
    }
    diagnostics() {
        return {
            operations: this.services.operations.snapshot(50),
            store: this.services.store.getState(),
        };
    }
}
exports.ClusterController = ClusterController;
