# Getting Started with DataFlow SDK

## Table of Contents

- [Introduction](#introduction)
- [System Requirements](#system-requirements)
- [Installation Steps](#installation-steps)
  - [Using npm](#using-npm)
  - [Using Docker](#using-docker)
- [Your First Pipeline](#your-first-pipeline)
- [Running in Production](#running-in-production)
- [Next Steps](#next-steps)

---

## Introduction

This guide walks you through setting up DataFlow SDK and creating your first data pipeline. By the end, you'll have a working pipeline that processes events in real-time.

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

# Install DataFlow SDK
npm install @dataflow/sdk

# Verify installation
npx dataflow --version
```

### Using Docker

For isolated development environments:

```bash
# Pull the official image
docker pull dataflow/sdk:latest

# Run interactive shell
docker run -it --rm \
  -v $(pwd):/app \
  -w /app \
  dataflow/sdk:latest bash

# Inside container
dataflow init my-pipeline
```

## Your First Pipeline

Create a file called `pipeline.js`:

```javascript
import { Pipeline } from '@dataflow/sdk';

// Define the pipeline
const pipeline = new Pipeline('hello-world');

// Configure source, transformation, and sink
pipeline
  .source('stdin')
  .transform(line => ({
    original: line,
    uppercase: line.toUpperCase(),
    timestamp: new Date().toISOString()
  }))
  .sink('stdout');

// Run it
pipeline.run();
```

Run your pipeline:

```bash
echo "hello dataflow" | node pipeline.js
```

Expected output:

```json
{
  "original": "hello dataflow",
  "uppercase": "HELLO DATAFLOW",
  "timestamp": "2026-01-31T12:00:00.000Z"
}
```

## Running in Production

### Environment Variables

```bash
# Required
export DATAFLOW_ENV=production
export DATAFLOW_BROKER_URL=kafka://broker:9092

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
```

### SQL Example - Monitoring Query

```sql
SELECT
  pipeline_name,
  COUNT(*) as events_processed,
  AVG(processing_time_ms) as avg_latency,
  MAX(processing_time_ms) as max_latency
FROM pipeline_metrics
WHERE timestamp > NOW() - INTERVAL '1 hour'
GROUP BY pipeline_name
ORDER BY events_processed DESC;
```

## Next Steps

- Read the [Configuration Reference](./configuration.md) for all options
- Explore the [API Documentation](./api.md) for advanced usage
- Check out example pipelines in our GitHub repository

---

*Need help? Join our Discord community or open a GitHub issue.*
