/**
 * Structured logging for Convex backend
 *
 * Usage:
 *   import { createLogger, Topics } from './lib/logger';
 *   const log = createLogger('users.getCurrentUser');
 *   log.info(Topics.Auth, 'User retrieved', { userId });
 */

export const LOG_TOPICS = {
  Auth: "AUTH",
  Artifact: "ARTIFACT",
  Review: "REVIEW",
  User: "USER",
  System: "SYSTEM",
} as const;

export type LogTopic = (typeof LOG_TOPICS)[keyof typeof LOG_TOPICS];

export interface LogMetadata {
  userId?: string;
  artifactId?: string;
  reviewId?: string;
  recovery?: string;
  [key: string]: unknown;
}

// Log levels with numeric priority
const LOG_LEVELS = {
  verbose: 0,
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
} as const;

type LogLevel = keyof typeof LOG_LEVELS;

// Get configured level (evaluated at deploy time)
const currentLevel = (process.env.LOG_LEVEL as LogLevel) || "debug";
const currentPriority = LOG_LEVELS[currentLevel] ?? LOG_LEVELS.debug;

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= currentPriority;
}

function formatLog(
  level: LogLevel,
  topic: LogTopic,
  context: string,
  message: string,
  metadata?: LogMetadata
): string {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    topic,
    context,
    message,
    ...(metadata && { metadata }),
  });
}

export function createLogger(context: string) {
  return {
    verbose: (topic: LogTopic, message: string, metadata?: LogMetadata) => {
      if (shouldLog("verbose")) {
        console.debug(formatLog("verbose", topic, context, message, metadata));
      }
    },
    debug: (topic: LogTopic, message: string, metadata?: LogMetadata) => {
      if (shouldLog("debug")) {
        console.debug(formatLog("debug", topic, context, message, metadata));
      }
    },
    info: (topic: LogTopic, message: string, metadata?: LogMetadata) => {
      if (shouldLog("info")) {
        console.log(formatLog("info", topic, context, message, metadata));
      }
    },
    warn: (topic: LogTopic, message: string, metadata?: LogMetadata) => {
      if (shouldLog("warn")) {
        console.warn(formatLog("warn", topic, context, message, metadata));
      }
    },
    error: (topic: LogTopic, message: string, metadata?: LogMetadata) => {
      if (shouldLog("error")) {
        console.error(formatLog("error", topic, context, message, metadata));
      }
    },
  };
}

// Re-export topics for convenience
export { LOG_TOPICS as Topics };
