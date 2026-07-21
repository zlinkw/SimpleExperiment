export type TunnelRequestPurpose =
  | "health"
  | "snapshot"
  | "manual_refresh"
  | "run_plan"
  | "stop"
  | "parse_results"
  | "diagnostics"
  | "events"
  | "file_transfer";

export type RequestBudgetBlockReason =
  | "paused"
  | "rate_limited"
  | "hidden"
  | "cooldown"
  | "offline";

export interface RequestBudgetConfig {
  maxRequestsPerMinute: number;
  maxConcurrentRequests: number;
  minIntervalByPurpose: Partial<Record<TunnelRequestPurpose, number>>;
  pauseWhenHidden: boolean;
  allowManualOverride: boolean;
  disabledPurposes?: TunnelRequestPurpose[];
}

export interface RequestBudgetDecision {
  allowed: boolean;
  reason?: RequestBudgetBlockReason;
  retryAfterMs?: number;
}

export interface RequestBudgetRunOptions {
  userInitiated?: boolean;
  visibleBypass?: boolean;
}

export interface RequestBudgetSnapshot {
  paused: boolean;
  hidden: boolean;
  inFlight: number;
  maxRequestsPerMinute: number;
  requestsLastMinute: number;
  deniedLastMinute: number;
  lastAllowedAt?: string;
  lastDeniedReason?: RequestBudgetBlockReason;
}

type BudgetEvent = {
  at: number;
  purpose: TunnelRequestPurpose;
  allowed: boolean;
  reason?: RequestBudgetBlockReason;
};

export const defaultRequestBudgetConfig: RequestBudgetConfig = {
  maxRequestsPerMinute: 10,
  maxConcurrentRequests: 1,
  pauseWhenHidden: true,
  allowManualOverride: true,
  disabledPurposes: [],
  minIntervalByPurpose: {
    health: 60_000,
    snapshot: 60_000,
    manual_refresh: 1_000,
    diagnostics: 60_000,
    events: 0,
    file_transfer: 0,
  },
};

export class RequestBudgetDeniedError extends Error {
  constructor(
    public readonly purpose: TunnelRequestPurpose,
    public readonly decision: RequestBudgetDecision,
  ) {
    super(`Request blocked: ${decision.reason || "unknown"}`);
  }
}

export class RequestBudget {
  private inFlight = 0;
  private paused = false;
  private hidden = false;
  private readonly events: BudgetEvent[] = [];
  private readonly lastByPurpose = new Map<TunnelRequestPurpose, number>();
  private lastDeniedReason?: RequestBudgetBlockReason;

  constructor(private readonly config: RequestBudgetConfig = defaultRequestBudgetConfig) {}

  setHidden(hidden: boolean): void {
    this.hidden = hidden;
  }

  pauseAll(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
  }

  isPaused(): boolean {
    return this.paused;
  }

  decide(purpose: TunnelRequestPurpose, options: RequestBudgetRunOptions = {}): RequestBudgetDecision {
    const now = Date.now();
    this.prune(now);

    const manualHealthOverride = options.userInitiated && purpose === "health" && this.config.allowManualOverride;
    if (this.paused && !manualHealthOverride) return this.deny(now, purpose, "paused");
    if (this.config.disabledPurposes?.includes(purpose)) return this.deny(now, purpose, "offline");
    if (this.config.pauseWhenHidden && this.hidden && !options.userInitiated && !options.visibleBypass && purpose !== "health") {
      return this.deny(now, purpose, "hidden");
    }
    if (this.inFlight >= this.config.maxConcurrentRequests) return this.deny(now, purpose, "rate_limited", 500);
    if (this.allowedLastMinute(now) >= this.config.maxRequestsPerMinute) return this.deny(now, purpose, "rate_limited", 60_000);

    const minInterval = this.config.minIntervalByPurpose[purpose] ?? 0;
    const last = this.lastByPurpose.get(purpose) || 0;
    if (Number.isFinite(minInterval) && minInterval > 0 && now - last < minInterval) {
      return this.deny(now, purpose, "cooldown", minInterval - (now - last));
    }

    return { allowed: true };
  }

  async run<T>(
    purpose: TunnelRequestPurpose,
    fn: () => Promise<T>,
    options: RequestBudgetRunOptions = {},
  ): Promise<T> {
    const decision = this.decide(purpose, options);
    if (!decision.allowed) throw new RequestBudgetDeniedError(purpose, decision);
    const now = Date.now();
    this.events.push({ at: now, purpose, allowed: true });
    this.lastByPurpose.set(purpose, now);
    this.inFlight += 1;
    try {
      return await fn();
    } finally {
      this.inFlight = Math.max(0, this.inFlight - 1);
    }
  }

  snapshot(): RequestBudgetSnapshot {
    const now = Date.now();
    this.prune(now);
    const lastAllowed = [...this.events].reverse().find((item) => item.allowed);
    return {
      paused: this.paused,
      hidden: this.hidden,
      inFlight: this.inFlight,
      maxRequestsPerMinute: this.config.maxRequestsPerMinute,
      requestsLastMinute: this.allowedLastMinute(now),
      deniedLastMinute: this.events.filter((item) => !item.allowed).length,
      lastAllowedAt: lastAllowed ? new Date(lastAllowed.at).toISOString() : undefined,
      lastDeniedReason: this.lastDeniedReason,
    };
  }

  private deny(
    now: number,
    purpose: TunnelRequestPurpose,
    reason: RequestBudgetBlockReason,
    retryAfterMs?: number,
  ): RequestBudgetDecision {
    this.events.push({ at: now, purpose, allowed: false, reason });
    this.lastDeniedReason = reason;
    return { allowed: false, reason, retryAfterMs };
  }

  private allowedLastMinute(now: number): number {
    this.prune(now);
    return this.events.filter((item) => item.allowed).length;
  }

  private prune(now: number): void {
    const cutoff = now - 60_000;
    while (this.events.length && this.events[0].at < cutoff) this.events.shift();
  }
}
