"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClusterStore = void 0;
const StateReducer_1 = require("./StateReducer");
class ClusterStore {
    state;
    listeners = new Set();
    constructor(initial = (0, StateReducer_1.createInitialClusterStoreState)()) {
        this.state = initial;
    }
    getState() {
        return this.state;
    }
    dispatch(action) {
        this.state = (0, StateReducer_1.clusterReducer)(this.state, action);
        for (const listener of this.listeners)
            listener(this.state, action);
    }
    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }
}
exports.ClusterStore = ClusterStore;
