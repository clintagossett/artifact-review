# DataFlow SDK Documentation v1

> A powerful toolkit for building data pipelines

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [Core Concepts](#core-concepts)
- [Related Documentation](#related-documentation)

---

## Overview

DataFlow SDK enables developers to build robust, scalable data pipelines with minimal boilerplate. Whether you're processing real-time streams or batch workloads, DataFlow provides the primitives you need.

### Key Features

| Feature | Description | Status |
|---------|-------------|--------|
| Stream Processing | Real-time data transformation | Stable |
| Batch Processing | Large-scale ETL jobs | Stable |
| Connectors | Pre-built integrations | Beta |
| Monitoring | Built-in observability | Alpha |

## Quick Start

Get up and running in under 5 minutes:

```bash
# Install the SDK
npm install @dataflow/sdk

# Initialize a new project
npx dataflow init my-pipeline

# Start the development server
cd my-pipeline && npm run dev
```

## Installation

### Prerequisites

Before installing, ensure you have:

- Node.js 18+ or Python 3.10+
- Docker (for local development)
- Access to a message broker (Kafka, RabbitMQ, or Redis)

### Package Managers

**npm:**
```bash
npm install @dataflow/sdk
```

**yarn:**
```bash
yarn add @dataflow/sdk
```

**pip:**
```bash
pip install dataflow-sdk
```

## Core Concepts

### Pipelines

A pipeline is a directed acyclic graph (DAG) of processing stages:

```javascript
import { Pipeline, Stage } from '@dataflow/sdk';

const pipeline = new Pipeline('user-events');

pipeline
  .source('kafka://events')
  .transform(event => enrichUserData(event))
  .filter(event => event.type === 'purchase')
  .sink('postgres://analytics');

pipeline.run();
```

### Transformations

Transformations modify data as it flows through the pipeline:

```python
from dataflow import Pipeline, transforms

pipeline = Pipeline("sales-etl")

@pipeline.transform
def calculate_revenue(record):
    return {
        **record,
        "revenue": record["quantity"] * record["unit_price"]
    }

@pipeline.transform
def add_tax(record):
    return {
        **record,
        "total": record["revenue"] * 1.08
    }
```

## Related Documentation

- [Getting Started Guide](./getting-started.md) - Detailed setup instructions
- [Configuration Reference](./configuration.md) - All configuration options
- [API Reference](./api.md) - Complete API documentation

---

*DataFlow SDK v1.0 - Last updated: 2026-01-31*
