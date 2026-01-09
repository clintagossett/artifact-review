import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";
import { TRACKING_CONFIG } from "./shared";

const crons = cronJobs();

crons.cron(
    "presence-cleanup",
    TRACKING_CONFIG.PRESENCE_CLEANUP_CRON,
    internal.presence.cleanup
);

export default crons;
