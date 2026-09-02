/**
 * PanelSectionFactory - 面板 Section 工厂
 * 管理 10 个板块的 HTML/CSS/JS 切片，负责排序与外层模板转义门禁接入
 * 遵循 docs/architecture-factory-refactor-plan.md §3.7
 */

import type { FactoryContext } from "./types";
import { PanelTemplateEscaper } from "../ui/PanelTemplateEscaper";

function tryRequire<T>(id: string): T | undefined {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require(id) as T;
  } catch {
    return undefined;
  }
}

type SectionsMod = {
  createSectionById?: (id: SectionId) => unknown;
  createAllSections?: () => unknown[];
};

function getSectionsMod(): SectionsMod | undefined {
  return tryRequire<SectionsMod>("../ui/sections");
}

export type SectionId =
  | "overview"
  | "plans"
  | "results"
  | "execution"
  | "servers"
  | "settings"
  | "gpu"
  | "sync"
  | "diagnostics"
  | "operations";

export interface PanelSection {
  readonly id: SectionId;
  readonly order: number;
  readonly title: string;
  readonly icon: string;
  renderHtml(state: unknown): string;
  renderCss(): string;
  renderScript(): string;
  readonly clientEvents?: ReadonlyArray<{ event: string; handler: string }>;
}

export interface PanelSectionFactory {
  create(id: SectionId, ctx: FactoryContext): PanelSection;
  createAll(ctx: FactoryContext): PanelSection[];
  createByName(name: string, ctx: FactoryContext): PanelSection | undefined;
  readonly escaper: PanelTemplateEscaper;
}

class BaseSection implements PanelSection {
  public readonly id: SectionId;
  public readonly order: number;
  public readonly title: string;
  public readonly icon: string;
  public readonly clientEvents?: ReadonlyArray<{ event: string; handler: string }>;
  constructor(opts: { id: SectionId; order: number; title: string; icon: string; clientEvents?: ReadonlyArray<{ event: string; handler: string }> }) {
    this.id = opts.id;
    this.order = opts.order;
    this.title = opts.title;
    this.icon = opts.icon;
    this.clientEvents = opts.clientEvents;
  }
  renderHtml(_state: unknown): string {
    return `<section class="section-card" data-section="${this.id}" data-anchor="${this.id}"><div class="section-head"><div class="section-title"><h2>${this.title}</h2></div></div><div id="${this.id}Root" class="section-body"></div></section>`;
  }
  renderCss(): string { return ""; }
  renderScript(): string {
    return `function render${capitalize(this.id)}(state){ var el=document.querySelector('[data-section="${this.id}"]'); if(!el) return; }`;
  }
}

function capitalize(s: string): string { return s.charAt(0).toUpperCase() + s.slice(1); }

const SECTION_DEFS: ReadonlyArray<{ id: SectionId; order: number; title: string; icon: string }> = [
  { id: "overview", order: 0, title: "总览", icon: "⌘" },
  { id: "plans", order: 1, title: "计划", icon: "📋" },
  { id: "results", order: 2, title: "结果", icon: "📊" },
  { id: "execution", order: 3, title: "执行", icon: "▶" },
  { id: "servers", order: 4, title: "服务器", icon: "🖥" },
  { id: "settings", order: 5, title: "设置", icon: "⚙" },
  { id: "gpu", order: 6, title: "GPU", icon: "🎮" },
  { id: "sync", order: 7, title: "同步", icon: "🔄" },
  { id: "diagnostics", order: 8, title: "诊断", icon: "🩺" },
  { id: "operations", order: 9, title: "操作", icon: "⚡" },
];

type SectionLike = {
  id: unknown;
  order: unknown;
  title: unknown;
  icon?: unknown;
  clientEvents?: unknown;
  renderHtml?: unknown;
  renderCss?: unknown;
  renderScript?: unknown;
};

function toPanelSection(s: unknown): PanelSection {
  const rec = s as SectionLike;
  return {
    id: rec.id as SectionId,
    order: rec.order as number,
    title: rec.title as string,
    icon: (rec.icon as string) || "",
    clientEvents: (rec.clientEvents as ReadonlyArray<{ event: string; handler: string }>) || undefined,
    renderHtml: (state: unknown) => (typeof rec.renderHtml === "function" ? (rec.renderHtml as (st: unknown) => string)(state) : ""),
    renderCss: () => (typeof rec.renderCss === "function" ? (rec.renderCss as () => string)() : ""),
    renderScript: () => (typeof rec.renderScript === "function" ? (rec.renderScript as () => string)() : ""),
  } as PanelSection;
}

export class DefaultPanelSectionFactory implements PanelSectionFactory {
  public readonly escaper: PanelTemplateEscaper;
  private readonly deps: Record<string, unknown>;
  constructor(deps: Record<string, unknown> = {}, escaper?: PanelTemplateEscaper) {
    this.deps = deps;
    this.escaper = escaper || new PanelTemplateEscaper();
  }

  create(id: SectionId, _ctx: FactoryContext): PanelSection {
    const def = SECTION_DEFS.find((s) => s.id === id);
    if (!def) throw new Error(`Unknown section: ${id}`);
    // 1. 若 deps 中有定制 Section，优先使用
    const custom = (this.deps["sections"] as Record<string, PanelSection> | undefined)?.[id];
    if (custom) return custom;
    // 2. 尝试真实 Section（逐个导入/聚合导入）
    const sectionsMod = getSectionsMod();
    if (sectionsMod) {
      if (typeof sectionsMod.createSectionById === "function") {
        const real = sectionsMod.createSectionById(id);
        if (real) return toPanelSection(real);
      }
      if (typeof sectionsMod.createAllSections === "function") {
        const all = sectionsMod.createAllSections() as unknown[];
        const found = all.find((x) => (x as SectionLike).id === id);
        if (found) return toPanelSection(found);
      }
    }
    // 3. Fallback 到 BaseSection
    return new BaseSection(def);
  }

  createAll(_ctx: FactoryContext): PanelSection[] {
    // 优先尝试真实 Sections 聚合
    const sectionsMod = getSectionsMod();
    if (sectionsMod && typeof sectionsMod.createAllSections === "function") {
      const realSections = sectionsMod.createAllSections() as unknown[];
      if (Array.isArray(realSections) && realSections.length >= 10) {
        const mapped = realSections.map(toPanelSection);
        // 合并 deps 定制覆盖（若有）
        const customMap = (this.deps["sections"] as Record<string, PanelSection> | undefined) || {};
        const merged = mapped.map((s) => customMap[s.id] || s);
        // 若 customMap 中有额外 id，补充
        for (const [k, v] of Object.entries(customMap)) {
          if (!merged.find((m) => m.id === k)) merged.push(v as PanelSection);
        }
        return merged.sort((a, b) => a.order - b.order);
      }
    }
    // Fallback：BaseSection
    const customMap = (this.deps["sections"] as Record<string, PanelSection> | undefined) || {};
    const sections: PanelSection[] = SECTION_DEFS.map((def) => customMap[def.id] || new BaseSection(def));
    return sections.sort((a, b) => a.order - b.order);
  }

  createByName(name: string, ctx: FactoryContext): PanelSection | undefined {
    const def = SECTION_DEFS.find((s) => s.id === name);
    if (!def) return undefined;
    return this.create(def.id, ctx);
  }
}
