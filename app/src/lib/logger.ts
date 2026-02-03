/**
 * Structured logging for frontend
 *
 * Usage:
 *   import { logger, LOG_TOPICS } from '@/lib/logger';
 *   logger.info(LOG_TOPICS.Auth, 'LoginForm', 'User signed in', { userId });
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

// Get configured level (defaults to debug in development)
const currentLevel: LogLevel =
  (process.env.NEXT_PUBLIC_LOG_LEVEL as LogLevel) || "debug";
const currentPriority = LOG_LEVELS[currentLevel] ?? LOG_LEVELS.debug;

console.log(`[LOGGER] Initialized at level: ${currentLevel}`);

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= currentPriority;
}

const COLORS = {
  verbose: '#71717a', // Gray
  debug: '#9333ea',   // Purple
  info: '#2563eb',    // Blue
  warn: '#d97706',    // Amber
  error: '#dc2626'    // Red
};

function logToConsole(
  level: LogLevel,
  topic: LogTopic,
  context: string,
  message: string,
  metadata?: LogMetadata
) {
  const color = COLORS[level];
  const label = `[${level.toUpperCase()}] [${topic}] [${context}]`;

  console.log(
    `%c${label} %c${message}`,
    `color: ${color}; font-weight: bold; border-left: 3px solid ${color}; padding-left: 4px;`,
    'color: inherit; font-weight: normal;',
    metadata || ''
  );
}

export const logger = {
  verbose: (topic: LogTopic, context: string, message: string, metadata?: LogMetadata) => {
    if (shouldLog("verbose")) {
      logToConsole("verbose", topic, context, message, metadata);
    }
  },
  debug: (topic: LogTopic, context: string, message: string, metadata?: LogMetadata) => {
    if (shouldLog("debug")) {
      logToConsole("debug", topic, context, message, metadata);
    }
  },
  info: (topic: LogTopic, context: string, message: string, metadata?: LogMetadata) => {
    if (shouldLog("info")) {
      logToConsole("info", topic, context, message, metadata);
    }
  },
  warn: (topic: LogTopic, context: string, message: string, metadata?: LogMetadata) => {
    if (shouldLog("warn")) {
      logToConsole("warn", topic, context, message, metadata);
    }
  },
  error: (topic: LogTopic, context: string, message: string, metadata?: LogMetadata) => {
    if (shouldLog("error")) {
      logToConsole("error", topic, context, message, metadata);
    }
  },
};
