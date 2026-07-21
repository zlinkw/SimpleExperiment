export interface ReconnectPolicy {
  reconnectInitialDelaySeconds: number;
  reconnectMaxDelaySeconds: number;
}

export class RealtimeReconnect {
  private attempt = 0;

  constructor(private readonly policy: ReconnectPolicy = { reconnectInitialDelaySeconds: 3, reconnectMaxDelaySeconds: 60 }) {}

  nextDelayMs(): number {
    const base = Math.max(1, this.policy.reconnectInitialDelaySeconds) * 1000;
    const max = Math.max(base, this.policy.reconnectMaxDelaySeconds * 1000);
    const delay = Math.min(max, base * 2 ** this.attempt);
    this.attempt += 1;
    return delay;
  }

  reset(): void {
    this.attempt = 0;
  }

  get attempts(): number {
    return this.attempt;
  }
}
