# Getting Started with DataFlow SDK v2

## Table of Contents

- [Introduction](#introduction)
- [System Requirements](#system-requirements)
- [Installation Steps](#installation-steps)
  - [Using npm](#using-npm)
  - [Using Docker](#using-docker)
  - [Using the CLI](#using-the-cli)
- [Your First Pipeline](#your-first-pipeline)
- [Running in Production](#running-in-production)
- [Migrating from v1](#migrating-from-v1)
- [Next Steps](#next-steps)

---

## Introduction

This guide walks you through setting up DataFlow SDK v2 and creating your first data pipeline. By the end, you'll have a working pipeline that processes events in real-time.

**New in v2:** Simplified CLI, Schema Registry support, and improved error messages.

## System Requirements

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| CPU | 2 cores | 4+ cores |
| Memory | 4 GB | 8+ GB |
| Disk | 10 GB | 50+ GB |
| Node.js | 18.x | 20.x LTS |
| Docker | 20.x | 24.x |

## Installation Steps

### Using npm

The fastest way to get started:

```bash
# Create a new directory
mkdir my-dataflow-project
cd my-dataflow-project

# Initialize npm project
npm init -y

# Install DataFlow SDK v2
npm install @dataflow/sdk@2

# Verify installation
npx dataflow --version
# Output: dataflow-sdk v2.0.0
```

### Using Docker

For isolated development environments:

```bash
# Pull the official image (v2)
docker pull dataflow/sdk:2

# Run interactive shell
docker run -it --rm \
  -v $(pwd):/app \
  -w /app \
  dataflow/sdk:2 bash

# Inside container
dataflow init my-pipeline --template stream
```

### Using the CLI

New in v2 - improved project scaffolding:

```bash
# Install CLI globally
npm install -g @dataflow/cli

# Create project with template
dataflow init my-project --template batch
dataflow init my-project --template stream
dataflow init my-project --template etl

# List available templates
dataflow templates list
```

## Your First Pipeline

Create a file called `pipeline.js`:

```javascript
import { Pipeline } from '@dataflow/sdk';

// Define the pipeline with v2 options
const pipeline = new Pipeline('hello-world', {
  mode: 'stream',
  errorHandling: 'dead-letter'  // New in v2
});

// Configure source, transformation, and sink
pipeline
  .source('stdin')
  .transform(line => ({
    original: line,
    uppercase: line.toUpperCase(),
    length: line.length,
    timestamp: new Date().toISOString()
  }))
  .sink('stdout');

// Run it
pipeline.run();
```

Run your pipeline:

```bash
echo "hello dataflow v2" | node pipeline.js
```

Expected output:

```json
{
  "original": "hello dataflow v2",
  "uppercase": "HELLO DATAFLOW V2",
  "length": 17,
  "timestamp": "2026-01-31T12:00:00.000Z"
}
```

## Running in Production

### Environment Variables

```bash
# Required
export DATAFLOW_ENV=production
export DATAFLOW_BROKER_URL=kafka://broker:9092

# New in v2
export DATAFLOW_SCHEMA_REGISTRY_URL=http://schema-registry:8081
export DATAFLOW_DEAD_LETTER_TOPIC=dead-letter

# Optional
export DATAFLOW_LOG_LEVEL=info
export DATAFLOW_METRICS_PORT=9090
```

### Health Checks

DataFlow exposes health endpoints:

```bash
# Liveness probe
curl http://localhost:8080/health/live

# Readiness probe
curl http://localhost:8080/health/ready

# New in v2: detailed metrics
curl http://localhost:8080/health/metrics
```

### SQL Example - Monitoring Query

```sql
SELECT
  pipeline_name,
  pipeline_version,  -- New in v2
  COUNT(*) as events_processed,
  AVG(processing_time_ms) as avg_latency,
  MAX(processing_time_ms) as max_latency,
  SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as error_count
FROM pipeline_metrics
WHERE timestamp > NOW() - INTERVAL '1 hour'
GROUP BY pipeline_name, pipeline_version
ORDER BY events_processed DESC;
```

## Migrating from v1

Key changes when upgrading:

```javascript
// v1 (old)
import { Pipeline } from '@dataflow/sdk';
const pipeline = new Pipeline('my-pipeline');
pipeline.source('kafka://topic');

// v2 (new) - explicit options recommended
import { Pipeline } from '@dataflow/sdk';
const pipeline = new Pipeline('my-pipeline', {
  mode: 'stream',  // explicit mode
  schemaRegistry: process.env.SCHEMA_REGISTRY_URL  // recommended
});
pipeline.source('kafka://topic', {
  schemaValidation: true  // new option
});
```

### Breaking Changes

| v1 | v2 | Migration |
|----|----|-----------|
| `pipeline.run()` returns void | Returns `Promise<Result>` | Add `await` |
| Errors throw immediately | Errors go to dead-letter by default | Check dead-letter topic |
| No schema validation | Schema validation available | Enable gradually |

## Next Steps

- Read the [Configuration Reference](./guides/configuration.md) for all options
- Explore the [API Overview](./api/overview.md) for core concepts
- Check the [API Endpoints Reference](./api/endpoints.md) for detailed docs
- Review example pipelines in our GitHub repository

---

*Need help? Join our Discord community or open a GitHub issue.*
