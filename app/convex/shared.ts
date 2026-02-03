export const TRACKING_CONFIG = {
    // Presence Heartbeats
    PRESENCE_HEARTBEAT_MS: 60000,   // Client pings every 60s (1 minute)
    PRESENCE_TTL_MS: 150000,        // Server considers offline after 2.5m (2.5x heartbeat)

    // View Counting
    VIEW_DEBOUNCE_MS: 3600000,      // 60 minutes (1 hour) between unique views (Rolling Window)

    // Cleanup
    PRESENCE_CLEANUP_CRON: "0 * * * *", // Every hour
    PRESENCE_DATA_RETENTION_MS: 600000  // 10 minutes (keep small buffer)
} as const;
