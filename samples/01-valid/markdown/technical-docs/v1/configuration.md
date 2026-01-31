# Configuration Reference

## Table of Contents

- [Overview](#overview)
- [Configuration File](#configuration-file)
- [Environment Variables](#environment-variables)
- [Pipeline Options](#pipeline-options)
- [Connector Settings](#connector-settings)
- [Logging Configuration](#logging-configuration)

---

## Overview

DataFlow SDK can be configured through:
1. Configuration files (`dataflow.config.js` or `dataflow.config.yaml`)
2. Environment variables
3. Programmatic options

Configuration is merged in this order, with later sources overriding earlier ones.

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
    retryDelay: 1000
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
    healthPort: 8080
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

Example:

```bash
export DATAFLOW_ENV=production
export DATAFLOW_BATCH_SIZE=5000
export DATAFLOW_LOG_LEVEL=warn
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
  }
});
```

### Stream Processing

```javascript
const pipeline = new Pipeline('stream-job', {
  mode: 'stream',
  windowSize: 30000,  // 30 second windows
  watermarkDelay: 5000,
  lateEventHandling: 'drop'  // or 'process', 'sideOutput'
});
```

## Connector Settings

### Kafka Connector

```javascript
connectors: {
  kafka: {
    brokers: ['broker1:9092', 'broker2:9092'],
    clientId: 'my-app',
    ssl: {
      enabled: true,
      ca: '/path/to/ca.pem',
      cert: '/path/to/cert.pem',
      key: '/path/to/key.pem'
    },
    sasl: {
      mechanism: 'plain',
      username: 'user',
      password: 'pass'
    }
  }
}
```

### PostgreSQL Connector

```javascript
connectors: {
  postgres: {
    connectionString: 'postgres://user:pass@host:5432/db',
    // Or individual options:
    host: 'localhost',
    port: 5432,
    database: 'analytics',
    user: 'dataflow',
    password: process.env.PG_PASSWORD,
    ssl: { rejectUnauthorized: false },
    pool: {
      min: 2,
      max: 20,
      idleTimeoutMillis: 30000
    }
  }
}
```

## Logging Configuration

```javascript
logging: {
  level: 'info',  // trace, debug, info, warn, error, fatal
  format: 'json', // json, pretty
  destination: 'stdout', // stdout, file, both
  file: {
    path: '/var/log/dataflow/app.log',
    rotation: {
      maxSize: '100M',
      maxFiles: 10,
      compress: true
    }
  }
}
```

---

*See [API Reference](./api.md) for programmatic configuration options.*
