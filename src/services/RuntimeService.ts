import { RuntimeManager, RuntimeRemote } from "../runtime/RuntimeManager";
import { RuntimeComponentSource } from "../runtime/RuntimeManifest";

export class RuntimeService {
  manager(remote: RuntimeRemote, projectDir: string, pluginVersion: string, runtimeVersion: string, components: RuntimeComponentSource[]): RuntimeManager {
    return new RuntimeManager(remote, projectDir, pluginVersion, runtimeVersion, components);
  }
}



