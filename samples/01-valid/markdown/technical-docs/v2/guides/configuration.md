# Configuration Reference

> **Note:** This file was moved from the root directory in v2 for better organization.

## Table of Contents

- [Overview](#overview)
- [Configuration File](#configuration-file)
  - [JavaScript Format](#javascript-format)
  - [YAML Format](#yaml-format)
  - [TypeScript Format](#typescript-format)
- [Environment Variables](#environment-variables)
- [Pipeline Options](#pipeline-options)
  - [Batch Processing](#batch-processing)
  - [Stream Processing](#stream-processing)
- [Connector Settings](#connector-settings)
- [Schema Registry](#schema-registry)
- [Logging Configuration](#logging-configuration)

---

## Overview

DataFlow SDK can be configured through:
1. Configuration files (`dataflow.config.js`, `dataflow.config.yaml`, or `dataflow.config.ts`)
2. Environment variables
3. Programmatic options

Configuration is merged in this order, with later sources overriding earlier ones.

**New in v2:** TypeScript configuration files and Schema Registry settings.

## Configuration File

### JavaScript Format

Create `dataflow.config.js` in your project root:

```javascript
module.exports = {
  // Pipeline defaults
  pipeline: {
    batchSize: 1000,
    flushInterval: 5000,
    maxRetries: 3,
    retryDelay: 1000,
    errorHandling: 'dead-letter'  // New in v2
  },

  // Schema Registry (New in v2)
  schemaRegistry: {
    url: 'http://localhost:8081',
    cacheSize: 1000,
    validateOnProduce: true,
    validateOnConsume: true
  },

  // Connector configurations
  connectors: {
    kafka: {
      brokers: ['localhost:9092'],
      clientId: 'dataflow-app',
      ssl: false
    },
    postgres: {
      host: 'localhost',
      port: 5432,
      database: 'analytics',
      pool: { min: 2, max: 10 }
    }
  },

  // Monitoring
  monitoring: {
    enabled: true,
    metricsPort: 9090,
    healthPort: 8080,
    tracing: {  // New in v2
      enabled: true,
      exporter: 'jaeger',
      endpoint: 'http://localhost:14268/api/traces'
    }
  }
};
```

### YAML Format

Alternatively, use `dataflow.config.yaml`:

```yaml
pipeline:
  batchSize: 1000
  flushInterval: 5000
  maxRetries: 3
  retryDelay: 1000
  errorHandling: dead-letter

schemaRegistry:
  url: http://localhost:8081
  cacheSize: 1000
  validateOnProduce: true
  validateOnConsume: true

connectors:
  kafka:
    brokers:
      - localhost:9092
    clientId: dataflow-app
    ssl: false

  postgres:
    host: localhost
    port: 5432
    database: analytics
    pool:
      min: 2
      max: 10

monitoring:
  enabled: true
  metricsPort: 9090
  healthPort: 8080
  tracing:
    enabled: true
    exporter: jaeger
    endpoint: http://localhost:14268/api/traces
```

### TypeScript Format

New in v2 - type-safe configuration:

```typescript
import { defineConfig } from '@dataflow/sdk';

export default defineConfig({
  pipeline: {
    batchSize: 1000,
    flushInterval: 5000,
    maxRetries: 3,
    retryDelay: 1000,
    errorHandling: 'dead-letter'
  },

  schemaRegistry: {
    url: process.env.SCHEMA_REGISTRY_URL!,
    validateOnProduce: true
  },

  connectors: {
    kafka: {
      brokers: process.env.KAFKA_BROKERS!.split(','),
      clientId: 'dataflow-app'
    }
  }
});
```

## Environment Variables

All configuration can be overridden via environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `DATAFLOW_ENV` | Environment name | `development` |
| `DATAFLOW_BATCH_SIZE` | Records per batch | `1000` |
| `DATAFLOW_FLUSH_INTERVAL` | Flush interval (ms) | `5000` |
| `DATAFLOW_LOG_LEVEL` | Log verbosity | `info` |
| `DATAFLOW_METRICS_PORT` | Prometheus port | `9090` |
| `DATAFLOW_SCHEMA_REGISTRY_URL` | Schema Registry URL | - |
| `DATAFLOW_DEAD_LETTER_TOPIC` | Dead letter topic | `dead-letter` |

Example:

```bash
export DATAFLOW_ENV=production
export DATAFLOW_BATCH_SIZE=5000
export DATAFLOW_LOG_LEVEL=warn
export DATAFLOW_SCHEMA_REGISTRY_URL=http://schema-registry:8081
```

## Pipeline Options

### Batch Processing

```javascript
const pipeline = new Pipeline('batch-job', {
  mode: 'batch',
  batchSize: 10000,
  parallelism: 4,
  checkpointing: {
    enabled: true,
    interval: 60000,
    storage: 's3://checkpoints/'
  },
  deadLetter: {  // New in v2
    enabled: true,
    destination: 'kafka://batch-errors'
  }
});
```

### Stream Processing

```javascript
const pipeline = new Pipeline('stream-job', {
  mode: 'stream',
  windowSize: 30000,  // 30 second windows
  watermarkDelay: 5000,
  lateEventHandling: 'sideOutput',  // New option in v2
  sideOutputs: {
    lateEvents: 'kafka://late-events',
    errors: 'kafka://stream-errors'
  }
});
```

## Connector Settings

See [API Endpoints Reference](../api/endpoints.md) for complete connector documentation.

### Quick Reference

```javascript
connectors: {
  kafka: {
    brokers: ['broker1:9092', 'broker2:9092'],
    ssl: true,
    sasl: { mechanism: 'plain', username: 'user', password: 'pass' }
  },
  postgres: {
    connectionString: 'postgres://user:pass@host:5432/db',
    pool: { min: 2, max: 20 }
  },
  s3: {
    region: 'us-east-1',
    bucket: 'my-bucket',
    credentials: { /* from env */ }
  }
}
```

## Schema Registry

New in v2 - automatic schema validation:

```javascript
schemaRegistry: {
  url: 'http://localhost:8081',

  // Caching
  cacheSize: 1000,
  cacheTTL: 300000,  // 5 minutes

  // Validation behavior
  validateOnProduce: true,
  validateOnConsume: true,
  compatibilityLevel: 'BACKWARD',  // BACKWARD, FORWARD, FULL, NONE

  // Auto-registration
  autoRegister: false,  // true in development

  // Serialization
  serializer: 'avro',  // avro, json-schema, protobuf
}
```

## Logging Configuration

```javascript
logging: {
  level: 'info',  // trace, debug, info, warn, error, fatal
  format: 'json', // json, pretty
  destination: 'stdout', // stdout, file, both

  // Structured logging fields
  defaultFields: {
    service: 'dataflow',
    version: '2.0.0'
  },

  // File output
  file: {
    path: '/var/log/dataflow/app.log',
    rotation: {
      maxSize: '100M',
      maxFiles: 10,
      compress: true
    }
  },

  // Sensitive data masking (New in v2)
  masking: {
    enabled: true,
    fields: ['password', 'token', 'secret', 'key']
  }
}
```

---

*See [API Overview](../api/overview.md) for programmatic configuration options.*
