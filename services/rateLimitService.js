class RateLimitService {
    constructor() {
        this.limits = new Map();
        this.globalLimits = new Map();
        this.requestCounts = new Map();
        this.lastRequestTime = new Map();
        
        // Cleanup old entries every minute
        setInterval(() => this.cleanup(), 60000);
    }

    check(userId, action, limit = 5, window = 60000) {
        const key = `${userId}:${action}`;
        const now = Date.now();
        const userLimits = this.limits.get(key) || [];
        
        // Clean old entries for this specific user/action
        const validCalls = userLimits.filter(time => now - time < window);
        
        if (validCalls.length >= limit) {
            return false;
        }
        
        validCalls.push(now);
        this.limits.set(key, validCalls);
        return true;
    }

    checkGlobal(action, limit = 60, window = 60000) {
        const now = Date.now();
        const calls = this.globalLimits.get(action) || [];
        
        // Clean old entries
        const validCalls = calls.filter(time => now - time < window);
        
        if (validCalls.length >= limit) {
            return false;
        }
        
        validCalls.push(now);
        this.globalLimits.set(action, validCalls);
        return true;
    }

    // Add LLM-specific rate limiting
    checkLLM(chatId) {
        const now = Date.now();
        const minute = Math.floor(now / 60000);

        if (!this.requestCounts.has(minute)) {
            this.requestCounts.clear();
            this.requestCounts.set(minute, 0);
        }

        const requestsThisMinute = this.requestCounts.get(minute);
        if (requestsThisMinute >= 60) return false;

        const lastRequest = this.lastRequestTime.get(chatId) || 0;
        if (now - lastRequest < 333) return false;

        this.requestCounts.set(minute, requestsThisMinute + 1);
        this.lastRequestTime.set(chatId, now);
        return true;
    }

    cleanup() {
        const now = Date.now();
        
        // Cleanup user-specific limits
        for (const [key, times] of this.limits.entries()) {
            const validTimes = times.filter(time => now - time < 60000);
            if (validTimes.length === 0) {
                this.limits.delete(key);
            } else {
                this.limits.set(key, validTimes);
            }
        }
        
        // Cleanup global limits
        for (const [action, times] of this.globalLimits.entries()) {
            const validTimes = times.filter(time => now - time < 60000);
            if (validTimes.length === 0) {
                this.globalLimits.delete(action);
            } else {
                this.globalLimits.set(action, validTimes);
            }
        }
    }
}

export const rateLimitService = new RateLimitService(); 