"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RemoteFileBrowser = void 0;
class RemoteFileBrowser {
    client;
    constructor(client) {
        this.client = client;
    }
    listProjectPath(remotePath) {
        return this.client.list(remotePath).then((result) => result.entries);
    }
    statProjectPath(remotePath) {
        return this.client.stat(remotePath);
    }
}
exports.RemoteFileBrowser = RemoteFileBrowser;
