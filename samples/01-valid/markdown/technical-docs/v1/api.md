# API Reference

## Table of Contents

- [Pipeline Class](#pipeline-class)
  - [Constructor](#constructor)
  - [Methods](#methods)
- [Stage Class](#stage-class)
- [Connectors](#connectors)
  - [Source Connectors](#source-connectors)
  - [Sink Connectors](#sink-connectors)
- [Transforms](#transforms)
- [Error Handling](#error-handling)
- [TypeScript Support](#typescript-support)

---

## Pipeline Class

The core class for building data pipelines.

### Constructor

```typescript
new Pipeline(name: string, options?: PipelineOptions)
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | `string` | Yes | Unique pipeline identifier |
| `options` | `PipelineOptions` | No | Configuration options |

**Example:**

```javascript
import { Pipeline } from '@dataflow/sdk';

const pipeline = new Pipeline('user-analytics', {
  mode: 'stream',
  batchSize: 500
});
```

### Methods

#### `source(uri: string, options?: SourceOptions): Pipeline`

Configures the data source.

```javascript
// Kafka source
pipeline.source('kafka://events-topic', {
  consumerGroup: 'analytics-group',
  startOffset: 'latest'
});

// File source
pipeline.source('file:///data/input/*.json', {
  format: 'jsonl',
  watch: true
});
```

#### `transform(fn: TransformFunction): Pipeline`

Adds a transformation stage.

```javascript
pipeline.transform(record => ({
  ...record,
  processed_at: Date.now()
}));
```

#### `filter(predicate: PredicateFunction): Pipeline`

Filters records based on a condition.

```javascript
pipeline.filter(record => record.status === 'active');
```

#### `sink(uri: string, options?: SinkOptions): Pipeline`

Configures the output destination.

```javascript
pipeline.sink('postgres://analytics/events', {
  batchSize: 1000,
  onConflict: 'update'
});
```

#### `run(): Promise<PipelineResult>`

Starts pipeline execution.

```javascript
const result = await pipeline.run();
console.log(`Processed ${result.recordCount} records`);
```

---

## Stage Class

Represents a processing stage in the pipeline.

```typescript
class Stage {
  name: string;
  type: 'source' | 'transform' | 'filter' | 'sink';
  metrics: StageMetrics;

  onError(handler: ErrorHandler): Stage;
  onComplete(handler: CompleteHandler): Stage;
}
```

**Example:**

```javascript
pipeline
  .transform(enrichData)
  .onError((error, record) => {
    console.error('Transform failed:', error);
    return { action: 'skip' }; // or 'retry', 'fail'
  });
```

---

## Connectors

### Source Connectors

#### Kafka

```javascript
pipeline.source('kafka://topic-name', {
  brokers: ['localhost:9092'],
  consumerGroup: 'my-group',
  startOffset: 'earliest', // 'earliest', 'latest', or timestamp
  keyDeserializer: 'string',
  valueDeserializer: 'json'
});
```

#### PostgreSQL

```sql
-- Query executed by the source connector
SELECT id, name, email, created_at
FROM users
WHERE updated_at > $1
ORDER BY updated_at ASC
LIMIT 10000;
```

```javascript
pipeline.source('postgres://db/users', {
  query: 'SELECT * FROM users WHERE updated_at > :lastSync',
  pollInterval: 60000,
  incrementalColumn: 'updated_at'
});
```

#### HTTP

```javascript
pipeline.source('http://api.example.com/events', {
  method: 'GET',
  headers: { 'Authorization': 'Bearer token' },
  pollInterval: 5000,
  pagination: {
    type: 'cursor',
    cursorParam: 'after'
  }
});
```

### Sink Connectors

#### Kafka

```javascript
pipeline.sink('kafka://output-topic', {
  keySerializer: record => record.id,
  partitioner: 'round-robin',
  compression: 'gzip'
});
```

#### PostgreSQL

```javascript
pipeline.sink('postgres://db/analytics', {
  table: 'events',
  batchSize: 1000,
  onConflict: {
    columns: ['id'],
    action: 'update'
  }
});
```

#### S3

```javascript
pipeline.sink('s3://bucket/prefix/', {
  format: 'parquet',
  partitionBy: ['date', 'region'],
  compression: 'snappy'
});
```

---

## Transforms

### Built-in Transforms

```javascript
import { transforms } from '@dataflow/sdk';

pipeline
  .transform(transforms.flatten('nested.field'))
  .transform(transforms.rename({ old_name: 'new_name' }))
  .transform(transforms.cast({ age: 'integer', active: 'boolean' }))
  .transform(transforms.dedupe('id', { window: 3600000 }));
```

### Custom Transforms

```typescript
import { TransformContext } from '@dataflow/sdk';

function customTransform(record: any, context: TransformContext) {
  const { logger, metrics, state } = context;

  metrics.increment('records_processed');

  return {
    ...record,
    enriched: true,
    pipeline_id: context.pipelineId
  };
}
```

---

## Error Handling

```javascript
pipeline
  .onError('transform', (error, record, context) => {
    context.logger.error('Transform error', { error, record });
    context.metrics.increment('transform_errors');

    return {
      action: 'deadLetter',
      destination: 'kafka://dead-letter-topic'
    };
  })
  .onError('sink', (error, batch, context) => {
    if (error.code === 'CONNECTION_REFUSED') {
      return { action: 'retry', delay: 5000 };
    }
    return { action: 'fail' };
  });
```

---

## TypeScript Support

Full TypeScript definitions are included:

```typescript
import { Pipeline, PipelineOptions, Record } from '@dataflow/sdk';

interface UserEvent {
  userId: string;
  action: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

interface EnrichedEvent extends UserEvent {
  enrichedAt: number;
  userSegment: string;
}

const pipeline = new Pipeline<UserEvent, EnrichedEvent>('typed-pipeline');

pipeline
  .source<UserEvent>('kafka://user-events')
  .transform((event): EnrichedEvent => ({
    ...event,
    enrichedAt: Date.now(),
    userSegment: calculateSegment(event.userId)
  }))
  .sink<EnrichedEvent>('postgres://analytics');
```

---

*For more examples, see our [GitHub repository](https://github.com/dataflow/examples).*
