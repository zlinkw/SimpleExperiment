"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationThrottle = void 0;
class NotificationThrottle {
    last = new Map();
    shouldNotify(rule, event) {
        if (!rule.enabled || rule.eventType !== event.type)
            return false;
        const key = `${rule.id}:${event.key || event.type}`;
        const now = event.at || Date.now();
        const previous = this.last.get(key) || 0;
        if (now - previous < rule.throttleSeconds * 1000)
            return false;
        this.last.set(key, now);
        return true;
    }
}
exports.NotificationThrottle = NotificationThrottle;
