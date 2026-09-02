// @ts-nocheck
/**
 * ServiceFactory - 根抽象工厂 (Abstract Factory)
 * 聚合 TunnelFactory / RealtimeClientFactory / FeatureFactory / CommandFactory / PanelSectionFactory
 * 遵循 docs/architecture-factory-refactor-plan.md §3.2
 * Composition Root 唯一持有具体工厂，其他模块只依赖抽象。
 */

import type { FactoryContext } from "./types";
import type { TunnelFactory } from "./TunnelFactory";
import type { RealtimeClientFactory } from "./RealtimeClientFactory";
import type { FeatureFactory } from "./FeatureFactory";
import type { CommandFactory } from "./CommandFactory";
import type { PanelSectionFactory } from "./PanelSectionFactory";
import { DefaultTunnelFactory } from "./TunnelFactory";
import { DefaultRealtimeClientFactory } from "./RealtimeClientFactory";
import { DefaultFeatureFactory } from "./FeatureFactory";
import { DefaultCommandFactory } from "./CommandFactory";
import { DefaultPanelSectionFactory } from "./PanelSectionFactory";

export interface ServiceFactory {
  readonly tunnel: TunnelFactory;
  readonly realtime: RealtimeClientFactory;
  readonly features: FeatureFactory;
  readonly commands: CommandFactory;
  readonly panels: PanelSectionFactory;
  createPanelProvider(ctx: FactoryContext): unknown;
  createLocalApiServer(ctx: FactoryContext): unknown;
}

export class DefaultServiceFactory implements ServiceFactory {
  public readonly tunnel: TunnelFactory;
  public readonly realtime: RealtimeClientFactory;
  public readonly features: FeatureFactory;
  public readonly commands: CommandFactory;
  public readonly panels: PanelSectionFactory;

  constructor(
    tunnel?: TunnelFactory,
    realtime?: RealtimeClientFactory,
    features?: FeatureFactory,
    commands?: CommandFactory,
    panels?: PanelSectionFactory,
  ) {
    this.tunnel = tunnel || new DefaultTunnelFactory();
    this.realtime = realtime || new DefaultRealtimeClientFactory();
    this.features = features || new DefaultFeatureFactory();
    this.commands = commands || new DefaultCommandFactory();
    this.panels = panels || new DefaultPanelSectionFactory();
  }

  createPanelProvider(ctx: FactoryContext): unknown {
    try {
      const mod = require("../extension");
      const Cls = mod?.RealtimeTunnelPanelProvider || mod?.default?.RealtimeTunnelPanelProvider;
      if (typeof Cls === "function") {
        return new Cls(ctx);
      }
    } catch {}
    // 向后兼容：真实创建失败时回退到桩对象
    return {
      kind: "RealtimeTunnelPanelProvider",
      ctx,
      factories: {
        tunnel: this.tunnel,
        realtime: this.realtime,
        features: this.features,
        panels: this.panels,
      },
      dispose() {},
    };
  }

  createLocalApiServer(ctx: FactoryContext): unknown {
    try {
      const mod = require("../api/LocalApiServer");
      const Cls = mod?.LocalApiServer || mod?.default?.LocalApiServer || mod?.LocalApiServerClass;
      if (typeof Cls === "function") {
        // 尝试用 FactoryContext 中的信息启动真实 LocalApiServer，失败则回退
        return new Cls({
          name: "SimpleExperiment",
          version: String((ctx as any)?.extensionVersion || (ctx as any)?.version || ""),
          preferredPort: 19765,
          discoveryPath: "",
          methods: {},
        });
      }
    } catch {}
    return {
      kind: "LocalApiServer",
      ctx,
      start: () => undefined,
      stop: () => undefined,
      dispose() {},
    };
  }

  createAllFactories(): Record<string, unknown> {
    return {
      tunnel: this.tunnel,
      realtime: this.realtime,
      features: this.features,
      commands: this.commands,
      panels: this.panels,
    };
  }

  createByName(name: string): unknown {
    const map: Record<string, unknown> = this.createAllFactories();
    return map[name];
  }
}
