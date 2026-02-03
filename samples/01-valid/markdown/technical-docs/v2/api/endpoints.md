# API Endpoints Reference

> **Note:** This is the detailed endpoint reference. For concepts, see [API Overview](./overview.md).

## Table of Contents

- [Pipeline Methods](#pipeline-methods)
  - [Constructor](#constructor)
  - [source()](#source)
  - [transform()](#transform)
  - [filter()](#filter)
  - [window()](#window)
  - [aggregate()](#aggregate)
  - [sink()](#sink)
  - [run()](#run)
- [Source Connectors](#source-connectors)
  - [Kafka](#kafka-source)
  - [PostgreSQL](#postgresql-source)
  - [HTTP](#http-source)
  - [S3](#s3-source)
- [Sink Connectors](#sink-connectors)
  - [Kafka](#kafka-sink)
  - [PostgreSQL](#postgresql-sink)
  - [S3](#s3-sink)
- [Built-in Transforms](#built-in-transforms)
- [Aggregation Functions](#aggregation-functions)

---

## Pipeline Methods

### Constructor

```typescript
new Pipeline<TIn, TOut>(name: string, options?: PipelineOptions): Pipeline
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | `string` | Yes | Unique pipeline identifier |
| `options` | `PipelineOptions` | No | Configuration options |

**Options:**

```typescript
interface PipelineOptions {
  mode?: 'stream' | 'batch';
  parallelism?: number;
  batchSize?: number;
  errorHandling?: 'fail' | 'skip' | 'dead-letter';
  schemaRegistry?: string;
  checkpointing?: CheckpointOptions;
}
```

**Example:**

```javascript
const pipeline = new Pipeline('user-analytics', {
  mode: 'stream',
  parallelism: 4,
  errorHandling: 'dead-letter',
  schemaRegistry: 'http://localhost:8081'
});
```

---

### source()

```typescript
source<T>(uri: string, options?: SourceOptions): Pipeline<T, T>
```

Configures the data source. URI format: `protocol://resource`

**Supported Protocols:**

| Protocol | Example | Description |
|----------|---------|-------------|
| `kafka` | `kafka://topic` | Kafka topic |
| `postgres` | `postgres://db/table` | Database table |
| `http` | `http://api/endpoint` | HTTP polling |
| `s3` | `s3://bucket/prefix` | S3 objects |
| `file` | `file:///path/*.json` | Local files |
| `stdin` | `stdin` | Standard input |

---

### transform()

```typescript
transform<TOut>(
  fn: (record: TIn, ctx: Context) => TOut | Promise<TOut>,
  options?: TransformOptions
): Pipeline<TIn, TOut>
```

**Options:**

```typescript
interface TransformOptions {
  concurrency?: number;      // Parallel executions
  timeout?: number;          // Per-record timeout (ms)
  onError?: 'fail' | 'skip' | 'dead-letter' | ErrorHandler;
  retries?: number;          // Retry attempts
  retryDelay?: number;       // Delay between retries
}
```

**Example:**

```javascript
pipeline.transform(
  async (record, ctx) => {
    const enriched = await enrichmentService.lookup(record.id);
    return { ...record, ...enriched };
  },
  {
    concurrency: 10,
    timeout: 5000,
    retries: 3,
    onError: 'dead-letter'
  }
);
```

---

### filter()

```typescript
filter(
  predicate: (record: T, ctx: Context) => boolean | Promise<boolean>,
  options?: FilterOptions
): Pipeline<T, T>
```

**Example:**

```javascript
pipeline
  .filter(record => record.status === 'active')
  .filter(async (record, ctx) => {
    const allowed = await ctx.state.get(`allowed:${record.region}`);
    return allowed === true;
  });
```

---

### window()

```typescript
window(windowSpec: WindowSpec): Pipeline<T, Window<T>>
```

**Window Types:**

```javascript
import { windows } from '@dataflow/sdk';

// Tumbling window (non-overlapping)
pipeline.window(windows.tumbling('5 minutes'));

// Sliding window (overlapping)
pipeline.window(windows.sliding('10 minutes', '1 minute'));

// Session window (gap-based)
pipeline.window(windows.session('30 minutes'));

// Count-based window
pipeline.window(windows.count(1000));
```

---

### aggregate()

```typescript
aggregate<TOut>(spec: AggregationSpec): Pipeline<Window<T>, TOut>
```

**Example:**

```javascript
import { agg } from '@dataflow/sdk';

pipeline
  .window(windows.tumbling('1 hour'))
  .aggregate({
    groupBy: ['region', 'product'],
    metrics: {
      totalSales: agg.sum('amount'),
      orderCount: agg.count(),
      avgOrderValue: agg.avg('amount'),
      maxOrder: agg.max('amount'),
      uniqueCustomers: agg.countDistinct('customerId')
    }
  });
```

---

### sink()

```typescript
sink<T>(uri: string, options?: SinkOptions): Pipeline<T, T>
```

**Options:**

```typescript
interface SinkOptions {
  batchSize?: number;
  flushInterval?: number;
  onConflict?: 'fail' | 'skip' | 'update' | 'upsert';
  partitionBy?: string[];
  format?: 'json' | 'parquet' | 'avro' | 'csv';
}
```

---

### run()

```typescript
run(): Promise<PipelineResult>
```

**Result:**

```typescript
interface PipelineResult {
  status: 'completed' | 'failed' | 'cancelled';
  recordsProcessed: number;
  recordsFailed: number;
  duration: number;
  stages: StageMetrics[];
}
```

---

## Source Connectors

### Kafka Source

```javascript
pipeline.source('kafka://user-events', {
  brokers: ['broker1:9092', 'broker2:9092'],
  consumerGroup: 'analytics-consumer',
  startOffset: 'latest',  // 'earliest', 'latest', timestamp

  // Deserialization
  keyDeserializer: 'string',
  valueDeserializer: 'json',  // 'json', 'avro', 'protobuf', 'string'

  // Schema Registry (v2)
  schemaValidation: true,

  // Batching
  maxPollRecords: 500,
  maxPollInterval: 300000
});
```

### PostgreSQL Source

```javascript
pipeline.source('postgres://analytics/events', {
  // Connection
  connectionString: 'postgres://user:pass@host:5432/db',

  // Query mode
  mode: 'incremental',  // 'full', 'incremental', 'cdc'
  incrementalColumn: 'updated_at',

  // Polling
  pollInterval: 60000,
  batchSize: 10000,

  // Custom query
  query: `
    SELECT id, name, email, created_at, updated_at
    FROM users
    WHERE updated_at > :lastSync
    ORDER BY updated_at ASC
    LIMIT :batchSize
  `
});
```

### HTTP Source

```javascript
pipeline.source('http://api.example.com/events', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${process.env.API_TOKEN}`,
    'Accept': 'application/json'
  },

  // Polling
  pollInterval: 5000,

  // Pagination
  pagination: {
    type: 'cursor',  // 'cursor', 'offset', 'link'
    cursorParam: 'after',
    cursorPath: 'meta.next_cursor'
  },

  // Rate limiting
  rateLimit: {
    requests: 100,
    period: 60000
  }
});
```

### S3 Source

```javascript
pipeline.source('s3://data-lake/events/', {
  region: 'us-east-1',

  // File selection
  pattern: '*.parquet',
  recursive: true,

  // Format
  format: 'parquet',
  compression: 'snappy',

  // Processing
  mode: 'incremental',  // 'full', 'incremental'
  stateStorage: 's3://state/s3-source/'
});
```

---

## Sink Connectors

### Kafka Sink

```javascript
pipeline.sink('kafka://processed-events', {
  brokers: ['broker1:9092'],

  // Serialization
  keySerializer: record => record.id,
  valueSerializer: 'json',  // 'json', 'avro', 'protobuf'

  // Partitioning
  partitioner: 'consistent-hash',  // 'round-robin', 'consistent-hash', custom
  partitionKey: 'userId',

  // Performance
  compression: 'gzip',  // 'none', 'gzip', 'snappy', 'lz4'
  batchSize: 1000,
  lingerMs: 100
});
```

### PostgreSQL Sink

```javascript
pipeline.sink('postgres://analytics/events', {
  // Connection
  connectionString: process.env.DATABASE_URL,
  pool: { min: 2, max: 10 },

  // Table
  table: 'events',
  columns: ['id', 'user_id', 'event_type', 'payload', 'created_at'],

  // Conflict handling
  onConflict: {
    columns: ['id'],
    action: 'update',
    updateColumns: ['payload', 'updated_at']
  },

  // Batching
  batchSize: 1000,
  flushInterval: 5000
});
```

### S3 Sink

```javascript
pipeline.sink('s3://data-lake/processed/', {
  region: 'us-east-1',

  // Format
  format: 'parquet',
  compression: 'snappy',

  // Partitioning
  partitionBy: ['date', 'region'],

  // File management
  maxFileSize: '128MB',
  maxRecordsPerFile: 1000000,

  // Naming
  filePrefix: 'events',
  fileExtension: '.parquet'
});
```

---

## Built-in Transforms

```javascript
import { transforms } from '@dataflow/sdk';

pipeline
  // Flatten nested objects
  .transform(transforms.flatten('nested.field'))

  // Rename fields
  .transform(transforms.rename({
    old_name: 'newName',
    another_old: 'anotherNew'
  }))

  // Type casting
  .transform(transforms.cast({
    age: 'integer',
    price: 'float',
    active: 'boolean',
    created: 'timestamp'
  }))

  // Deduplication
  .transform(transforms.dedupe('id', {
    window: 3600000,  // 1 hour
    storage: 'memory'  // or 'redis'
  }))

  // JSON path extraction
  .transform(transforms.jsonPath({
    userId: '$.user.id',
    items: '$.order.items[*].sku'
  }))

  // Mask sensitive data
  .transform(transforms.mask({
    email: 'partial',  // j***@example.com
    phone: 'full',     // ****
    ssn: 'last4'       // ***-**-1234
  }));
```

---

## Aggregation Functions

```javascript
import { agg } from '@dataflow/sdk';

// Numeric aggregations
agg.sum('field')
agg.avg('field')
agg.min('field')
agg.max('field')
agg.stddev('field')
agg.variance('field')
agg.percentile('field', 95)

// Count aggregations
agg.count()
agg.countDistinct('field')
agg.countIf(record => record.status === 'active')

// Collection aggregations
agg.collect('field')           // Array of all values
agg.collectSet('field')        // Unique values
agg.first('field')
agg.last('field')

// Custom aggregations
agg.custom({
  init: () => ({ sum: 0, count: 0 }),
  accumulate: (acc, record) => ({
    sum: acc.sum + record.value,
    count: acc.count + 1
  }),
  merge: (acc1, acc2) => ({
    sum: acc1.sum + acc2.sum,
    count: acc1.count + acc2.count
  }),
  finalize: acc => acc.sum / acc.count
})
```

---

*See [API Overview](./overview.md) for concepts and patterns.*
